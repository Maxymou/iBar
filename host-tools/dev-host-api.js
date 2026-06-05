#!/usr/bin/env node
/*
 * iBar DEV Host API
 * API locale hors Docker pour mettre à jour le dépôt iBar depuis l'interface web.
 */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const SERVICE_NAME = 'ibar-dev-host-api';
const PORT = Number(process.env.PORT || 4878);
const DEV_HOST_TOKEN = process.env.DEV_HOST_TOKEN || '';
const WORKDIR = path.resolve(__dirname, '..');
const ALLOWED_ORIGINS = (process.env.DEV_HOST_ALLOWED_ORIGINS || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const SYSTEMCTL_COMMAND = process.getuid && process.getuid() === 0
  ? ['systemctl', 'restart', 'ibar', 'ibar-adminer']
  : ['sudo', '-n', 'systemctl', 'restart', 'ibar', 'ibar-adminer'];

let isUpdating = false;
let currentStep = null;
let lastUpdate = null;
let lastError = null;

const now = () => new Date().toISOString();

const makeStatus = (extra = {}) => ({
  status: 'ok',
  service: SERVICE_NAME,
  workdir: WORKDIR,
  isUpdating,
  currentStep,
  lastUpdate,
  lastError,
  timestamp: now(),
  ...extra,
});

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
};

const getCorsOrigin = (req) => {
  const origin = req.headers.origin;
  if (!origin) return '*';
  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0] || 'null';
};

const applyCors = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(req));
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-dev-host-token');
  res.setHeader('Access-Control-Max-Age', '86400');
};

const isAuthorized = (req) => {
  if (!DEV_HOST_TOKEN) return false;
  return req.headers['x-dev-host-token'] === DEV_HOST_TOKEN;
};

const runCommand = (command, args, step, cwd = WORKDIR) => new Promise((resolve, reject) => {
  currentStep = step;
  const startedAt = now();
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    shell: false,
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('error', (error) => {
    reject({ command: [command, ...args].join(' '), step, startedAt, error, stdout, stderr });
  });

  child.on('close', (code) => {
    const result = {
      command: [command, ...args].join(' '),
      cwd,
      step,
      startedAt,
      finishedAt: now(),
      code,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };

    if (code === 0) resolve(result);
    else reject({ ...result, error: new Error(`Commande échouée avec le code ${code}`) });
  });
});

const parseRev = (result) => result.stdout.split('\n').map((line) => line.trim()).filter(Boolean)[0] || null;

const runUpdate = async () => {
  const steps = [];
  const startedAt = now();

  steps.push(await runCommand('git', ['fetch', 'origin', 'main'], 'Récupération de origin/main'));

  const localRev = parseRev(await runCommand('git', ['rev-parse', 'HEAD'], 'Lecture de la révision locale'));
  const remoteRev = parseRev(await runCommand('git', ['rev-parse', 'origin/main'], 'Lecture de origin/main'));

  if (localRev && remoteRev && localRev === remoteRev) {
    const update = {
      status: 'already-up-to-date',
      message: 'Aucun changement disponible sur origin/main.',
      startedAt,
      finishedAt: now(),
      localRev,
      remoteRev,
      steps,
    };
    lastUpdate = update;
    return update;
  }

  steps.push(await runCommand('git', ['pull', '--ff-only', 'origin', 'main'], 'Application des changements'));
  steps.push(await runCommand('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], 'Installation des dépendances backend', path.join(WORKDIR, 'backend')));
  steps.push(await runCommand('npm', ['install', '--include=dev', '--no-audit', '--no-fund'], 'Installation des dépendances frontend', path.join(WORKDIR, 'frontend')));
  steps.push(await runCommand('npm', ['run', 'build'], 'Build frontend'));

  try {
    const [command, ...args] = SYSTEMCTL_COMMAND;
    steps.push(await runCommand(command, args, 'Redémarrage des services systemd'));
  } catch (error) {
    steps.push({
      command: error.command || SYSTEMCTL_COMMAND.join(' '),
      step: 'Redémarrage des services systemd',
      warning: true,
      message: 'Redémarrage systemd non effectué. Vérifiez les droits du service DEV host.',
      stderr: error.stderr || error.error?.message || String(error),
      finishedAt: now(),
    });
  }

  const update = {
    status: 'updated',
    message: 'Mise à jour iBar terminée.',
    startedAt,
    finishedAt: now(),
    localRev,
    remoteRev,
    steps,
  };
  lastUpdate = update;
  return update;
};

const handleUpdate = async (res) => {
  if (isUpdating) {
    sendJson(res, 409, makeStatus({
      status: 'busy',
      error: 'Une mise à jour est déjà en cours.',
    }));
    return;
  }

  isUpdating = true;
  currentStep = 'Initialisation de la mise à jour';
  lastError = null;

  try {
    const update = await runUpdate();
    currentStep = null;
    sendJson(res, 200, makeStatus({ update, message: update.message }));
  } catch (error) {
    const normalizedError = {
      message: error.error?.message || error.message || 'Erreur inconnue pendant la mise à jour.',
      command: error.command,
      step: error.step || currentStep,
      stdout: error.stdout,
      stderr: error.stderr,
      timestamp: now(),
    };
    lastError = normalizedError;
    currentStep = null;
    sendJson(res, 500, makeStatus({ status: 'error', error: normalizedError.message }));
  } finally {
    isUpdating = false;
  }
};

const server = http.createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, {
      status: 'unauthorized',
      service: SERVICE_NAME,
      error: DEV_HOST_TOKEN
        ? 'Token DEV host absent ou incorrect.'
        : 'DEV_HOST_TOKEN doit être configuré côté serveur.',
      timestamp: now(),
    });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${PORT}`}`);

  if (req.method === 'GET' && url.pathname === '/status') {
    sendJson(res, 200, makeStatus());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/update') {
    await handleUpdate(res);
    return;
  }

  sendJson(res, 404, {
    status: 'not-found',
    service: SERVICE_NAME,
    error: 'Route inconnue.',
    timestamp: now(),
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`${SERVICE_NAME} listening on http://127.0.0.1:${PORT}`);
  if (!DEV_HOST_TOKEN) {
    console.warn('DEV_HOST_TOKEN est absent : toutes les requêtes seront refusées.');
  }
});

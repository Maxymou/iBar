const express = require('express');
const http = require('http');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const DEV_HOST_BASE_URL = 'http://127.0.0.1:4878';
const DEV_HOST_TIMEOUT_MS = 30 * 1000;

const proxyDevHostRequest = ({ method, path, body }) => new Promise((resolve, reject) => {
  const devHostToken = process.env.DEV_HOST_TOKEN;

  if (!devHostToken) {
    const error = new Error('DEV_HOST_TOKEN doit être configuré côté serveur iBar.');
    error.statusCode = 500;
    reject(error);
    return;
  }

  const payload = body && Object.keys(body).length > 0 ? JSON.stringify(body) : null;
  const request = http.request(
    `${DEV_HOST_BASE_URL}${path}`,
    {
      method,
      headers: {
        'x-dev-host-token': devHostToken,
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        } : {}),
      },
      timeout: DEV_HOST_TIMEOUT_MS,
    },
    (response) => {
      let responseBody = '';

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        responseBody += chunk;
      });
      response.on('end', () => {
        const contentType = response.headers['content-type'] || '';
        let data = responseBody;

        if (contentType.includes('application/json')) {
          try {
            data = responseBody ? JSON.parse(responseBody) : {};
          } catch {
            data = {
              status: 'error',
              error: 'Réponse JSON invalide depuis l’API DEV host locale.',
            };
          }
        }

        resolve({ statusCode: response.statusCode || 502, data });
      });
    }
  );

  request.on('timeout', () => {
    request.destroy(new Error('Délai dépassé pendant le contact de l’API DEV host locale.'));
  });

  request.on('error', (error) => {
    error.statusCode = 502;
    reject(error);
  });

  if (payload) request.write(payload);
  request.end();
});

const handleDevHostProxy = (method, path) => async (req, res) => {
  try {
    const { statusCode, data } = await proxyDevHostRequest({ method, path, body: req.body });
    res.status(statusCode).json(data);
  } catch (error) {
    res.status(error.statusCode || 502).json({
      status: 'error',
      error: error.message || 'Impossible de contacter l’API DEV host locale.',
    });
  }
};

router.get('/status', authenticate, handleDevHostProxy('GET', '/status'));
router.post('/update', authenticate, handleDevHostProxy('POST', '/update'));

module.exports = router;

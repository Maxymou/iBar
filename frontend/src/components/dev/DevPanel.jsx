import { useMemo, useState } from 'react';
import {
  devHostConfig,
  forcePwaRefresh,
  getDevHostStatus,
  triggerDevHostUpdate,
} from '../../services/devHost';

const STATUS_LABELS = {
  idle: 'En attente',
  checking: 'Vérification en cours',
  updating: 'Mise à jour en cours',
  success: 'Terminé',
  error: 'Erreur',
};

const formatDateTime = (value) => {
  if (!value) return 'Jamais';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });
};

const getErrorMessage = (error) => error?.payload?.lastError?.message || error?.message || 'Erreur inconnue';

const UpdateOverlay = ({ state, status, error, onRetry, onReload, onClose }) => {
  if (state === 'idle') return null;

  const isBusy = state === 'checking' || state === 'updating';
  const isSuccess = state === 'success';
  const isError = state === 'error';
  const step = status?.currentStep || status?.step || (state === 'checking' ? 'Contact de l’API DEV host' : null);

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-ios-lg dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <div className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${isError ? 'bg-red-100 text-red-600' : isSuccess ? 'bg-green-100 text-green-600' : 'bg-primary-100 text-primary-700'}`}>
            {isBusy ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : isSuccess ? '✓' : '!'}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {isBusy ? 'Mise à jour en cours' : isSuccess ? 'Mise à jour terminée' : 'Mise à jour échouée'}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              État : {STATUS_LABELS[state] || state}
            </p>
            {step && (
              <p className="mt-2 rounded-2xl bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                Étape : {step}
              </p>
            )}
            {status?.message && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{status.message}</p>
            )}
            {isError && (
              <p className="mt-2 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                {getErrorMessage(error)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {isError && (
            <button type="button" onClick={onRetry} className="ios-button-primary w-full">
              Réessayer
            </button>
          )}
          {isSuccess && (
            <button type="button" onClick={onReload} className="ios-button-primary w-full">
              Recharger l’app
            </button>
          )}
          {!isBusy && (
            <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-100 py-3 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const DevPanel = () => {
  const [updateState, setUpdateState] = useState('idle');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [pwaMessage, setPwaMessage] = useState('');

  const isBusy = updateState === 'checking' || updateState === 'updating';

  const lastKnownState = useMemo(() => {
    if (!status) return 'Aucun état récupéré';
    if (status.isUpdating) return 'Mise à jour en cours côté serveur';
    if (status.lastError) return `Dernière erreur : ${status.lastError.message || status.lastError}`;
    if (status.lastUpdate) return `Dernière mise à jour : ${status.lastUpdate.status || 'succès'}`;
    return 'API DEV host disponible';
  }, [status]);

  const checkStatus = async () => {
    setUpdateState('checking');
    setError(null);
    try {
      const payload = await getDevHostStatus();
      setStatus(payload);
      setUpdateState('success');
    } catch (err) {
      setError(err);
      setUpdateState('error');
    }
  };

  const updateApp = async () => {
    if (isBusy) return;
    setUpdateState('updating');
    setError(null);
    try {
      const payload = await triggerDevHostUpdate();
      setStatus(payload);
      setUpdateState('success');
    } catch (err) {
      setError(err);
      if (err.payload) setStatus(err.payload);
      setUpdateState('error');
    }
  };

  const handleForcePwaRefresh = async () => {
    setPwaMessage('Nettoyage PWA en cours : service workers et caches vont être supprimés.');
    try {
      await forcePwaRefresh();
    } catch (err) {
      setPwaMessage(`Erreur pendant la mise à jour PWA forcée : ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        Section DEV discrète : utilisez-la uniquement depuis iBar. Le token DEV host reste configuré côté serveur.
      </div>

      <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">API DEV host</p>
            <h3 className="font-bold text-gray-900 dark:text-white">État du service</h3>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status?.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
            {status?.status === 'ok' ? 'OK' : 'Inconnu'}
          </span>
        </div>

        <dl className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex justify-between gap-3">
            <dt>Accès DEV</dt>
            <dd className="text-right font-medium">{devHostConfig.accessMode}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>URL</dt>
            <dd className="break-all text-right font-medium">{devHostConfig.apiUrl}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Service</dt>
            <dd>{status?.service || '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Étape</dt>
            <dd className="text-right">{status?.currentStep || '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Dernier contrôle</dt>
            <dd>{formatDateTime(status?.timestamp)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <p className="font-semibold">Dernier état connu</p>
        <p className="mt-1">{lastKnownState}</p>
        {error && <p className="mt-2 text-red-600 dark:text-red-300">{getErrorMessage(error)}</p>}
      </div>

      <div className="grid gap-2">
        <button type="button" onClick={checkStatus} disabled={isBusy} className="ios-button-secondary w-full disabled:opacity-50">
          Vérifier l’état
        </button>
        <button type="button" onClick={updateApp} disabled={isBusy} className="ios-button-primary w-full disabled:opacity-50">
          {isBusy ? 'Opération en cours...' : 'Mettre à jour l’app'}
        </button>
        <button type="button" onClick={handleForcePwaRefresh} className="w-full rounded-xl bg-gray-900 py-3 font-semibold text-white active:bg-gray-800 dark:bg-gray-100 dark:text-gray-900">
          Forcer mise à jour PWA
        </button>
      </div>

      {pwaMessage && (
        <p className="rounded-2xl bg-primary-50 p-3 text-sm text-primary-800 dark:bg-primary-950/40 dark:text-primary-100">
          {pwaMessage}
        </p>
      )}

      <UpdateOverlay
        state={updateState}
        status={status}
        error={error}
        onRetry={updateApp}
        onReload={() => window.location.reload()}
        onClose={() => setUpdateState('idle')}
      />
    </div>
  );
};

export default DevPanel;

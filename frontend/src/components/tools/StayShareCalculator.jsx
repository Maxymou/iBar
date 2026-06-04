import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'ibar_stay_share_calculator';

export const roundUpToTenthCent = (value) => Math.ceil(value * 1000) / 1000;

const formatEuros3 = (value) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);

const formatEuros2 = (value) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const emptyForm = { firstName: '', nights: '' };

const createParticipantId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const sanitizeParticipants = (participants) => {
  if (!Array.isArray(participants)) return [];

  return participants
    .map((participant) => {
      const firstName = typeof participant.firstName === 'string' ? participant.firstName.trim() : '';
      const nights = Number(participant.nights);

      if (!firstName || !Number.isInteger(nights) || nights < 1) return null;

      return {
        id: typeof participant.id === 'string' && participant.id ? participant.id : createParticipantId(),
        firstName,
        nights,
      };
    })
    .filter(Boolean);
};

const getInitialState = () => {
  if (typeof window === 'undefined') {
    return { totalPrice: '', participants: [] };
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { totalPrice: '', participants: [] };

    const parsed = JSON.parse(saved);
    return {
      totalPrice: typeof parsed.totalPrice === 'string' ? parsed.totalPrice : '',
      participants: sanitizeParticipants(parsed.participants),
    };
  } catch {
    return { totalPrice: '', participants: [] };
  }
};

const StayShareCalculator = () => {
  const [{ totalPrice, participants }, setSavedState] = useState(getInitialState);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ totalPrice, participants }),
      );
    } catch {
      // La persistance locale est pratique, mais le calculateur reste fonctionnel sans elle.
    }
  }, [totalPrice, participants]);

  const price = Number.parseFloat(totalPrice);
  const validPrice = totalPrice !== '' && Number.isFinite(price) && price >= 0;

  const calculation = useMemo(() => {
    const totalNights = participants.reduce((sum, participant) => sum + participant.nights, 0);
    const canCalculate = validPrice && totalNights > 0;
    const nightlyPrice = canCalculate ? price / totalNights : 0;
    const participantsWithAmounts = participants.map((participant) => {
      const rawAmount = canCalculate ? participant.nights * nightlyPrice : null;
      return {
        ...participant,
        amountDue: rawAmount === null ? null : roundUpToTenthCent(rawAmount),
      };
    });
    const distributedTotal = participantsWithAmounts.reduce(
      (sum, participant) => sum + (participant.amountDue ?? 0),
      0,
    );

    return {
      totalNights,
      nightlyPrice: canCalculate ? nightlyPrice : null,
      participantsWithAmounts,
      distributedTotal: canCalculate ? distributedTotal : null,
      roundingGap: canCalculate ? distributedTotal - price : null,
    };
  }, [participants, price, validPrice]);

  const updateTotalPrice = (value) => {
    setSavedState((current) => ({ ...current, totalPrice: value }));
  };

  const resetEdition = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const firstName = form.firstName.trim();
    const nights = Number(form.nights);

    if (!firstName) {
      setError('Veuillez saisir un prénom.');
      return;
    }

    if (!Number.isInteger(nights) || nights < 1) {
      setError('Le nombre de nuits doit être un entier positif.');
      return;
    }

    setSavedState((current) => {
      if (editingId) {
        return {
          ...current,
          participants: current.participants.map((participant) => (
            participant.id === editingId ? { ...participant, firstName, nights } : participant
          )),
        };
      }

      return {
        ...current,
        participants: [
          ...current.participants,
          { id: createParticipantId(), firstName, nights },
        ],
      };
    });

    resetEdition();
  };

  const editParticipant = (participant) => {
    setEditingId(participant.id);
    setForm({ firstName: participant.firstName, nights: String(participant.nights) });
    setError('');
  };

  const deleteParticipant = (participantId) => {
    setSavedState((current) => ({
      ...current,
      participants: current.participants.filter((participant) => participant.id !== participantId),
    }));

    if (editingId === participantId) {
      resetEdition();
    }
  };

  const buildShareText = () => {
    if (!validPrice || calculation.totalNights === 0) return '';

    const lines = [
      `Prix du logement : ${formatEuros2(price)}`,
      `Prix de la nuit : ${formatEuros3(calculation.nightlyPrice ?? 0)}`,
      `Total des nuits : ${calculation.totalNights} ${calculation.totalNights > 1 ? 'nuits' : 'nuit'}`,
      '',
      ...calculation.participantsWithAmounts.map((participant) => (
        `${participant.firstName}, ${participant.nights} ${participant.nights > 1 ? 'nuits' : 'nuit'} = ${formatEuros3(participant.amountDue ?? 0)}`
      )),
    ];

    return lines.join('\n');
  };

  const copyShareDetails = async () => {
    if (!validPrice || calculation.totalNights === 0) return;

    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopySuccess(true);
      setCopyError(false);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setCopyError(true);
      setCopySuccess(false);
      setTimeout(() => setCopyError(false), 2000);
    }
  };

  return (
    <div className="space-y-5 text-gray-900 dark:text-gray-100">
      <div className="rounded-2xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 px-4 py-3">
        <p className="text-sm text-primary-900 dark:text-primary-100">
          Répartissez le coût du logement au prorata des nuits de chacun. Les montants dus sont arrondis au dixième de centime supérieur.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
          Prix total du logement
        </label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={totalPrice}
          onChange={(event) => updateTotalPrice(event.target.value)}
          placeholder="850"
          className="ios-input"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Prénom
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              placeholder="Cyril"
              className="ios-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Nombre de nuits
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={form.nights}
              onChange={(event) => setForm((current) => ({ ...current, nights: event.target.value }))}
              placeholder="7"
              className="ios-input"
            />
          </div>
        </div>

        {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-2">
          <button type="submit" className="ios-button-primary flex-1">
            {editingId ? 'Modifier' : 'Ajouter'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetEdition}
              className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold active:bg-gray-300 dark:active:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Participants
        </h3>

        {calculation.participantsWithAmounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Aucun participant ajouté pour le moment.
          </div>
        ) : (
          <div className="space-y-2">
            {calculation.participantsWithAmounts.map((participant) => (
              <div
                key={participant.id}
                className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{participant.firstName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {participant.nights} {participant.nights > 1 ? 'nuits' : 'nuit'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Montant dû</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {participant.amountDue === null ? '—' : formatEuros3(participant.amountDue)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => editParticipant(participant)}
                    className="py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteParticipant(participant.id)}
                    className="py-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm font-medium active:bg-red-100 dark:active:bg-red-900/50 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Résumé
        </h3>
        <SummaryRow label="Total des nuits" value={calculation.totalNights || '—'} />
        <SummaryRow label="Prix par nuit" value={calculation.nightlyPrice === null ? '—' : formatEuros3(calculation.nightlyPrice)} />
        <SummaryRow label="Total logement" value={validPrice ? formatEuros2(price) : '—'} />
        <SummaryRow label="Total réparti" value={calculation.distributedTotal === null ? '—' : formatEuros3(calculation.distributedTotal)} />
        {calculation.roundingGap !== null && (
          <SummaryRow
            label="Écart dû aux arrondis"
            value={`${calculation.roundingGap >= 0 ? '+' : ''}${formatEuros3(calculation.roundingGap)}`}
          />
        )}
        <button
          type="button"
          onClick={copyShareDetails}
          disabled={!validPrice || calculation.totalNights === 0}
          className="ios-button-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copySuccess ? 'Détail copié' : 'Copier le détail'}
        </button>
        {copyError && (
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Impossible de copier automatiquement.
          </p>
        )}
      </section>
    </div>
  );
};

const SummaryRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
    <span className="font-semibold text-gray-900 dark:text-white text-right">{value}</span>
  </div>
);

export default StayShareCalculator;

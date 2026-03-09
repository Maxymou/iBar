import Modal from './Modal';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', danger = false }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    footer={
      <div className="flex gap-3">
        <button onClick={onClose} className="ios-button-secondary flex-1">Annuler</button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`flex-1 py-3 px-6 rounded-xl font-semibold text-base transition-all active:scale-95
                      ${danger ? 'bg-red-500 text-white' : 'bg-primary-600 text-white'}`}
        >
          {confirmLabel}
        </button>
      </div>
    }
  >
    <p className="text-gray-600">{message}</p>
  </Modal>
);

export default ConfirmModal;

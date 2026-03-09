import { useRef } from 'react';

const ImageUpload = ({ value, onChange, preview }) => {
  const fileRef = useRef();
  const camRef = useRef();

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onChange(file);
  };

  return (
    <div className="space-y-2">
      {/* Preview */}
      {preview && (
        <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100">
          <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full
                       flex items-center justify-center text-sm"
          >
            ×
          </button>
        </div>
      )}

      {!preview && (
        <div className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200
                        flex items-center justify-center bg-gray-50 text-gray-400 text-4xl">
          📷
        </div>
      )}

      {/* Upload buttons */}
      <div className="flex gap-2">
        {/* Camera */}
        <input ref={camRef} type="file" accept="image/*" capture="environment"
               className="hidden" onChange={handleChange} />
        <button type="button" onClick={() => camRef.current.click()}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium
                           active:bg-gray-200 transition-colors">
          📷 Caméra
        </button>

        {/* File */}
        <input ref={fileRef} type="file" accept="image/*"
               className="hidden" onChange={handleChange} />
        <button type="button" onClick={() => fileRef.current.click()}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium
                           active:bg-gray-200 transition-colors">
          🖼️ Galerie
        </button>
      </div>
    </div>
  );
};

export default ImageUpload;

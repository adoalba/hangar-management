
import React, { useState, useEffect } from 'react';

interface LocationPopupProps {
  onConfirm: (location: string) => void;
  onCancel: () => void;
  t: any;
  initialLocation?: string;
}

const LocationPopup: React.FC<LocationPopupProps> = ({ onConfirm, onCancel, t, initialLocation }) => {
  const [location, setLocation] = useState(initialLocation || '');

  useEffect(() => {
    if (initialLocation) setLocation(initialLocation);
  }, [initialLocation]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-black mb-2 text-white">{t.location_title}</h2>
        <p className="text-slate-400 text-sm mb-6">
          {t.language === 'EN' 
            ? "This information is mandatory for part traceability in the hangar."
            : "Esta información es obligatoria para la trazabilidad de la pieza en el hangar."
          }
        </p>
        
        <input
          autoFocus
          type="text"
          className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl p-4 text-white text-lg focus:border-indigo-500 outline-none mb-8 transition-colors"
          placeholder={t.location_placeholder}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && location && onConfirm(location)}
        />

        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-2xl transition-colors"
          >
            {t.cancel}
          </button>
          <button 
            disabled={!location}
            onClick={() => onConfirm(location)}
            className="flex-1 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
          >
            {t.confirm_save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPopup;

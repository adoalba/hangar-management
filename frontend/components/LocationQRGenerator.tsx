/**
 * LocationQRGenerator.tsx - Admin Tool for Location Label Generation
 * Generates printable bilingual QR labels with industrial black-block design
 */

import React, { useState, useRef } from 'react';
import { ICONS } from '../constants';
import { generateLocationQR } from '../utils/QRGenerator';

interface LocationQRGeneratorProps {
    t: any;
    onClose: () => void;
}

// Predefined locations
const PREDEFINED_LOCATIONS = [
    { code: 'HANGAR-A', label: 'Hangar A' },
    { code: 'HANGAR-B', label: 'Hangar B' },
    { code: 'RACK-01', label: 'Rack 01' },
    { code: 'RACK-02', label: 'Rack 02' },
    { code: 'CONTAINER-01', label: 'Container 01' },
    { code: 'CONTAINER-02', label: 'Container 02' },
    { code: 'QUARANTINE', label: 'Quarantine / Cuarentena' },
    { code: 'DISPOSAL', label: 'Disposal / Desecho' },
    { code: 'SHIPPING-AREA', label: 'Shipping Area' },
    { code: 'HOLD-AREA', label: 'Hold Area' },
];

const LocationQRGenerator: React.FC<LocationQRGeneratorProps> = ({ t, onClose }) => {
    const [customCode, setCustomCode] = useState('');
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const printRef = useRef<HTMLDivElement>(null);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://wca.app';

    const toggleLocation = (code: string) => {
        setSelectedLocations(prev =>
            prev.includes(code)
                ? prev.filter(c => c !== code)
                : [...prev, code]
        );
    };

    const addCustomLocation = () => {
        if (customCode && !selectedLocations.includes(customCode.toUpperCase())) {
            setSelectedLocations(prev => [...prev, customCode.toUpperCase()]);
            setCustomCode('');
        }
    };

    const printLabels = () => {
        if (printRef.current) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Location Labels</title>
                        <style>
                            @page { size: 4in 2in; margin: 0; }
                            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                            .label-grid { display: flex; flex-wrap: wrap; }
                            .label { 
                                width: 4in; 
                                height: 2in; 
                                border: 3px solid black;
                                box-sizing: border-box;
                                display: flex;
                                page-break-inside: avoid;
                                background: white;
                            }
                            .qr-section {
                                width: 2in;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                border-right: 3px solid black;
                                padding: 8px;
                            }
                            .qr-section img { width: 100%; max-width: 1.6in; height: auto; }
                            .info-section {
                                flex: 1;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                padding: 12px;
                            }
                            .label-header {
                                background: black;
                                color: white;
                                padding: 6px 10px;
                                font-size: 10px;
                                font-weight: bold;
                                text-transform: uppercase;
                                letter-spacing: 2px;
                                text-align: center;
                                margin-bottom: 8px;
                            }
                            .location-code {
                                font-size: 22px;
                                font-weight: 900;
                                text-transform: uppercase;
                                text-align: center;
                                letter-spacing: 1px;
                                margin-bottom: 8px;
                            }
                            .scan-instruction {
                                font-size: 8px;
                                text-transform: uppercase;
                                text-align: center;
                                color: #666;
                                letter-spacing: 1px;
                            }
                            @media print {
                                .label { break-after: page; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="label-grid">
                            ${selectedLocations.map(code => `
                                <div class="label">
                                    <div class="qr-section">
                                        <img src="${generateLocationQR(code, baseUrl, 200)}" alt="QR ${code}" />
                                    </div>
                                    <div class="info-section">
                                        <div class="label-header">LOCATION / UBICACIÓN</div>
                                        <div class="location-code">${code}</div>
                                        <div class="scan-instruction">SCAN FOR INVENTORY TRACKING<br/>ESCANEAR PARA TRAZABILIDAD</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <script>
                            setTimeout(() => { window.print(); window.close(); }, 1000);
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                            <ICONS.QrCode size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase">Location QR Labels</h2>
                            <p className="text-xs text-slate-500">Generate printable labels for inventory locations</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl">
                        <ICONS.X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Predefined Locations */}
                    <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">
                        Select Locations / Seleccionar Ubicaciones
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                        {PREDEFINED_LOCATIONS.map(loc => (
                            <button
                                key={loc.code}
                                onClick={() => toggleLocation(loc.code)}
                                className={`p-3 rounded-xl text-xs font-bold uppercase transition-all border ${selectedLocations.includes(loc.code)
                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                {loc.code}
                            </button>
                        ))}
                    </div>

                    {/* Custom Location Input */}
                    <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3">
                        Add Custom Location
                    </h3>
                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                            placeholder="e.g. RACK-A03"
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white font-bold uppercase outline-none focus:border-indigo-500"
                        />
                        <button
                            onClick={addCustomLocation}
                            disabled={!customCode}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm uppercase disabled:opacity-50"
                        >
                            Add
                        </button>
                    </div>

                    {/* Selected Labels Preview */}
                    {selectedLocations.length > 0 && (
                        <>
                            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-3">
                                Labels to Print ({selectedLocations.length})
                            </h3>
                            <div ref={printRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {selectedLocations.map(code => (
                                    <div
                                        key={code}
                                        className="bg-white rounded-xl overflow-hidden border-4 border-black flex"
                                        style={{ aspectRatio: '2/1' }}
                                    >
                                        {/* QR Section */}
                                        <div className="w-1/2 border-r-4 border-black flex items-center justify-center p-4 bg-white">
                                            <img
                                                src={generateLocationQR(code, baseUrl, 150)}
                                                alt={`QR ${code}`}
                                                className="w-full max-w-[120px]"
                                            />
                                        </div>
                                        {/* Info Section */}
                                        <div className="flex-1 flex flex-col justify-center p-4">
                                            <div className="bg-black text-white px-3 py-1 text-[9px] font-black uppercase tracking-widest text-center mb-3">
                                                LOCATION / UBICACIÓN
                                            </div>
                                            <p className="text-xl font-black text-black uppercase text-center tracking-tight">
                                                {code}
                                            </p>
                                            <p className="text-[8px] text-slate-600 uppercase text-center mt-2 tracking-wide">
                                                Scan for inventory tracking
                                            </p>
                                        </div>
                                        {/* Remove button */}
                                        <button
                                            onClick={() => toggleLocation(code)}
                                            className="absolute top-2 right-2 p-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <ICONS.X size={12} className="text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Print Button */}
                            <button
                                onClick={printLabels}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-3"
                            >
                                <ICONS.Printer size={20} />
                                Print Labels ({selectedLocations.length})
                            </button>
                        </>
                    )}

                    {selectedLocations.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <ICONS.QrCode size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-sm">Select locations above to generate labels</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LocationQRGenerator;

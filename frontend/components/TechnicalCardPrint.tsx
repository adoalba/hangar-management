import React, { useMemo } from 'react';
import { AviationPart, TagColor } from '../types';
import { generateQRDataUri } from '../utils/QRGenerator';
import { svgToDataUri, WCA_LOGO_SVG, getCardTypeBadgeSVG, BLOCK_ICONS } from '../utils/svgAssets';

/**
 * TechnicalCardPrint.tsx
 * 
 * Optimized 4x6 inch (10.16cm x 15.24cm) technical card template for
 * Android tablet printing with:
 * - Unified 5-block industrial structure
 * - Dynamic color schemes per card type
 * - SVG vectorization for logos/icons
 * - Compressed image support
 * - @media print CSS for Chrome Android
 */

interface TechnicalCardPrintProps {
    part: AviationPart;
    t: any;
    compressedPhoto?: string; // Pre-compressed photo data URI
}

// Color schemes for each card type
const COLOR_SCHEMES = {
    [TagColor.YELLOW]: {
        headerBg: '#0f172a', // Black
        headerText: '#ffffff',
        accentColor: '#eab308', // Yellow-500
        borderColor: '#eab308',
        badgeText: 'SERVICEABLE',
        documentBg: '#ffffff'
    },
    [TagColor.GREEN]: {
        headerBg: '#166534', // Green-800
        headerText: '#ffffff',
        accentColor: '#10b981', // Emerald-500
        borderColor: '#10b981',
        badgeText: 'REPAIRABLE',
        documentBg: '#ffffff'
    },
    [TagColor.WHITE]: {
        headerBg: '#0f172a', // Black
        headerText: '#ffffff',
        accentColor: '#64748b', // Slate-500
        borderColor: '#334155',
        badgeText: 'REMOVED',
        documentBg: '#ffffff'
    },
    [TagColor.RED]: {
        headerBg: '#991b1b', // Red-800
        headerText: '#ffffff',
        accentColor: '#dc2626', // Red-600
        borderColor: '#dc2626',
        badgeText: 'REJECTED',
        documentBg: '#ffffff'
    }
};

// Card type titles
const CARD_TITLES = {
    [TagColor.YELLOW]: { en: 'SERVICEABLE MATERIAL', es: 'MATERIAL APROBADO' },
    [TagColor.GREEN]: { en: 'REPAIRABLE MATERIAL', es: 'MATERIAL REPARABLE' },
    [TagColor.WHITE]: { en: 'REMOVED NO DEFECT', es: 'REMOVIDO SIN FALLA' },
    [TagColor.RED]: { en: 'REJECTED MATERIAL', es: 'MATERIAL RECHAZADO' }
};

const TechnicalCardPrint: React.FC<TechnicalCardPrintProps> = ({ part, t, compressedPhoto }) => {
    const scheme = COLOR_SCHEMES[part.tagColor] || COLOR_SCHEMES[TagColor.YELLOW];
    const titles = CARD_TITLES[part.tagColor] || CARD_TITLES[TagColor.YELLOW];

    // Generate QR code with record ID and action URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://wca.app';
    const qrPayload = `${baseUrl}/#/scan/${part.id}`;
    const qrDataUri = useMemo(() => generateQRDataUri(qrPayload, 80), [qrPayload]);

    // Format shelf life date
    const shelfLifeDate = part?.shelfLife
        ? new Date(part.shelfLife).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'N/A';

    // Use compressed photo or original
    const photoSrc = compressedPhoto || part.photo;

    // Location label based on card type
    const getLocationLabel = () => {
        switch (part.tagColor) {
            case TagColor.YELLOW: return 'FINAL LOCATION / POSICIÓN FINAL';
            case TagColor.WHITE:
            case TagColor.GREEN: return 'STORAGE LOC / LUGAR DE ALMACÉN';
            case TagColor.RED: return 'QUARANTINE / ZONA CUARENTENA';
            default: return 'LOCATION / UBICACIÓN';
        }
    };

    const locationValue = part.location || part.physicalStorageLocation || 'PENDIENTE';

    return (
        <>
            {/* Print CSS for 4x6 inch format */}
            <style>{`
                @page {
                    size: 4in 6in;
                    margin: 2mm;
                }
                
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    
                    body {
                        margin: 0;
                        padding: 0;
                        width: 4in;
                        height: 6in;
                    }
                    
                    .technical-card {
                        width: 4in !important;
                        height: 6in !important;
                        max-width: 4in !important;
                        max-height: 6in !important;
                        margin: 0 !important;
                        padding: 2mm !important;
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                        overflow: hidden !important;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    /* Condensed typography for long fields */
                    .condensed-text {
                        font-stretch: condensed;
                        letter-spacing: -0.02em;
                    }
                    
                    /* Ensure QR is crisp */
                    .qr-code {
                        image-rendering: pixelated;
                        image-rendering: -moz-crisp-edges;
                        image-rendering: crisp-edges;
                    }
                }
                
                /* Screen preview at 4x6 scale */
                @media screen {
                    .technical-card {
                        width: 384px; /* 4in at 96dpi */
                        height: 576px; /* 6in at 96dpi */
                        margin: 0 auto;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                    }
                }
            `}</style>

            <div
                className="technical-card bg-white font-sans text-black"
                style={{
                    border: `4px solid ${scheme.borderColor}`,
                    borderRadius: '4px'
                }}
            >
                {/* BLOCK 01: Header with QR and Badge */}
                <div
                    className="flex items-center justify-between p-2"
                    style={{
                        backgroundColor: scheme.headerBg,
                        borderBottom: `2px solid ${scheme.accentColor}`
                    }}
                >
                    {/* Logo */}
                    <div className="flex flex-col">
                        <span className="text-white text-[8px] font-black tracking-wide">WORLD CLASS</span>
                        <span className="text-white text-[10px] font-black tracking-wider">AVIATION</span>
                        <span className="text-[5px] font-medium tracking-widest" style={{ color: scheme.accentColor }}>
                            TECHNICAL RECORD
                        </span>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-1 rounded">
                        <img
                            src={qrDataUri}
                            alt="QR"
                            className="qr-code w-[50px] h-[50px]"
                        />
                        <p className="text-[4px] text-center font-bold text-slate-600 mt-0.5">SCAN</p>
                    </div>

                    {/* Status Badge */}
                    <div
                        className="px-2 py-1 rounded text-center"
                        style={{
                            backgroundColor: scheme.accentColor,
                            border: part.tagColor === TagColor.WHITE ? '1px solid #1e293b' : 'none'
                        }}
                    >
                        <span
                            className="text-[9px] font-black uppercase tracking-tight"
                            style={{ color: part.tagColor === TagColor.WHITE ? '#0f172a' : '#ffffff' }}
                        >
                            {scheme.badgeText}
                        </span>
                        <p className="text-[5px] font-bold" style={{ color: part.tagColor === TagColor.WHITE ? '#475569' : 'rgba(255,255,255,0.8)' }}>
                            {titles.es}
                        </p>
                    </div>
                </div>

                {/* BLOCK 02: Technical Identification */}
                <div className="px-2 py-1" style={{ backgroundColor: scheme.headerBg }}>
                    <span className="text-[6px] font-black text-white uppercase tracking-widest">
                        02. IDENTIFICACIÓN TÉCNICA
                    </span>
                </div>

                <div className="grid grid-cols-12 gap-px p-1 bg-slate-100">
                    {/* Part Info - Left */}
                    <div className="col-span-8 space-y-px">
                        <div className="flex border border-slate-300 bg-white">
                            <div className="w-1/4 bg-slate-50 p-1 border-r border-slate-200">
                                <span className="text-[5px] font-bold text-slate-500 uppercase">P/N</span>
                            </div>
                            <div className="flex-1 p-1">
                                <span className="text-[10px] font-black text-slate-900">{part.pn}</span>
                            </div>
                        </div>
                        <div className="flex border border-slate-300 bg-white">
                            <div className="w-1/4 bg-slate-50 p-1 border-r border-slate-200">
                                <span className="text-[5px] font-bold text-slate-500 uppercase">S/N</span>
                            </div>
                            <div className="flex-1 p-1">
                                <span className="text-[10px] font-black text-slate-900">{part.sn}</span>
                            </div>
                        </div>
                        <div className="flex border border-slate-300 bg-white">
                            <div className="w-1/4 bg-slate-50 p-1 border-r border-slate-200">
                                <span className="text-[5px] font-bold text-slate-500 uppercase">NOMBRE</span>
                            </div>
                            <div className="flex-1 p-1 overflow-hidden">
                                <span className="text-[8px] font-bold text-slate-800 condensed-text truncate block">{part.partName}</span>
                            </div>
                        </div>
                        <div className="flex border border-slate-300 bg-white">
                            <div className="w-1/4 bg-slate-50 p-1 border-r border-slate-200">
                                <span className="text-[5px] font-bold text-slate-500 uppercase">MARCA</span>
                            </div>
                            <div className="flex-1 p-1">
                                <span className="text-[8px] font-bold text-slate-800">{part.brand}</span>
                            </div>
                        </div>
                    </div>

                    {/* Photo - Right */}
                    <div className="col-span-4 border border-slate-300 bg-white flex items-center justify-center p-1 min-h-[70px]">
                        {photoSrc ? (
                            <img
                                src={photoSrc}
                                alt="Part"
                                className="w-full h-full object-contain max-h-[65px]"
                            />
                        ) : (
                            <span className="text-[6px] text-slate-300 font-bold text-center">NO PHOTO</span>
                        )}
                    </div>
                </div>

                {/* Final Location - MANDATORY HIGHLIGHT */}
                <div
                    className="mx-1 flex border-2"
                    style={{ borderColor: scheme.accentColor }}
                >
                    <div
                        className="w-1/3 p-1 flex items-center"
                        style={{ backgroundColor: scheme.headerBg }}
                    >
                        <span className="text-[5px] font-black text-white uppercase leading-tight">
                            {getLocationLabel()}
                        </span>
                    </div>
                    <div className="flex-1 p-1 bg-white">
                        <span className="text-[11px] font-black text-slate-900 uppercase">{locationValue}</span>
                    </div>
                </div>

                {/* BLOCK 03: Times and Cycles - 6 columns, 100% width */}
                <div className="px-2 py-0.5 mt-1" style={{ backgroundColor: scheme.headerBg }}>
                    <span className="text-[6px] font-black text-white uppercase tracking-widest">
                        03. TIEMPOS Y CICLOS
                    </span>
                </div>

                <div className="grid grid-cols-6 mx-1 border border-slate-300">
                    {[
                        { label: 'TAT/T.T', value: part.ttTat },
                        { label: 'TSO', value: part.tso },
                        { label: 'T.REM', value: part.trem },
                        { label: 'TC', value: part.tc },
                        { label: 'CSO', value: part.cso },
                        { label: 'C.REM', value: part.crem }
                    ].map((item, idx) => (
                        <div
                            key={item.label}
                            className={`flex flex-col ${idx < 5 ? 'border-r border-slate-200' : ''}`}
                        >
                            <div className="bg-slate-100 text-center py-0.5 border-b border-slate-200">
                                <span className="text-[5px] font-bold text-slate-600 uppercase">{item.label}</span>
                            </div>
                            <div className="bg-white text-center py-1.5">
                                <span className="text-[9px] font-black font-mono text-slate-900">
                                    {item.value || '---'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* BLOCK 04: Condition & Status */}
                <div className="px-2 py-0.5 mt-1" style={{ backgroundColor: scheme.headerBg }}>
                    <span className="text-[6px] font-black text-white uppercase tracking-widest">
                        04. CONDICIÓN
                    </span>
                </div>

                <div className="mx-1 border border-slate-300 bg-white p-1">
                    {part.tagColor === TagColor.YELLOW && (
                        <div className="flex items-center gap-2">
                            <span className="text-[6px] font-bold text-slate-500 uppercase">SHELF LIFE:</span>
                            <span className="text-[10px] font-black text-rose-600">{shelfLifeDate}</span>
                        </div>
                    )}
                    {part.tagColor === TagColor.RED && (
                        <div>
                            <span className="text-[6px] font-bold text-rose-600 uppercase">REJECTION REASON:</span>
                            <p className="text-[8px] font-bold text-slate-800 condensed-text leading-tight">
                                {part.rejectionReason || 'N/A'}
                            </p>
                        </div>
                    )}
                    {(part.tagColor === TagColor.GREEN || part.tagColor === TagColor.WHITE) && (
                        <div className="flex items-center gap-3">
                            <span className="text-[6px] font-bold text-slate-500 uppercase">REASON:</span>
                            <span className="text-[8px] font-bold text-slate-800">{part.removalReason || 'N/A'}</span>
                        </div>
                    )}
                </div>

                {/* BLOCK 05: Remarks & Signatures */}
                <div className="px-2 py-0.5 mt-1" style={{ backgroundColor: scheme.headerBg }}>
                    <span className="text-[6px] font-black text-white uppercase tracking-widest">
                        05. OBSERVACIONES Y FIRMAS
                    </span>
                </div>

                <div className="mx-1 border border-slate-300 bg-white p-1 min-h-[30px] mb-1">
                    <p className="text-[7px] text-slate-700 leading-tight condensed-text">
                        {part.observations || 'N/A'}
                    </p>
                </div>

                {/* Signatures - Compact */}
                <div className="mx-1 grid grid-cols-2 gap-1 mb-1">
                    {/* Technician */}
                    <div className="border border-slate-300 bg-white">
                        <div className="bg-slate-100 px-1 py-0.5 border-b border-slate-200">
                            <span className="text-[5px] font-bold text-slate-600 uppercase">TÉCNICO</span>
                        </div>
                        <div className="grid grid-cols-2 h-[35px]">
                            <div className="p-1 border-r border-slate-100">
                                <p className="text-[6px] font-bold text-slate-800 truncate">{part.technicianName || 'N/A'}</p>
                                <p className="text-[5px] text-slate-500">LIC: {part.technicianLicense || 'N/A'}</p>
                            </div>
                            <div className="flex items-center justify-center p-0.5">
                                {part.technicianSignature ? (
                                    <img src={part.technicianSignature} alt="Sig" className="max-h-[30px] w-auto" />
                                ) : (
                                    <span className="text-[5px] text-slate-300">FIRMA</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Inspector */}
                    <div className="border border-slate-300 bg-white">
                        <div className="bg-slate-100 px-1 py-0.5 border-b border-slate-200">
                            <span className="text-[5px] font-bold text-slate-600 uppercase">INSPECTOR</span>
                        </div>
                        <div className="grid grid-cols-2 h-[35px]">
                            <div className="p-1 border-r border-slate-100">
                                <p className="text-[6px] font-bold text-slate-800 truncate">{part.inspectorName || 'N/A'}</p>
                                <p className="text-[5px] text-slate-500">LIC: {part.inspectorLicense || 'N/A'}</p>
                            </div>
                            <div className="flex items-center justify-center p-0.5">
                                {part.inspectorSignature ? (
                                    <img src={part.inspectorSignature} alt="Stamp" className="max-h-[30px] w-auto" />
                                ) : (
                                    <span className="text-[5px] text-slate-300">SELLO</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="mx-1 px-2 py-1 flex items-center justify-between"
                    style={{ backgroundColor: scheme.headerBg }}
                >
                    <div className="flex items-center gap-2">
                        <img
                            src={qrDataUri}
                            alt="QR"
                            className="qr-code w-[25px] h-[25px] bg-white p-0.5"
                        />
                        <div>
                            <p className="text-[5px] text-slate-400 uppercase">RECORD ID</p>
                            <p className="text-[7px] font-mono font-bold text-white">{part.id}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[4px] text-slate-500 italic">DIGITALLY GENERATED</p>
                        <p className="text-[6px] text-white font-bold">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TechnicalCardPrint;

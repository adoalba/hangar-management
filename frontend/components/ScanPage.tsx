/**
 * ScanPage.tsx - Double-Scan Flow for Part Tracking
 * 4-Step Flow: Part Scan → Location Scan → Validation → Execution
 * Optimized for Android Tablets with touch-friendly UI
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AviationPart, TagColor, MovementEvent, User } from '../types';
import { ICONS } from '../constants';
import PrintTemplate from './PrintTemplate';
import QRScannerModal from './QRScannerModal';

interface ScanPageProps {
    recordId?: string;
    user: User;
    token: string;
    inventory: AviationPart[];
    onUpdatePart: (updatedPart: AviationPart) => Promise<boolean>;
    onClose: () => void;
    t: any;
}

// Valid locations by category
const LOCATION_CATEGORIES = {
    QUARANTINE: ['QUARANTINE', 'REJECTED AREA', 'DISPOSAL', 'HOLD AREA'],
    STORAGE: ['RACK 01', 'RACK 02', 'RACK A', 'RACK B', 'CONTAINER A', 'CONTAINER B', 'CONTAINER 01', 'CONTAINER 02'],
    HANGAR: ['HANGAR A', 'HANGAR B', 'SHIPPING AREA'],
};

const ALL_LOCATIONS = [
    ...LOCATION_CATEGORIES.HANGAR,
    ...LOCATION_CATEGORIES.STORAGE,
    ...LOCATION_CATEGORIES.QUARANTINE,
];

// Scan flow steps
type ScanStep = 'IDLE' | 'PART_IDENTIFIED' | 'LOCATION_SCANNED' | 'CONFIRMING' | 'SUCCESS';

const ScanPage: React.FC<ScanPageProps> = ({ recordId, user, token, inventory, onUpdatePart, onClose, t }) => {
    // Core state
    const [step, setStep] = useState<ScanStep>(recordId ? 'PART_IDENTIFIED' : 'IDLE');
    const [part, setPart] = useState<AviationPart | null>(null);
    const [targetLocation, setTargetLocation] = useState<string>('');
    const [customLocation, setCustomLocation] = useState<string>('');

    // Scanner state
    const [showScanner, setShowScanner] = useState(false);
    const [scanType, setScanType] = useState<'part' | 'location'>('part');

    // UI state
    const [isUpdating, setIsUpdating] = useState(false);
    const [showQuarantineWarning, setShowQuarantineWarning] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // Initialize with recordId if provided (from QR scan or direct link)
    useEffect(() => {
        if (recordId) {
            const foundPart = inventory.find(p => p.id === recordId);
            if (foundPart) {
                setPart(foundPart);
                setStep('PART_IDENTIFIED');
            }
        }
    }, [recordId, inventory]);

    // Tag color styles
    const getTagStyle = (tag?: TagColor) => {
        switch (tag) {
            case TagColor.YELLOW: return { bg: 'bg-yellow-500', text: 'text-yellow-950', border: 'border-yellow-600' };
            case TagColor.GREEN: return { bg: 'bg-emerald-500', text: 'text-emerald-950', border: 'border-emerald-600' };
            case TagColor.WHITE: return { bg: 'bg-slate-200', text: 'text-slate-900', border: 'border-slate-400' };
            case TagColor.RED: return { bg: 'bg-rose-500', text: 'text-rose-950', border: 'border-rose-600' };
            default: return { bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-600' };
        }
    };

    // Validation logic
    const isQuarantineZone = (loc: string) => {
        return LOCATION_CATEGORIES.QUARANTINE.some(zone => loc.toUpperCase().includes(zone));
    };

    const validateLocationChange = (loc: string): { valid: boolean; error?: string } => {
        if (!part) return { valid: false, error: 'No part selected' };

        // RED cards can ONLY go to quarantine zones
        if (part.tagColor === TagColor.RED && !isQuarantineZone(loc)) {
            return {
                valid: false,
                error: `RED (Rejected) parts can only be moved to: ${LOCATION_CATEGORIES.QUARANTINE.join(', ')}`
            };
        }

        return { valid: true };
    };

    // Handle QR scan result
    const handleScanResult = (decodedText: string, type: 'part' | 'location') => {
        setShowScanner(false);

        if (type === 'part') {
            // Extract record ID from URL or use as-is
            let partId = decodedText;

            // Try to extract ID from scan URL format: /inventario/scan/{id} or /#/scan/{id}
            const urlMatch = decodedText.match(/\/scan\/([a-zA-Z0-9-]+)/);
            if (urlMatch) {
                partId = urlMatch[1];
            }

            const foundPart = inventory.find(p => p.id === partId);
            if (foundPart) {
                setPart(foundPart);
                setStep('PART_IDENTIFIED');
                setValidationError(null);
            } else {
                setValidationError(`Part not found: ${partId}`);
            }
        } else if (type === 'location') {
            // Extract location code from URL or use as-is
            let locationCode = decodedText;

            // Try to extract from URL format: /location/{code}
            const urlMatch = decodedText.match(/\/location\/([A-Z0-9-]+)/i);
            if (urlMatch) {
                locationCode = urlMatch[1].toUpperCase();
            } else {
                locationCode = decodedText.toUpperCase();
            }

            setTargetLocation(locationCode);

            // Validate immediately
            const validation = validateLocationChange(locationCode);
            if (!validation.valid) {
                if (part?.tagColor === TagColor.RED) {
                    setShowQuarantineWarning(true);
                } else {
                    setValidationError(validation.error || 'Invalid location');
                }
            } else {
                setStep('LOCATION_SCANNED');
            }
        }
    };

    // Open scanner
    const openScanner = (type: 'part' | 'location') => {
        setScanType(type);
        setShowScanner(true);
    };

    // Select location (for quick buttons)
    const selectLocation = (loc: string) => {
        const validation = validateLocationChange(loc);

        if (!validation.valid) {
            if (part?.tagColor === TagColor.RED) {
                setTargetLocation(loc);
                setShowQuarantineWarning(true);
            } else {
                setValidationError(validation.error || 'Invalid location');
            }
            return;
        }

        setTargetLocation(loc);
        setStep('LOCATION_SCANNED');
        setValidationError(null);
    };

    // Confirm and execute location change - STRICT ASYNC SEQUENCE
    const executeLocationChange = async (bypassWarning = false) => {
        if (!part || !targetLocation) return;

        // Final validation
        const validation = validateLocationChange(targetLocation);
        if (!validation.valid && !bypassWarning) {
            setShowQuarantineWarning(true);
            return;
        }

        setShowQuarantineWarning(false);
        setIsUpdating(true);
        setStep('CONFIRMING');
        setValidationError(null);

        try {
            // STEP 1: Build movement event with complete data binding
            const movementEvent: MovementEvent = {
                id: `${Date.now()}-${user.id}`,
                timestamp: new Date().toISOString(),
                type: 'LOCATION_CHANGE',
                description: `Double-Scan move by ${user.name}`,
                previousLocation: part.location || 'UNASSIGNED',
                newLocation: targetLocation,
                userId: user.id,
                userName: user.name,
            };

            // STEP 2: Create updated part with NEW LOCATION bound
            const updatedPart: AviationPart = {
                ...part,
                location: targetLocation, // CRITICAL: New location bound here
                history: [...(part.history || []), movementEvent],
            };

            // STEP 3: Save to database and wait for server confirmation
            console.log('[SCAN] Saving to database...', { recordId: part.id, newLocation: targetLocation });
            const success = await onUpdatePart(updatedPart);

            if (!success) {
                throw new Error('Server failed to save location update');
            }

            console.log('[SCAN] Database save SUCCESS');

            // STEP 4: Update local state with confirmed data
            setPart(updatedPart);
            setIsUpdating(false);
            setStep('SUCCESS');

            // STEP 5: Trigger print with confirmed updated part (wait for UI to render)
            await triggerAutoPrint(updatedPart);

        } catch (error) {
            console.error('[SCAN] Location change failed:', error);
            setIsUpdating(false);
            setValidationError('Failed to update location. Please try again.');
            setStep('LOCATION_SCANNED');
        }
    };

    // Auto-print function with PRE-RENDERING and DOM wait
    const triggerAutoPrint = (updatedPart: AviationPart): Promise<void> => {
        return new Promise((resolve) => {
            console.log('[PRINT] Starting print process...', {
                partId: updatedPart.id,
                newLocation: updatedPart.location
            });

            setIsPrinting(true);

            const printSection = document.getElementById('print-section');
            if (!printSection) {
                console.error('[PRINT] Print section not found in DOM');
                setIsPrinting(false);
                resolve();
                return;
            }

            // Clear previous content
            printSection.innerHTML = '';

            // Set document title for PDF filename
            const tagLabel = updatedPart.tagColor || 'TAG';
            const cleanPN = (updatedPart.pn || 'N-A').replace(/[/\\?%*:|"<>]/g, '-');
            const cleanSN = (updatedPart.sn || 'N-A').replace(/[/\\?%*:|"<>]/g, '-');
            const dateStr = new Date().toISOString().split('T')[0];
            const oldTitle = document.title;
            document.title = `${tagLabel}_${cleanPN}_${cleanSN}_${dateStr}`;

            // STEP 1: Pre-render template with UPDATED part data
            const root = createRoot(printSection);
            root.render(<PrintTemplate part={updatedPart} t={t} />);

            console.log('[PRINT] Template rendered, waiting for QR and styles...');

            // STEP 2: Wait for images (QR codes) to load
            const waitForImages = (): Promise<void> => {
                return new Promise((imgResolve) => {
                    const images = printSection.querySelectorAll('img');
                    if (images.length === 0) {
                        imgResolve();
                        return;
                    }

                    let loadedCount = 0;
                    const totalImages = images.length;

                    const checkComplete = () => {
                        loadedCount++;
                        if (loadedCount >= totalImages) {
                            imgResolve();
                        }
                    };

                    images.forEach((img) => {
                        if (img.complete) {
                            checkComplete();
                        } else {
                            img.onload = checkComplete;
                            img.onerror = checkComplete; // Don't block on failed images
                        }
                    });

                    // Fallback timeout to prevent hanging
                    setTimeout(() => imgResolve(), 3000);
                });
            };

            // STEP 3: Wait for DOM render + images, then print
            setTimeout(async () => {
                await waitForImages();

                console.log('[PRINT] All assets loaded, invoking print...');

                // Additional delay for CSS paint
                await new Promise(r => setTimeout(r, 500));

                window.print();

                // Restore title and cleanup
                document.title = oldTitle;
                setIsPrinting(false);

                console.log('[PRINT] Print dialog closed');
                resolve();
            }, 800); // Initial delay for React to render
        });
    };

    // Reset to start new scan
    const resetScan = () => {
        setPart(null);
        setTargetLocation('');
        setCustomLocation('');
        setStep('IDLE');
        setValidationError(null);
        setShowQuarantineWarning(false);
    };

    const tagStyle = part ? getTagStyle(part.tagColor) : getTagStyle();

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* QR Scanner Modal */}
            <QRScannerModal
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScanResult}
                scanType={scanType}
                t={t}
            />

            {/* Quarantine Warning Modal */}
            {showQuarantineWarning && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-8 max-w-md text-center">
                        <ICONS.AlertTriangle size={64} className="text-rose-500 mx-auto mb-4" />
                        <h2 className="text-xl font-black text-rose-400 uppercase mb-2">Quarantine Warning</h2>
                        <p className="text-sm text-slate-400 mb-6">
                            This is a <span className="font-black text-rose-500">REJECTED (RED)</span> component.
                            Moving to <span className="font-black text-white">{targetLocation}</span> is not an authorized quarantine zone.
                        </p>
                        <p className="text-xs text-rose-300 mb-6 font-bold uppercase">
                            Authorized Zones: {LOCATION_CATEGORIES.QUARANTINE.join(', ')}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowQuarantineWarning(false)}
                                className="flex-1 px-6 py-4 bg-slate-700 text-white rounded-2xl font-black uppercase text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => executeLocationChange(true)}
                                className="flex-1 px-6 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-sm"
                            >
                                Override & Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Processing / Printing Overlay */}
            {(isPrinting || isUpdating) && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
                    <div className="text-center max-w-sm">
                        {/* Spinner */}
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
                            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <div className="absolute inset-3 border-4 border-emerald-500/20 rounded-full" />
                            <div className="absolute inset-3 border-4 border-emerald-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse' }} />
                        </div>

                        {/* Status Text */}
                        <h3 className="text-xl font-black text-white uppercase mb-2">
                            {isUpdating && !isPrinting && 'Saving Movement...'}
                            {isPrinting && 'Generating Tag...'}
                        </h3>

                        {/* Progress Steps */}
                        <div className="space-y-2 mt-4">
                            <div className={`flex items-center gap-3 justify-center ${!isUpdating ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {!isUpdating ? <ICONS.Yellow size={16} /> : <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                                <span className="text-xs font-bold uppercase">1. Saving to Database</span>
                            </div>
                            <div className={`flex items-center gap-3 justify-center ${isPrinting ? 'text-indigo-400' : 'text-slate-600'}`}>
                                {isPrinting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <div className="w-4 h-4 border border-current rounded-full" />}
                                <span className="text-xs font-bold uppercase">2. Rendering Template</span>
                            </div>
                            <div className="flex items-center gap-3 justify-center text-slate-600">
                                <div className="w-4 h-4 border border-current rounded-full" />
                                <span className="text-xs font-bold uppercase">3. Opening Print Dialog</span>
                            </div>
                        </div>

                        {/* Part Info */}
                        {part && (
                            <div className="mt-6 p-3 bg-slate-900 rounded-xl border border-slate-800">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Component</p>
                                <p className="text-sm font-black text-white">{part.pn} • {part.sn}</p>
                                {targetLocation && (
                                    <p className="text-xs font-bold text-emerald-400 mt-1">→ {targetLocation}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                    <h1 className="text-lg font-black text-white uppercase tracking-tight">
                        Double-Scan Terminal
                    </h1>
                </div>
                <button onClick={onClose} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700">
                    <ICONS.X size={20} className="text-slate-400" />
                </button>
            </div>

            {/* Step Indicator */}
            <div className="bg-slate-900/50 p-4 border-b border-slate-800">
                <div className="flex justify-between max-w-lg mx-auto">
                    {['PART', 'LOCATION', 'CONFIRM', 'DONE'].map((label, idx) => {
                        const stepOrder = ['IDLE', 'PART_IDENTIFIED', 'LOCATION_SCANNED', 'SUCCESS'];
                        const currentIdx = stepOrder.indexOf(step);
                        const isActive = idx <= currentIdx || (step === 'CONFIRMING' && idx <= 2);

                        return (
                            <div key={label} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
                                    }`}>
                                    {idx + 1}
                                </div>
                                <span className={`ml-2 text-xs font-bold uppercase ${isActive ? 'text-white' : 'text-slate-500'
                                    }`}>
                                    {label}
                                </span>
                                {idx < 3 && <div className={`w-8 h-0.5 mx-2 ${isActive ? 'bg-indigo-600' : 'bg-slate-800'}`} />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                {/* STEP: IDLE - No part selected */}
                {step === 'IDLE' && (
                    <div className="max-w-md mx-auto text-center py-12">
                        <ICONS.Scan size={80} className="text-indigo-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-black text-white uppercase mb-2">
                            Start Scanning
                        </h2>
                        <p className="text-slate-500 text-sm mb-8">
                            Scan the QR code on the component tag to begin
                        </p>

                        <button
                            onClick={() => openScanner('part')}
                            className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-lg uppercase tracking-wide flex items-center justify-center gap-3"
                        >
                            <ICONS.Camera size={28} />
                            Scan Part QR
                        </button>

                        {validationError && (
                            <div className="mt-6 p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl">
                                <p className="text-sm font-bold text-rose-400">{validationError}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP: PART_IDENTIFIED - Part found, select location */}
                {step === 'PART_IDENTIFIED' && part && (
                    <div className="max-w-lg mx-auto">
                        {/* Part Info Card */}
                        <div className={`p-6 rounded-3xl border-2 ${tagStyle.bg} ${tagStyle.border} mb-6`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest opacity-70 ${tagStyle.text}`}>
                                        Part Identified / Pieza Identificada
                                    </p>
                                    <h3 className={`text-2xl font-black uppercase ${tagStyle.text}`}>
                                        {part.partName}
                                    </h3>
                                </div>
                                <div className={`px-3 py-1 bg-black/20 rounded-xl ${tagStyle.text}`}>
                                    <span className="text-xs font-black uppercase">{part.tagColor}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/10 rounded-xl p-3">
                                    <p className={`text-[9px] font-bold uppercase opacity-70 ${tagStyle.text}`}>P/N</p>
                                    <p className={`text-sm font-black font-mono ${tagStyle.text}`}>{part.pn}</p>
                                </div>
                                <div className="bg-black/10 rounded-xl p-3">
                                    <p className={`text-[9px] font-bold uppercase opacity-70 ${tagStyle.text}`}>S/N</p>
                                    <p className={`text-sm font-black font-mono ${tagStyle.text}`}>{part.sn}</p>
                                </div>
                            </div>

                            <div className="mt-4 bg-black/10 rounded-xl p-3">
                                <p className={`text-[9px] font-bold uppercase opacity-70 ${tagStyle.text}`}>Current Location</p>
                                <p className={`text-lg font-black uppercase ${tagStyle.text}`}>
                                    {part.location || 'UNASSIGNED'}
                                </p>
                            </div>
                        </div>

                        {/* Location Selection */}
                        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ICONS.MapPin size={16} />
                                Step 2: Select Destination / Seleccionar Destino
                            </h4>

                            {/* Scan Location Button */}
                            <button
                                onClick={() => openScanner('location')}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-3 mb-4"
                            >
                                <ICONS.Camera size={20} />
                                Scan Location QR
                            </button>

                            <div className="text-center text-slate-600 text-xs font-bold uppercase mb-4">
                                — OR SELECT —
                            </div>

                            {/* Quick Location Buttons */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {ALL_LOCATIONS.map(loc => {
                                    const isQuarantine = LOCATION_CATEGORIES.QUARANTINE.includes(loc);
                                    const isCurrentLocation = loc === part.location;

                                    return (
                                        <button
                                            key={loc}
                                            onClick={() => selectLocation(loc)}
                                            disabled={isCurrentLocation}
                                            className={`p-3 rounded-xl text-xs font-black uppercase transition-all border ${isCurrentLocation
                                                ? 'bg-indigo-600 border-indigo-500 text-white cursor-not-allowed'
                                                : isQuarantine
                                                    ? 'bg-rose-950 border-rose-700 text-rose-400 hover:bg-rose-900 hover:text-white'
                                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                                                }`}
                                        >
                                            {loc}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom Location */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customLocation}
                                    onChange={(e) => setCustomLocation(e.target.value.toUpperCase())}
                                    placeholder="Custom Location..."
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm font-bold uppercase outline-none focus:border-indigo-500"
                                />
                                <button
                                    onClick={() => selectLocation(customLocation)}
                                    disabled={!customLocation}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm uppercase disabled:opacity-50"
                                >
                                    Set
                                </button>
                            </div>

                            {validationError && (
                                <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl">
                                    <p className="text-xs font-bold text-rose-400">{validationError}</p>
                                </div>
                            )}
                        </div>

                        {/* Reset button */}
                        <button
                            onClick={resetScan}
                            className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-bold text-xs uppercase"
                        >
                            Scan Different Part / Escanear Otra Pieza
                        </button>
                    </div>
                )}

                {/* STEP: LOCATION_SCANNED - Confirm move */}
                {step === 'LOCATION_SCANNED' && part && (
                    <div className="max-w-md mx-auto text-center py-8">
                        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
                            <ICONS.ArrowRightLeft size={48} className="text-amber-500 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-white uppercase mb-6">
                                Confirm Move / Confirmar Movimiento
                            </h3>

                            <div className="flex items-center justify-center gap-4 mb-8">
                                <div className="bg-slate-800 p-4 rounded-xl text-center">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">From</p>
                                    <p className="text-lg font-black text-white uppercase">
                                        {part.location || 'N/A'}
                                    </p>
                                </div>
                                <ICONS.ArrowRight size={24} className="text-indigo-500" />
                                <div className="bg-emerald-900/50 border border-emerald-600 p-4 rounded-xl text-center">
                                    <p className="text-[9px] font-bold text-emerald-400 uppercase">To</p>
                                    <p className="text-lg font-black text-emerald-300 uppercase">
                                        {targetLocation}
                                    </p>
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl ${tagStyle.bg} ${tagStyle.border} border mb-6`}>
                                <p className={`text-xs font-black uppercase ${tagStyle.text}`}>
                                    {part.pn} • {part.sn}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setTargetLocation('');
                                        setStep('PART_IDENTIFIED');
                                    }}
                                    className="flex-1 py-4 bg-slate-700 text-white rounded-2xl font-black uppercase text-sm"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => executeLocationChange()}
                                    disabled={isUpdating}
                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-sm disabled:opacity-50"
                                >
                                    {isUpdating ? 'Processing...' : 'Confirm & Print'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP: SUCCESS - Move completed */}
                {step === 'SUCCESS' && part && (
                    <div className="max-w-md mx-auto text-center py-8">
                        <div className={`p-8 rounded-3xl border-4 ${tagStyle.border} ${tagStyle.bg}`}>
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ICONS.Yellow size={48} className={tagStyle.text} />
                            </div>
                            <h3 className={`text-2xl font-black uppercase mb-2 ${tagStyle.text}`}>
                                Move Complete!
                            </h3>
                            <p className={`text-sm font-bold uppercase mb-6 ${tagStyle.text} opacity-80`}>
                                New tag printing...
                            </p>

                            <div className="bg-black/20 p-4 rounded-xl mb-6">
                                <p className={`text-[10px] font-bold uppercase opacity-70 ${tagStyle.text}`}>
                                    New Location
                                </p>
                                <p className={`text-xl font-black uppercase ${tagStyle.text}`}>
                                    {part.location}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={resetScan}
                                    className="flex-1 py-4 bg-black/20 text-white rounded-2xl font-black uppercase text-sm"
                                >
                                    New Scan
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 bg-white/20 text-white rounded-2xl font-black uppercase text-sm"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-slate-900 border-t border-slate-800 p-4 text-center">
                <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                    Double-Scan Terminal v2.0 • {part ? `ID: ${part.id}` : 'Ready'} • Auto-Print {isPrinting ? 'Active' : 'Enabled'}
                </p>
            </div>
        </div>
    );
};

export default ScanPage;

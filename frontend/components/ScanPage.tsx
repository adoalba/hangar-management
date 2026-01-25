import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AviationPart, TagColor, MovementEvent, User } from '../types';
import { ICONS } from '../constants';
import PrintTemplate from './PrintTemplate';

interface ScanPageProps {
    recordId: string;
    user: User;
    token: string;
    inventory: AviationPart[];
    onUpdatePart: (updatedPart: AviationPart) => Promise<boolean>;
    onClose: () => void;
    t: any;
}

const LIFECYCLE_STAGES = [
    { id: 'INCOMING', label: 'Incoming / Ingreso', color: 'bg-blue-500' },
    { id: 'CLEANING', label: 'Cleaning / Limpieza', color: 'bg-cyan-500' },
    { id: 'INSPECTION', label: 'Inspection / Inspección', color: 'bg-amber-500' },
    { id: 'STORAGE', label: 'Storage / Almacenamiento', color: 'bg-emerald-500' },
    { id: 'SHIPPING', label: 'Shipping / Envío', color: 'bg-purple-500' },
];

const QUICK_LOCATIONS = [
    'HANGAR A', 'HANGAR B', 'RACK 01', 'RACK 02', 'CONTAINER A', 'CONTAINER B', 'SHIPPING AREA', 'QUARANTINE'
];

// Authorized quarantine zones for RED (Rejected) cards
const QUARANTINE_ZONES = ['QUARANTINE', 'REJECTED AREA', 'DISPOSAL', 'HOLD AREA'];

const ScanPage: React.FC<ScanPageProps> = ({ recordId, user, token, inventory, onUpdatePart, onClose, t }) => {
    const [part, setPart] = useState<AviationPart | null>(null);
    const [newLocation, setNewLocation] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null);
    const [showQuarantineWarning, setShowQuarantineWarning] = useState(false);
    const [pendingLocation, setPendingLocation] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        // Find part by ID
        const foundPart = inventory.find(p => p.id === recordId);
        if (foundPart) {
            setPart(foundPart);
            setNewLocation(foundPart.location || '');
        }
    }, [recordId, inventory]);

    const getTagStyle = (tag?: TagColor) => {
        switch (tag) {
            case TagColor.YELLOW: return 'bg-yellow-500 text-yellow-950 border-yellow-600';
            case TagColor.GREEN: return 'bg-emerald-500 text-emerald-950 border-emerald-600';
            case TagColor.WHITE: return 'bg-slate-200 text-slate-900 border-slate-400';
            case TagColor.RED: return 'bg-rose-500 text-rose-950 border-rose-600';
            default: return 'bg-indigo-500 text-white';
        }
    };

    // Auto-print function
    const triggerAutoPrint = (updatedPart: AviationPart) => {
        setIsPrinting(true);
        const printSection = document.getElementById('print-section');
        if (printSection) {
            printSection.innerHTML = '';
            const root = createRoot(printSection);

            // Aviation Standard Filename
            const tagLabel = updatedPart.tagColor || 'TAG';
            const cleanPN = (updatedPart.pn || 'N-A').replace(/[/\\?%*:|"<>]/g, '-');
            const cleanSN = (updatedPart.sn || 'N-A').replace(/[/\\?%*:|"<>]/g, '-');
            const dateStr = new Date().toISOString().split('T')[0];
            const oldTitle = document.title;
            document.title = `${tagLabel}_${cleanPN}_${cleanSN}_${dateStr}`;

            root.render(<PrintTemplate part={updatedPart} t={t} />);

            setTimeout(() => {
                window.print();
                document.title = oldTitle;
                setIsPrinting(false);
            }, 1000);
        }
    };

    // Check if location is a valid quarantine zone
    const isQuarantineZone = (loc: string) => {
        return QUARANTINE_ZONES.some(zone => loc.toUpperCase().includes(zone));
    };

    const handleLocationChange = async (loc: string, bypassWarning = false) => {
        if (!part || !user) return;

        // RED CARD SAFETY CHECK
        if (part.tagColor === TagColor.RED && !isQuarantineZone(loc) && !bypassWarning) {
            setShowQuarantineWarning(true);
            setPendingLocation(loc);
            return;
        }

        setShowQuarantineWarning(false);
        setPendingLocation(null);
        setIsUpdating(true);
        setUpdateSuccess(null);

        const movementEvent: MovementEvent = {
            id: `${Date.now()}-${user.id}`,
            timestamp: new Date().toISOString(),
            type: 'LOCATION_CHANGE',
            description: `Quick-Action move by ${user.name}`,
            previousLocation: part.location,
            newLocation: loc,
            userId: user.id,
            userName: user.name,
        };

        const updatedPart: AviationPart = {
            ...part,
            location: loc,
            history: [...(part.history || []), movementEvent],
        };

        const success = await onUpdatePart(updatedPart);
        setIsUpdating(false);
        setUpdateSuccess(success);

        if (success) {
            setPart(updatedPart);
            setNewLocation(loc);

            // AUTO-PRINT: Trigger print after successful update
            setTimeout(() => {
                triggerAutoPrint(updatedPart);
            }, 500);
        }
    };

    const confirmQuarantineBypass = () => {
        if (pendingLocation) {
            handleLocationChange(pendingLocation, true);
        }
    };

    const cancelQuarantineBypass = () => {
        setShowQuarantineWarning(false);
        setPendingLocation(null);
    };

    if (!part) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 text-center">
                    <ICONS.XCircle size={64} className="text-rose-500 mx-auto mb-4" />
                    <h1 className="text-xl font-black text-white uppercase">Component Not Found</h1>
                    <p className="text-slate-500 text-sm mt-2">Record ID: {recordId}</p>
                    <button onClick={onClose} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-sm">
                        Return
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4 flex flex-col">
            {/* QUARANTINE WARNING MODAL */}
            {showQuarantineWarning && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-8 max-w-md text-center">
                        <ICONS.AlertTriangle size={64} className="text-rose-500 mx-auto mb-4" />
                        <h2 className="text-xl font-black text-rose-400 uppercase mb-2">Quarantine Warning</h2>
                        <p className="text-sm text-slate-400 mb-6">
                            This is a <span className="font-black text-rose-500">REJECTED (RED)</span> component.
                            Moving to <span className="font-black text-white">{pendingLocation}</span> is not an authorized quarantine zone.
                        </p>
                        <p className="text-xs text-rose-300 mb-6 font-bold uppercase">
                            Authorized Zones: {QUARANTINE_ZONES.join(', ')}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={cancelQuarantineBypass}
                                className="flex-1 px-6 py-4 bg-slate-700 text-white rounded-2xl font-black uppercase text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmQuarantineBypass}
                                className="flex-1 px-6 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-sm"
                            >
                                Override & Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINTING OVERLAY */}
            {isPrinting && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg font-black text-white uppercase">Generating New Tag...</p>
                        <p className="text-xs text-slate-400 mt-2">Auto-printing updated component card</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-4 h-12 rounded-r ${getTagStyle(part.tagColor)}`}></div>
                    <div>
                        <h1 className="text-lg font-black text-white uppercase leading-tight">{part.partName}</h1>
                        <p className="text-[10px] font-mono text-indigo-400">P/N: {part.pn} | S/N: {part.sn}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-3 bg-slate-800 rounded-full">
                    <ICONS.X size={20} className="text-slate-400" />
                </button>
            </div>

            {/* Current Status Card */}
            <div className={`p-6 rounded-3xl border-2 ${getTagStyle(part.tagColor)} mb-6`}>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Current Location</p>
                        <p className="text-2xl font-black uppercase">{part.location || 'UNASSIGNED'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Tag</p>
                        <p className="text-lg font-black uppercase">{part.tagColor}</p>
                    </div>
                </div>
            </div>

            {/* Quick Action: Location Change */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 mb-6 flex-1">
                <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ICONS.MapPin size={16} />
                    Confirm & Generate New Tag / Confirmar y Generar
                </h2>

                {updateSuccess === true && (
                    <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl mb-4 flex items-center gap-3">
                        <ICONS.Yellow size={20} className="text-emerald-400" />
                        <div>
                            <p className="text-sm font-bold text-emerald-400">Location updated!</p>
                            <p className="text-xs text-emerald-300">New tag printing automatically...</p>
                        </div>
                    </div>
                )}

                {updateSuccess === false && (
                    <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl mb-4 flex items-center gap-3">
                        <ICONS.XCircle size={20} className="text-rose-400" />
                        <p className="text-sm font-bold text-rose-400">Update failed. Try again.</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    {QUICK_LOCATIONS.map(loc => (
                        <button
                            key={loc}
                            onClick={() => handleLocationChange(loc)}
                            disabled={isUpdating || loc === part.location}
                            className={`p-4 rounded-2xl text-xs font-black uppercase transition-all border ${loc === part.location
                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                    : loc === 'QUARANTINE'
                                        ? 'bg-rose-950 border-rose-700 text-rose-400 hover:bg-rose-900 hover:text-white'
                                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                                } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isUpdating ? '...' : loc}
                        </button>
                    ))}
                </div>

                {/* Custom Location Input */}
                <div className="mt-4 flex gap-2">
                    <input
                        type="text"
                        value={newLocation === part.location ? '' : newLocation}
                        onChange={(e) => setNewLocation(e.target.value.toUpperCase())}
                        placeholder="Custom Location..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm font-bold uppercase outline-none focus:border-indigo-500"
                    />
                    <button
                        onClick={() => handleLocationChange(newLocation)}
                        disabled={isUpdating || !newLocation || newLocation === part.location}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm uppercase disabled:opacity-50"
                    >
                        Set
                    </button>
                </div>
            </div>

            {/* Lifecycle Stages */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <h2 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ICONS.Activity size={16} />
                    Lifecycle Stage / Etapa
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {LIFECYCLE_STAGES.map(stage => (
                        <button
                            key={stage.id}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap ${stage.color} text-white/90`}
                        >
                            {stage.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer Meta */}
            <div className="mt-6 text-center">
                <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                    Quick-Action Terminal • ID: {part.id} • Auto-Print Enabled
                </p>
            </div>
        </div>
    );
};

export default ScanPage;

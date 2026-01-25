/**
 * QRScannerModal.tsx - In-App QR Scanner using Webcam API
 * Preserves session state by running inside a modal overlay
 * Supports flash toggle and visual frame guide
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ICONS } from '../constants';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string, type: 'part' | 'location') => void;
    scanType: 'part' | 'location';
    t: any;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({
    isOpen,
    onClose,
    onScan,
    scanType,
    t
}) => {
    const [error, setError] = useState<string | null>(null);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [hasFlash, setHasFlash] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (e) {
                // Scanner might already be stopped
            }
            scannerRef.current = null;
        }
        setIsScanning(false);
    }, []);

    const startScanner = useCallback(async () => {
        if (!containerRef.current || scannerRef.current) return;

        setError(null);
        const scannerId = 'qr-scanner-region';

        try {
            const html5QrCode = new Html5Qrcode(scannerId);
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            await html5QrCode.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    // Successfully scanned
                    stopScanner();
                    onScan(decodedText, scanType);
                },
                (errorMessage) => {
                    // QR code not found - this is normal, keep scanning
                }
            );

            setIsScanning(true);

            // Check for flash support
            const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
            if (capabilities && capabilities.torchFeature && capabilities.torchFeature().isSupported()) {
                setHasFlash(true);
            }
        } catch (err: any) {
            console.error('Scanner error:', err);
            if (err.toString().includes('Permission denied')) {
                setError('Camera access denied. Please allow camera permissions.');
            } else if (err.toString().includes('NotFoundError')) {
                setError('No camera found on this device.');
            } else {
                setError(`Scanner error: ${err.message || err}`);
            }
        }
    }, [onScan, scanType, stopScanner]);

    const toggleFlash = async () => {
        if (!scannerRef.current || !hasFlash) return;

        try {
            const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
            if (capabilities && capabilities.torchFeature) {
                const newState = !isFlashOn;
                await capabilities.torchFeature().apply(newState);
                setIsFlashOn(newState);
            }
        } catch (e) {
            console.error('Flash toggle failed:', e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                startScanner();
            }, 300);
            return () => clearTimeout(timer);
        } else {
            stopScanner();
        }
    }, [isOpen, startScanner, stopScanner]);

    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, [stopScanner]);

    if (!isOpen) return null;

    const scanLabel = scanType === 'part'
        ? 'SCAN PART QR / ESCANEAR QR DE PIEZA'
        : 'SCAN LOCATION QR / ESCANEAR QR DE UBICACIÓN';

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${scanType === 'part' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">
                        {scanLabel}
                    </h2>
                </div>
                <button
                    onClick={() => {
                        stopScanner();
                        onClose();
                    }}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-colors"
                >
                    <ICONS.X size={20} className="text-white" />
                </button>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 flex items-center justify-center p-4" ref={containerRef}>
                <div className="relative w-full max-w-md">
                    {/* Visual Frame Guide */}
                    <div className="absolute inset-0 pointer-events-none z-10">
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-indigo-500" />
                        <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-indigo-500" />
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-indigo-500" />
                        <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-indigo-500" />

                        {/* Scanning line animation */}
                        {isScanning && (
                            <div className="absolute inset-x-4 h-0.5 bg-indigo-500/50 animate-scan"
                                style={{ animation: 'scan 2s linear infinite' }} />
                        )}
                    </div>

                    {/* QR Scanner Container */}
                    <div
                        id="qr-scanner-region"
                        className="w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden"
                    />

                    {/* Error Message */}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 rounded-2xl">
                            <div className="text-center p-6">
                                <ICONS.XCircle size={48} className="text-rose-500 mx-auto mb-4" />
                                <p className="text-sm font-bold text-rose-400">{error}</p>
                                <button
                                    onClick={() => {
                                        setError(null);
                                        startScanner();
                                    }}
                                    className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase"
                                >
                                    Retry / Reintentar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="flex justify-center gap-4">
                    {/* Flash Toggle */}
                    {hasFlash && (
                        <button
                            onClick={toggleFlash}
                            className={`p-4 rounded-2xl font-bold text-xs uppercase flex items-center gap-2 transition-all ${isFlashOn
                                    ? 'bg-amber-500 text-amber-950'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            <ICONS.Zap size={20} />
                            Flash {isFlashOn ? 'ON' : 'OFF'}
                        </button>
                    )}

                    {/* Manual Entry Option */}
                    <button
                        onClick={() => {
                            stopScanner();
                            onClose();
                        }}
                        className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 font-bold text-xs uppercase flex items-center gap-2"
                    >
                        <ICONS.Edit size={20} />
                        Manual Entry / Entrada Manual
                    </button>
                </div>

                {/* Instructions */}
                <p className="text-center text-slate-500 text-xs mt-4 uppercase tracking-wider">
                    {scanType === 'part'
                        ? 'Point camera at the QR code on the component tag'
                        : 'Point camera at the location label QR code'}
                </p>
            </div>

            {/* CSS for scan animation */}
            <style>{`
        @keyframes scan {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
      `}</style>
        </div>
    );
};

export default QRScannerModal;

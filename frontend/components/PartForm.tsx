
import React, { useState, useRef, useEffect } from 'react';
import { TagColor, AviationPart, RemovalReason } from '../types';
import { ICONS, BILINGUAL_LABELS, TRANSLATIONS } from '../constants';

interface SignaturePadProps {
  label: string;
  onSave: (signature: string | undefined) => void;
  initialValue?: string;
  t: any;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ label, onSave, initialValue, t }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(!!initialValue);

  const resizeCanvas = () => {
    if (canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const tempImage = canvas.toDataURL();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      if (ctx && (hasContent || initialValue)) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = tempImage !== 'data:,' ? tempImage : (initialValue || '');
      }
    }
  };

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    const timer = setTimeout(resizeCanvas, 100);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearTimeout(timer);
    };
  }, []);

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#818cf8';

    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasContent(true);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const signatureData = canvasRef.current?.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-[9px] font-black text-slate-100 uppercase tracking-widest">{label}</label>
        {hasContent && (
          <button type="button" onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
            setHasContent(false);
            onSave(undefined);
          }} className="text-[10px] font-bold text-rose-400 uppercase p-1">
            {t.clear}
          </button>
        )}
      </div>
      <div ref={containerRef} className="relative h-32 md:h-40 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden touch-none shadow-inner" style={{ touchAction: 'none' }}>
        <canvas ref={canvasRef} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerLeave={stopDrawing} className="w-full h-full cursor-crosshair" />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-700 text-[10px] uppercase font-black tracking-widest flex-col gap-2">
            <ICONS.Edit size={16} /> {t.sign_here}
          </div>
        )}
      </div>
    </div>
  );
};


const FormInput = ({ label, value, onChange, t, type = "text", inputMode = "text", placeholder = "", options = [] }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-100 uppercase tracking-widest ml-1">{label}</label>
    {type === "select" ? (
      <select
        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base font-bold transition-all appearance-none"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t.language === 'EN' ? 'Select...' : 'Seleccione...'}</option>
        {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    ) : (
      <input
        type={type}
        inputMode={inputMode}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base font-bold transition-all placeholder:text-slate-600"
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()} // Auto-select content for quick replacement
      />
    )}
  </div>
);

const PartForm: React.FC<{ tag: TagColor; initialData?: AviationPart; onSubmit: (data: Partial<AviationPart>) => void; onCancel: () => void; t: any; }> = ({ tag, initialData, onSubmit, onCancel, t }) => {
  const [formData, setFormData] = useState<Partial<AviationPart>>({
    partName: '', pn: '', sn: '', brand: '', model: '', ttTat: '', tso: '', trem: '', tc: '', cso: '', crem: '',
    technicianName: '', technicianLicense: '', inspectorName: '', inspectorLicense: '',
    removalReason: undefined,
    registrationDate: new Date().toISOString().split('T')[0],
    organization: 'World Class Aviation',
    companyAddress: '1130 Dividend Ct, Peachtree City, Georgia 30269',
    companyPhone: '(770) 631-1961',
    companyEmail: 'ops@worldclassaviation.com'
  });

  const [photo, setPhoto] = useState<string | null>(null);
  const [techSig, setTechSig] = useState<string | undefined>(undefined);
  const [inspSig, setInspSig] = useState<string | undefined>(undefined);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Focus first input on mount
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
      setPhoto(initialData.photo || null);
      setTechSig(initialData.technicianSignature);
      setInspSig(initialData.inspectorSignature);
    }
    // Auto-focus logic would go here if we had direct ref access to the input
  }, [initialData]);

  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(e => {
          console.error("Video play failed:", e);
          setCameraError("Error al iniciar flujo de video.");
        });
      };
    }
  }, [isCameraActive, cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const optimizeImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_W = 1200; // Increased for better detail in aviation parts
        const MAX_H = 1200;
        let w = img.width;
        let h = img.height;

        if (w > h) {
          if (w > MAX_W) { h *= MAX_W / w; w = MAX_W; }
        } else {
          if (h > MAX_H) { w *= MAX_H / h; h = MAX_H; }
        }

        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
        }
        // 0.7 quality provides excellent balance for technical photos
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = dataUrl;
    });
  };

  const startCamera = async () => {
    setCameraError(null);
    const isSecure = window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'https:';

    if (!isSecure) {
      setCameraError("Acceso denegado: Se requiere HTTPS o Localhost.");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("API de cámara no disponible.");
      return;
    }

    try {
      // Improved constraints for mobile devices
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      // Fallback for some mobile browsers that might fail with precise constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(fallbackStream);
        setIsCameraActive(true);
      } catch (fallbackErr: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError("Permiso de cámara denegado.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError("Cámara no detectada.");
        } else {
          setCameraError(`Error: ${err.message || "Fallo de hardware"}`);
        }
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capture = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const optimized = await optimizeImage(canvas.toDataURL('image/jpeg', 0.9));
      setPhoto(optimized);
      stopCamera();
    }
  };

  const greenCardReasons = [
    { label: t.reason_failure, value: 'FAILURE' },
    { label: t.reason_time, value: 'TIME' },
    { label: t.reason_condition, value: 'CONDITION' },
    { label: t.reason_other, value: 'OTHER' },
  ];

  const whiteCardReasons = [
    { label: t.reason_storage, value: 'STORAGE' },
    { label: t.reason_troubleshooting, value: 'TROUBLESHOOTING' },
    { label: t.reason_assistance, value: 'ASSISTANCE' },
    { label: t.reason_other, value: 'OTHER' },
  ];

  return (
    <div className={`max-w-4xl mx-auto bg-slate-950 border-2 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 ${tag === TagColor.YELLOW ? 'border-yellow-500' : tag === TagColor.GREEN ? 'border-emerald-500' : tag === TagColor.WHITE ? 'border-slate-300' : 'border-rose-500'}`}>
      <div className={`p-5 text-center font-black text-xl uppercase tracking-widest flex items-center justify-center gap-4 ${tag === TagColor.WHITE ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'}`}>
        <ICONS.ShieldCheck size={24} />
        {t[`${tag.toLowerCase()}_tag` as keyof typeof t]}
      </div>

      <div className="p-6 md:p-10 space-y-10 custom-scrollbar max-h-[80vh] overflow-y-auto">
        <section className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 space-y-4">
            <div className="aspect-square bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-800 overflow-hidden relative group shadow-inner">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-10 px-4">
                    <button
                      onClick={stopCamera}
                      className="bg-slate-800 p-4 rounded-full shadow-2xl active:scale-90 transition-transform text-white border border-slate-700"
                    >
                      <ICONS.X size={20} />
                    </button>
                    <button
                      onClick={capture}
                      className="bg-indigo-600 p-5 rounded-full shadow-2xl active:scale-90 transition-transform text-white border-2 border-white/20"
                    >
                      <ICONS.Camera size={28} />
                    </button>
                  </div>
                </>
              ) : photo ? (
                <>
                  <img src={photo} className="w-full h-full object-cover" alt="Captured part" />
                  <button
                    onClick={startCamera}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-black uppercase tracking-widest text-white"
                  >
                    {t.retake_photo}
                  </button>
                </>
              ) : (
                <button onClick={startCamera} className="w-full h-full flex flex-col items-center justify-center text-slate-700 hover:text-indigo-500 transition-all p-6 text-center">
                  {cameraError ? (
                    <>
                      <ICONS.AlertTriangle size={48} className="text-rose-500 mb-2" />
                      <span className="text-[10px] font-black uppercase text-rose-500 mb-2 px-2 leading-tight">{cameraError}</span>
                      <span className="text-[8px] font-bold text-slate-100 uppercase underline mt-2">Reintentar Acceso</span>
                    </>
                  ) : (
                    <>
                      <ICONS.Camera size={56} />
                      <span className="text-[10px] font-black uppercase tracking-widest mt-4">{t.upload_photo}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormInput t={t} label={t.form.part_name} value={formData.partName} onChange={(v: string) => setFormData({ ...formData, partName: v })} />
            <FormInput t={t} label={t.form.pn} value={formData.pn} onChange={(v: string) => setFormData({ ...formData, pn: v })} />
            <FormInput t={t} label={t.form.sn} value={formData.sn} onChange={(v: string) => setFormData({ ...formData, sn: v })} />
            <FormInput t={t} label={t.form.brand} value={formData.brand} onChange={(v: string) => setFormData({ ...formData, brand: v })} />
            <FormInput t={t} label={t.form.model} value={formData.model} onChange={(v: string) => setFormData({ ...formData, model: v })} />
            <FormInput t={t} label={t.form.date} value={formData.registrationDate} type="date" onChange={(v: string) => setFormData({ ...formData, registrationDate: v })} />
          </div>
        </section>

        <section className="p-8 bg-slate-900/50 rounded-[2.5rem] border border-slate-800 shadow-inner">
          <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <ICONS.Clock size={14} /> TIEMPOS Y CICLOS / TIMES & CYCLES
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {/* Using decimal inputMode for numeric fields to show numbers only */}
            <FormInput t={t} inputMode="decimal" label={t.form.tt} value={formData.ttTat} onChange={(v: string) => setFormData({ ...formData, ttTat: v })} placeholder="0.0" />
            <FormInput t={t} inputMode="decimal" label={t.form.tso} value={formData.tso} onChange={(v: string) => setFormData({ ...formData, tso: v })} placeholder="0.0" />
            <FormInput t={t} inputMode="decimal" label={t.form.trem} value={formData.trem} onChange={(v: string) => setFormData({ ...formData, trem: v })} placeholder="0.0" />
            <FormInput t={t} inputMode="numeric" label={t.form.tc} value={formData.tc} onChange={(v: string) => setFormData({ ...formData, tc: v })} placeholder="0" />
            <FormInput t={t} inputMode="numeric" label={t.form.cso} value={formData.cso} onChange={(v: string) => setFormData({ ...formData, cso: v })} placeholder="0" />
            <FormInput t={t} inputMode="numeric" label={t.form.crem} value={formData.crem} onChange={(v: string) => setFormData({ ...formData, crem: v })} placeholder="0" />
          </div>
        </section>

        <section className="p-8 bg-indigo-600/5 rounded-[2.5rem] border border-indigo-500/10">
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <ICONS.Database size={14} /> ATRIBUTOS DE CONDICIÓN / CONDITION ATTRIBUTES
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(tag === TagColor.YELLOW) && (
              <FormInput t={t} type="date" label={t.form.shelf_life} value={formData.shelfLife} onChange={(v: string) => setFormData({ ...formData, shelfLife: v })} />
            )}

            {(tag === TagColor.GREEN || tag === TagColor.WHITE || tag === TagColor.RED) && (
              <>
                <FormInput t={t} label={t.form.ac_removed} value={formData.removedFromAC} onChange={(v: string) => setFormData({ ...formData, removedFromAC: v })} />
                {(tag === TagColor.GREEN || tag === TagColor.WHITE) && (
                  <FormInput t={t} label={t.form.position} value={formData.position} onChange={(v: string) => setFormData({ ...formData, position: v })} />
                )}
              </>
            )}

            {tag === TagColor.GREEN && (
              <>
                <FormInput
                  t={t}
                  type="select"
                  label={t.form.removal_reason}
                  value={formData.removalReason}
                  onChange={(v: any) => setFormData({ ...formData, removalReason: v })}
                  options={greenCardReasons}
                />
                <div className="md:col-span-2">
                  <FormInput t={t} label={t.form.report} value={formData.technicalReport} onChange={(v: string) => setFormData({ ...formData, technicalReport: v })} />
                </div>
              </>
            )}

            {tag === TagColor.WHITE && (
              <>
                <FormInput
                  t={t}
                  type="select"
                  label={t.form.removal_reason}
                  value={formData.removalReason}
                  onChange={(v: any) => setFormData({ ...formData, removalReason: v })}
                  options={whiteCardReasons}
                />
                <FormInput t={t} label={t.form.physical_location} value={formData.physicalStorageLocation} onChange={(v: string) => setFormData({ ...formData, physicalStorageLocation: v })} />
              </>
            )}

            {tag === TagColor.RED && (
              <>
                <FormInput t={t} label={t.form.rejection} value={formData.rejectionReason} onChange={(v: string) => setFormData({ ...formData, rejectionReason: v })} />
                <FormInput t={t} label={t.form.disposition} value={formData.finalDisposition} onChange={(v: string) => setFormData({ ...formData, finalDisposition: v })} />
              </>
            )}
            <div className="md:col-span-2">
              <FormInput t={t} label={t.form.observations} value={formData.observations} onChange={(v: string) => setFormData({ ...formData, observations: v })} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-slate-800">
          <div className="space-y-5">
            <h3 className="font-black text-xs tracking-widest uppercase text-indigo-400 flex items-center gap-2">
              <ICONS.User size={18} /> {t.form.technician}
            </h3>
            <FormInput t={t} label={t.form.name} value={formData.technicianName} onChange={(v: string) => setFormData({ ...formData, technicianName: v })} />
            <FormInput t={t} label={t.form.license} value={formData.technicianLicense} onChange={(v: string) => setFormData({ ...formData, technicianLicense: v })} />
            <SignaturePad label={t.form.signature} onSave={setTechSig} initialValue={techSig} t={t} />
          </div>
          <div className="space-y-5">
            <h3 className="font-black text-xs tracking-widest uppercase text-emerald-400 flex items-center gap-2">
              <ICONS.ShieldCheck size={18} /> {t.form.inspector}
            </h3>
            <FormInput t={t} label={t.form.name} value={formData.inspectorName} onChange={(v: string) => setFormData({ ...formData, inspectorName: v })} />
            <FormInput t={t} label={t.form.license} value={formData.inspectorLicense} onChange={(v: string) => setFormData({ ...formData, inspectorLicense: v })} />
            <SignaturePad label={t.form.signature} onSave={setInspSig} initialValue={inspSig} t={t} />
          </div>
        </section>

        <footer className="flex justify-between items-center pt-10 sticky bottom-0 bg-slate-950 py-4 border-t border-slate-800">
          <button onClick={onCancel} className="px-6 py-4 text-slate-100 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors">
            {t.cancel}
          </button>
          <button
            disabled={!formData.partName || !formData.pn}
            onClick={() => onSubmit({ ...formData, photo: photo || undefined, technicianSignature: techSig, inspectorSignature: inspSig })}
            className="flex items-center gap-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest px-10 py-5 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <ICONS.Printer size={22} /> {t.save_print}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PartForm;

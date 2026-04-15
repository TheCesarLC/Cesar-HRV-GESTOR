import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, isQuotaError } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit, where, getDocs, doc, getCountFromServer, getDocsFromServer } from 'firebase/firestore';
import { toast } from 'sonner';
import { UserPlus, History, User as UserIcon, MapPin, Phone, Camera, X, Rocket } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { FALLBACK_SECTIONS } from '../constants/sections';

export default function Dashboard({ user, isAdmin }: { user: any, isAdmin: boolean }) {
  const [personName, setPersonName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [ineFront, setIneFront] = useState<string | null>(null);
  const [ineBack, setIneBack] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>(FALLBACK_SECTIONS);
  const [dashboardOrder, setDashboardOrder] = useState(['welcome', 'form', 'activity']);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
  const TOTAL_SECTIONS = 188;

  useEffect(() => {
    const fetchInitialCount = async () => {
      try {
        const coll = collection(db, 'registrations');
        const snapshot = await getCountFromServer(coll);
        setRegistrationCount(snapshot.data().count);
      } catch (e: any) {
        if (!isQuotaError(e)) console.error("Dashboard initial count error:", e);
        try {
          const snap = await getDocs(collection(db, 'registrations'));
          setRegistrationCount(snap.size);
        } catch (err: any) {
          if (!isQuotaError(err)) console.error("Dashboard fallback error:", err);
        }
      }
    };
    fetchInitialCount();

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (d) => {
      if (d.exists() && d.data().dashboardOrder) {
        setDashboardOrder(d.data().dashboardOrder);
      }
    }, (error) => {
      if (!isQuotaError(error)) console.error("Dashboard settings error:", error);
    });

    const qSections = query(collection(db, 'sections'), orderBy('order', 'asc'));
    const unsubSections = onSnapshot(qSections, (snap) => {
      if (!snap.empty) {
        setSections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }, (error) => {
      if (!isQuotaError(error)) handleFirestoreError(error, OperationType.LIST, 'sections');
    });

    const q = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      if (!isQuotaError(error)) handleFirestoreError(error, OperationType.LIST, 'registrations');
    });

    const unsubCount = onSnapshot(collection(db, 'registrations'), (snap) => {
      setRegistrationCount(snap.size);
    }, (error) => {
      if (!isQuotaError(error)) console.error("Dashboard count snapshot error:", error);
    });

    return () => {
      unsubSettings();
      unsubSections();
      unsubscribe();
      unsubCount();
    };
  }, []);

  const progressPercentage = Math.min((registrationCount / TOTAL_SECTIONS) * 100, 100).toFixed(2);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        if (side === 'front') setIneFront(base64);
        else setIneBack(base64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !sectionId || !phoneNumber || !ineFront || !ineBack) {
      toast.error('Por favor completa todos los campos y carga las fotos');
      return;
    }
    setLoading(true);
    const section = sections.find(s => s.id === sectionId);
    try {
      const q = query(collection(db, 'registrations'), where('sectionId', '==', sectionId), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast.error(`Esta seccion ya cuenta con un responsable: ${querySnapshot.docs[0].data().personName}`);
        setLoading(false);
        return;
      }
      await addDoc(collection(db, 'registrations'), {
        personName,
        phoneNumber,
        ineFrontUrl: ineFront,
        ineBackUrl: ineBack,
        sectionId,
        sectionName: section?.name || 'Desconocida',
        responsibleId: user.uid,
        responsibleEmail: user.email,
        createdAt: serverTimestamp()
      });
      toast.success('Registro exitoso');
      setPersonName(''); setPhoneNumber(''); setIneFront(null); setIneBack(null); setSectionId('');
    } catch (error: any) {
      if (!isQuotaError(error)) {
        handleFirestoreError(error, OperationType.CREATE, 'registrations');
        toast.error('Error al guardar el registro');
      } else {
        toast.error('Límite de cuota excedido. Intenta más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {dashboardOrder.map((item) => (
        <React.Fragment key={item}>
          {item === 'welcome' && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-bold text-neutral-900 mb-2">Bienvenido de nuevo</h2>
                <p className="text-neutral-500">Aquí tienes un resumen de tus secciones y recursos disponibles.</p>
                <p className="text-[10px] text-neutral-400 mt-1">Conectado como: {user?.email}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex-1 max-w-sm">
                <div className="flex justify-between items-end mb-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Avance del Territorio</span>
                      <button 
                        onClick={async () => {
                          try {
                            const coll = collection(db, 'registrations');
                            const snapshot = await getCountFromServer(coll);
                            setRegistrationCount(snapshot.data().count);
                            toast.success('Avance actualizado');
                          } catch (e) {
                            if (!isQuotaError(e)) console.error(e);
                          }
                        }}
                        className="p-1 hover:bg-neutral-100 rounded-full transition-colors"
                      >
                        <Rocket className="w-3 h-3 text-neutral-400" />
                      </button>
                    </div>
                    <span className="text-2xl font-black text-red-600">{progressPercentage}%</span>
                    <button 
                      onClick={async () => {
                        const tid = toast.loading('Sincronizando...');
                        try {
                          const snap = await getDocsFromServer(collection(db, 'registrations'));
                          setRegistrationCount(snap.size);
                          toast.success('Sincronizado', { id: tid });
                        } catch (e) {
                          toast.error('Error', { id: tid });
                        }
                      }}
                      className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700 underline text-left"
                    >
                      Forzar sincronización (Chrome Fix)
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-neutral-900">{registrationCount}</span>
                    <span className="text-xs text-neutral-400"> / {TOTAL_SECTIONS}</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-red-50 rounded-full overflow-hidden border border-red-50">
                  <motion.div 
                    className="h-full bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                    style={{ width: `${progressPercentage}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          {item === 'form' && (
            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-100 p-2 rounded-lg"><UserPlus className="text-indigo-600 w-5 h-5" /></div>
                <h2 className="text-xl font-bold text-neutral-900">Registrar responsable de sección</h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Nombre <span className="text-red-500">*</span></label>
                    <input type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Teléfono <span className="text-red-500">*</span></label>
                    <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Sección <span className="text-red-500">*</span></label>
                    <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="">Selecciona...</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-neutral-700">INE Frontal <span className="text-red-500">*</span></label>
                    <div className="relative aspect-video rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden">
                      {ineFront ? (
                        <>
                          <img src={ineFront} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setIneFront(null)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center"><Camera className="w-8 h-8 text-neutral-400" /><span className="text-sm text-neutral-500">Subir Frontal</span><input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'front')} /></label>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-neutral-700">INE Reverso <span className="text-red-500">*</span></label>
                    <div className="relative aspect-video rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden">
                      {ineBack ? (
                        <>
                          <img src={ineBack} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setIneBack(null)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center"><Camera className="w-8 h-8 text-neutral-400" /><span className="text-sm text-neutral-500">Subir Reverso</span><input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'back')} /></label>
                      )}
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full md:w-auto bg-indigo-600 text-white font-bold py-4 px-10 rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Registrar responsable'}
                </button>
              </form>
            </div>
          )}
          {item === 'activity' && isAdmin && (
            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-amber-100 p-2 rounded-lg"><History className="text-amber-600 w-5 h-5" /></div>
                <h2 className="text-xl font-bold text-neutral-900">Actividad Reciente</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentRegistrations.length === 0 ? <p className="text-neutral-400 text-center py-10 italic col-span-full">No hay registros</p> : 
                  recentRegistrations.map(reg => (
                    <button 
                      key={reg.id} 
                      onClick={() => setSelectedRegistration(reg)}
                      className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-2 text-left hover:border-indigo-300 transition-colors group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-neutral-400 group-hover:text-indigo-500" />
                          <span className="font-bold text-neutral-800">{reg.personName}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400">{reg.createdAt?.toDate ? format(reg.createdAt.toDate(), 'HH:mm', { locale: es }) : 'Ahora'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600"><MapPin className="w-4 h-4 text-indigo-500" /><span>{reg.sectionName}</span></div>
                    </button>
                  ))
                }
              </div>
            </div>
          )}
        </React.Fragment>
      ))}

      {/* Modal de Detalles */}
      <AnimatePresence>
        {selectedRegistration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b border-neutral-100 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-neutral-900">Detalles del Registro</h3>
                <button onClick={() => setSelectedRegistration(null)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-neutral-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Info Responsable de Sección */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Responsable de Sección</span>
                    <p className="text-lg font-bold text-neutral-900">{selectedRegistration.personName}</p>
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Phone className="w-4 h-4" />
                      <span>{selectedRegistration.phoneNumber}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Sección</span>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedRegistration.sectionName}</span>
                    </div>
                  </div>
                </div>

                {/* Quien lo designó */}
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Designado por</span>
                  <p className="text-sm font-bold text-indigo-900">{selectedRegistration.responsibleEmail}</p>
                  <p className="text-[10px] text-indigo-400 mt-1">
                    Fecha: {selectedRegistration.createdAt?.toDate ? format(selectedRegistration.createdAt.toDate(), "PPPP 'a las' p", { locale: es }) : 'N/A'}
                  </p>
                </div>

                {/* Fotos INE */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Documentación (INE)</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-neutral-500">Frontal</p>
                      <div className="aspect-video rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100">
                        <img src={selectedRegistration.ineFrontUrl} alt="INE Frontal" className="w-full h-full object-contain" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-neutral-500">Reverso</p>
                      <div className="aspect-video rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100">
                        <img src={selectedRegistration.ineBackUrl} alt="INE Reverso" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-100 flex justify-end">
                <button 
                  onClick={() => setSelectedRegistration(null)}
                  className="px-6 py-2 bg-neutral-900 text-white rounded-xl font-bold text-sm hover:bg-neutral-800 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

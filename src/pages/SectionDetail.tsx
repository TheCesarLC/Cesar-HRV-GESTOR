import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, isQuotaError } from '../firebase';
import { doc, onSnapshot, collection, query, where, limit, getDoc } from 'firebase/firestore';
import { ChevronLeft, MapPin, User, Phone, FileText, ExternalLink, Image as ImageIcon, Video, FileSpreadsheet, Link as LinkIcon, LifeBuoy, Download, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FALLBACK_SECTIONS } from '../constants/sections';

export default function SectionDetail() {
  const { sectionId } = useParams();
  const [section, setSection] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId) return;

    setLoading(true);

    const unsubSection = onSnapshot(doc(db, 'sections', sectionId), (docSnap) => {
      if (docSnap.exists()) {
        setSection({ id: docSnap.id, ...docSnap.data() });
        setLoading(false);
      } else {
        // Si no existe en Firestore, buscamos en los fallbacks
        const fallback = FALLBACK_SECTIONS.find(s => s.id === sectionId);
        if (fallback) {
          setSection(fallback);
        } else {
          setSection(null);
        }
        setLoading(false);
      }
    }, (error) => {
      if (!isQuotaError(error)) {
        console.error("Error fetching section detail:", error);
      }
      // Fallback incluso en error de permisos/cuota
      const fallback = FALLBACK_SECTIONS.find(s => s.id === sectionId);
      if (fallback) setSection(fallback);
      setLoading(false);
    });

    const q = query(
      collection(db, 'registrations'),
      where('sectionId', '==', sectionId),
      limit(1)
    );

    const unsubReg = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setRegistration({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setRegistration(null);
      }
    }, (error) => {
      if (!isQuotaError(error)) {
        console.error("Error fetching section registration:", error);
      }
    });

    return () => {
      unsubSection();
      unsubReg();
    };
  }, [sectionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Sección no encontrada</h2>
        <Link to="/sections" className="text-indigo-600 font-bold hover:underline flex items-center justify-center gap-2">
          <ChevronLeft className="w-5 h-5" /> Volver al catálogo
        </Link>
      </div>
    );
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-500" />;
      case 'image': return <ImageIcon className="w-6 h-6 text-blue-500" />;
      case 'video': return <Video className="w-6 h-6 text-purple-500" />;
      case 'excel': return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />;
      default: return <LinkIcon className="w-6 h-6 text-indigo-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link to="/sections" className="inline-flex items-center gap-2 text-neutral-500 hover:text-indigo-600 transition-colors font-bold text-sm group">
        <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        VOLVER AL CATÁLOGO
      </Link>

      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-8 md:p-10 bg-indigo-600 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="text-indigo-100 font-bold tracking-widest uppercase text-xs">Sección Territorial</span>
              </div>
              <h1 className="text-4xl font-black">{section.name}</h1>
            </div>
            {registration && (
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-1">Estatus</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold">ASIGNADA</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 md:p-10 space-y-10">
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Descripción de la Sección</h3>
            <p className="text-neutral-600 leading-relaxed text-lg italic">
              "{section.description || 'Esta sección es parte fundamental de nuestra estrategia territorial.'}"
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-6">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Responsable Asignado</h3>
              {registration ? (
                <div className="bg-neutral-50 rounded-3xl p-6 border border-neutral-100 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-neutral-900">{registration.personName}</h4>
                      <p className="text-neutral-500 text-sm">Responsable de Sección</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <a 
                      href={`tel:${registration.phoneNumber}`}
                      className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-neutral-200 hover:border-indigo-300 transition-all group"
                    >
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Phone className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-neutral-700">{registration.phoneNumber}</span>
                    </a>
                    
                    <a 
                      href={`https://wa.me/52${registration.phoneNumber}?text=Hola ${registration.personName}, te contacto desde el Sistema Territorial...`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                    >
                      Enviar WhatsApp
                    </a>
                  </div>

                  <div className="pt-4 border-t border-neutral-200">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Documentación INE</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setPreviewImage(registration.ineFrontUrl)}
                        className="relative aspect-video rounded-xl overflow-hidden border border-neutral-200 group"
                      >
                        <img src={registration.ineFrontUrl} alt="INE Frontal" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="text-white w-6 h-6" />
                        </div>
                      </button>
                      <button 
                        onClick={() => setPreviewImage(registration.ineBackUrl)}
                        className="relative aspect-video rounded-xl overflow-hidden border border-neutral-200 group"
                      >
                        <img src={registration.ineBackUrl} alt="INE Reverso" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="text-white w-6 h-6" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 rounded-3xl p-10 border border-red-100 text-center space-y-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-red-900">Sin Responsable</h4>
                    <p className="text-red-600 text-sm">Esta sección aún no ha sido asignada.</p>
                  </div>
                  <Link 
                    to="/" 
                    className="inline-block px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                  >
                    Asignar Ahora
                  </Link>
                </div>
              )}
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Recursos de la Sección</h3>
              <div className="space-y-3">
                {section.files && section.files.length > 0 ? (
                  section.files.map((file: any, idx: number) => (
                    <div key={idx} className="p-4 bg-white rounded-2xl border border-neutral-200 flex items-center justify-between group hover:border-indigo-300 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-neutral-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                          {getFileIcon(file.type)}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">{file.name}</p>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{file.type}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Ver recurso"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                        <button 
                          onClick={() => window.open(file.url, '_blank')}
                          className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Descargar"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 bg-neutral-50 rounded-3xl border border-dashed border-neutral-200 text-center">
                    <p className="text-neutral-400 text-sm">No hay recursos adicionales para esta sección.</p>
                  </div>
                )}

                <div className="mt-8 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                  <div className="flex items-center gap-3 mb-4">
                    <LifeBuoy className="text-indigo-600 w-5 h-5" />
                    <h4 className="font-bold text-indigo-900">¿Necesitas ayuda?</h4>
                  </div>
                  <p className="text-sm text-indigo-700 mb-4">Si detectas algún error en la información de esta sección, contacta a soporte.</p>
                  <a 
                    href="https://wa.me/524434008893?text=Hola Hugo César, necesito ayuda con la sección..."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    Contactar a Hugo César
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-neutral-900/90 backdrop-blur-md flex items-center justify-center p-4 md:p-20"
            onClick={() => setPreviewImage(null)}
          >
            <button 
              className="absolute top-6 right-6 p-3 text-white hover:bg-white/10 rounded-full transition-colors"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

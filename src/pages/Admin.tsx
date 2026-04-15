import React, { useState, useEffect } from 'react';
import { db, isQuotaError } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, setDoc, getDocs, where } from 'firebase/firestore';
import { Settings, Users, List, Plus, Trash2, Save, Download, FileSpreadsheet, Archive, GripVertical, Palette, Layout as LayoutIcon, LogIn, Sidebar, ChevronDown, ChevronUp, X, Edit2, Check, ExternalLink, Image as ImageIcon, Video, FileText, Link as LinkIcon } from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const FONT_OPTIONS = [
  { name: 'Inter (Sans)', value: 'Inter, sans-serif' },
  { name: 'Outfit (Modern)', value: 'Outfit, sans-serif' },
  { name: 'Space Grotesk (Tech)', value: 'Space Grotesk, sans-serif' },
  { name: 'Playfair Display (Serif)', value: 'Playfair Display, serif' },
  { name: 'JetBrains Mono (Code)', value: 'JetBrains Mono, monospace' }
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState('settings');
  const [settings, setSettings] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (d) => {
      if (d.exists()) setSettings(d.data());
    }, (error) => { if (!isQuotaError(error)) console.error(error); });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => { if (!isQuotaError(error)) console.error(error); });

    const unsubSections = onSnapshot(query(collection(db, 'sections'), orderBy('order', 'asc')), (snap) => {
      setSections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => { if (!isQuotaError(error)) console.error(error); });

    const unsubRegs = onSnapshot(collection(db, 'registrations'), (snap) => {
      setRegistrations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => { if (!isQuotaError(error)) console.error(error); });

    return () => { unsubSettings(); unsubUsers(); unsubSections(); unsubRegs(); };
  }, []);

  const handleUpdateSettings = async (newSettings: any) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings, { merge: true });
      toast.success('Configuración actualizada');
    } catch (error) { toast.error('Error'); }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success('Rol actualizado');
    } catch (error) { toast.error('Error'); }
  };

  const handleExportExcel = () => {
    const data = registrations.map(reg => ({
      'Nombre': reg.personName,
      'Teléfono': reg.phoneNumber,
      'Sección': reg.sectionName,
      'Registrado por': reg.responsibleEmail,
      'Fecha': reg.createdAt?.toDate ? format(reg.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
    XLSX.writeFile(wb, `Registros_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const handleExportImages = async () => {
    const zip = new JSZip();
    const folder = zip.folder("INE_Images");
    registrations.forEach(reg => {
      if (reg.ineFrontUrl) folder?.file(`${reg.personName}_Front.jpg`, reg.ineFrontUrl.split(',')[1], { base64: true });
      if (reg.ineBackUrl) folder?.file(`${reg.personName}_Back.jpg`, reg.ineBackUrl.split(',')[1], { base64: true });
    });
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `INE_Images.zip`);
  };

  const handleAddSection = async () => {
    const name = prompt('Nombre:');
    if (!name) return;
    await setDoc(doc(collection(db, 'sections')), { name, order: sections.length, files: [] });
  };

  const handleReorderSections = async (newOrder: any[]) => {
    setSections(newOrder);
    const batch = writeBatch(db);
    newOrder.forEach((s, i) => batch.update(doc(db, 'sections', s.id), { order: i }));
    await batch.commit();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-neutral-900">Administración</h2>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button onClick={handleExportImages} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm"><Archive className="w-4 h-4" /> ZIP INEs</button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-neutral-100 rounded-2xl w-fit">
        {['settings', 'sections', 'users', 'registrations'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500'}`}>{tab}</button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
        {activeTab === 'settings' && settings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2"><Palette className="w-5 h-5 text-indigo-600" /> Visual</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-600 mb-2">Color Primario</label>
                  <div className="flex gap-3">
                    <input type="color" value={settings.primaryColor || '#4f46e5'} onChange={(e) => handleUpdateSettings({ primaryColor: e.target.value })} className="w-12 h-12 rounded-xl cursor-pointer" />
                    <input type="text" value={settings.primaryColor || '#4f46e5'} onChange={(e) => handleUpdateSettings({ primaryColor: e.target.value })} className="flex-1 px-4 py-2 rounded-xl border border-neutral-200 font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-600 mb-2">Tipografía</label>
                  <select value={settings.fontFamily || 'Inter, sans-serif'} onChange={(e) => handleUpdateSettings({ fontFamily: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white">
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2"><LayoutIcon className="w-5 h-5 text-indigo-600" /> Orden</h3>
              <div className="space-y-4">
                <p className="text-xs font-bold text-neutral-400 uppercase">Dashboard</p>
                <Reorder.Group axis="y" values={settings.dashboardOrder || ['welcome', 'form', 'activity']} onReorder={(o) => handleUpdateSettings({ dashboardOrder: o })} className="space-y-2">
                  {(settings.dashboardOrder || ['welcome', 'form', 'activity']).map((item: string) => (
                    <Reorder.Item key={item} value={item} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center gap-3 cursor-grab"><GripVertical className="w-4 h-4 text-neutral-400" /><span className="text-sm font-medium capitalize">{item}</span></Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sections' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-neutral-800">Secciones</h3><button onClick={handleAddSection} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm"><Plus className="w-4 h-4" /> Añadir</button></div>
            <Reorder.Group axis="y" values={sections} onReorder={handleReorderSections} className="space-y-3">
              {sections.map(s => (
                <Reorder.Item key={s.id} value={s} className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4"><GripVertical className="w-5 h-5 text-neutral-300" /><h4 className="font-bold text-neutral-800">{s.name}</h4></div>
                  <button onClick={async () => { if(confirm('Eliminar?')) await deleteDoc(doc(db, 'sections', s.id)); }} className="p-2 text-neutral-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b border-neutral-100"><th className="pb-4 font-bold text-neutral-400 text-xs uppercase">Usuario</th><th className="pb-4 font-bold text-neutral-400 text-xs uppercase">Rol</th><th className="pb-4 font-bold text-neutral-400 text-xs uppercase">Acciones</th></tr></thead>
              <tbody className="divide-y divide-neutral-50">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="py-4"><p className="font-bold text-neutral-800">{u.displayName || u.email}</p></td>
                    <td className="py-4"><select value={u.role || 'user'} onChange={(e) => handleUpdateUserRole(u.id, e.target.value)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-neutral-200"><option value="user">Usuario</option><option value="admin">Admin</option></select></td>
                    <td className="py-4"><button onClick={async () => { if(confirm('Eliminar?')) await deleteDoc(doc(db, 'users', u.id)); }} className="p-2 text-neutral-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b border-neutral-100"><th className="pb-4 font-bold text-neutral-400 text-xs uppercase">Persona</th><th className="pb-4 font-bold text-neutral-400 text-xs uppercase">Sección</th><th className="pb-4 font-bold text-neutral-400 text-xs uppercase">Designado por</th><th className="pb-4 font-bold text-neutral-400 text-xs uppercase">Acciones</th></tr></thead>
              <tbody className="divide-y divide-neutral-50">
                {registrations.map(r => (
                  <tr key={r.id} className="hover:bg-neutral-50 transition-colors group">
                    <td className="py-4">
                      <button onClick={() => setSelectedRegistration(r)} className="text-left">
                        <p className="font-bold text-neutral-800 group-hover:text-indigo-600 transition-colors">{r.personName}</p>
                        <p className="text-[10px] text-neutral-400">{r.phoneNumber}</p>
                      </button>
                    </td>
                    <td className="py-4"><span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">{r.sectionName}</span></td>
                    <td className="py-4"><p className="text-xs text-neutral-500">{r.responsibleEmail}</p></td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedRegistration(r)} className="p-2 text-neutral-400 hover:text-indigo-600"><ImageIcon className="w-4 h-4" /></button>
                        <button onClick={async () => { if(confirm('Eliminar?')) await deleteDoc(doc(db, 'registrations', r.id)); }} className="p-2 text-neutral-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Responsable de Sección</span>
                    <p className="text-lg font-bold text-neutral-900">{selectedRegistration.personName}</p>
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>{selectedRegistration.phoneNumber}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Sección</span>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold">
                      <LayoutIcon className="w-4 h-4" />
                      <span>{selectedRegistration.sectionName}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Designado por</span>
                  <p className="text-sm font-bold text-indigo-900">{selectedRegistration.responsibleEmail}</p>
                  <p className="text-[10px] text-indigo-400 mt-1">
                    ID: {selectedRegistration.responsibleId}
                  </p>
                  <p className="text-[10px] text-indigo-400 mt-1">
                    Fecha: {selectedRegistration.createdAt?.toDate ? format(selectedRegistration.createdAt.toDate(), "PPPP 'a las' p", { locale: es }) : 'N/A'}
                  </p>
                </div>

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

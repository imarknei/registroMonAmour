import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatBs, getRoomTypeLabel } from '../utils/formatUtils';
import { formatDateTime, formatTimeOnly } from '../utils/timeUtils';
import {
  X,
  DollarSign,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Lock,
  LogOut,
  UserCheck,
  Coins,
  ArrowRightLeft,
  BedDouble,
  Info,
  ShieldAlert,
  Edit3,
  Receipt,
  MinusCircle,
  Landmark,
  ShieldCheck,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import { SYSTEM_USERS } from '../data/initialData';

interface ShiftCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftCloseModal: React.FC<ShiftCloseModalProps> = ({ isOpen, onClose }) => {
  const { currentShift, currentUser, closeCurrentShift, rooms, staffMembers } = useApp();

  const [responsibleName, setResponsibleName] = useState<string>('');
  const [nextReceptionistName, setNextReceptionistName] = useState<string>('');
  const [totalPhysicalCash, setTotalPhysicalCash] = useState<string>('');
  const [declaredQrVendis, setDeclaredQrVendis] = useState<string>('');
  const [declaredQrUnion, setDeclaredQrUnion] = useState<string>('');
  const [handoverFloat, setHandoverFloat] = useState<string>('100');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Set default names based on active shift and next shift
  useEffect(() => {
    if (currentShift) {
      setResponsibleName(currentShift.responsiblePersonName || currentShift.receptionistName || currentUser.name);
      if (currentShift.initialCashFloat !== undefined) {
        setHandoverFloat(currentShift.initialCashFloat.toString());
      }
      // Suggest opposite receptionist as default next
      const defaultNext =
        currentShift.receptionistId === 'user-recep-dia'
          ? 'Recepcionista Noche'
          : 'Recepcionista Día';
      setNextReceptionistName(defaultNext);
    }
  }, [currentShift, currentUser]);

  if (!isOpen || !currentShift) return null;

  const numHandoverFloat = parseFloat(handoverFloat) || 0;
  const numTotalPhysicalCash = parseFloat(totalPhysicalCash) || 0;
  const numDeclaredQrVendis = parseFloat(declaredQrVendis) || 0;
  const numDeclaredQrUnion = parseFloat(declaredQrUnion) || 0;

  // Efectivo neto a retirar/entregar al administrador = Total contado en gaveta - Caja chica dejada
  const netCashToDeliver = Math.max(0, numTotalPhysicalCash - numHandoverFloat);
  const totalDeclaredGeneral = numTotalPhysicalCash + numDeclaredQrVendis + numDeclaredQrUnion;

  // Active rooms currently occupied during shift handover
  const occupiedRooms = rooms.filter((r) => r.status === 'ocupada' && r.currentStay);

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsibleName.trim()) {
      alert('Por favor ingrese el nombre de la persona que está entregando la caja.');
      return;
    }
    if (!nextReceptionistName.trim()) {
      alert('Por favor ingrese el nombre de la persona que está RECIBIENDO la caja para el siguiente turno.');
      return;
    }
    if (totalPhysicalCash.trim() === '') {
      alert('Por favor declare el efectivo total contado físicamente en la gaveta.');
      return;
    }

    setIsSubmitting(true);
    closeCurrentShift(
      responsibleName.trim(),
      nextReceptionistName.trim(),
      numTotalPhysicalCash,
      numDeclaredQrVendis,
      numDeclaredQrUnion,
      numHandoverFloat,
      notes.trim() || undefined
    );
    setIsSubmitting(false);

    onClose();
    setTotalPhysicalCash('');
    setDeclaredQrVendis('');
    setDeclaredQrUnion('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-in my-6">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-rose-800 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold shadow-inner">
              <LogOut className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Cierre de Caja y Relevo de Turno
              </h2>
              <p className="text-xs text-rose-200 font-medium">
                {currentShift.receptionistName} • {currentShift.shiftType === 'noche' ? 'Turno Noche' : 'Turno Día'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleCloseShift} className="p-6 max-h-[78vh] overflow-y-auto space-y-5">
          {/* Security Banner: Blind Count */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-black text-amber-950 text-sm">
                Arqueo Ciego & Relevo Continuo
              </strong>
              <span>
                Declara el efectivo contado en gaveta y los comprobantes QR. Al confirmar, este turno se cerrará y se abrirá automáticamente el nuevo turno a nombre de quien recibe la caja.
              </span>
            </div>
          </div>

          {/* RELEVO DE PERSONAS: QUIÉN ENTREGA Y QUIÉN RECIBE */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-brand-600" />
              1. Responsables del Relevo de Caja
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Persona Saliente (Entrega) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-rose-600" />
                  Recepcionista que ENTREGA (Saliente) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez..."
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {/* Persona Entrante (Recibe) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                  Recepcionista que RECIBE (Entrante) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. María López..."
                  value={nextReceptionistName}
                  onChange={(e) => setNextReceptionistName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-emerald-300 font-bold text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200">
              <ArrowRight className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span>
                Al guardar, la sesión pasará a <strong>{nextReceptionistName || '...'}</strong> y se iniciará su nuevo turno abierto de forma ordenada.
              </span>
            </div>
          </div>

          {/* DECLARACIÓN A CIEGAS DE VALORES */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-brand-600" />
              2. Arqueo Ciego de Caja & Comprobantes
            </h3>

            {/* 1. Efectivo Total en Gaveta */}
            <div className="bg-emerald-50/60 p-4 rounded-2xl border-2 border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Efectivo Total Contado en Gaveta (Bs) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                  {formatBs(numTotalPhysicalCash)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-tight">
                Cuenta todo el dinero físico que hay físicamente en gaveta (incluyendo caja chica y ventas).
              </p>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  placeholder="0.00"
                  value={totalPhysicalCash}
                  onChange={(e) => setTotalPhysicalCash(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-emerald-300 font-mono font-black text-sm text-slate-900 bg-white focus:outline-none focus:border-emerald-600"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Bs
                </span>
              </div>
            </div>

            {/* 2. QR Vendis Declarado */}
            <div className="bg-sky-50/60 p-4 rounded-2xl border-2 border-sky-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-sky-950 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-sky-600" />
                  QR Vendis Declarado (Bs)
                </label>
                <span className="text-[11px] font-mono font-bold text-sky-800 bg-white px-2 py-0.5 rounded-lg border border-sky-200">
                  {formatBs(numDeclaredQrVendis)}
                </span>
              </div>
              <p className="text-[11px] text-sky-800 leading-tight">
                Total recaudado en QR Vendis según comprobantes de cobro.
              </p>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0.00"
                  value={declaredQrVendis}
                  onChange={(e) => setDeclaredQrVendis(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-sky-300 font-mono font-black text-sm text-slate-900 bg-white focus:outline-none focus:border-sky-600"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Bs
                </span>
              </div>
            </div>

            {/* 3. QR Banco Unión Declarado */}
            <div className="bg-indigo-50/60 p-4 rounded-2xl border-2 border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-indigo-600" />
                  QR Banco Unión Declarado (Bs)
                </label>
                <span className="text-[11px] font-mono font-bold text-indigo-800 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                  {formatBs(numDeclaredQrUnion)}
                </span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-tight">
                Total recaudado en transferencias o QR Banco Unión según comprobantes.
              </p>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0.00"
                  value={declaredQrUnion}
                  onChange={(e) => setDeclaredQrUnion(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-indigo-300 font-mono font-black text-sm text-slate-900 bg-white focus:outline-none focus:border-indigo-600"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Bs
                </span>
              </div>
            </div>

            {/* 4. Caja Chica que se queda en gaveta */}
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-brand-600" />
                  Caja Chica que se Deja en Gaveta para {nextReceptionistName || 'el Siguiente Turno'} (Bs)
                </label>
                <span className="text-[11px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {formatBs(numHandoverFloat)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Fondo de cambio en efectivo que se deja físicamente en gaveta para el nuevo turno.
              </p>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={handoverFloat}
                  onChange={(e) => setHandoverFloat(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs bg-white text-slate-800 focus:outline-none focus:border-brand-500"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Bs
                </span>
              </div>
            </div>

            {/* Resumen de Entrega Física */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Total General Declarado:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">{formatBs(totalDeclaredGeneral)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-slate-300 font-bold block">Efectivo Neto a Retirar / Entregar:</span>
                  <span className="text-[10px] text-slate-400">Total Efectivo Gaveta - Caja Chica Dejada</span>
                </div>
                <span className="font-mono font-black text-rose-300 text-base">{formatBs(netCashToDeliver)}</span>
              </div>
            </div>
          </div>

          {/* Traspaso de Habitaciones Activas */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2 text-xs text-blue-900">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-blue-600" />
                Habitaciones Ocupadas en Curso ({occupiedRooms.length}):
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-200/70 text-blue-950 font-black">
                {occupiedRooms.length} habitacion(es)
              </span>
            </div>
            <p className="text-[11px] text-blue-800 leading-tight">
              {occupiedRooms.length > 0
                ? `Las ${occupiedRooms.length} habitaciones activas pasarán en curso al turno de ${nextReceptionistName || 'el siguiente recepcionista'}. Sus cobros pendientes ingresarán al turno que haga el checkout.`
                : 'No hay habitaciones ocupadas en este momento. Todas las habitaciones están libres o en limpieza.'}
            </p>
          </div>

          {/* Notas / Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones de Entrega de Turno (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Se dejan 10 toallas limpias, habitación 4 pidió no molestar hasta las 10:00..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-1/2 py-3 rounded-xl border border-slate-300 font-bold text-slate-700 text-xs hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              {isSubmitting ? 'Cerrando...' : 'Confirmar Cierre & Relevo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

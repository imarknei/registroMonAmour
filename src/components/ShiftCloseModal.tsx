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
  Sparkles,
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
  const [cashDeliveredAtClose, setCashDeliveredAtClose] = useState<string>('');
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
      const initFloat = currentShift.initialCashFloat !== undefined ? currentShift.initialCashFloat : 100;
      setHandoverFloat(initFloat.toString());

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
  const numCashDelivered = parseFloat(cashDeliveredAtClose) || 0;
  // Si especificó total físico en gaveta directamente, usarlo; de lo contrario, gaveta = caja chica dejada
  const numTotalPhysicalCash = totalPhysicalCash !== '' ? (parseFloat(totalPhysicalCash) || 0) : numHandoverFloat;
  const numDeclaredQrVendis = parseFloat(declaredQrVendis) || 0;
  const numDeclaredQrUnion = parseFloat(declaredQrUnion) || 0;

  const initialFloat = currentShift.initialCashFloat || 100;
  const expectedCashSales = currentShift.expectedCash || 0;
  const totalShiftExpensesCash = currentShift.totalExpensesCash || 0;

  // Total efectivo que ingresó a caja (fondo inicial + ventas efectivo)
  const totalExpectedCashRequired = initialFloat + expectedCashSales;
  // Total efectivo justificado = lo que queda en gaveta + retiros entregados al cierre + egresos/retiros ya registrados en turno
  const totalCashJustified = numTotalPhysicalCash + numCashDelivered + totalShiftExpensesCash;
  const liveCashDifference = totalCashJustified - totalExpectedCashRequired;

  const totalDeclaredGeneral = (numTotalPhysicalCash + numCashDelivered) + numDeclaredQrVendis + numDeclaredQrUnion;

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

    setIsSubmitting(true);
    closeCurrentShift(
      responsibleName.trim(),
      nextReceptionistName.trim(),
      numTotalPhysicalCash,
      numDeclaredQrVendis,
      numDeclaredQrUnion,
      numHandoverFloat,
      notes.trim() || undefined,
      numCashDelivered
    );
    setIsSubmitting(false);

    onClose();
    setTotalPhysicalCash('');
    setCashDeliveredAtClose('');
    setDeclaredQrVendis('');
    setDeclaredQrUnion('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scale-in my-auto">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-rose-800 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold shadow-inner shrink-0">
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                Cierre de Caja y Relevo de Turno
              </h2>
              <p className="text-[11px] sm:text-xs text-rose-200 font-medium">
                {currentShift.receptionistName} • {currentShift.shiftType === 'noche' ? 'Turno Noche' : 'Turno Día'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleCloseShift} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
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

          {/* DECLARACIÓN DE VALORES & RETIROS */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-brand-600" />
              2. Arqueo de Caja, Retiros de Efectivo & QR
            </h3>

            {/* A. Retiro de Efectivo a Administración / Sobre */}
            <div className="bg-amber-50/80 p-4 rounded-2xl border-2 border-amber-300 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-amber-700" />
                  Efectivo Retirado / Entregado a Administración (Bs)
                </label>
                <span className="text-[11px] font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                  {formatBs(numCashDelivered)}
                </span>
              </div>
              <p className="text-[11px] text-amber-900 leading-tight">
                Dinero en efectivo que se retira de la caja y se entrega a Marco (dueño), administración o se guarda en sobre.
              </p>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="Ej. 1500 (Efectivo entregado / retirado)"
                  value={cashDeliveredAtClose}
                  onChange={(e) => setCashDeliveredAtClose(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-amber-300 font-mono font-black text-sm text-slate-900 bg-white focus:outline-none focus:border-amber-600"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-amber-600 text-xs">
                  Bs
                </span>
              </div>

              {expectedCashSales > 0 && numCashDelivered === 0 && (
                <button
                  type="button"
                  onClick={() => setCashDeliveredAtClose(expectedCashSales.toString())}
                  className="text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  ⚡ Entregar todas las ventas en efectivo ({formatBs(expectedCashSales)})
                </button>
              )}
            </div>

            {/* B. Caja Chica que se queda en gaveta */}
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-brand-600" />
                  Caja Chica que se Queda en Gaveta para {nextReceptionistName || 'el Siguiente Turno'} (Bs) *
                </label>
                <span className="text-[11px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {formatBs(numHandoverFloat)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Fondo de cambio en monedas y billetes que se deja físicamente en gaveta para el recepcionista entrante.
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

            {/* C. Efectivo Total Contado en Gaveta */}
            <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Efectivo Físico Contado en Gaveta (Bs)
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                  {formatBs(numTotalPhysicalCash)}
                </span>
              </div>
              <p className="text-[10px] text-emerald-800 leading-tight">
                Si antes de hacer el retiro contaste todo el dinero que había en la gaveta, puedes indicarlo aquí. Si ya retiraste el sobre, es igual a la caja chica dejada ({formatBs(numHandoverFloat)}).
              </p>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder={numHandoverFloat.toString()}
                  value={totalPhysicalCash}
                  onChange={(e) => setTotalPhysicalCash(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-emerald-300 font-mono font-bold text-xs text-slate-900 bg-white focus:outline-none focus:border-emerald-600"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Bs
                </span>
              </div>
            </div>

            {/* D. QR Vendis Declarado */}
            <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-200 space-y-2">
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
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-sky-300 font-mono font-bold text-xs text-slate-900 bg-white focus:outline-none focus:border-sky-600"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Bs
                </span>
              </div>
            </div>

            {/* E. QR Banco Unión Declarado */}
            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 space-y-2">
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
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-indigo-300 font-mono font-bold text-xs text-slate-900 bg-white focus:outline-none focus:border-indigo-600"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Bs
                </span>
              </div>
            </div>

            {/* F. RESUMEN Y BALANCE EN VIVO */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Caja Chica Inicial:</span>
                <span className="font-mono font-bold text-slate-200">+{formatBs(initialFloat)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Ventas Esperadas en Efectivo:</span>
                <span className="font-mono font-bold text-emerald-400">+{formatBs(expectedCashSales)}</span>
              </div>

              {totalShiftExpensesCash > 0 && (
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-rose-300">
                  <span className="font-bold uppercase text-[10px]">Gastos / Retiros Previos Registrados:</span>
                  <span className="font-mono font-bold">-{formatBs(totalShiftExpensesCash)}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-amber-300">
                <span className="font-bold uppercase text-[10px]">Retiro Entregado al Cierre:</span>
                <span className="font-mono font-black text-sm">+{formatBs(numCashDelivered)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-200">
                <span className="font-bold uppercase text-[10px]">Caja Chica Dejada en Gaveta:</span>
                <span className="font-mono font-black text-sm">+{formatBs(numHandoverFloat)}</span>
              </div>

              {/* Indicador de Cuadre de Caja en Tiempo Real */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-300 font-black block text-xs">Estado del Arqueo de Caja:</span>
                  <span className="text-[10px] text-slate-400">
                    Justificado: {formatBs(totalCashJustified)} • Requerido: {formatBs(totalExpectedCashRequired)}
                  </span>
                </div>
                <div>
                  {Math.abs(liveCashDifference) < 0.5 ? (
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ¡Caja Cuadrada (0 Bs)!
                    </span>
                  ) : liveCashDifference < 0 ? (
                    <span className="px-3 py-1 rounded-xl bg-rose-500/20 border border-rose-400 text-rose-300 font-black text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Faltante: {formatBs(Math.abs(liveCashDifference))}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-xl bg-sky-500/20 border border-sky-400 text-sky-300 font-black text-xs flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Sobrante: +{formatBs(liveCashDifference)}
                    </span>
                  )}
                </div>
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

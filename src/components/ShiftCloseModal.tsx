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
} from 'lucide-react';
import { SYSTEM_USERS } from '../data/initialData';

interface ShiftCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftCloseModal: React.FC<ShiftCloseModalProps> = ({ isOpen, onClose }) => {
  const { currentShift, currentUser, closeCurrentShift, rooms } = useApp();

  const [responsibleName, setResponsibleName] = useState<string>('');
  const [totalPhysicalCash, setTotalPhysicalCash] = useState<string>('');
  const [declaredQrVendis, setDeclaredQrVendis] = useState<string>('');
  const [declaredQrUnion, setDeclaredQrUnion] = useState<string>('');
  const [handoverFloat, setHandoverFloat] = useState<string>('100');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (currentShift?.initialCashFloat !== undefined) {
      setHandoverFloat(currentShift.initialCashFloat.toString());
    }
  }, [currentShift]);

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

  // Next receptionist in line
  const nextUser =
    currentUser.id === 'user-recep-dia'
      ? SYSTEM_USERS.find((u) => u.id === 'user-recep-noche') || SYSTEM_USERS[2]
      : currentUser.id === 'user-recep-noche'
      ? SYSTEM_USERS.find((u) => u.id === 'user-recep-dia') || SYSTEM_USERS[1]
      : currentUser;

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsibleName.trim()) {
      alert('Por favor ingrese el nombre de la persona que está entregando el turno.');
      return;
    }
    if (totalPhysicalCash.trim() === '') {
      alert('Por favor declare el efectivo total contado físicamente en la gaveta.');
      return;
    }

    setIsSubmitting(true);
    closeCurrentShift(
      responsibleName.trim(),
      numTotalPhysicalCash,
      numDeclaredQrVendis,
      numDeclaredQrUnion,
      numHandoverFloat,
      notes.trim() || undefined
    );
    setIsSubmitting(false);

    onClose();
    setResponsibleName('');
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
                Cierre de Turno y Arqueo Ciego
              </h2>
              <p className="text-xs text-rose-200 font-medium">
                {currentUser.name} • {currentUser.shiftName}
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
                Arqueo Ciego de Caja
              </strong>
              <span>
                Declara con exactitud el efectivo físico contado en gaveta y los totales de comprobantes de QR Vendis y QR Banco Unión. El Administrador cotejará el cuadre directamente en su panel.
              </span>
            </div>
          </div>

          {/* Responsible Person Input */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-brand-600" />
                Nombre de quien entrega el turno <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Juan Pérez (Recepcionista saliente)..."
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* DECLARACIÓN A CIEGAS DE VALORES */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-brand-600" />
              Declaración Física de Caja y Comprobantes
            </h3>

            {/* 1. Efectivo Total en Gaveta */}
            <div className="bg-emerald-50/60 p-4 rounded-2xl border-2 border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  1. Efectivo Total Contado en Gaveta (Bs) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                  {formatBs(numTotalPhysicalCash)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-tight">
                Cuenta todo el dinero físico que hay físicamente en gaveta (billetes y monedas).
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
                  2. QR Vendis Declarado (Bs)
                </label>
                <span className="text-[11px] font-mono font-bold text-sky-800 bg-white px-2 py-0.5 rounded-lg border border-sky-200">
                  {formatBs(numDeclaredQrVendis)}
                </span>
              </div>
              <p className="text-[11px] text-sky-800 leading-tight">
                Total recaudado en QR Vendis según comprobantes o extracto de la aplicación.
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
                  3. QR Banco Unión Declarado (Bs)
                </label>
                <span className="text-[11px] font-mono font-bold text-indigo-800 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                  {formatBs(numDeclaredQrUnion)}
                </span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-tight">
                Total recaudado en transferencias o QR Banco Unión según comprobantes bancarios.
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
                  4. Caja Chica que se Deja en Gaveta para el Siguiente Turno (Bs)
                </label>
                <span className="text-[11px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {formatBs(numHandoverFloat)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Fondo de cambio en efectivo que se deja físicamente en gaveta para {nextUser.name}.
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

          {/* Active Rooms in Stay Warning */}
          {occupiedRooms.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-1.5">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-brand-600" />
                Habitaciones Ocupadas que pasan al siguiente turno ({occupiedRooms.length}):
              </span>
              <div className="flex flex-wrap gap-1">
                {occupiedRooms.map((r) => (
                  <span key={r.id} className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-700">
                    {r.name} ({getRoomTypeLabel(r.type)})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Observations & Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones / Novedades de la entrega (Opcional):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Se dejó 100 Bs en cambio de monedas de 2 y 5 Bs, habitación 4 extendió tiempo..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Confirmar y Cerrar Turno</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Stay } from '../../types';
import { formatBs } from '../../utils/formatUtils';
import { formatTimeOnly } from '../../utils/timeUtils';
import {
  AlertTriangle,
  Ban,
  X,
  BedDouble,
  UserCheck,
  Clock,
  Car,
  ShoppingBag,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

interface CancelStayModalProps {
  stay: Stay | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (stayId: string, reason: string, restoreInventory: boolean) => void;
}

const COMMON_REASONS = [
  'Registro de prueba / test del sistema',
  'Error al asignar la habitación / habitación equivocada',
  'Cliente no ingresó / se retiró inmediatamente (sin uso)',
  'Error de digitación en el plan o tarifa seleccionada',
  'Falla técnica o desperfecto en la habitación',
  'Otro motivo',
];

export const CancelStayModal: React.FC<CancelStayModalProps> = ({
  stay,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0]);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [restoreInventory, setRestoreInventory] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !stay) return null;

  const consumptionsCount = stay.consumptions ? stay.consumptions.length : 0;
  const consumptionsTotal = stay.consumptions
    ? stay.consumptions.reduce((sum, c) => sum + c.subtotal, 0)
    : 0;

  const totalAmount = (stay.totalAmount || (stay.baseRoomPrice + consumptionsTotal + (stay.overtimeCharge || 0)));

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason =
      selectedReason === 'Otro motivo'
        ? customNotes.trim() || 'Anulación justificada por Administrador'
        : customNotes.trim()
        ? `${selectedReason}: ${customNotes.trim()}`
        : selectedReason;

    setIsSubmitting(true);
    onConfirm(stay.id, finalReason, restoreInventory);
    setIsSubmitting(false);
    onClose();
    setCustomNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 w-full max-w-lg overflow-hidden animate-scale-in my-6">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-rose-700 via-brand-700 to-rose-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-bold">
              <Ban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Anular Registro de Habitación</h3>
              <p className="text-xs text-rose-200">Acción exclusiva de Administrador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* Warning Banner */}
          <div className="bg-rose-50 rounded-2xl p-3.5 border border-rose-200 flex items-start gap-3 text-rose-900 text-xs">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Atención: Anulación de Registro</strong>
              <span>
                Esta acción cancelará la estadía, liberará la habitación a disponible si está ocupada, y ajustará los informes y reportes diarios.
              </span>
            </div>
          </div>

          {/* Stay Summary Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-brand-600" />
                <span className="font-extrabold text-sm text-slate-800">{stay.roomName}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                  {stay.chosenPlan}
                </span>
              </div>
              <span className="font-extrabold text-sm text-brand-700 font-mono">
                {formatBs(totalAmount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Entrada: <strong>{formatTimeOnly(stay.startTime)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Recep: <strong className="truncate">{stay.receptionistName}</strong></span>
              </div>
              {stay.vehiclePlate && (
                <div className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-slate-400" />
                  <span>Placa: <strong>{stay.vehiclePlate}</strong></span>
                </div>
              )}
              {stay.isPrepaid && (
                <div className="text-emerald-700 font-bold text-[11px]">
                  Pagado al entrar: {formatBs(stay.prepaidAmount || stay.baseRoomPrice)}
                </div>
              )}
            </div>

            {/* Consumptions summary */}
            {consumptionsCount > 0 && (
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between text-slate-700 font-bold mb-1">
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-brand-600" />
                    Consumos ({consumptionsCount} ítems):
                  </span>
                  <span className="font-mono text-brand-700">+{formatBs(consumptionsTotal)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {stay.consumptions.map((c) => (
                    <span key={c.id} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {c.quantity}x {c.productName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Motivo de la Anulación <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-brand-500"
            >
              {COMMON_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Detalle / Justificación adicional (Opcional):
            </label>
            <textarea
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Ej. Registro de prueba realizado al capacitar al personal..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>

          {/* Restore Inventory Checkbox */}
          {consumptionsCount > 0 && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={restoreInventory}
                onChange={(e) => setRestoreInventory(e.target.checked)}
                className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
              />
              <div className="text-xs text-amber-900">
                <span className="font-bold block flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  Devolver consumos al inventario
                </span>
                <span className="text-[11px] text-amber-800 opacity-90 block">
                  Se repondrá el stock de los {consumptionsCount} producto(s) consumidos.
                </span>
              </div>
            </label>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
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
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-xs font-extrabold text-white shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              Confirmar Anulación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

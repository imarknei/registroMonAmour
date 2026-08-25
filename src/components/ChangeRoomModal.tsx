import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Room } from '../types';
import { formatBs, getRoomTypeBadge, getRoomTypeLabel } from '../utils/formatUtils';
import { formatTimeOnly, calculateStayTime, formatTimerDisplay } from '../utils/timeUtils';
import {
  X,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BedDouble,
  FileText,
  Sparkles,
  ShoppingBag,
  Car,
  Layers,
  Check,
  RotateCcw,
} from 'lucide-react';

interface ChangeRoomModalProps {
  sourceRoom: Room | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const COMMON_REASONS = [
  'Falla en Aire Acondicionado / Calefacción',
  'Problema en Ducha / Sin Agua Caliente',
  'Falla en TV / Luces / Equipamiento',
  'Inconveniente de Limpieza u Olor',
  'Error al registrar número de habitación',
  'Cliente solicitó cambio de habitación',
  'Inconveniente con Jacuzzi / Hidromasaje',
];

export const ChangeRoomModal: React.FC<ChangeRoomModalProps> = ({
  sourceRoom,
  onClose,
  onSuccess,
}) => {
  const { rooms, tariffs, changeRoom } = useApp();

  const [selectedTargetRoomId, setSelectedTargetRoomId] = useState<string>('');
  const [selectedReasonPreset, setSelectedReasonPreset] = useState<string>('');
  const [customExplanation, setCustomExplanation] = useState<string>('');
  const [oldRoomDestination, setOldRoomDestination] = useState<'limpieza' | 'disponible'>('limpieza');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!sourceRoom || !sourceRoom.currentStay) return null;

  const stay = sourceRoom.currentStay;
  const sourceBadge = getRoomTypeBadge(sourceRoom.type);
  const extraRate = tariffs[sourceRoom.type]?.extraHourPrice || 30;
  const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes, extraRate);
  const consumptionsTotal = stay.consumptions.reduce((sum, c) => sum + c.subtotal, 0);

  // Filter available target rooms (must be disponible and different from source)
  const availableTargetRooms = rooms.filter(
    (r) => r.status === 'disponible' && r.id !== sourceRoom.id
  );

  const selectedTargetRoom = rooms.find((r) => r.id === selectedTargetRoomId);

  // Full final explanation text
  const finalReason = customExplanation.trim() !== ''
    ? (selectedReasonPreset ? `${selectedReasonPreset}: ${customExplanation.trim()}` : customExplanation.trim())
    : selectedReasonPreset;

  const handleSelectPreset = (reason: string) => {
    if (selectedReasonPreset === reason) {
      setSelectedReasonPreset('');
    } else {
      setSelectedReasonPreset(reason);
      if (customExplanation === '') {
        setCustomExplanation(reason);
      }
    }
  };

  const handleConfirmChange = () => {
    if (!selectedTargetRoomId) {
      alert('Por favor seleccione la habitación de destino disponible.');
      return;
    }

    if (!finalReason || finalReason.trim().length < 3) {
      alert('Por favor especifique o escriba el motivo del cambio de habitación.');
      return;
    }

    setIsSubmitting(true);
    const success = changeRoom(sourceRoom.id, selectedTargetRoomId, finalReason, {
      oldRoomStatus: oldRoomDestination,
    });

    setIsSubmitting(false);
    if (success) {
      onSuccess?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-rose-300">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">CAMBIO DE HABITACIÓN</h2>
              <p className="text-xs text-slate-300">
                Traslado de estadía por inconveniente técnico, solicitud o error
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* 1. Habitación de Origen (Actual) */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Habitación de Origen (Actual)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sourceBadge.bg} ${sourceBadge.text}`}>
                {sourceRoom.tag}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">{sourceRoom.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>Plan: <strong className="uppercase">{stay.chosenPlan}</strong> ({formatBs(stay.baseRoomPrice)})</span>
                  <span>•</span>
                  <span>Entrada: {formatTimeOnly(stay.startTime)}</span>
                  {stay.vehiclePlate && (
                    <>
                      <span>•</span>
                      <span className="font-mono font-bold text-slate-700">Placa: {stay.vehiclePlate}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 block">
                  {timeCalc.isOvertime ? `Excedido +${timeCalc.overtimeMinutes}m` : `Quedan ${formatTimerDisplay(timeCalc.remainingMinutes, timeCalc.remainingSeconds)}`}
                </span>
                {stay.isPrepaid && (
                  <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                    Pagado por adelantado
                  </span>
                )}
              </div>
            </div>

            {/* Consumos transferibles */}
            {stay.consumptions.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-brand-600" />
                  Consumos de Minibar ({stay.consumptions.length} items):
                </span>
                <strong className="font-mono text-brand-700">+{formatBs(consumptionsTotal)} (Se trasladan)</strong>
              </div>
            )}
          </div>

          {/* 2. Seleccionar Habitación de Destino (Disponible) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-brand-600" />
                Seleccione la Nueva Habitación de Destino:
              </label>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {availableTargetRooms.length} Disponibles
              </span>
            </div>

            {availableTargetRooms.length === 0 ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-brand-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-brand-600 shrink-0" />
                <span>
                  <strong>No hay habitaciones disponibles.</strong> Todas las demás habitaciones están ocupadas o en limpieza.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {availableTargetRooms.map((target) => {
                  const isSelected = selectedTargetRoomId === target.id;
                  const targetBadge = getRoomTypeBadge(target.type);

                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setSelectedTargetRoomId(target.id)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-brand-600 bg-rose-50/80 shadow-md shadow-brand-500/10'
                          : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${targetBadge.bg} ${targetBadge.text}`}>
                          {target.tag}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        <strong className="text-sm font-black text-slate-900 block">{target.name}</strong>
                        <span className="text-[11px] text-slate-500">{getRoomTypeLabel(target.type)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Motivo del Cambio (Presets Rápidos) */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-600" />
              Motivo o Causa del Cambio (Obligatorio):
            </label>

            <div className="flex flex-wrap gap-1.5">
              {COMMON_REASONS.map((reason) => {
                const isSelected = selectedReasonPreset === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => handleSelectPreset(reason)}
                    className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition-all ${
                      isSelected
                        ? 'bg-brand-600 text-white border-brand-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>

            {/* Input de explicación detallada */}
            <textarea
              rows={2}
              value={customExplanation}
              onChange={(e) => setCustomExplanation(e.target.value)}
              placeholder="Escriba o detalle el motivo del cambio (ej. El cliente reportó que no enfría el aire en la Habitación 2)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* 4. Estado de la Habitación Anterior */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
              ¿A qué estado pasa la habitación anterior ({sourceRoom.name})?
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOldRoomDestination('limpieza')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                  oldRoomDestination === 'limpieza'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <span className="block font-black">Limpieza / Revisión</span>
                  <span className="text-[10px] opacity-80 font-normal">Recomendado para revisión</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOldRoomDestination('disponible')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                  oldRoomDestination === 'disponible'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <span className="block font-black">Disponible Inmediato</span>
                  <span className="text-[10px] opacity-80 font-normal">Si no se llegó a ocupar</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!selectedTargetRoomId || !finalReason || finalReason.trim().length < 3 || isSubmitting}
            onClick={handleConfirmChange}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            {isSubmitting
              ? 'Procesando Cambio...'
              : selectedTargetRoom
              ? `Confirmar Cambio a ${selectedTargetRoom.name}`
              : 'Confirmar Cambio de Habitación'}
          </button>
        </div>
      </div>
    </div>
  );
};

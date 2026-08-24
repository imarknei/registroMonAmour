import React from 'react';
import { Room } from '../types';
import { useApp } from '../context/AppContext';
import {
  calculateStayTime,
  formatTimerDisplay,
  formatTimeOnly,
} from '../utils/timeUtils';
import { formatBs, getRoomTypeBadge, getRoomTypeLabel } from '../utils/formatUtils';
import {
  Clock,
  AlertCircle,
  PlusCircle,
  LogOut,
  Sparkles,
  ShoppingBag,
  Car,
  CheckCircle,
  CheckCircle2,
  BedDouble,
  Music,
  Waves,
  Wind,
  Fan,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface RoomCardProps {
  room: Room;
  onOpenRegister: (room: Room) => void;
  onOpenDetail: (room: Room) => void;
  onOpenQuickConsumption: (room: Room) => void;
  onOpenCheckout: (room: Room) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  onOpenRegister,
  onOpenDetail,
  onOpenQuickConsumption,
  onOpenCheckout,
}) => {
  const { tariffs, changeRoomStatus, nowTimestamp } = useApp();

  const badge = getRoomTypeBadge(room.type);
  const roomTariff = tariffs[room.type];

  // Helper icon for room type
  const getRoomIcon = () => {
    switch (room.type) {
      case 'golden_suite':
        return <Music className="w-4 h-4 text-amber-600" />;
      case 'jacuzzi':
        return <Waves className="w-4 h-4 text-purple-600" />;
      case 'aire':
        return <Wind className="w-4 h-4 text-sky-600" />;
      case 'ventilador':
        return <Fan className="w-4 h-4 text-teal-600" />;
      default:
        return <BedDouble className="w-4 h-4 text-rose-600" />;
    }
  };

  // State: DISPONIBLE
  if (room.status === 'disponible') {
    return (
      <div className="bg-white rounded-2xl border-2 border-slate-200/80 hover:border-brand-400/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
        {/* Top Header */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {getRoomIcon()}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                  {room.tag}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-brand-600 transition-colors">
                {room.name}
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Libre
            </span>
          </div>

          {/* Pricing pills */}
          <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between items-center">
              <span>1 Hora:</span>
              <strong className="font-bold text-slate-800">
                {roomTariff?.price1h ? formatBs(roomTariff.price1h) : 'No disp.'}
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span>2 Horas:</span>
              <strong className="font-bold text-slate-800">
                {roomTariff?.price2h ? formatBs(roomTariff.price2h) : 'No disp.'}
              </strong>
            </div>
            <div className="flex justify-between items-center text-brand-700 font-semibold pt-1 border-t border-slate-200/60">
              <span>Noche (12h):</span>
              <strong className="font-bold font-mono">
                {roomTariff?.priceNight ? formatBs(roomTariff.priceNight) : 'Consultar'}
              </strong>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onOpenRegister(room)}
          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-md shadow-brand-600/20 hover:shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Registrar Entrada
        </button>
      </div>
    );
  }

  // State: LIMPIEZA
  if (room.status === 'limpieza') {
    return (
      <div className="bg-amber-50/70 rounded-2xl border-2 border-amber-300 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {getRoomIcon()}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                  {room.tag}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{room.name}</h3>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              En Limpieza
            </span>
          </div>

          <div className="bg-white/80 rounded-xl p-4 mb-4 border border-amber-200/70 text-center text-amber-900">
            <Sparkles className="w-8 h-8 mx-auto text-amber-500 mb-2 animate-bounce" />
            <p className="text-xs font-semibold">Habitación en proceso de desinfección y cambio de sábanas.</p>
          </div>
        </div>

        <button
          onClick={() => changeRoomStatus(room.id, 'disponible')}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Marcar Lista / Disponible
        </button>
      </div>
    );
  }

  // State: OCUPADA
  const stay = room.currentStay;
  if (!stay) {
    return null;
  }

  const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes);
  const consumptionsTotal = stay.consumptions.reduce((sum, c) => sum + c.subtotal, 0);
  const currentTotalAmount = stay.baseRoomPrice + timeCalc.overtimeCharge + consumptionsTotal;
  const isPrepaid = stay.isPrepaid || false;
  const prepaidAmt = isPrepaid ? (stay.prepaidAmount || stay.baseRoomPrice) : 0;
  const pendingBalance = Math.max(0, currentTotalAmount - prepaidAmt);

  return (
    <div
      className={`rounded-2xl border-2 p-5 shadow-md flex flex-col justify-between relative overflow-hidden transition-all ${
        timeCalc.isOvertime
          ? 'bg-rose-50/90 border-brand-500 shadow-brand-500/15'
          : timeCalc.isWarning
          ? 'bg-amber-50/90 border-amber-400'
          : 'bg-white border-brand-200'
      }`}
    >
      {/* Top Banner & Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              {getRoomIcon()}
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                {room.tag}
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{room.name}</h3>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                timeCalc.isOvertime
                  ? 'bg-brand-600 text-white border-brand-700 animate-pulse'
                  : timeCalc.isWarning
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-brand-50 text-brand-700 border-brand-200'
              }`}
            >
              {timeCalc.isOvertime ? '¡TIEMPO EXCEDIDO!' : timeCalc.isWarning ? '¡Por vencer!' : 'Ocupada'}
            </span>

            {isPrepaid ? (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Pagado: {formatBs(prepaidAmt)}
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                Paga al Salir
              </span>
            )}
          </div>
        </div>

        {/* Live Timer Display */}
        <div
          className={`rounded-2xl p-3.5 mb-3 border text-center relative overflow-hidden ${
            timeCalc.isOvertime
              ? 'bg-brand-600 text-white border-brand-700'
              : timeCalc.isWarning
              ? 'bg-amber-500 text-white border-amber-600'
              : 'bg-slate-900 text-white border-slate-950'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest opacity-90 mb-0.5">
            <Clock className="w-3.5 h-3.5" />
            {timeCalc.isOvertime ? 'Cronómetro Excedido' : 'Tiempo Restante'}
          </div>

          <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight my-0.5">
            {timeCalc.isOvertime
              ? `+ ${formatTimerDisplay(timeCalc.overtimeMinutes, timeCalc.overtimeSeconds)}`
              : formatTimerDisplay(timeCalc.remainingMinutes, timeCalc.remainingSeconds)}
          </div>

          {/* Overtime penalty charge badge */}
          {timeCalc.isOvertime && (
            <div className="mt-1.5 inline-block bg-white text-brand-700 text-xs font-black px-3 py-1 rounded-full shadow-sm">
              {timeCalc.gracePeriodActive ? (
                'Periodo de Gracia (0 Bs)'
              ) : (
                `Recargo Extra: +${formatBs(timeCalc.overtimeCharge)}`
              )}
            </div>
          )}

          {/* Progress bar for normal countdown */}
          {!timeCalc.isOvertime && (
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeCalc.isWarning ? 'bg-amber-200' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.max(5, 100 - timeCalc.percentElapsed)}%` }}
              />
            </div>
          )}
        </div>

        {/* Stay Details Brief */}
        <div className="bg-slate-50 rounded-xl p-2.5 mb-3 border border-slate-200/80 text-xs space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>Hora de Entrada:</span>
            <strong className="font-semibold text-slate-800">{formatTimeOnly(stay.startTime)}</strong>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Plan Elegido:</span>
            <span className="font-bold text-slate-800 uppercase">
              {stay.chosenPlan} ({formatBs(stay.baseRoomPrice)})
            </span>
          </div>

          {stay.vehiclePlate && (
            <div className="flex items-center justify-between text-slate-600 pt-0.5">
              <span className="flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-slate-500" />
                Placa:
              </span>
              <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">
                {stay.vehiclePlate}
              </span>
            </div>
          )}

          {/* Consumptions summary */}
          <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
            <span className="flex items-center gap-1 text-slate-600">
              <ShoppingBag className="w-3.5 h-3.5 text-brand-600" />
              Consumos ({stay.consumptions.length}):
            </span>
            <strong className="font-bold text-slate-800">{formatBs(consumptionsTotal)}</strong>
          </div>

          {/* Balance breakdown */}
          <div className="pt-1 border-t border-slate-200 space-y-0.5">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Total Estancia:</span>
              <span className="font-mono font-bold text-slate-800">{formatBs(currentTotalAmount)}</span>
            </div>

            {isPrepaid && (
              <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                <span>Pagado al Ingresar:</span>
                <span className="font-mono">-{formatBs(prepaidAmt)}</span>
              </div>
            )}

            <div className="flex justify-between items-center font-bold text-brand-700 text-sm pt-0.5">
              <span>{isPrepaid ? 'Saldo Pendiente:' : 'Total a Cobrar:'}</span>
              <span className="font-mono text-base font-extrabold text-brand-700">
                {formatBs(pendingBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Grid */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Quick Consumo Button */}
          <button
            onClick={() => onOpenQuickConsumption(room)}
            className="py-2 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
            title="Añadir bebidas, preservativos o snacks"
          >
            <PlusCircle className="w-3.5 h-3.5 text-brand-600" />
            + Consumo
          </button>

          {/* Ver Detalle Button */}
          <button
            onClick={() => onOpenDetail(room)}
            className="py-2 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Detalles
          </button>
        </div>

        {/* Primary Checkout Button: CERRAR HABITACIÓN */}
        <button
          onClick={() => onOpenCheckout(room)}
          className={`w-full py-2.5 px-4 font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-white ${
            timeCalc.isOvertime
              ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/30 animate-pulse'
              : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20'
          }`}
        >
          <LogOut className="w-4 h-4" />
          {pendingBalance === 0 ? 'LIBERAR HABITACIÓN (0 Bs Pendientes)' : `COBRAR SALIDA (${formatBs(pendingBalance)})`}
        </button>
      </div>
    </div>
  );
};

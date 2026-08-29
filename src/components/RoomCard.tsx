import React, { useState, useEffect } from 'react';
import { Room } from '../types';
import { useApp } from '../context/AppContext';
import {
  calculateStayTime,
  formatTimerDisplay,
  formatTimeOnly,
} from '../utils/timeUtils';
import { formatBs, getRoomTypeBadge, getRoomTypeLabel, getEffective2hPrice, isWeekendTariffDay } from '../utils/formatUtils';
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
  ArrowLeftRight,
} from 'lucide-react';

interface RoomCardProps {
  room: Room;
  onOpenRegister: (room: Room) => void;
  onOpenDetail: (room: Room) => void;
  onOpenQuickConsumption: (room: Room) => void;
  onOpenCheckout: (room: Room) => void;
  onOpenChangeRoom?: (room: Room) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  onOpenRegister,
  onOpenDetail,
  onOpenQuickConsumption,
  onOpenCheckout,
  onOpenChangeRoom,
}) => {
  const { tariffs, changeRoomStatus } = useApp();

  // Reloj local de 1 segundo para asegurar actualización continua y fluida del temporizador
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
              <span className="flex items-center gap-1">
                2 Horas:
                {isWeekendTariffDay() && (
                  <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                    Vie-Dom
                  </span>
                )}
              </span>
              <strong className="font-bold text-slate-800">
                {formatBs(getEffective2hPrice(room.type, roomTariff))}
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

          <div className="bg-white/90 rounded-xl p-4 mb-4 border border-amber-200 text-center text-amber-950 shadow-xs">
            <Sparkles className="w-7 h-7 mx-auto text-amber-500 mb-1.5 animate-bounce" />
            <p className="text-xs font-semibold mb-1">Habitación en desinfección y cambio de sábanas.</p>
            {room.cleaningStartTime && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/80 rounded-lg text-xs font-mono font-bold text-amber-900 border border-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                <span>
                  {(() => {
                    const elapsedMs = Math.max(0, Date.now() - new Date(room.cleaningStartTime).getTime());
                    const sec = Math.floor(elapsedMs / 1000);
                    const min = Math.floor(sec / 60);
                    const remSec = sec % 60;
                    return `${min.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;
                  })()} en limpieza
                </span>
              </div>
            )}
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

  const extraHourRate = roomTariff?.extraHourPrice || (room.type === 'jacuzzi' || room.type === 'golden_suite' ? 40 : 30);
  const priceNight = roomTariff?.priceNight || (room.type === 'ventilador' ? 140 : room.type === 'aire' ? 150 : room.type === 'suite' ? 180 : room.type === 'jacuzzi' ? 220 : 230);
  const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes, extraHourRate, Date.now(), {
    priceNight,
    baseRoomPrice: stay.baseRoomPrice,
    chosenPlan: stay.chosenPlan,
  });
  const consumptionsTotal = stay.consumptions.reduce((sum, c) => sum + c.subtotal, 0);
  const paidConsumptionsTotal = stay.consumptions
    .filter((c) => c.isPaid)
    .reduce((sum, c) => sum + c.subtotal, 0);
  const unpaidConsumptionsTotal = stay.consumptions
    .filter((c) => !c.isPaid)
    .reduce((sum, c) => sum + c.subtotal, 0);

  const currentTotalAmount = stay.baseRoomPrice + timeCalc.overtimeCharge + consumptionsTotal;
  const isPrepaid = stay.isPrepaid || false;
  const prepaidAmt = isPrepaid ? (stay.prepaidAmount || stay.baseRoomPrice) : 0;
  const totalAlreadyPaid = prepaidAmt + paidConsumptionsTotal;
  const pendingBalance = Math.max(0, currentTotalAmount - totalAlreadyPaid);

  return (
    <div
      className={`rounded-2xl border-2 p-5 shadow-md flex flex-col justify-between relative overflow-hidden transition-all ${
        timeCalc.autoNightConverted && !timeCalc.isOvertime
          ? 'bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-slate-50 border-indigo-300 shadow-indigo-500/10'
          : timeCalc.isOvertime
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
                timeCalc.autoNightConverted && !timeCalc.isOvertime
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                  : timeCalc.isOvertime
                  ? timeCalc.gracePeriodActive
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-brand-600 text-white border-brand-700 animate-pulse'
                  : timeCalc.isWarning
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-brand-50 text-brand-700 border-brand-200'
              }`}
            >
              {timeCalc.autoNightConverted && !timeCalc.isOvertime
                ? '🌙 Noche 12h (Auto)'
                : timeCalc.isOvertime
                ? timeCalc.gracePeriodActive
                  ? 'En Espera (10 min)'
                  : `¡Tiempo Extra (+${formatBs(timeCalc.overtimeCharge)})!`
                : timeCalc.isWarning
                ? '¡Por vencer!'
                : 'Ocupada'}
            </span>

            {isPrepaid || paidConsumptionsTotal > 0 ? (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {pendingBalance === 0 ? `Pagado: ${formatBs(totalAlreadyPaid)}` : `Abonado: ${formatBs(totalAlreadyPaid)}`}
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
            timeCalc.autoNightConverted && !timeCalc.isOvertime
              ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white border-indigo-900'
              : timeCalc.isOvertime
              ? timeCalc.gracePeriodActive
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-brand-600 text-white border-brand-700'
              : timeCalc.isWarning
              ? 'bg-amber-500 text-white border-amber-600'
              : 'bg-slate-900 text-white border-slate-950'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest opacity-90 mb-0.5">
            <Clock className="w-3.5 h-3.5" />
            {timeCalc.autoNightConverted && !timeCalc.isOvertime
              ? 'Tiempo Restante Noche (12h)'
              : timeCalc.isOvertime
              ? timeCalc.gracePeriodActive
                ? 'Cronómetro de Espera'
                : 'Cronómetro Excedido'
              : 'Tiempo Restante'}
          </div>

          <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight my-0.5">
            {timeCalc.isOvertime
              ? `+ ${formatTimerDisplay(timeCalc.overtimeMinutes, timeCalc.overtimeSeconds)}`
              : formatTimerDisplay(timeCalc.remainingMinutes, timeCalc.remainingSeconds)}
          </div>

          {/* Overtime penalty charge badge OR Auto-night badge */}
          {timeCalc.autoNightConverted ? (
            <div className="mt-1.5 inline-block bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[11px] font-extrabold px-3 py-0.5 rounded-full">
              Tarifa Noche: {formatBs(stay.baseRoomPrice + timeCalc.overtimeCharge)} (Cubre 12h)
            </div>
          ) : timeCalc.isOvertime ? (
            <div className="mt-1.5 inline-block bg-white text-brand-700 text-xs font-black px-3 py-1 rounded-full shadow-sm">
              {timeCalc.gracePeriodActive ? (
                'Espera / Tolerancia (10 min) • 0 Bs'
              ) : (
                `+${formatBs(timeCalc.overtimeCharge)} Extra (${timeCalc.extraBlocksCount} x 20 min)`
              )}
            </div>
          ) : null}

          {/* Progress bar for normal countdown */}
          {!timeCalc.isOvertime && (
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeCalc.autoNightConverted
                    ? 'bg-indigo-400'
                    : timeCalc.isWarning
                    ? 'bg-amber-200'
                    : 'bg-emerald-400'
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
            <span>Plan:</span>
            <span className="font-bold text-slate-800 uppercase">
              {timeCalc.autoNightConverted ? (
                <span className="text-indigo-700 font-extrabold">{stay.chosenPlan} ➔ NOCHE (12h)</span>
              ) : (
                `${stay.chosenPlan} (${formatBs(stay.baseRoomPrice)})`
              )}
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
            <div className="text-right">
              <strong className="font-bold text-slate-800">{formatBs(consumptionsTotal)}</strong>
              {paidConsumptionsTotal > 0 && (
                <span className="block text-[10px] text-emerald-700 font-bold">
                  ({formatBs(paidConsumptionsTotal)} pagado en el acto)
                </span>
              )}
            </div>
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

            {paidConsumptionsTotal > 0 && (
              <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                <span>Consumos Pagados en el Acto:</span>
                <span className="font-mono">-{formatBs(paidConsumptionsTotal)}</span>
              </div>
            )}

            <div className="flex justify-between items-center font-bold text-sm pt-0.5">
              <span className={pendingBalance === 0 ? 'text-emerald-700 font-black' : 'text-brand-700'}>
                {pendingBalance === 0 ? 'Saldo Pendiente:' : isPrepaid ? 'Saldo Pendiente:' : 'Total a Cobrar:'}
              </span>
              <span
                className={`font-mono text-base font-black ${
                  pendingBalance === 0 ? 'text-emerald-600' : 'text-brand-700'
                }`}
              >
                {pendingBalance === 0 ? '0.00 Bs (Liquidado)' : formatBs(pendingBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Grid */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          {/* Quick Consumo Button */}
          <button
            onClick={() => onOpenQuickConsumption(room)}
            className="py-2 px-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1"
            title="Añadir bebidas, preservativos o snacks"
          >
            <PlusCircle className="w-3.5 h-3.5 text-brand-600" />
            + Consumo
          </button>

          {/* Cambio de Habitación Button */}
          <button
            onClick={() => (onOpenChangeRoom ? onOpenChangeRoom(room) : onOpenDetail(room))}
            className="py-2 px-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1"
            title="Cambio de habitación por inconveniente o error"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700" />
            Cambio
          </button>

          {/* Ver Detalle Button */}
          <button
            onClick={() => onOpenDetail(room)}
            className="py-2 px-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Detalles
          </button>
        </div>

        {/* Primary Checkout Button: CERRAR HABITACIÓN */}
        <button
          onClick={() => onOpenCheckout(room)}
          className={`w-full py-2.5 px-4 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-white ${
            pendingBalance === 0
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 active:scale-98'
              : timeCalc.isOvertime
              ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/30 animate-pulse'
              : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20'
          }`}
        >
          {pendingBalance === 0 ? (
            <>
              <CheckCircle className="w-4 h-4 text-white" />
              LIBERAR HABITACIÓN (Cuenta Liquidada • 0 Bs)
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              COBRAR SALIDA ({formatBs(pendingBalance)})
            </>
          )}
        </button>
      </div>
    </div>
  );
};

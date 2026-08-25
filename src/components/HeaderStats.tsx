import React from 'react';
import { useApp } from '../context/AppContext';
import { formatBs } from '../utils/formatUtils';
import { Bed, CheckCircle2, Sparkles, Clock, AlertTriangle, Wallet } from 'lucide-react';
import { calculateStayTime } from '../utils/timeUtils';

export const HeaderStats: React.FC = () => {
  const { rooms, tariffs, currentShift, currentUser, nowTimestamp } = useApp();

  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.status === 'disponible').length;
  const occupiedRooms = rooms.filter((r) => r.status === 'ocupada').length;
  const cleaningRooms = rooms.filter((r) => r.status === 'limpieza').length;

  // Overtime count
  const overtimeRooms = rooms.filter((r) => {
    if (r.status === 'ocupada' && r.currentStay) {
      const extraRate = tariffs[r.type]?.extraHourPrice || 30;
      const calc = calculateStayTime(r.currentStay.startTime, r.currentStay.chosenDurationMinutes, extraRate, nowTimestamp);
      return calc.isOvertime;
    }
    return false;
  }).length;

  const totalShiftSales = currentShift ? currentShift.expectedCash + currentShift.expectedQr : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {/* 1. Habitaciones Disponibles */}
      <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm flex items-center gap-3 relative overflow-hidden group">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Disponibles
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-800">{availableRooms}</span>
            <span className="text-xs text-slate-400 font-medium">/ {totalRooms}</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 h-full w-1.5 bg-emerald-500 rounded-r" />
      </div>

      {/* 2. Habitaciones Ocupadas */}
      <div className="bg-white rounded-2xl p-4 border border-brand-100 shadow-sm flex items-center gap-3 relative overflow-hidden group">
        <div className="w-11 h-11 rounded-xl bg-rose-50 text-brand-600 flex items-center justify-center font-bold shrink-0">
          <Bed className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Ocupadas
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-brand-600">{occupiedRooms}</span>
            <span className="text-xs text-slate-400 font-medium">/ {totalRooms}</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 h-full w-1.5 bg-brand-600 rounded-r" />
      </div>

      {/* 3. Habitaciones en Limpieza */}
      <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm flex items-center gap-3 relative overflow-hidden group">
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            En Limpieza
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-amber-600">{cleaningRooms}</span>
            <span className="text-xs text-slate-400 font-medium">hab.</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 h-full w-1.5 bg-amber-500 rounded-r" />
      </div>

      {/* 4. Tiempo Excedido Alert */}
      <div className={`rounded-2xl p-4 border shadow-sm flex items-center gap-3 relative overflow-hidden ${
        overtimeRooms > 0 
          ? 'bg-rose-50 border-rose-200 text-rose-900 animate-pulse-subtle' 
          : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
          overtimeRooms > 0 ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
        }`}>
          {overtimeRooms > 0 ? <AlertTriangle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Tiempo Excedido
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-extrabold ${overtimeRooms > 0 ? 'text-brand-700' : 'text-slate-800'}`}>
              {overtimeRooms}
            </span>
            <span className="text-xs text-slate-400 font-medium">alertas</span>
          </div>
        </div>
        {overtimeRooms > 0 && <div className="absolute top-0 right-0 h-full w-1.5 bg-brand-600 rounded-r" />}
      </div>

      {/* 5. Total en Caja Turno (Efectivo + QR) */}
      <div className="col-span-2 sm:col-span-2 bg-gradient-to-br from-brand-700 to-rose-800 rounded-2xl p-4 text-white shadow-md shadow-brand-900/10 flex items-center justify-between relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-rose-200 uppercase tracking-wider block">
              {currentUser.role === 'admin' ? 'Caja Turno Activo' : `Total Caja (${currentUser.name})`}
            </span>
            <span className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight">
              {formatBs(totalShiftSales)}
            </span>
          </div>
        </div>

        {currentShift && (
          <div className="text-right text-xs space-y-0.5 pr-1 hidden xs:block">
            <div className="text-rose-100">
              <span className="opacity-75">Gaveta (c/Caja Chica y Pagos):</span>{' '}
              <strong className="font-mono font-bold text-white">
                {formatBs(
                  (currentShift.initialCashFloat || 100) +
                    currentShift.expectedCash -
                    (currentShift.totalExpensesCash || 0)
                )}
              </strong>
            </div>
            <div className="text-rose-200 text-[11px]">
              <span className="opacity-75">Ventas:</span> Efec: {formatBs(currentShift.expectedCash)} | QR: {formatBs(currentShift.expectedQr)}
              {(currentShift.totalExpensesCash || 0) + (currentShift.totalExpensesQr || 0) > 0 && (
                <span className="text-amber-200 font-semibold ml-1.5">
                  | Pagos: -{formatBs((currentShift.totalExpensesCash || 0) + (currentShift.totalExpensesQr || 0))}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

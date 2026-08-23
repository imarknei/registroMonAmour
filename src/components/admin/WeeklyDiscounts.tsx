import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Shift, WeeklyDiscountReport } from '../../types';
import { formatBs } from '../../utils/formatUtils';
import { getWeekRange, formatDateTime, formatDateOnly } from '../../utils/timeUtils';
import {
  CalendarDays,
  UserCheck,
  AlertTriangle,
  DollarSign,
  QrCode,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { SYSTEM_USERS } from '../../data/initialData';

export const WeeklyDiscounts: React.FC = () => {
  const { shiftsHistory } = useApp();

  const currentWeekInfo = getWeekRange(new Date());
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(currentWeekInfo.weekKey);

  // Group shifts by weekKey and receptionist
  const receptionistUsers = SYSTEM_USERS.filter((u) => u.role !== 'admin');

  // Build weekly summaries
  const allWeekKeys = Array.from(
    new Set([
      currentWeekInfo.weekKey,
      ...shiftsHistory.map((s) => getWeekRange(s.endTime || s.startTime).weekKey),
    ])
  ).sort().reverse();

  // Filter shifts belonging to the selected week
  const weekShifts = shiftsHistory.filter(
    (s) => getWeekRange(s.endTime || s.startTime).weekKey === selectedWeekKey
  );

  // Compute stats per receptionist for this week
  const receptionistReports = receptionistUsers.map((user) => {
    const userShifts = weekShifts.filter((s) => s.receptionistId === user.id);
    const totalExpectedCash = userShifts.reduce((sum, s) => sum + s.expectedCash, 0);
    const totalExpectedQr = userShifts.reduce((sum, s) => sum + s.expectedQr, 0);
    const totalDeclaredCash = userShifts.reduce((sum, s) => sum + (s.declaredCash || 0), 0);
    const totalDeclaredQr = userShifts.reduce((sum, s) => sum + (s.declaredQr || 0), 0);
    const totalDiscount = userShifts.reduce((sum, s) => sum + (s.discountAmount || 0), 0);
    const totalRooms = userShifts.reduce((sum, s) => sum + s.salesCount, 0);

    return {
      user,
      shifts: userShifts,
      shiftCount: userShifts.length,
      totalExpectedCash,
      totalExpectedQr,
      totalDeclaredCash,
      totalDeclaredQr,
      totalDiscount,
      totalRooms,
      hasDiscounts: totalDiscount > 0,
    };
  });

  const totalWeekDiscounts = receptionistReports.reduce((sum, r) => sum + r.totalDiscount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-brand-600" />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Reporte de Descuentos Semanales de Caja
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cálculo consolidado de faltantes por turno acumulados para el pago de nómina semanal de cada recepcionista.
          </p>
        </div>

        {/* Week Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedWeekKey}
            onChange={(e) => setSelectedWeekKey(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {allWeekKeys.map((wKey) => (
              <option key={wKey} value={wKey}>
                {wKey === currentWeekInfo.weekKey ? `⭐ Semana Actual (${wKey})` : `Semana ${wKey}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Receptionists Weekly KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {receptionistReports.map((rep) => (
          <div
            key={rep.user.id}
            className={`bg-white rounded-2xl border-2 p-5 shadow-sm space-y-4 relative overflow-hidden ${
              rep.hasDiscounts ? 'border-rose-300' : 'border-slate-200'
            }`}
          >
            {/* Receptionist Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${rep.user.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{rep.user.name}</h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {rep.user.shiftName}
                  </span>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {rep.shiftCount} turnos esta semana
              </span>
            </div>

            {/* Financial Totals */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 font-bold block mb-0.5">Efectivo Total Decl.</span>
                <span className="text-base font-extrabold font-mono text-slate-800">
                  {formatBs(rep.totalDeclaredCash)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Esperado: {formatBs(rep.totalExpectedCash)}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 font-bold block mb-0.5">QR Total Verificado</span>
                <span className="text-base font-extrabold font-mono text-slate-800">
                  {formatBs(rep.totalDeclaredQr)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Esperado: {formatBs(rep.totalExpectedQr)}
                </span>
              </div>
            </div>

            {/* Total Discount to apply on payroll */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                rep.hasDiscounts
                  ? 'bg-rose-50 border-rose-200 text-brand-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {rep.hasDiscounts ? (
                  <AlertTriangle className="w-5 h-5 text-brand-600 shrink-0" />
                ) : (
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider block">
                    {rep.hasDiscounts ? 'Descuento Semanal a Aplicar' : 'Sin Descuentos Pendientes'}
                  </span>
                  <span className="text-[10px] opacity-80">
                    {rep.hasDiscounts
                      ? 'Deducir del pago semanal por faltantes acumulados'
                      : 'Todas las cajas cuadraron correctamente'}
                  </span>
                </div>
              </div>

              <span
                className={`text-2xl font-black font-mono tracking-tight ${
                  rep.hasDiscounts ? 'text-brand-700' : 'text-emerald-700'
                }`}
              >
                {rep.hasDiscounts ? `-${formatBs(rep.totalDiscount)}` : '0 Bs'}
              </span>
            </div>

            {/* Shifts list for this receptionist */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Desglose diario de turnos ({rep.shifts.length}):
              </span>

              {rep.shifts.length === 0 ? (
                <div className="text-center py-4 bg-slate-50 rounded-xl text-slate-400 text-xs border border-dashed border-slate-200">
                  No registra turnos cerrados en esta semana.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {rep.shifts.map((s) => {
                    const hasShiftDisc = (s.discountAmount || 0) > 0;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800 block">
                            {formatDateOnly(s.endTime || s.startTime)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {s.salesCount} hab. atendidas • Efec: {formatBs(s.declaredCash || 0)} / QR: {formatBs(s.declaredQr || 0)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-bold text-xs ${
                              hasShiftDisc ? 'text-brand-700' : 'text-emerald-600'
                            }`}
                          >
                            {hasShiftDisc ? `-${formatBs(s.discountAmount)}` : 'Cuadrado'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Total Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-rose-300 block mb-1">
            Resumen Total de Nómina Semanal ({selectedWeekKey})
          </span>
          <p className="text-xs text-slate-300">
            Total acumulado a descontar entre todo el personal de recepción esta semana.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 uppercase font-bold block">
            Total Descuentos Semanales
          </span>
          <span className="text-3xl font-black font-mono text-rose-400">
            {formatBs(totalWeekDiscounts)}
          </span>
        </div>
      </div>
    </div>
  );
};

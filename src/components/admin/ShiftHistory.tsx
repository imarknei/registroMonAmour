import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Shift, Stay } from '../../types';
import { formatBs } from '../../utils/formatUtils';
import { formatDateTime, formatTimeOnly } from '../../utils/timeUtils';
import {
  History,
  DollarSign,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  UserCheck,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  Car,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

export const ShiftHistory: React.FC = () => {
  const { shiftsHistory, completedStays, rooms } = useApp();

  const [filterReceptionist, setFilterReceptionist] = useState<string>('all');
  const [filterDiscrepancy, setFilterDiscrepancy] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);

  // Separate active/open shifts vs closed shifts
  const activeOpenShifts = shiftsHistory.filter((s) => s.status === 'open');
  const closedShifts = shiftsHistory.filter((s) => s.status === 'closed');

  const filteredClosedShifts = closedShifts.filter((s) => {
    const matchRecep = filterReceptionist === 'all' || s.receptionistId === filterReceptionist;
    const matchDisc =
      filterDiscrepancy === 'all' ||
      (filterDiscrepancy === 'faltante' && (s.discountAmount || 0) > 0) ||
      (filterDiscrepancy === 'cuadrado' && (!s.discountAmount || s.discountAmount === 0));
    const matchQuery =
      searchQuery === '' ||
      s.receptionistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.responsiblePersonName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchRecep && matchDisc && matchQuery;
  });

  const totalClosedShiftsCount = closedShifts.length;
  const totalFaltantesSum = closedShifts.reduce((sum, s) => sum + (s.discountAmount || 0), 0);
  const totalRevenueAudited = closedShifts.reduce(
    (sum, s) => sum + (s.declaredCash || 0) + (s.declaredQr || 0),
    0
  );

  // Helper to find stays for a shift
  const getStaysForShift = (shift: Shift): Stay[] => {
    const shiftStart = new Date(shift.startTime).getTime();
    const shiftEnd = shift.endTime ? new Date(shift.endTime).getTime() : Date.now();

    return completedStays.filter((s) => {
      if (shift.stayIds && shift.stayIds.includes(s.id)) return true;
      const stayTime = new Date(s.startTime).getTime();
      const matchRecep = s.receptionistId === shift.receptionistId || s.receptionistName.includes(shift.receptionistName);
      return matchRecep && stayTime >= shiftStart - 1000 * 60 * 60 && stayTime <= shiftEnd + 1000 * 60 * 60;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-brand-600" />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Historial de Cierres de Turno y Arqueos en Vivo
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisión global de cajas abiertas en curso y auditoría completa de turnos cerrados por los recepcionistas.
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🟢 SECCIÓN: TURNOS ACTIVOS EN CURSO (EN VIVO) */}
      {/* ======================================================== */}
      {activeOpenShifts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Turnos Actualmente Abiertos en Recepción ({activeOpenShifts.length})
            </h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Sincronizado en Vivo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOpenShifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-white rounded-2xl border-2 border-emerald-300 shadow-sm p-4 space-y-3 relative overflow-hidden group"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <strong className="text-slate-900 font-extrabold text-sm">{shift.receptionistName}</strong>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      TURNO ACTIVO
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Desde: {formatDateTime(shift.startTime)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Ventas Efectivo</span>
                    <strong className="text-emerald-700 font-mono font-black">{formatBs(shift.expectedCash)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Ventas QR</span>
                    <strong className="text-sky-700 font-mono font-black">{formatBs(shift.expectedQr)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Habitaciones</span>
                    <strong className="text-slate-800 font-bold">{shift.salesCount} ventas</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-500 font-medium">
                    Fondo inicial de caja: <strong>{formatBs(shift.initialCashFloat || 100)}</strong>
                  </span>
                  <span className="text-slate-900 font-black font-mono bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Total en Gaveta: {formatBs((shift.initialCashFloat || 100) + shift.expectedCash)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Turnos Cerrados
          </span>
          <span className="text-2xl font-black text-slate-800 block mt-1">
            {totalClosedShiftsCount} turnos
          </span>
          <span className="text-xs text-slate-500">Histórico auditado en la base de datos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
            Recaudación Total Auditada
          </span>
          <span className="text-2xl font-black font-mono text-emerald-950 block mt-1">
            {formatBs(totalRevenueAudited)}
          </span>
          <span className="text-xs text-slate-500">Suma total de efectivo y QR declarado</span>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-sm ${
            totalFaltantesSum > 0
              ? 'bg-rose-50 border-rose-200 text-brand-900'
              : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Faltantes / Descuentos
          </span>
          <span
            className={`text-2xl font-black font-mono block mt-1 ${
              totalFaltantesSum > 0 ? 'text-brand-700' : 'text-slate-800'
            }`}
          >
            {formatBs(totalFaltantesSum)}
          </span>
          <span className="text-xs text-slate-500">Descuentos acumulados en salarios</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
            <Filter className="w-4 h-4 text-slate-400" />
            Filtrar:
          </div>

          <select
            value={filterReceptionist}
            onChange={(e) => setFilterReceptionist(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">👥 Todos los Recepcionistas</option>
            <option value="user-recep-dia">👤 Recepcionista Día</option>
            <option value="user-recep-noche">👤 Recepcionista Noche</option>
          </select>

          <select
            value={filterDiscrepancy}
            onChange={(e) => setFilterDiscrepancy(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">Todos los Estados de Caja</option>
            <option value="faltante">⚠️ Solo con Faltante / Descuento</option>
            <option value="cuadrado">✅ Solo Cuadrados Correctamente</option>
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por recepcionista, nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-700 focus:outline-none w-48 focus:w-60 transition-all"
            />
          </div>
        </div>

        <span className="text-xs text-slate-400 font-semibold">
          Mostrando {filteredClosedShifts.length} turnos cerrados
        </span>
      </div>

      {/* Shifts History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider font-extrabold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Recepcionista / Turno</th>
                <th className="py-3 px-4 text-right">Efectivo (Esp. vs Decl.)</th>
                <th className="py-3 px-4 text-right">QR (Esp. vs Decl.)</th>
                <th className="py-3 px-4 text-center">Habitaciones</th>
                <th className="py-3 px-4 text-center">Arqueo</th>
                <th className="py-3 px-4 text-right">Descuento</th>
                <th className="py-3 px-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClosedShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    No se han registrado cierres de turno todavía.
                  </td>
                </tr>
              ) : (
                filteredClosedShifts.map((shift) => {
                  const hasDiscount = (shift.discountAmount || 0) > 0;
                  const isExpanded = expandedShiftId === shift.id;
                  const shiftStays = getStaysForShift(shift);

                  return (
                    <React.Fragment key={shift.id}>
                      <tr
                        onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                        className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">
                            {shift.endTime ? formatDateTime(shift.endTime) : formatDateTime(shift.startTime)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Inicio: {formatDateTime(shift.startTime)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{shift.receptionistName}</span>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5">
                            <span>Entregó:</span>
                            <strong className="text-brand-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                              {shift.responsiblePersonName || shift.receptionistName}
                            </strong>
                          </div>
                          {shift.notes && (
                            <span className="text-[10px] text-slate-400 italic block mt-0.5">
                              "{shift.notes}"
                            </span>
                          )}
                        </td>

                        {/* Cash */}
                        <td className="py-3.5 px-4 text-right font-mono">
                          <div className="font-bold text-slate-900">
                            {formatBs(shift.declaredCash ?? 0)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Esp: {formatBs(shift.expectedCash)}
                          </div>
                          <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                            Gaveta: {formatBs(shift.totalPhysicalCashInDrawer || ((shift.declaredCash || 0) + (shift.initialCashFloat || 100)))}
                          </div>
                        </td>

                        {/* QR */}
                        <td className="py-3.5 px-4 text-right font-mono">
                          <div className="font-bold text-slate-900">
                            {formatBs(shift.declaredQr ?? 0)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Esp: {formatBs(shift.expectedQr)}
                          </div>
                        </td>

                        {/* Room count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold px-2 py-0.5 bg-slate-100 rounded-md text-slate-700 block">
                            {shift.salesCount} habitaciones
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              hasDiscount
                                ? 'bg-rose-100 text-brand-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {hasDiscount ? (
                              <>
                                <AlertTriangle className="w-3 h-3 text-brand-600" />
                                Faltante
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Cuadrado
                              </>
                            )}
                          </span>
                        </td>

                        {/* Discount amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold">
                          {hasDiscount ? (
                            <span className="text-brand-700 text-sm">
                              -{formatBs(shift.discountAmount)}
                            </span>
                          ) : (
                            <span className="text-emerald-700">0.00 Bs</span>
                          )}
                        </td>

                        {/* Expand Button */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDED ROW: HABITACIONES DE ESTE TURNO */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan={8} className="p-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-inner">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                                  <Layers className="w-4 h-4 text-brand-600" />
                                  Habitaciones registradas en este turno ({shiftStays.length})
                                </h4>
                                <span className="text-[11px] font-bold text-slate-400">
                                  Cierre: {formatDateTime(shift.endTime || shift.startTime)}
                                </span>
                              </div>

                              {shiftStays.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2">
                                  No hay detalle de habitaciones individuales vinculado a este turno antiguo.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {shiftStays.map((s) => {
                                    const consTotal = (s.consumptions || []).reduce((sum, c) => sum + c.subtotal, 0);
                                    return (
                                      <div
                                        key={s.id}
                                        className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 text-xs space-y-1"
                                      >
                                        <div className="flex items-center justify-between">
                                          <strong className="text-slate-900 font-bold">{s.roomName}</strong>
                                          <span className="font-mono font-black text-brand-700">
                                            {formatBs(s.totalAmount || s.baseRoomPrice)}
                                          </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                          <span>Plan: <strong className="uppercase">{s.chosenPlan}</strong> ({formatBs(s.baseRoomPrice)})</span>
                                          <span>Entrada: {formatTimeOnly(s.startTime)}</span>
                                        </div>

                                        {(s.consumptions || []).length > 0 && (
                                          <div className="text-[10px] text-slate-600 bg-white p-1 rounded border border-slate-200 flex flex-wrap gap-1">
                                            {s.consumptions.map((c) => (
                                              <span key={c.id}>
                                                {c.quantity}x {c.productName} ({formatBs(c.subtotal)})
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

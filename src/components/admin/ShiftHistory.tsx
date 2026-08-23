import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Shift } from '../../types';
import { formatBs } from '../../utils/formatUtils';
import { formatDateTime } from '../../utils/timeUtils';
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
} from 'lucide-react';

export const ShiftHistory: React.FC = () => {
  const { shiftsHistory } = useApp();

  const [filterReceptionist, setFilterReceptionist] = useState<string>('all');
  const [filterDiscrepancy, setFilterDiscrepancy] = useState<string>('all');

  const filteredShifts = shiftsHistory.filter((s) => {
    const matchRecep = filterReceptionist === 'all' || s.receptionistId === filterReceptionist;
    const matchDisc =
      filterDiscrepancy === 'all' ||
      (filterDiscrepancy === 'faltante' && (s.discountAmount || 0) > 0) ||
      (filterDiscrepancy === 'cuadrado' && (!s.discountAmount || s.discountAmount === 0));
    return matchRecep && matchDisc;
  });

  const totalClosedShifts = shiftsHistory.length;
  const totalFaltantesSum = shiftsHistory.reduce((sum, s) => sum + (s.discountAmount || 0), 0);
  const totalRevenueAudited = shiftsHistory.reduce(
    (sum, s) => sum + (s.declaredCash || 0) + (s.declaredQr || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-brand-600" />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Historial de Cierres de Turno y Arqueos
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro cronológico detallado de todos los turnos cerrados por los recepcionistas con auditoría de efectivo y QR.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Turnos Registrados
          </span>
          <span className="text-2xl font-extrabold text-slate-800 block mt-1">
            {totalClosedShifts} turnos
          </span>
          <span className="text-xs text-slate-500">Histórico de cajas cerradas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Recaudación Total Auditada
          </span>
          <span className="text-2xl font-extrabold font-mono text-emerald-700 block mt-1">
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
            className={`text-2xl font-extrabold font-mono block mt-1 ${
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
            <option value="all">Todos los Recepcionistas</option>
            <option value="user-recep-dia">Recepcionista Día</option>
            <option value="user-recep-noche">Recepcionista Noche</option>
          </select>

          <select
            value={filterDiscrepancy}
            onChange={(e) => setFilterDiscrepancy(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="all">Todos los Estados de Caja</option>
            <option value="faltante">Solo con Faltante / Descuento</option>
            <option value="cuadrado">Solo Cuadrados Correctamente</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-semibold">
          Mostrando {filteredShifts.length} registros
        </span>
      </div>

      {/* Shifts History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Fecha y Hora</th>
                <th className="py-3.5 px-4">Recepcionista / Turno</th>
                <th className="py-3.5 px-4 text-right">Efectivo (Esp. vs Decl.)</th>
                <th className="py-3.5 px-4 text-right">Vendis / QR (Esp. vs Decl.)</th>
                <th className="py-3.5 px-4 text-center">Habitaciones</th>
                <th className="py-3.5 px-4 text-center">Arqueo</th>
                <th className="py-3.5 px-4 text-right">Descuento Turno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    No se han registrado cierres de turno todavía. Los cierres se guardarán aquí una vez que los recepcionistas cierren su turno.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => {
                  const hasDiscount = (shift.discountAmount || 0) > 0;
                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">
                          {shift.endTime ? formatDateTime(shift.endTime) : formatDateTime(shift.startTime)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Inicio: {formatDateTime(shift.startTime)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{shift.receptionistName}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-0.5">
                          <span className="font-semibold">Entregó:</span>
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
                        <div className="font-bold text-slate-800">
                          {formatBs(shift.declaredCash ?? 0)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Esp: {formatBs(shift.expectedCash)}
                        </div>
                        <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                          Gaveta: {formatBs(shift.totalPhysicalCashInDrawer || ((shift.declaredCash || 0) + (shift.initialCashFloat || 100)))} (Fondo: {formatBs(shift.initialCashFloat || 100)})
                        </div>
                      </td>

                      {/* QR */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="font-bold text-slate-800">
                          {formatBs(shift.declaredQr ?? 0)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Esp: {formatBs(shift.expectedQr)}
                        </div>
                      </td>

                      {/* Room count & Handover */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold px-2 py-0.5 bg-slate-100 rounded-md text-slate-700 block">
                          {shift.salesCount} cerradas
                        </span>
                        {shift.handoverActiveRoomsCount !== undefined && shift.handoverActiveRoomsCount > 0 && (
                          <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold block mt-1">
                            +{shift.handoverActiveRoomsCount} traspasadas
                          </span>
                        )}
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
                          <span className="text-emerald-700">0 Bs</span>
                        )}
                      </td>
                    </tr>
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

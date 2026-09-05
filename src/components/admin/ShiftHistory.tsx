import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Shift, Stay, Expense, InventoryMovementLog, ExtraConsumption, StaffConsumption } from '../../types';
import { formatBs, getPaymentMethodLabel } from '../../utils/formatUtils';
import { formatDateTime, formatTimeOnly, formatDateOnly } from '../../utils/timeUtils';
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
  Landmark,
  ShieldCheck,
  Receipt,
  MinusCircle,
  CalendarDays,
  Coins,
  ArrowRightLeft,
  Check,
  Edit3,
  Package,
  Coffee,
  Trash2,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { SYSTEM_USERS } from '../../data/initialData';
import { ShiftAdjustmentModal } from './ShiftAdjustmentModal';

export const ShiftHistory: React.FC = () => {
  const {
    shiftsHistory,
    completedStays,
    rooms,
    expenses,
    inventoryLogs,
    extraConsumptions,
    staffConsumptions,
    cleanupOrphanShifts,
    updateShiftInHistory,
    deleteShiftFromHistory,
  } = useApp();

  // Filtros
  const [selectedDateMode, setSelectedDateMode] = useState<'all' | 'today' | 'yesterday' | 'week' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [filterReceptionist, setFilterReceptionist] = useState<string>('all');
  const [filterDiscrepancy, setFilterDiscrepancy] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);
  const [adjustingShift, setAdjustingShift] = useState<Shift | null>(null);

  // Turnos abiertos (en vivo) vs turnos cerrados (historial)
  const activeOpenShifts = shiftsHistory.filter((s) => s.status === 'open');
  const closedShifts = shiftsHistory.filter((s) => s.status === 'closed');

  // Detección de turnos cerrados con faltante sospechoso por retiro de ventas no asentado
  const suspiciousShifts = useMemo(() => {
    return closedShifts.filter((s) => {
      const hasDeficit = (s.discountAmount || 0) > 0 || (s.totalDifference && s.totalDifference < -0.01);
      const noDeliveredRecorded = !s.cashDeliveredAtClose || s.cashDeliveredAtClose === 0;
      const hasCashSales = (s.expectedCash || 0) > 0;
      const floatOnly = s.totalPhysicalCashInDrawer === s.handoverCashFloat || (s.declaredCash || 0) === 0;
      const deficitMatchesSales = (s.discountAmount || 0) >= (s.expectedCash || 0) * 0.8;
      return hasDeficit && noDeliveredRecorded && hasCashSales && (floatOnly || deficitMatchesSales);
    });
  }, [closedShifts]);

  const handleAutoRepairAllSuspicious = () => {
    if (suspiciousShifts.length === 0) return;
    const confirm = window.confirm(
      `¿Deseas asentar automáticamente el retiro de ventas en los ${suspiciousShifts.length} turnos detectados para cuadrarlos a 0.00 Bs?`
    );
    if (!confirm) return;

    suspiciousShifts.forEach((s) => {
      const floatLeft = s.handoverCashFloat !== undefined ? s.handoverCashFloat : (s.initialCashFloat || 100);
      updateShiftInHistory(s.id, {
        cashDeliveredAtClose: s.expectedCash,
        totalPhysicalCashInDrawer: floatLeft + (s.expectedCash || 0),
        declaredQrVendis: s.declaredQrVendis || s.expectedQrVendis || 0,
        declaredQrUnion: s.declaredQrUnion || s.expectedQrUnion || 0,
        notes: (s.notes ? s.notes + ' | ' : '') + 'Asentado retiro de ventas en efectivo entregado a administración.',
      });
    });
  };

  // Rango de fechas seleccionado
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekStart = todayStart - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 24 * 60 * 60 * 1000;

    let customStart = 0;
    let customEnd = Infinity;
    if (selectedDateMode === 'custom' && customDate) {
      const parts = customDate.split('-');
      if (parts.length === 3) {
        customStart = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
        customEnd = customStart + 24 * 60 * 60 * 1000;
      }
    }

    return {
      todayStart,
      todayEnd,
      yesterdayStart,
      weekStart,
      customStart,
      customEnd,
    };
  }, [selectedDateMode, customDate]);

  // Filtrar turnos cerrados según fecha, recepcionista, discrepancia y búsqueda
  const filteredClosedShifts = useMemo(() => {
    return closedShifts.filter((s) => {
      const shiftTime = new Date(s.endTime || s.startTime).getTime();

      // Filtro de fecha
      if (selectedDateMode === 'today' && shiftTime < dateRangeBounds.todayStart) return false;
      if (selectedDateMode === 'yesterday' && (shiftTime < dateRangeBounds.yesterdayStart || shiftTime >= dateRangeBounds.todayStart)) return false;
      if (selectedDateMode === 'week' && shiftTime < dateRangeBounds.weekStart) return false;
      if (selectedDateMode === 'custom' && (shiftTime < dateRangeBounds.customStart || shiftTime >= dateRangeBounds.customEnd)) return false;

      // Filtro de recepcionista
      if (filterReceptionist !== 'all' && s.receptionistId !== filterReceptionist) return false;

      // Filtro de discrepancia
      if (filterDiscrepancy === 'faltante' && (!s.discountAmount || s.discountAmount <= 0)) return false;
      if (filterDiscrepancy === 'demasia' && (!s.surplusAmount || s.surplusAmount <= 0)) return false;
      if (filterDiscrepancy === 'cuadrado' && (s.discountAmount || 0) > 0) return false;

      // Búsqueda
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchRecep = s.receptionistName.toLowerCase().includes(q);
        const matchResp = (s.responsiblePersonName || '').toLowerCase().includes(q);
        const matchNotes = (s.notes || '').toLowerCase().includes(q);
        if (!matchRecep && !matchResp && !matchNotes) return false;
      }

      return true;
    });
  }, [closedShifts, selectedDateMode, dateRangeBounds, filterReceptionist, filterDiscrepancy, searchQuery]);

  // Agregados Financieros de los turnos filtrados
  const auditMetrics = useMemo(() => {
    const totalCount = filteredClosedShifts.length;
    let exactCount = 0;
    let deficitCount = 0;
    let surplusCount = 0;

    let totalExpectedCashSum = 0;
    let totalExpectedQrVendisSum = 0;
    let totalExpectedQrUnionSum = 0;
    let totalExpectedQrSum = 0;
    let totalExpensesCashSum = 0;
    let totalExpensesQrSum = 0;

    let totalDeclaredCashSum = 0;
    let totalDeclaredQrVendisSum = 0;
    let totalDeclaredQrUnionSum = 0;
    let totalDeclaredQrSum = 0;

    let totalDiscountSum = 0;
    let totalSurplusSum = 0;

    filteredClosedShifts.forEach((s) => {
      const discount = s.discountAmount || (s.totalDifference && s.totalDifference < 0 ? Math.abs(s.totalDifference) : 0);
      const surplus = s.surplusAmount || (s.totalDifference && s.totalDifference > 0 ? s.totalDifference : 0);

      if (discount > 0) deficitCount++;
      else if (surplus > 0) surplusCount++;
      else exactCount++;

      totalExpectedCashSum += s.expectedCash || 0;
      totalExpectedQrVendisSum += s.expectedQrVendis || 0;
      totalExpectedQrUnionSum += s.expectedQrUnion || 0;
      totalExpectedQrSum += s.expectedQr || (s.expectedQrVendis || 0) + (s.expectedQrUnion || 0);

      totalExpensesCashSum += s.totalExpensesCash || 0;
      totalExpensesQrSum += s.totalExpensesQr || 0;

      totalDeclaredCashSum += s.declaredCash || 0;
      totalDeclaredQrVendisSum += s.declaredQrVendis || 0;
      totalDeclaredQrUnionSum += s.declaredQrUnion || 0;
      totalDeclaredQrSum += s.declaredQr || (s.declaredQrVendis || 0) + (s.declaredQrUnion || 0);

      totalDiscountSum += discount;
      totalSurplusSum += surplus;
    });

    const totalAuditedRevenue = totalDeclaredCashSum + totalDeclaredQrSum;

    return {
      totalCount,
      exactCount,
      deficitCount,
      surplusCount,
      totalExpectedCashSum,
      totalExpectedQrVendisSum,
      totalExpectedQrUnionSum,
      totalExpectedQrSum,
      totalExpensesCashSum,
      totalExpensesQrSum,
      totalDeclaredCashSum,
      totalDeclaredQrVendisSum,
      totalDeclaredQrUnionSum,
      totalDeclaredQrSum,
      totalDiscountSum,
      totalSurplusSum,
      totalAuditedRevenue,
    };
  }, [filteredClosedShifts]);

  // Helper para buscar estadías de un turno (cotejo exacto sin solapamiento ni duplicación)
  const getStaysForShift = (shift: Shift): Stay[] => {
    const shiftStart = new Date(shift.startTime).getTime();
    const shiftEnd = shift.endTime ? new Date(shift.endTime).getTime() : Infinity;

    return completedStays.filter((s) => {
      // 1. Vinculación directa por ID de turno
      if (s.checkoutShiftId === shift.id || s.entryShiftId === shift.id) return true;
      if (shift.stayIds && shift.stayIds.includes(s.id)) return true;

      // 2. Solo si no tiene IDs asignados (estadías legacy): cotejo estricto de tiempo
      if (!s.checkoutShiftId && !s.entryShiftId) {
        const t = s.endTime ? new Date(s.endTime).getTime() : new Date(s.startTime).getTime();
        const matchesReceptionist =
          s.receptionistId === shift.receptionistId ||
          s.receptionistName?.toLowerCase().includes(shift.receptionistName?.toLowerCase()) ||
          (shift.responsiblePersonName && s.receptionistName?.toLowerCase().includes(shift.responsiblePersonName.toLowerCase()));
        return matchesReceptionist && t >= shiftStart && t < shiftEnd;
      }

      return false;
    });
  };

  // Helper para buscar modificaciones de inventario hechas en el turno
  const getInventoryLogsForShift = (shift: Shift): InventoryMovementLog[] => {
    const shiftStart = new Date(shift.startTime).getTime();
    const shiftEnd = shift.endTime ? new Date(shift.endTime).getTime() : Infinity;

    return inventoryLogs.filter((l) => {
      if (l.shiftId && l.shiftId === shift.id) return true;
      const t = l.timestamp ? new Date(l.timestamp).getTime() : new Date(l.date).getTime();
      return t >= shiftStart && t < shiftEnd;
    });
  };

  // Helper para buscar ventas directas / mostrador del turno
  const getExtraConsumptionsForShift = (shift: Shift): ExtraConsumption[] => {
    const shiftStart = new Date(shift.startTime).getTime();
    const shiftEnd = shift.endTime ? new Date(shift.endTime).getTime() : Infinity;

    return extraConsumptions.filter((c) => {
      if (c.shiftId && c.shiftId === shift.id) return true;
      const t = new Date(c.date).getTime();
      return t >= shiftStart && t < shiftEnd;
    });
  };

  // Helper para buscar consumos de personal del turno
  const getStaffConsumptionsForShift = (shift: Shift): StaffConsumption[] => {
    const shiftStart = new Date(shift.startTime).getTime();
    const shiftEnd = shift.endTime ? new Date(shift.endTime).getTime() : Infinity;

    return staffConsumptions.filter((c) => {
      if (c.shiftId && c.shiftId === shift.id) return true;
      const t = new Date(c.date).getTime();
      return t >= shiftStart && t < shiftEnd;
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & BARRA DE AUDITORÍA */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Auditoría de Cierres de Turno y Cuadre de Caja
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Cotejo de valores declarados a ciegas (Efectivo, QR Vendis y QR Banco Unión), control de faltantes y demasías.
              </p>
            </div>
          </div>

          {/* SELECTOR DE FECHAS / DÍAS */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-600" />
              Período:
            </span>

            <button
              onClick={() => setSelectedDateMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                selectedDateMode === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Todo
            </button>

            <button
              onClick={() => setSelectedDateMode('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                selectedDateMode === 'today'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Hoy
            </button>

            <button
              onClick={() => setSelectedDateMode('yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                selectedDateMode === 'yesterday'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Ayer
            </button>

            <button
              onClick={() => setSelectedDateMode('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                selectedDateMode === 'week'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Esta Semana
            </button>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setSelectedDateMode('custom');
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                  selectedDateMode === 'custom'
                    ? 'border-brand-600 bg-rose-50 text-brand-800'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 2. TARJETAS KPIS DE AUDITORÍA */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Turnos Auditados */}
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Turnos Auditados</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black font-mono">{auditMetrics.totalCount}</span>
              <span className="text-[10px] text-slate-400">turnos</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold block mt-1">
              {auditMetrics.exactCount} exactos / cuadrados
            </span>
          </div>

          {/* Ventas Efectivo */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Ventas Efectivo</span>
            <span className="text-lg font-black font-mono text-emerald-700 block mt-0.5">
              {formatBs(auditMetrics.totalDeclaredCashSum)}
            </span>
            <span className="text-[10px] text-slate-400">declarado en turnos</span>
          </div>

          {/* QR Vendis */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">QR Vendis</span>
            <span className="text-lg font-black font-mono text-sky-700 block mt-0.5">
              {formatBs(auditMetrics.totalDeclaredQrVendisSum)}
            </span>
            <span className="text-[10px] text-slate-400">comprobantes Vendis</span>
          </div>

          {/* QR Banco Unión */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">QR Banco Unión</span>
            <span className="text-lg font-black font-mono text-indigo-700 block mt-0.5">
              {formatBs(auditMetrics.totalDeclaredQrUnionSum)}
            </span>
            <span className="text-[10px] text-slate-400">transferencias B. Unión</span>
          </div>

          {/* Faltantes / Descuentos */}
          <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 shadow-sm">
            <span className="text-[10px] uppercase font-black text-rose-800 block">Faltantes (Descuentos)</span>
            <span className="text-lg font-black font-mono text-rose-700 block mt-0.5">
              -{formatBs(auditMetrics.totalDiscountSum)}
            </span>
            <span className="text-[10px] text-rose-600 font-bold">
              {auditMetrics.deficitCount} turno(s) con faltante
            </span>
          </div>

          {/* Demasías / Sobrantes */}
          <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 shadow-sm">
            <span className="text-[10px] uppercase font-black text-emerald-800 block">Demasías (Sobrantes)</span>
            <span className="text-lg font-black font-mono text-emerald-700 block mt-0.5">
              +{formatBs(auditMetrics.totalSurplusSum)}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">
              {auditMetrics.surplusCount} turno(s) con demasía
            </span>
          </div>
        </div>

        {/* 3. FILTROS ADICIONALES (Recepcionista & Discrepancia) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Recepcionista */}
            <select
              value={filterReceptionist}
              onChange={(e) => setFilterReceptionist(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value="all">👤 Todos los Recepcionistas</option>
              <option value="user-recep-dia">Recepcionista Día</option>
              <option value="user-recep-noche">Recepcionista Noche</option>
            </select>

            {/* Discrepancia */}
            <select
              value={filterDiscrepancy}
              onChange={(e) => setFilterDiscrepancy(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value="all">⚖️ Todos los Estados de Cuadre</option>
              <option value="cuadrado">✅ Solo Cuadrados Exactos</option>
              <option value="faltante">🔴 Solo con Faltante (Descuento)</option>
              <option value="demasia">🟢 Solo con Demasía (Sobrante)</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar recepcionista, responsable, nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🟢 SECCIÓN: TURNO ACTIVO EN CURSO (EN VIVO) */}
      {/* ======================================================== */}
      {activeOpenShifts.length > 0 && (
        <div className="space-y-3">
          {/* Alerta de Consolidación si hay múltiples abiertos */}
          {activeOpenShifts.length > 1 && (
            <div className="bg-amber-50 rounded-3xl p-4 sm:p-5 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 shadow-sm animate-fade-in">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-black block">
                    Se detectaron {activeOpenShifts.length} turnos con estado abierto en la base de datos
                  </strong>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Para mantener el cuadre estricto de caja, la recepción debe operar con exactamente 1 turno activo. Puedes consolidarlos con un solo clic.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => cleanupOrphanShifts()}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <span>🧹 Consolidar a 1 Solo Turno</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Turno Actualmente Abierto en Recepción (1)
            </h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Sincronizado en Vivo Nube
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOpenShifts.slice(0, 1).map((shift) => (
              <div
                key={shift.id}
                className="bg-white rounded-3xl border-2 border-emerald-300 shadow-sm p-5 space-y-3.5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <strong className="text-slate-900 font-extrabold text-sm block">{shift.receptionistName}</strong>
                      <span className="text-[10px] text-slate-400">Inicio: {formatDateTime(shift.startTime)}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    TURNO EN CURSO
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Caja Chica Inicial</span>
                    <strong className="text-slate-800 font-mono">{formatBs(shift.initialCashFloat || 100)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Ventas Efec.</span>
                    <strong className="text-emerald-700 font-mono">+{formatBs(shift.expectedCash)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Ventas QR</span>
                    <strong className="text-sky-700 font-mono">+{formatBs(shift.expectedQr)}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Habitaciones registradas: <strong>{shift.salesCount}</strong></span>
                  {(shift.totalExpensesCash || 0) + (shift.totalExpensesQr || 0) > 0 && (
                    <span className="text-rose-600 font-bold">
                      Pagos: -{formatBs((shift.totalExpensesCash || 0) + (shift.totalExpensesQr || 0))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📋 SECCIÓN: HISTORIAL Y AUDITORÍA DE TURNOS CERRADOS */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-brand-600" />
            Turnos Cerrados Auditados ({filteredClosedShifts.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Orden cronológico descendente
          </span>
        </div>

        {/* Alerta de Retiros No Asentados en Turnos Históricos */}
        {suspiciousShifts.length > 0 && (
          <div className="bg-amber-50 rounded-3xl p-4 sm:p-5 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 shadow-sm animate-fade-in">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <strong className="text-xs sm:text-sm font-black block">
                  Se detectaron {suspiciousShifts.length} turnos con faltantes por retiros de ventas no asentados
                </strong>
                <p className="text-[11px] text-amber-800 font-medium">
                  El recepcionista entregó el efectivo de ventas en sobre o a administración sin registrar el retiro, generando falsos faltantes. Puedes cuadrarlos todos con un solo clic.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoRepairAllSuspicious}
              className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>⚡ Auto-Cuadrar ({suspiciousShifts.length}) Turnos</span>
            </button>
          </div>
        )}

        {filteredClosedShifts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <History className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-700">No se encontraron turnos cerrados</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No hay turnos registrados que coincidan con los filtros de fecha o recepcionista seleccionados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClosedShifts.map((shift) => {
              const isExpanded = expandedShiftId === shift.id;
              const shiftStays = getStaysForShift(shift);
              const shiftInventoryLogs = getInventoryLogsForShift(shift);
              const shiftExtraConsumptions = getExtraConsumptionsForShift(shift);
              const shiftStaffConsumptions = getStaffConsumptionsForShift(shift);
              const stayFrigobarCount = shiftStays.reduce((acc, s) => acc + (s.consumptions?.length || 0), 0);
              const isSuspicious = suspiciousShifts.some((susp) => susp.id === shift.id);

              // Cargar egresos asociados al turno de forma reactiva
              const shiftExpensesList =
                shift.expenses && shift.expenses.length > 0
                  ? shift.expenses
                  : expenses.filter((e) => {
                      if (e.shiftId === shift.id) return true;
                      const t = new Date(e.timestamp).getTime();
                      const start = new Date(shift.startTime).getTime();
                      const end = shift.endTime ? new Date(shift.endTime).getTime() : Infinity;
                      return t >= start && t <= end;
                    });

              const startingFloat = shift.initialCashFloat || 100;
              const handoverFloat = shift.handoverCashFloat !== undefined ? shift.handoverCashFloat : 100;
              const expectedSalesCash = shift.expectedCash || 0;
              const expectedSalesQrVendis = shift.expectedQrVendis || 0;
              const expectedSalesQrUnion = shift.expectedQrUnion || 0;
              const expectedSalesQrTotal = shift.expectedQr || (expectedSalesQrVendis + expectedSalesQrUnion);

              // Separar egresos operativos de retiros de administración
              const deliveredAtClose = shift.cashDeliveredAtClose || 0;
              let operationalExpensesCash = shift.totalExpensesCash || 0;
              if (deliveredAtClose > 0 && operationalExpensesCash >= deliveredAtClose) {
                operationalExpensesCash -= deliveredAtClose;
              }

              const expQrVendis = shift.totalExpensesQrVendis || 0;
              const expQrUnion = shift.totalExpensesQrUnion || 0;
              const expQrTotal = shift.totalExpensesQr || (expQrVendis + expQrUnion);

              // Lo que DEBÍA haber físicamente en gaveta antes del retiro
              const expectedCashInDrawer = Math.max(0, startingFloat + expectedSalesCash - operationalExpensesCash);

              // Lo declarado por el recepcionista
              const declaredCashInDrawer = shift.totalPhysicalCashInDrawer || 0;
              const declaredQrVendis = shift.declaredQrVendis || 0;
              const declaredQrUnion = shift.declaredQrUnion || 0;
              const declaredQrTotal = shift.declaredQr || (declaredQrVendis + declaredQrUnion);

              // Efectivo físico contado (si totalPhysicalCashInDrawer ya incluye todo, o si se anotó por separado):
              const effectiveCountedCash = Math.max(
                declaredCashInDrawer,
                handoverFloat + deliveredAtClose
              );

              // Diferencias exactas
              const diffCash = shift.differenceCash !== undefined ? shift.differenceCash : (effectiveCountedCash - expectedCashInDrawer);
              const diffQrVendis = shift.differenceQrVendis !== undefined ? shift.differenceQrVendis : (declaredQrVendis - (expectedSalesQrVendis - expQrVendis));
              const diffQrUnion = shift.differenceQrUnion !== undefined ? shift.differenceQrUnion : (declaredQrUnion - (expectedSalesQrUnion - expQrUnion));
              const totalDiff = shift.totalDifference !== undefined ? shift.totalDifference : (diffCash + (declaredQrTotal - (expectedSalesQrTotal - expQrTotal)));

              const hasDeficit = totalDiff < -0.01 || (shift.discountAmount || 0) > 0.01;
              const hasSurplus = totalDiff > 0.01 || (shift.surplusAmount || 0) > 0.01;
              const discountAmt = shift.discountAmount || (hasDeficit ? Math.abs(totalDiff) : 0);
              const surplusAmt = shift.surplusAmount || (hasSurplus ? totalDiff : 0);

              return (
                <div
                  key={shift.id}
                  className={`bg-white rounded-3xl border-2 shadow-sm transition-all overflow-hidden ${
                    hasDeficit
                      ? 'border-rose-300 hover:border-rose-400'
                      : hasSurplus
                      ? 'border-emerald-300 hover:border-emerald-400'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Encabezado del Turno */}
                  <div className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 uppercase">
                            {shift.shiftType === 'noche' ? '🌙 Turno Noche' : '☀️ Turno Día'}
                          </span>
                          <strong className="text-base font-black text-slate-900">
                            {shift.receptionistName}
                          </strong>
                          {shift.responsiblePersonName && (
                            <span className="text-xs text-slate-500 font-medium">
                              (Entregado por: <strong className="text-slate-800">{shift.responsiblePersonName}</strong>)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Inicio: {formatDateTime(shift.startTime)}</span>
                          <span>•</span>
                          <span>Cierre: {shift.endTime ? formatDateTime(shift.endTime) : 'En curso'}</span>
                        </div>
                      </div>

                      {/* BADGE DE ESTADO DE CUADRE Y BOTONES DE AJUSTE */}
                      <div className="flex flex-wrap items-center justify-end gap-2 text-right">
                        {isSuspicious && (
                          <button
                            type="button"
                            onClick={() =>
                              updateShiftInHistory(shift.id, {
                                cashDeliveredAtClose: shift.expectedCash,
                                totalPhysicalCashInDrawer: (shift.handoverCashFloat ?? (shift.initialCashFloat || 100)) + (shift.expectedCash || 0),
                                declaredQrVendis: shift.declaredQrVendis || shift.expectedQrVendis || 0,
                                declaredQrUnion: shift.declaredQrUnion || shift.expectedQrUnion || 0,
                                notes: (shift.notes ? shift.notes + ' | ' : '') + 'Asentado retiro de ventas en efectivo entregado a administración.',
                              })
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs shadow-sm flex items-center gap-1.5 transition-all"
                            title="Asentar retiro por el total de ventas en efectivo y cuadrar turno a 0.00 Bs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>⚡ Cuadrar Retiro ({formatBs(shift.expectedCash)})</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setAdjustingShift(shift)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>⚙️ Ajustar Arqueo</span>
                        </button>

                        {hasDeficit ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-black text-xs shadow-md shadow-rose-600/20">
                            <AlertTriangle className="w-4 h-4" />
                            <span>FALTANTE: -{formatBs(discountAmt)} (DESCUENTO)</span>
                          </div>
                        ) : hasSurplus ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-600/20">
                            <Sparkles className="w-4 h-4" />
                            <span>DEMASÍA: +{formatBs(surplusAmt)} (SOBRANTE)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>CUADRADO EXACTO (0.00 Bs)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ALERTA DE RETIRO NO ASENTADO DENTRO DE LA TARJETA */}
                    {isSuspicious && (
                      <div className="bg-amber-50 p-3 rounded-2xl border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            <strong>Retiro no registrado:</strong> Este turno tiene un faltante falso porque el efectivo de ventas ({formatBs(shift.expectedCash)}) fue retirado/entregado en sobre sin asentarse al cierre.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateShiftInHistory(shift.id, {
                              cashDeliveredAtClose: shift.expectedCash,
                              totalPhysicalCashInDrawer: (shift.handoverCashFloat ?? (shift.initialCashFloat || 100)) + (shift.expectedCash || 0),
                              declaredQrVendis: shift.declaredQrVendis || shift.expectedQrVendis || 0,
                              declaredQrUnion: shift.declaredQrUnion || shift.expectedQrUnion || 0,
                              notes: (shift.notes ? shift.notes + ' | ' : '') + 'Asentado retiro de ventas en efectivo entregado a administración.',
                            })
                          }
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shrink-0 shadow-sm"
                        >
                          ⚡ Cuadrar Turno a 0.00 Bs
                        </button>
                      </div>
                    )}

                    {/* COMPARADOR AUDITOR LADO A LADO: SISTEMA (ESPERADO) VS DECLARADO A CIEGAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. SISTEMA (ESPERADO) */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-brand-600" />
                            1. Esperado por el Sistema:
                          </span>
                          <span className="font-mono font-bold text-slate-500">
                            Caja Chica Inicial: {formatBs(startingFloat)}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-slate-600">
                          <div className="flex items-center justify-between">
                            <span>Ventas Efectivo:</span>
                            <strong className="font-mono text-emerald-700">+{formatBs(expectedSalesCash)}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Ventas QR Vendis:</span>
                            <strong className="font-mono text-sky-700">+{formatBs(expectedSalesQrVendis)}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Ventas QR Banco Unión:</span>
                            <strong className="font-mono text-indigo-700">+{formatBs(expectedSalesQrUnion)}</strong>
                          </div>
                          {operationalExpensesCash > 0 && (
                            <div className="flex items-center justify-between text-rose-600 font-semibold">
                              <span>Gastos Operativos Efectivo:</span>
                              <strong className="font-mono">-{formatBs(operationalExpensesCash)}</strong>
                            </div>
                          )}
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 pt-2 space-y-1">
                          <div className="flex items-center justify-between text-slate-800 font-bold">
                            <span>Efectivo que debía haber en gaveta:</span>
                            <span className="font-mono font-black text-brand-800">{formatBs(expectedCashInDrawer)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>QR Total Esperado (Vendis + Unión):</span>
                            <span className="font-mono font-bold text-slate-700">{formatBs(Math.max(0, expectedSalesQrTotal - expQrTotal))}</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. DECLARADO POR EL RECEPCIONISTA (ARQUEO) */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-emerald-600" />
                            2. Declarado en Arqueo:
                          </span>
                          <span className="font-mono font-bold text-slate-500">
                            Caja Chica: {formatBs(handoverFloat)}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-slate-600">
                          <div className="flex items-center justify-between">
                            <span>Total Efectivo Contado en Gaveta:</span>
                            <strong className="font-mono text-emerald-700">{formatBs(effectiveCountedCash)}</strong>
                          </div>
                          {deliveredAtClose > 0 && (
                            <div className="flex items-center justify-between text-amber-800 font-bold">
                              <span>(-) Retiro en Sobre (Dueño / Marco):</span>
                              <strong className="font-mono text-amber-700">+{formatBs(deliveredAtClose)}</strong>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-slate-500">
                            <span>(=) Caja Chica que quedó en Gaveta:</span>
                            <strong className="font-mono text-slate-700">{formatBs(handoverFloat)}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>QR Vendis Declarado:</span>
                            <strong className="font-mono text-sky-700">{formatBs(declaredQrVendis)}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>QR Banco Unión Declarado:</span>
                            <strong className="font-mono text-indigo-700">{formatBs(declaredQrUnion)}</strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200">
                            <span>Total Efectivo Distribuido (Sobre + Caja):</span>
                            <strong className="font-mono text-slate-800">{formatBs(handoverFloat + deliveredAtClose)}</strong>
                          </div>
                        </div>

                        {/* RESULTADO DEL COTEJO */}
                        <div className={`p-2.5 rounded-xl border pt-2 space-y-1 ${
                          hasDeficit
                            ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                            : hasSurplus
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                        }`}>
                          <div className="flex items-center justify-between font-black text-xs">
                            <span>Diferencia Neta Total:</span>
                            <span className="font-mono text-sm">
                              {totalDiff > 0 ? `+${formatBs(totalDiff)}` : totalDiff < 0 ? `-${formatBs(Math.abs(totalDiff))}` : '0.00 Bs'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] opacity-80">
                            <span>Dif. Efectivo: {diffCash >= 0 ? `+${formatBs(diffCash)}` : `-${formatBs(Math.abs(diffCash))}`}</span>
                            <span>Dif. QR: {totalDiff - diffCash >= 0 ? `+${formatBs(totalDiff - diffCash)}` : `-${formatBs(Math.abs(totalDiff - diffCash))}`}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notas del turno si existen */}
                    {shift.notes && (
                      <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900">
                        <strong className="font-bold block text-[11px] text-amber-950">Observaciones del Cierre:</strong>
                        <p className="text-[11px] text-amber-800 mt-0.5">{shift.notes}</p>
                      </div>
                    )}

                    {/* Barra de Acciones y Despliegue de Auditoría */}
                    <div className="flex flex-wrap items-center justify-between pt-2 gap-2 border-t border-slate-100 mt-2">
                      <button
                        onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                        className="text-xs font-extrabold text-brand-700 hover:text-brand-800 flex items-center gap-1.5 py-1.5 px-3 rounded-xl hover:bg-brand-50 transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>
                          {isExpanded
                            ? 'Ocultar Auditoría Detallada'
                            : `Auditoría Completa (${shiftStays.length} Hab, ${shiftExtraConsumptions.length + shiftStaffConsumptions.length + stayFrigobarCount} Consumos, ${shiftInventoryLogs.length} Inventario, ${shiftExpensesList.length} Pagos)`}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAdjustingShift(shift)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1 transition-colors"
                          title="Ajustar valores de arqueo o retiros de este turno"
                        >
                          <Edit3 className="w-3 h-3 text-slate-500" />
                          <span>Ajustar Arqueo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const conf = window.confirm(
                              `¿Estás seguro de ELIMINAR permanentemente este registro de turno de "${shift.receptionistName}" (${formatDateTime(shift.startTime)})?\n\nEsta acción no se puede deshacer y borrará el turno de Firebase y del historial.`
                            );
                            if (conf) {
                              deleteShiftFromHistory(shift.id);
                            }
                          }}
                          className="px-2 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          title="Eliminar este turno permanentemente si fue un registro huérfano o vacío de 0 Bs"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* DESPLEGABLE: AUDITORÍA DETALLADA COMPLETA DEL TURNO */}
                  {isExpanded && (
                    <div className="bg-slate-50 p-5 border-t border-slate-200 space-y-6 animate-fade-in text-xs">
                      {/* 1. HABITACIONES COBRADAS EN EL TURNO */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-brand-600" />
                            1. Habitaciones Cobradas en este Turno ({shiftStays.length}):
                          </h4>
                          <span className="text-[11px] font-mono font-bold text-slate-500">
                            Total Habitaciones: {formatBs(shiftStays.reduce((sum, s) => sum + (s.totalAmount || s.baseRoomPrice), 0))}
                          </span>
                        </div>

                        {shiftStays.length === 0 ? (
                          <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-400 italic text-center">
                            No hay habitaciones registradas o cobradas directamente durante este turno.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {shiftStays.map((s) => {
                              const stayCons = s.consumptions || [];
                              return (
                                <div key={s.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-black text-xs">
                                        {s.roomName.replace(/\D/g, '') || s.roomName}
                                      </div>
                                      <strong className="text-slate-900 font-extrabold text-xs">{s.roomName}</strong>
                                    </div>
                                    <span className="font-mono font-black text-brand-700 text-sm">
                                      {formatBs(s.totalAmount || s.baseRoomPrice)}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                    <span className="font-bold text-slate-700">{s.chosenPlan.toUpperCase()}</span>
                                    <span>{getPaymentMethodLabel(s.paymentMethod)}</span>
                                  </div>

                                  <div className="text-[10px] text-slate-400 space-y-0.5">
                                    <div className="flex justify-between">
                                      <span>Tarifa Base:</span>
                                      <span className="font-mono font-bold text-slate-600">{formatBs(s.baseRoomPrice)}</span>
                                    </div>
                                    {s.overtimeCharge ? (
                                      <div className="flex justify-between text-amber-700 font-semibold">
                                        <span>Horas Extras ({s.overtimeMinutes} min):</span>
                                        <span className="font-mono">+{formatBs(s.overtimeCharge)}</span>
                                      </div>
                                    ) : null}
                                    <div className="flex justify-between">
                                      <span>Horario:</span>
                                      <span>{formatTimeOnly(s.startTime)} {s.endTime ? `➔ ${formatTimeOnly(s.endTime)}` : '(En curso)'}</span>
                                    </div>
                                  </div>

                                  {/* Frigobar consumido en la habitación */}
                                  {stayCons.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 space-y-1">
                                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                                        Frigobar Consumido ({stayCons.length}):
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {stayCons.map((c, i) => (
                                          <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                                            {c.productName} ×{c.quantity} ({formatBs(c.subtotal)})
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 2. CONSUMOS REALIZADOS (MOSTRADOR, FRIGOBAR Y PERSONAL) */}
                      <div className="space-y-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Coffee className="w-3.5 h-3.5 text-amber-600" />
                            2. Consumos y Ventas Realizados en este Turno ({shiftExtraConsumptions.length + shiftStaffConsumptions.length + stayFrigobarCount}):
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Ventas Directas de Mostrador / Extras */}
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3 text-brand-600" />
                              Ventas Mostrador / Consumos Extras ({shiftExtraConsumptions.length})
                            </span>
                            {shiftExtraConsumptions.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">No hubo ventas directas en mostrador.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {shiftExtraConsumptions.map((ec) => (
                                  <div key={ec.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                                    <div>
                                      <strong className="text-slate-800 block">{ec.description}</strong>
                                      <span className="text-[10px] text-slate-400">
                                        {formatTimeOnly(ec.date)} • {getPaymentMethodLabel(ec.paymentMethod)}
                                        {ec.items && ec.items.length > 0 ? ` (${ec.items.map((it) => `${it.productName} ×${it.quantity}`).join(', ')})` : ''}
                                      </span>
                                    </div>
                                    <span className="font-mono font-black text-emerald-700">+{formatBs(ec.totalAmount)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Consumos del Personal en este Turno */}
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-amber-600" />
                              Consumos de Personal en este Turno ({shiftStaffConsumptions.length})
                            </span>
                            {shiftStaffConsumptions.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">El personal no registró consumos en este turno.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {shiftStaffConsumptions.map((sc) => (
                                  <div key={sc.id} className="p-2 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between text-[11px]">
                                    <div>
                                      <strong className="text-amber-950 block">{sc.staffName}</strong>
                                      <span className="text-[10px] text-amber-800">
                                        {formatTimeOnly(sc.date)} • {sc.items.map((it) => `${it.productName} ×${it.quantity}`).join(', ')}
                                      </span>
                                      <span className="block text-[9px] font-bold text-amber-700">
                                        {sc.isPaid ? '✓ Pagado al contado' : '⚠️ A descontar en semana'}
                                      </span>
                                    </div>
                                    <span className="font-mono font-black text-amber-900">{formatBs(sc.totalAmount)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. MODIFICACIONES AL INVENTARIO EN ESTE TURNO */}
                      <div className="space-y-2.5 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-indigo-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-indigo-600" />
                            3. Modificaciones al Inventario en este Turno ({shiftInventoryLogs.length}):
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Cambios de stock y altas/bajas realizadas
                          </span>
                        </div>

                        {shiftInventoryLogs.length === 0 ? (
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>El recepcionista no realizó modificaciones manuales ni ajustes de stock en el inventario durante este turno.</span>
                          </div>
                        ) : (
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                            <div className="divide-y divide-slate-100">
                              {shiftInventoryLogs.map((log) => {
                                const isPositive = log.quantityAdded > 0;
                                const isNegative = log.quantityAdded < 0;
                                return (
                                  <div key={log.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors">
                                    <div className="flex items-start sm:items-center gap-3">
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                        isPositive
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : isNegative
                                          ? 'bg-rose-100 text-rose-700'
                                          : 'bg-indigo-100 text-indigo-700'
                                      }`}>
                                        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : isNegative ? <ArrowDownRight className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <strong className="text-slate-900 font-extrabold text-xs">{log.productName}</strong>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            log.action === 'restock'
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : log.action === 'create_product'
                                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                              : log.action === 'price_change'
                                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                                          }`}>
                                            {log.action === 'restock'
                                              ? 'Ingreso de Stock'
                                              : log.action === 'create_product'
                                              ? 'Nuevo Producto'
                                              : log.action === 'price_change'
                                              ? 'Cambio de Precio'
                                              : 'Ajuste Manual'}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                                          <span>Stock: <strong>{log.previousStock}</strong> ➔ <strong>{log.newStock}</strong></span>
                                          <span>•</span>
                                          <span>Por: <strong>{log.responsibleName || 'Recepcionista'}</strong></span>
                                          <span>•</span>
                                          <span>{formatTimeOnly(log.date || new Date(log.timestamp).toISOString())}</span>
                                          {log.notes && (
                                            <>
                                              <span>•</span>
                                              <span className="italic text-slate-400">"{log.notes}"</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right sm:text-right self-end sm:self-center">
                                      <span className={`font-mono font-black text-sm ${
                                        isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-slate-700'
                                      }`}>
                                        {isPositive ? `+${log.quantityAdded}` : log.quantityAdded} u.
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 4. PAGOS, GASTOS Y RETIROS REALIZADOS */}
                      <div className="space-y-2.5 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-rose-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-rose-600" />
                            4. Pagos, Salidas de Caja y Retiros ({shiftExpensesList.length + (deliveredAtClose > 0 ? 1 : 0)}):
                          </h4>
                          <span className="text-[11px] font-mono font-bold text-rose-700">
                            Total Salidas: -{formatBs(operationalExpensesCash + deliveredAtClose)}
                          </span>
                        </div>

                        {/* Banner de Retiro en Sobre si existió */}
                        {deliveredAtClose > 0 && (
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-300 text-amber-950 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Coins className="w-4 h-4 text-amber-700 shrink-0" />
                              <div>
                                <strong className="text-xs font-black block">Retiro de Ventas en Sobre a Administración / Marco</strong>
                                <span className="text-[10px] text-amber-800">Efectivo entregado físicamente al momento del cierre de caja</span>
                              </div>
                            </div>
                            <span className="font-mono font-black text-sm text-amber-800">+{formatBs(deliveredAtClose)}</span>
                          </div>
                        )}

                        {shiftExpensesList.length === 0 ? (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-400 italic text-center">
                            No se registraron gastos operativos durante este turno.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {shiftExpensesList.map((e) => (
                              <div key={e.id} className="bg-white p-3 rounded-xl border border-rose-200 flex items-center justify-between shadow-xs">
                                <div>
                                  <strong className="text-slate-800 block text-xs">{e.description}</strong>
                                  <span className="text-[10px] text-slate-400">
                                    {formatTimeOnly(e.timestamp)} • {getPaymentMethodLabel(e.paymentMethod)} • {e.category}
                                  </span>
                                </div>
                                <span className="font-mono font-black text-rose-600 text-xs">-{formatBs(e.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE AUDITORÍA Y AJUSTE DE ARQUEO / RETIROS */}
      <ShiftAdjustmentModal
        shift={adjustingShift}
        isOpen={!!adjustingShift}
        onClose={() => setAdjustingShift(null)}
      />
    </div>
  );
};

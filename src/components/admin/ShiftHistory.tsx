import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Shift, Stay, Expense } from '../../types';
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
} from 'lucide-react';
import { SYSTEM_USERS } from '../../data/initialData';

export const ShiftHistory: React.FC = () => {
  const { shiftsHistory, completedStays, rooms, expenses } = useApp();

  // Filtros
  const [selectedDateMode, setSelectedDateMode] = useState<'all' | 'today' | 'yesterday' | 'week' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [filterReceptionist, setFilterReceptionist] = useState<string>('all');
  const [filterDiscrepancy, setFilterDiscrepancy] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);

  // Turnos abiertos (en vivo) vs turnos cerrados (historial)
  const activeOpenShifts = shiftsHistory.filter((s) => s.status === 'open');
  const closedShifts = shiftsHistory.filter((s) => s.status === 'closed');

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

  // Helper para buscar estadías de un turno
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
              Sincronizado en Vivo Nube
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOpenShifts.map((shift) => (
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
              const shiftExpensesList = shift.expenses || [];

              const startingFloat = shift.initialCashFloat || 100;
              const handoverFloat = shift.handoverCashFloat !== undefined ? shift.handoverCashFloat : 100;
              const expectedSalesCash = shift.expectedCash || 0;
              const expectedSalesQrVendis = shift.expectedQrVendis || 0;
              const expectedSalesQrUnion = shift.expectedQrUnion || 0;
              const expectedSalesQrTotal = shift.expectedQr || (expectedSalesQrVendis + expectedSalesQrUnion);

              const expCash = shift.totalExpensesCash || 0;
              const expQrVendis = shift.totalExpensesQrVendis || 0;
              const expQrUnion = shift.totalExpensesQrUnion || 0;
              const expQrTotal = shift.totalExpensesQr || (expQrVendis + expQrUnion);

              // Lo que DEBÍA haber físicamente en gaveta = Caja Chica Inicial + Ventas Efectivo - Gastos Efectivo
              const expectedCashInDrawer = Math.max(0, startingFloat + expectedSalesCash - expCash);

              // Lo declarado por el recepcionista
              const declaredCashInDrawer = shift.totalPhysicalCashInDrawer || 0;
              const declaredQrVendis = shift.declaredQrVendis || 0;
              const declaredQrUnion = shift.declaredQrUnion || 0;
              const declaredQrTotal = shift.declaredQr || (declaredQrVendis + declaredQrUnion);

              // Diferencias exactas
              const diffCash = shift.differenceCash !== undefined ? shift.differenceCash : (declaredCashInDrawer - expectedCashInDrawer);
              const diffQrVendis = shift.differenceQrVendis !== undefined ? shift.differenceQrVendis : (declaredQrVendis - (expectedSalesQrVendis - expQrVendis));
              const diffQrUnion = shift.differenceQrUnion !== undefined ? shift.differenceQrUnion : (declaredQrUnion - (expectedSalesQrUnion - expQrUnion));
              const totalDiff = shift.totalDifference !== undefined ? shift.totalDifference : (diffCash + (declaredQrTotal - (expectedSalesQrTotal - expQrTotal)));

              const hasDeficit = totalDiff < 0 || (shift.discountAmount || 0) > 0;
              const hasSurplus = totalDiff > 0 || (shift.surplusAmount || 0) > 0;
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

                      {/* BADGE DE ESTADO DE CUADRE */}
                      <div className="text-right">
                        {hasDeficit ? (
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-black text-xs shadow-md shadow-rose-600/20">
                            <AlertTriangle className="w-4 h-4" />
                            <span>FALTANTE: -{formatBs(discountAmt)} (DESCUENTO)</span>
                          </div>
                        ) : hasSurplus ? (
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-600/20">
                            <Sparkles className="w-4 h-4" />
                            <span>DEMASÍA: +{formatBs(surplusAmt)} (SOBRANTE)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>CUADRADO EXACTO (0.00 Bs)</span>
                          </div>
                        )}
                      </div>
                    </div>

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
                          {expCash + expQrTotal > 0 && (
                            <div className="flex items-center justify-between text-rose-600 font-semibold">
                              <span>Gastos/Pagos Restados:</span>
                              <strong className="font-mono">-{formatBs(expCash + expQrTotal)}</strong>
                            </div>
                          )}
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 pt-2 space-y-1">
                          <div className="flex items-center justify-between text-slate-800 font-bold">
                            <span>Efectivo Físico que debía haber en gaveta:</span>
                            <span className="font-mono font-black text-brand-800">{formatBs(expectedCashInDrawer)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>QR Total Esperado (Vendis + Unión):</span>
                            <span className="font-mono font-bold text-slate-700">{formatBs(Math.max(0, expectedSalesQrTotal - expQrTotal))}</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. DECLARADO POR EL RECEPCIONISTA (ARQUEO CIEGO) */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-emerald-600" />
                            2. Declarado en Arqueo Ciego:
                          </span>
                          <span className="font-mono font-bold text-slate-500">
                            Dejó Caja Chica: {formatBs(handoverFloat)}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-slate-600">
                          <div className="flex items-center justify-between">
                            <span>Efectivo Total Contado en Gaveta:</span>
                            <strong className="font-mono text-emerald-700">{formatBs(declaredCashInDrawer)}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>QR Vendis Declarado:</span>
                            <strong className="font-mono text-sky-700">{formatBs(declaredQrVendis)}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>QR Banco Unión Declarado:</span>
                            <strong className="font-mono text-indigo-700">{formatBs(declaredQrUnion)}</strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Efectivo Neto Retirado / Entregado:</span>
                            <strong className="font-mono text-slate-800">{formatBs(Math.max(0, declaredCashInDrawer - handoverFloat))}</strong>
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

                    {/* Botón para desplegar habitaciones y gastos */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                        className="text-xs font-extrabold text-brand-700 hover:text-brand-800 flex items-center gap-1.5 py-1 px-3 rounded-xl hover:bg-brand-50 transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>
                          {isExpanded ? 'Ocultar Detalle del Turno' : `Ver ${shiftStays.length} Habitación(es) y ${shiftExpensesList.length} Pago(s)`}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* DESPLEGABLE: HABITACIONES Y GASTOS DEL TURNO */}
                  {isExpanded && (
                    <div className="bg-slate-50 p-5 border-t border-slate-200 space-y-4 animate-fade-in text-xs">
                      {/* Habitaciones del Turno */}
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-brand-600" />
                          Habitaciones Cobradas en este Turno ({shiftStays.length}):
                        </h4>
                        {shiftStays.length === 0 ? (
                          <p className="text-slate-400 italic">No hay habitaciones registradas directamente en este turno.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {shiftStays.map((s) => (
                              <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                                <div className="flex items-center justify-between">
                                  <strong className="text-slate-900 font-extrabold">{s.roomName}</strong>
                                  <span className="font-mono font-bold text-brand-700">
                                    {formatBs(s.totalAmount || s.baseRoomPrice)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                  <span>{s.chosenPlan.toUpperCase()} • {getPaymentMethodLabel(s.paymentMethod)}</span>
                                  <span>{formatTimeOnly(s.startTime)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Gastos del Turno */}
                      {shiftExpensesList.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <h4 className="font-extrabold text-rose-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-rose-600" />
                            Pagos / Salidas de Caja Realizadas ({shiftExpensesList.length}):
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {shiftExpensesList.map((e) => (
                              <div key={e.id} className="bg-white p-2.5 rounded-xl border border-rose-200 flex items-center justify-between">
                                <div>
                                  <strong className="text-slate-800 block">{e.description}</strong>
                                  <span className="text-[10px] text-slate-400">
                                    {formatTimeOnly(e.timestamp)} • {getPaymentMethodLabel(e.paymentMethod)} • {e.category}
                                  </span>
                                </div>
                                <span className="font-mono font-black text-rose-600">-{formatBs(e.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

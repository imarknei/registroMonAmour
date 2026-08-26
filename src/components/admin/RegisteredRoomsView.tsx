import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Room, Stay, Product } from '../../types';
import { formatBs, getRoomTypeBadge, getRoomTypeLabel } from '../../utils/formatUtils';
import { formatDateTime, formatTimeOnly, calculateStayTime, formatTimerDisplay, formatDateOnly } from '../../utils/timeUtils';
import { CancelStayModal } from './CancelStayModal';
import {
  BedDouble,
  DollarSign,
  QrCode,
  Layers,
  Clock,
  Car,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Sparkles,
  ShoppingBag,
  History,
  TrendingUp,
  Calendar,
  Ban,
  CalendarDays,
  Receipt,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
} from 'lucide-react';

export const RegisteredRoomsView: React.FC = () => {
  const { rooms, tariffs, completedStays, expenses, currentUser, cancelStay } = useApp();

  // Reloj local de 1 segundo para sincronización continua de temporizadores
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Modal de anulación
  const [stayToCancel, setStayToCancel] = useState<Stay | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  // Filtros de fecha / día
  const [selectedDateMode, setSelectedDateMode] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Pestañas principales
  const [activeTab, setActiveTab] = useState<'day' | 'active' | 'history' | 'cancelled'>('day');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPrepaid, setFilterPrepaid] = useState<string>('all');

  // Acordeón de detalles del día
  const [showDailyConsumptions, setShowDailyConsumptions] = useState<boolean>(false);
  const [showDailyExpenses, setShowDailyExpenses] = useState<boolean>(false);

  // Determinar rango de timestamp del día seleccionado
  const targetDateString = useMemo(() => {
    const now = new Date();
    if (selectedDateMode === 'today') {
      return now.toISOString().slice(0, 10);
    }
    if (selectedDateMode === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return yesterday.toISOString().slice(0, 10);
    }
    return customDate;
  }, [selectedDateMode, customDate]);

  // Unificar todas las estadías del sistema (activas en habitaciones + completadas + canceladas)
  const allUnifiedStays: Stay[] = useMemo(() => {
    const staysMap = new Map<string, Stay>();

    // 1. Agregar historial completo sincronizado
    completedStays.forEach((s) => {
      if (s && s.id) {
        staysMap.set(s.id, s);
      }
    });

    // 2. Agregar estadías actualmente activas en habitaciones
    rooms.forEach((r) => {
      if (r.status === 'ocupada' && r.currentStay) {
        staysMap.set(r.currentStay.id, r.currentStay);
      }
    });

    return Array.from(staysMap.values()).sort((a, b) => {
      const timeA = new Date(a.startTime).getTime() || 0;
      const timeB = new Date(b.startTime).getTime() || 0;
      return timeB - timeA;
    });
  }, [completedStays, rooms]);

  // Estadías correspondientes al día seleccionado
  const dayStays = useMemo(() => {
    return allUnifiedStays.filter((s) => {
      const stayDate = s.startTime ? s.startTime.slice(0, 10) : '';
      return stayDate === targetDateString;
    });
  }, [allUnifiedStays, targetDateString]);

  // Gastos correspondientes al día seleccionado
  const dayExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expDate = e.timestamp ? e.timestamp.slice(0, 10) : '';
      return expDate === targetDateString;
    });
  }, [expenses, targetDateString]);

  // Consolidado de consumos / productos vendidos en el día seleccionado
  const dailyConsumptionsSummary = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; total: number; unitPrice: number }>();

    dayStays
      .filter((s) => s.status !== 'cancelled')
      .forEach((s) => {
        if (s.consumptions && s.consumptions.length > 0) {
          s.consumptions.forEach((c) => {
            const key = c.productId || c.productName;
            const existing = map.get(key) || {
              name: c.productName,
              quantity: 0,
              total: 0,
              unitPrice: c.unitPrice,
            };
            map.set(key, {
              ...existing,
              quantity: existing.quantity + c.quantity,
              total: existing.total + c.subtotal,
            });
          });
        }
      });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [dayStays]);

  // Cálculos financieros del día seleccionado (excluyendo anuladas)
  const dayFinancials = useMemo(() => {
    let totalRoomsCount = 0;
    let activeRoomsCount = 0;
    let completedRoomsCount = 0;
    let cancelledRoomsCount = 0;

    let baseRoomSales = 0;
    let consumptionsSales = 0;
    let overtimeSales = 0;
    let totalCash = 0;
    let totalQr = 0;

    dayStays.forEach((s) => {
      if (s.status === 'cancelled') {
        cancelledRoomsCount++;
        return;
      }

      totalRoomsCount++;
      if (s.status === 'active') activeRoomsCount++;
      if (s.status === 'completed') completedRoomsCount++;

      const extraRate = tariffs[s.roomType]?.extraHourPrice || (s.roomType === 'jacuzzi' || s.roomType === 'golden_suite' ? 40 : 30);
      const timeCalc = calculateStayTime(s.startTime, s.chosenDurationMinutes, extraRate, Date.now());
      const consSum = s.consumptions ? s.consumptions.reduce((sum, c) => sum + c.subtotal, 0) : 0;
      const stayOvertime = s.overtimeCharge !== undefined ? s.overtimeCharge : timeCalc.overtimeCharge;

      baseRoomSales += s.baseRoomPrice;
      consumptionsSales += consSum;
      overtimeSales += stayOvertime;

      if (s.status === 'completed') {
        totalCash += s.cashPaid || (s.paymentMethod === 'efectivo' ? s.totalAmount || 0 : 0);
        totalQr += s.qrPaid || (s.paymentMethod === 'qr' ? s.totalAmount || 0 : 0);
      } else if (s.isPrepaid) {
        totalCash += s.prepaidCash || (s.paymentMethod === 'efectivo' ? s.prepaidAmount || s.baseRoomPrice : 0);
        totalQr += s.prepaidQr || (s.paymentMethod === 'qr' ? s.prepaidAmount || s.baseRoomPrice : 0);
      }
    });

    const totalGrossSales = baseRoomSales + consumptionsSales + overtimeSales;
    const totalExpensesCash = dayExpenses
      .filter((e) => e.paymentMethod === 'efectivo')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesQr = dayExpenses
      .filter((e) => e.paymentMethod === 'qr')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesAmount = totalExpensesCash + totalExpensesQr;
    const netRevenue = totalGrossSales - totalExpensesAmount;

    return {
      totalRoomsCount,
      activeRoomsCount,
      completedRoomsCount,
      cancelledRoomsCount,
      baseRoomSales,
      consumptionsSales,
      overtimeSales,
      totalGrossSales,
      totalCash,
      totalQr,
      totalExpensesCash,
      totalExpensesQr,
      totalExpensesAmount,
      netRevenue,
    };
  }, [dayStays, dayExpenses, tariffs]);

  // Filtrado según pestaña y controles de búsqueda
  const displayedStays = useMemo(() => {
    let list: Stay[] = [];

    if (activeTab === 'day') {
      list = dayStays;
    } else if (activeTab === 'active') {
      list = allUnifiedStays.filter((s) => s.status === 'active');
    } else if (activeTab === 'history') {
      list = allUnifiedStays.filter((s) => s.status === 'completed');
    } else if (activeTab === 'cancelled') {
      list = allUnifiedStays.filter((s) => s.status === 'cancelled');
    }

    return list.filter((s) => {
      const matchSearch =
        s.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.vehiclePlate && s.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.receptionistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.cancellationReason && s.cancellationReason.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = filterType === 'all' || s.roomType === filterType;
      const matchPrepaid =
        filterPrepaid === 'all' ||
        (filterPrepaid === 'prepaid' && s.isPrepaid) ||
        (filterPrepaid === 'pending' && !s.isPrepaid);

      return matchSearch && matchType && matchPrepaid;
    });
  }, [activeTab, dayStays, allUnifiedStays, searchQuery, filterType, filterPrepaid]);

  // Manejador de anulación
  const handleOpenCancelModal = (stay: Stay) => {
    setStayToCancel(stay);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = (stayId: string, reason: string, restoreInventory: boolean) => {
    cancelStay(stayId, reason, restoreInventory);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & BARRA DE CONTROL DIARIO */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                <BedDouble className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  Informe Diario y Control de Habitaciones
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Revisión detallada de movimientos diarios, consumos, pagos y anulación de registros de prueba.
                </p>
              </div>
            </div>
          </div>

          {/* SELECTOR DE FECHA / DÍA */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-600" />
              Día:
            </span>

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

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={targetDateString}
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

        {/* 2. TARJETA RESUMEN FINANCIERO DEL DÍA SELECCIONADO */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 rounded-2xl p-5 text-white shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-rose-400" />
              <span className="text-sm font-extrabold uppercase tracking-wide text-rose-200">
                Resumen de Movimientos del Día: {targetDateString}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-semibold">
                {dayFinancials.totalRoomsCount} hab. atendidas
              </span>
              {dayFinancials.cancelledRoomsCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  {dayFinancials.cancelledRoomsCount} anuladas
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Base Hospedaje */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">1. Hospedaje Base</span>
              <span className="text-lg font-black font-mono text-white">{formatBs(dayFinancials.baseRoomSales)}</span>
            </div>

            {/* Consumos */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">2. Consumos Extra</span>
              <span className="text-lg font-black font-mono text-emerald-400">+{formatBs(dayFinancials.consumptionsSales)}</span>
            </div>

            {/* Tiempo Extra */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">3. Tiempo Extra</span>
              <span className="text-lg font-black font-mono text-amber-300">+{formatBs(dayFinancials.overtimeSales)}</span>
            </div>

            {/* Total Cobrado Efec / QR */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Cobros (Efec / QR)</span>
              <div className="text-xs font-mono font-bold text-slate-200">
                Ef: {formatBs(dayFinancials.totalCash)} | QR: {formatBs(dayFinancials.totalQr)}
              </div>
            </div>

            {/* Gastos / Pagos */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Gastos / Pagos</span>
              <span className="text-lg font-black font-mono text-rose-300">-{formatBs(dayFinancials.totalExpensesAmount)}</span>
            </div>

            {/* Total Neto del Día */}
            <div className="bg-rose-500/20 rounded-xl p-3 border border-rose-500/30">
              <span className="text-[10px] uppercase font-extrabold text-rose-300 block">Total Neto del Día</span>
              <span className="text-xl font-black font-mono text-white">{formatBs(dayFinancials.netRevenue)}</span>
            </div>
          </div>

          {/* BOTONES DESPLEGABLES PARA VER CONSUMOS Y GASTOS DEL DÍA */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-700/60">
            <button
              onClick={() => setShowDailyConsumptions(!showDailyConsumptions)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ver {dailyConsumptionsSummary.length} producto(s) consumido(s) en el día</span>
              {showDailyConsumptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowDailyExpenses(!showDailyExpenses)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Receipt className="w-3.5 h-3.5 text-rose-400" />
              <span>Ver {dayExpenses.length} pago(s) / egreso(s) del día</span>
              {showDailyExpenses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* DESPLEGABLE: PRODUCTOS CONSUMIDOS EN EL DÍA */}
          {showDailyConsumptions && (
            <div className="bg-black/30 rounded-xl p-3.5 border border-white/10 text-xs space-y-2 animate-fade-in">
              <span className="font-extrabold text-emerald-300 uppercase tracking-wider block">
                Detalle de Consumos del Día ({targetDateString}):
              </span>
              {dailyConsumptionsSummary.length === 0 ? (
                <p className="text-slate-400 italic">No hubo consumos registrados en este día.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {dailyConsumptionsSummary.map((item, idx) => (
                    <div key={idx} className="bg-white/5 p-2 rounded-lg flex items-center justify-between border border-white/5">
                      <span className="font-semibold text-slate-200 truncate">{item.quantity}x {item.name}</span>
                      <span className="font-mono font-bold text-emerald-400 shrink-0 ml-2">+{formatBs(item.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DESPLEGABLE: PAGOS Y GASTOS DEL DÍA */}
          {showDailyExpenses && (
            <div className="bg-black/30 rounded-xl p-3.5 border border-white/10 text-xs space-y-2 animate-fade-in">
              <span className="font-extrabold text-rose-300 uppercase tracking-wider block">
                Pagos / Egresos Registrados en el Día ({targetDateString}):
              </span>
              {dayExpenses.length === 0 ? (
                <p className="text-slate-400 italic">No se registraron gastos en este día.</p>
              ) : (
                <div className="space-y-1.5">
                  {dayExpenses.map((exp) => (
                    <div key={exp.id} className="bg-white/5 p-2 rounded-lg flex items-center justify-between border border-white/5">
                      <div>
                        <span className="font-bold text-slate-200 block">{exp.description}</span>
                        <span className="text-[10px] text-slate-400">
                          {formatTimeOnly(exp.timestamp)} • {exp.registeredByName} • {exp.category.toUpperCase()} • Pago {exp.paymentMethod.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-rose-300">-{formatBs(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. PESTAÑAS DE VISTA & BUSCADOR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* Pestañas */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('day')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'day'
                  ? 'bg-white text-brand-700 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Registro del Día ({dayStays.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-white text-brand-700 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>En Curso ({allUnifiedStays.filter((s) => s.status === 'active').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-brand-700 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial General ({allUnifiedStays.filter((s) => s.status === 'completed').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-sm font-black'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Anuladas ({allUnifiedStays.filter((s) => s.status === 'cancelled').length})</span>
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar habitación, placa o recepcionista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 w-full sm:w-56"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value="all">Todas las Categorías</option>
              <option value="ventilador">Ventilador</option>
              <option value="aire">Aire Acondicionado</option>
              <option value="suite">Suite</option>
              <option value="jacuzzi">Jacuzzi</option>
              <option value="golden_suite">Golden Suite</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. LISTA DE HABITACIONES Y MOVIMIENTOS */}
      {displayedStays.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BedDouble className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-700">No se encontraron habitaciones registradas</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No hay registros que coincidan con la fecha seleccionada ({targetDateString}) o los filtros de búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedStays.map((stay) => {
            const isCancelled = stay.status === 'cancelled';
            const isActive = stay.status === 'active';
            const extraRate = tariffs[stay.roomType]?.extraHourPrice || (stay.roomType === 'jacuzzi' || stay.roomType === 'golden_suite' ? 40 : 30);
            const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes, extraRate, Date.now());
            const consumptionsTotal = stay.consumptions ? stay.consumptions.reduce((sum, c) => sum + c.subtotal, 0) : 0;
            const stayOvertime = stay.overtimeCharge !== undefined ? stay.overtimeCharge : timeCalc.overtimeCharge;
            const totalDue = stay.totalAmount || (stay.baseRoomPrice + consumptionsTotal + stayOvertime);
            const prepaidAmt = stay.isPrepaid ? (stay.prepaidAmount || stay.baseRoomPrice) : 0;
            const pendingBalance = Math.max(0, totalDue - prepaidAmt);
            const badge = getRoomTypeBadge(stay.roomType);

            return (
              <div
                key={stay.id}
                className={`rounded-3xl border-2 p-5 space-y-3.5 transition-all relative overflow-hidden ${
                  isCancelled
                    ? 'bg-rose-50/50 border-rose-200 opacity-80'
                    : isActive
                    ? 'bg-white border-brand-300 shadow-md hover:border-brand-500'
                    : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                {/* Encabezado de la Tarjeta */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                        {getRoomTypeLabel(stay.roomType)}
                      </span>
                      {isCancelled ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1">
                          <Ban className="w-3 h-3" />
                          ANULADA
                        </span>
                      ) : isActive ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          En Curso
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Completada
                        </span>
                      )}
                    </div>
                    <h3 className={`text-lg font-black tracking-tight ${isCancelled ? 'text-rose-900 line-through' : 'text-slate-900'}`}>
                      {stay.roomName}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className={`text-lg font-extrabold font-mono block ${isCancelled ? 'text-rose-700' : 'text-brand-700'}`}>
                      {formatBs(totalDue)}
                    </span>
                    {stay.isPrepaid ? (
                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Adelanto: {formatBs(prepaidAmt)}
                        </span>
                        {isActive && pendingBalance > 0 && (
                          <span className="text-[9px] font-black text-rose-600 block">
                            Saldo x cobrar: {formatBs(pendingBalance)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 inline-block">
                          Paga al salir
                        </span>
                        {isActive && (
                          <span className="text-[9px] font-black text-amber-700 block">
                            Por cobrar: {formatBs(totalDue)} (pasa al sgte. turno)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desglose de Precios */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Plan</span>
                    <strong className="text-slate-800 uppercase font-extrabold">{stay.chosenPlan}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Base Habitación</span>
                    <strong className="text-slate-800 font-mono font-bold">{formatBs(stay.baseRoomPrice)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Consumos Extra</span>
                    <strong className="text-emerald-700 font-mono font-bold">+{formatBs(consumptionsTotal)}</strong>
                  </div>
                </div>

                {/* Lista de Consumos si tiene */}
                {stay.consumptions && stay.consumptions.length > 0 && (
                  <div className="bg-rose-50/40 p-2.5 rounded-2xl border border-rose-100 text-xs space-y-1.5">
                    <span className="text-[10px] font-extrabold text-rose-800 flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-rose-600" />
                      Consumos Detallados ({stay.consumptions.length} ítems):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {stay.consumptions.map((c) => (
                        <span key={c.id} className="text-[10px] bg-white px-2 py-1 rounded-lg border border-rose-200 font-semibold text-slate-800 flex items-center gap-1">
                          <span>{c.quantity}x {c.productName} (+{formatBs(c.subtotal)})</span>
                          {c.isPaid ? (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-black">
                              ✓ Pagado
                            </span>
                          ) : (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-black">
                              ⏳ Por cobrar
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tiempos & Temporizador */}
                <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Entrada: <strong>{formatTimeOnly(stay.startTime)}</strong></span>
                    {stay.endTime && (
                      <span className="text-slate-400">| Salida: <strong className="text-slate-700">{formatTimeOnly(stay.endTime)}</strong></span>
                    )}
                  </div>

                  <div>
                    {isActive ? (
                      timeCalc.isOvertime ? (
                        timeCalc.gracePeriodActive ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Espera (+{timeCalc.overtimeMinutes}m • 0 Bs)
                          </span>
                        ) : (
                          <span className="text-rose-700 font-black bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            +{formatBs(timeCalc.overtimeCharge)} Extra ({timeCalc.extraBlocksCount} x 20m)
                          </span>
                        )
                      ) : (
                        <span className="text-emerald-700 font-mono font-bold">
                          Quedan {formatTimerDisplay(timeCalc.remainingMinutes, timeCalc.remainingSeconds)}
                        </span>
                      )
                    ) : (
                      stayOvertime > 0 && (
                        <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          Recargo extra: +{formatBs(stayOvertime)}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Recepcionista y Placa */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    Recep: <strong className="text-slate-700">{stay.receptionistName}</strong>
                  </span>
                  {stay.vehiclePlate && (
                    <span className="flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      <Car className="w-3 h-3 text-slate-400" />
                      {stay.vehiclePlate}
                    </span>
                  )}
                </div>

                {/* MOTIVO DE ANULACIÓN SI ESTÁ ANULADA */}
                {isCancelled && (
                  <div className="bg-rose-100/70 p-3 rounded-2xl border border-rose-300 text-xs text-rose-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Anulado por: {stay.cancelledBy || 'Administrador'}</span>
                    </div>
                    <p className="text-[11px] text-rose-800 pl-5.5">
                      <strong>Motivo:</strong> {stay.cancellationReason || 'Registro de prueba / error'}
                    </p>
                    {stay.cancelledAt && (
                      <span className="text-[10px] text-rose-600 block pl-5.5">
                        Fecha anulación: {formatDateTime(stay.cancelledAt)}
                      </span>
                    )}
                  </div>
                )}

                {/* BOTÓN DE ANULACIÓN EXCLUSIVO PARA ADMINISTRADOR */}
                {currentUser.role === 'admin' && !isCancelled && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => handleOpenCancelModal(stay)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-bold transition-all flex items-center gap-1.5 border border-rose-200 active:scale-95"
                      title="Anular habitación registrada por error o prueba"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Anular Registro / Prueba</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL DE CONFIRMACIÓN DE ANULACIÓN */}
      <CancelStayModal
        stay={stayToCancel}
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setStayToCancel(null);
        }}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
};

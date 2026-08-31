import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Room, Stay, Product } from '../../types';
import { formatBs, getRoomTypeBadge, getRoomTypeLabel, getPlanLabel } from '../../utils/formatUtils';
import { formatDateTime, formatTimeOnly, calculateStayTime, formatTimerDisplay, formatDateOnly } from '../../utils/timeUtils';
import { CancelStayModal } from './CancelStayModal';
import { EditStayModal } from './EditStayModal';
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
  Edit,
  Sliders,
  Check,
  Moon,
  Sun,
  Users,
} from 'lucide-react';

export const RegisteredRoomsView: React.FC = () => {
  const {
    rooms,
    tariffs,
    completedStays,
    shiftsHistory,
    expenses,
    extraConsumptions,
    removeExtraConsumption,
    currentUser,
    cancelStay,
  } = useApp();

  // Reloj local de 1 segundo para sincronización continua de temporizadores
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Modal de anulación
  const [stayToCancel, setStayToCancel] = useState<Stay | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  // Modal de edición / modificación
  const [stayToEdit, setStayToEdit] = useState<Stay | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Filtros de fecha
  const [selectedDateMode, setSelectedDateMode] = useState<'today' | 'yesterday' | 'week' | 'custom' | 'all'>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Filtros de turno y cajero
  const [filterShiftType, setFilterShiftType] = useState<string>('all'); // 'all' | 'dia' | 'noche'
  const [filterReceptionist, setFilterReceptionist] = useState<string>('all'); // 'all' | receptionist name
  const [filterRoomType, setFilterRoomType] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all'); // 'all' | 'prepaid' | 'pending'
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pestaña de estado principal
  const [activeTab, setActiveTab] = useState<'day' | 'active' | 'history' | 'cancelled' | 'all_stays'>('day');

  // Acordeón de detalles
  const [showDailyConsumptions, setShowDailyConsumptions] = useState<boolean>(false);
  const [showDailyExpenses, setShowDailyExpenses] = useState<boolean>(false);
  const [showDailyExtraConsumptions, setShowDailyExtraConsumptions] = useState<boolean>(false);

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

  // Lista de todos los cajeros / recepcionistas únicos que han registrado movimientos
  const distinctReceptionists = useMemo(() => {
    const set = new Set<string>();
    allUnifiedStays.forEach((s) => {
      if (s.receptionistName && s.receptionistName.trim()) {
        set.add(s.receptionistName.trim());
      }
    });
    return Array.from(set).sort();
  }, [allUnifiedStays]);

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

  // Consumos extras correspondientes al día seleccionado
  const dayExtraConsumptions = useMemo(() => {
    return extraConsumptions.filter((e) => {
      const ecDate = e.date ? e.date.slice(0, 10) : '';
      return ecDate === targetDateString;
    });
  }, [extraConsumptions, targetDateString]);

  // Consolidado de consumos / productos vendidos en el día seleccionado
  const dailyConsumptionsSummary = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; total: number; unitPrice: number }>();

    // Consumos de habitaciones
    dayStays.forEach((s) => {
      if (s.status !== 'cancelled' && s.consumptions) {
        s.consumptions.forEach((item) => {
          const current = map.get(item.productId) || {
            name: item.productName,
            quantity: 0,
            total: 0,
            unitPrice: item.unitPrice,
          };
          map.set(item.productId, {
            ...current,
            quantity: current.quantity + item.quantity,
            total: current.total + item.subtotal,
          });
        });
      }
    });

    // Consumos extras fuera de habitación
    dayExtraConsumptions.forEach((ec) => {
      ec.items.forEach((item) => {
        const current = map.get(item.productId) || {
          name: item.productName,
          quantity: 0,
          total: 0,
          unitPrice: item.unitPrice,
        };
        map.set(item.productId, {
          ...current,
          quantity: current.quantity + item.quantity,
          total: current.total + item.subtotal,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [dayStays, dayExtraConsumptions]);

  // Resumen financiero del día
  const dailyMetrics = useMemo(() => {
    const validStays = dayStays.filter((s) => s.status !== 'cancelled');
    const totalRoomsCount = validStays.length;
    const activeRoomsCount = validStays.filter((s) => s.status === 'active').length;
    const completedRoomsCount = validStays.filter((s) => s.status === 'completed').length;
    const cancelledRoomsCount = dayStays.filter((s) => s.status === 'cancelled').length;

    let baseRoomSales = 0;
    let consumptionsSales = 0;
    let overtimeSales = 0;
    let totalCash = 0;
    let totalQr = 0;

    validStays.forEach((s) => {
      const extraRate = tariffs[s.roomType]?.extraHourPrice || (s.roomType === 'jacuzzi' || s.roomType === 'golden_suite' ? 40 : 30);
      const priceNight = tariffs[s.roomType]?.priceNight || (s.roomType === 'ventilador' ? 140 : s.roomType === 'aire' ? 150 : s.roomType === 'suite' ? 180 : s.roomType === 'jacuzzi' ? 220 : 230);
      const timeCalc = calculateStayTime(s.startTime, s.chosenDurationMinutes, extraRate, Date.now(), {
        priceNight,
        baseRoomPrice: s.baseRoomPrice,
        chosenPlan: s.chosenPlan,
      });
      const consSum = s.consumptions ? s.consumptions.reduce((sum, c) => sum + c.subtotal, 0) : 0;
      const stayOvertime = s.overtimeCharge !== undefined ? s.overtimeCharge : timeCalc.overtimeCharge;

      baseRoomSales += s.baseRoomPrice;
      consumptionsSales += consSum;
      overtimeSales += stayOvertime;

      if (s.status === 'completed') {
        totalCash += s.cashPaid || (s.paymentMethod === 'efectivo' ? s.totalAmount || 0 : 0);
        totalQr += s.qrPaid || (s.paymentMethod === 'qr' || s.paymentMethod === 'qr_vendis' || s.paymentMethod === 'qr_union' ? s.totalAmount || 0 : 0);
      } else if (s.isPrepaid) {
        totalCash += s.prepaidCash || (s.paymentMethod === 'efectivo' ? s.prepaidAmount || s.baseRoomPrice : 0);
        totalQr += s.prepaidQr || (s.paymentMethod === 'qr' || s.paymentMethod === 'qr_vendis' || s.paymentMethod === 'qr_union' ? s.prepaidAmount || s.baseRoomPrice : 0);
      }
    });

    // Sumar ventas extras del día
    let extraConsumptionsSales = 0;
    dayExtraConsumptions.forEach((ec) => {
      extraConsumptionsSales += ec.totalAmount;
      if (ec.paymentMethod === 'efectivo') {
        totalCash += ec.totalAmount;
      } else {
        totalQr += ec.totalAmount;
      }
    });
    consumptionsSales += extraConsumptionsSales;

    const totalGrossSales = baseRoomSales + consumptionsSales + overtimeSales;
    const totalExpensesCash = dayExpenses
      .filter((e) => e.paymentMethod === 'efectivo')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesQr = dayExpenses
      .filter((e) => e.paymentMethod !== 'efectivo')
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
      extraConsumptionsSales,
      overtimeSales,
      totalGrossSales,
      totalCash,
      totalQr,
      totalExpensesCash,
      totalExpensesQr,
      totalExpensesAmount,
      netRevenue,
    };
  }, [dayStays, dayExpenses, dayExtraConsumptions, tariffs]);

  // Filtrado exhaustivo según pestaña, fecha, turno, recepcionista y búsqueda
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
    } else {
      list = allUnifiedStays;
    }

    return list.filter((s) => {
      // Filtro de fecha en pestañas que no sean 'day'
      if (activeTab !== 'day') {
        if (selectedDateMode === 'today') {
          const todayIso = new Date().toISOString().slice(0, 10);
          if (!s.startTime || !s.startTime.startsWith(todayIso)) return false;
        } else if (selectedDateMode === 'yesterday') {
          const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          if (!s.startTime || !s.startTime.startsWith(yesterdayIso)) return false;
        } else if (selectedDateMode === 'custom' && customDate) {
          if (!s.startTime || !s.startTime.startsWith(customDate)) return false;
        }
      }

      // Filtro de turno (Día: 08:00 a 20:00, Noche: 20:00 a 08:00)
      if (filterShiftType !== 'all') {
        const startHour = s.startTime ? new Date(s.startTime).getHours() : 12;
        const isNightShift = startHour >= 20 || startHour < 8;
        if (filterShiftType === 'noche' && !isNightShift) return false;
        if (filterShiftType === 'dia' && isNightShift) return false;
      }

      // Filtro de cajero / recepcionista
      if (filterReceptionist !== 'all') {
        if (!s.receptionistName || s.receptionistName.trim() !== filterReceptionist) {
          return false;
        }
      }

      // Filtro de categoría de habitación
      if (filterRoomType !== 'all' && s.roomType !== filterRoomType) {
        return false;
      }

      // Filtro de estado de pago
      if (filterPaymentStatus === 'prepaid' && !s.isPrepaid) return false;
      if (filterPaymentStatus === 'pending' && s.isPrepaid) return false;

      // Búsqueda de texto libre
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchRoom = s.roomName.toLowerCase().includes(q);
        const matchPlate = s.vehiclePlate ? s.vehiclePlate.toLowerCase().includes(q) : false;
        const matchRecep = s.receptionistName ? s.receptionistName.toLowerCase().includes(q) : false;
        const matchPlan = s.chosenPlan ? s.chosenPlan.toLowerCase().includes(q) : false;
        const matchReason = s.cancellationReason ? s.cancellationReason.toLowerCase().includes(q) : false;
        if (!matchRoom && !matchPlate && !matchRecep && !matchPlan && !matchReason) {
          return false;
        }
      }

      return true;
    });
  }, [
    activeTab,
    dayStays,
    allUnifiedStays,
    selectedDateMode,
    customDate,
    filterShiftType,
    filterReceptionist,
    filterRoomType,
    filterPaymentStatus,
    searchQuery,
  ]);

  // Manejadores de modales
  const handleOpenCancelModal = (stay: Stay) => {
    setStayToCancel(stay);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = (stayId: string, reason: string, restoreInventory: boolean) => {
    cancelStay(stayId, reason, restoreInventory);
  };

  const handleOpenEditModal = (stay: Stay) => {
    setStayToEdit(stay);
    setIsEditModalOpen(true);
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
                  Control de Habitaciones & Auditoría de Cajeros
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Revisión y modificación de todas las habitaciones dadas (abiertas y cerradas), consumos de minibar, tiempos y cobros por turno.
                </p>
              </div>
            </div>
          </div>

          {/* Selector de Fecha */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedDateMode('today')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDateMode === 'today'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateMode('yesterday')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDateMode === 'yesterday'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ayer
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateMode('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDateMode === 'custom'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Fecha
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateMode('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDateMode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todo
              </button>
            </div>

            {selectedDateMode === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            )}
          </div>
        </div>

        {/* 2. TARJETAS DE MÉTRICAS DEL DÍA */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-brand-950 text-white rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-extrabold tracking-wide uppercase text-amber-200">
                Resumen Económico: {targetDateString}
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-300">
              {dailyMetrics.totalRoomsCount} hab. atendidas • {dailyMetrics.activeRoomsCount} en curso • {dailyMetrics.completedRoomsCount} cerradas
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
              <span className="text-[11px] font-bold text-slate-300 block mb-1">Ventas Habitación</span>
              <strong className="text-lg font-black font-mono text-white block">
                {formatBs(dailyMetrics.baseRoomSales)}
              </strong>
              <span className="text-[10px] text-slate-400">{dailyMetrics.totalRoomsCount} estadías</span>
            </div>

            <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
              <span className="text-[11px] font-bold text-slate-300 block mb-1">Minibar & Ventas Extra</span>
              <strong className="text-lg font-black font-mono text-emerald-400 block">
                +{formatBs(dailyMetrics.consumptionsSales)}
              </strong>
              <span className="text-[10px] text-slate-400">
                {dailyConsumptionsSummary.reduce((s, c) => s + c.quantity, 0)} unidades
              </span>
            </div>

            <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
              <span className="text-[11px] font-bold text-slate-300 block mb-1">Tiempo Extra</span>
              <strong className="text-lg font-black font-mono text-rose-300 block">
                +{formatBs(dailyMetrics.overtimeSales)}
              </strong>
              <span className="text-[10px] text-slate-400">Recargos sobretiempo</span>
            </div>

            <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-400/30">
              <span className="text-[11px] font-extrabold text-emerald-200 block mb-1">Ventas Brutas Totales</span>
              <strong className="text-xl font-black font-mono text-emerald-300 block">
                {formatBs(dailyMetrics.totalGrossSales)}
              </strong>
              <span className="text-[10px] text-emerald-200/80 font-mono">
                Efec: {formatBs(dailyMetrics.totalCash)} | QR: {formatBs(dailyMetrics.totalQr)}
              </span>
            </div>
          </div>

          {/* Botones de Desglose */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowDailyConsumptions(!showDailyConsumptions)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 text-slate-200"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
              <span>Ver Minibar del Día ({dailyConsumptionsSummary.length})</span>
              {showDailyConsumptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowDailyExtraConsumptions(!showDailyExtraConsumptions)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 text-slate-200"
            >
              <Receipt className="w-3.5 h-3.5 text-purple-300" />
              <span>Ventas Directas / Mostrador ({dayExtraConsumptions.length})</span>
              {showDailyExtraConsumptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowDailyExpenses(!showDailyExpenses)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 text-slate-200"
            >
              <MinusCircle className="w-3.5 h-3.5 text-rose-300" />
              <span>Pagos y Egresos ({dayExpenses.length})</span>
              {showDailyExpenses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* DESPLEGABLES */}
          {showDailyConsumptions && (
            <div className="bg-black/30 rounded-xl p-3.5 border border-white/10 text-xs space-y-2 animate-fade-in">
              <span className="font-extrabold text-amber-300 uppercase tracking-wider block">
                Detalle de Productos Consumidos ({targetDateString}):
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

          {showDailyExtraConsumptions && (
            <div className="bg-black/30 rounded-xl p-3.5 border border-white/10 text-xs space-y-2 animate-fade-in">
              <span className="font-extrabold text-purple-300 uppercase tracking-wider block">
                Consumos Extras y Ventas Mostrador ({targetDateString}):
              </span>
              {dayExtraConsumptions.length === 0 ? (
                <p className="text-slate-400 italic">No hay consumos extras registrados en este día.</p>
              ) : (
                <div className="space-y-1.5">
                  {dayExtraConsumptions.map((ec) => (
                    <div key={ec.id} className="bg-white/5 p-2 rounded-lg flex items-center justify-between border border-white/5">
                      <div>
                        <span className="font-bold text-slate-200 block">{ec.description}</span>
                        <span className="text-[10px] text-slate-400">
                          {formatTimeOnly(ec.date)} • Atendido por: {ec.registeredByName} • Pago {ec.paymentMethod.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-purple-300">+{formatBs(ec.totalAmount)}</span>
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => removeExtraConsumption(ec.id, true)}
                            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20"
                            title="Anular venta extra y reponer stock"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showDailyExpenses && (
            <div className="bg-black/30 rounded-xl p-3.5 border border-white/10 text-xs space-y-2 animate-fade-in">
              <span className="font-extrabold text-rose-300 uppercase tracking-wider block">
                Pagos / Egresos Registrados ({targetDateString}):
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
                          {formatTimeOnly(exp.timestamp)} • {exp.registeredByName} • Pago {exp.paymentMethod.toUpperCase()}
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

        {/* 3. BARRA DE FILTROS AVANZADOS (Turno, Cajero, Categoría, Estado) */}
        <div className="space-y-3 pt-2">
          {/* Pestañas de Estado */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('day')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'day'
                    ? 'bg-white text-brand-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Registro del Día ({dayStays.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all_stays')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'all_stays'
                    ? 'bg-white text-indigo-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Todas ({allUnifiedStays.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'active'
                    ? 'bg-white text-emerald-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>En Curso ({allUnifiedStays.filter((s) => s.status === 'active').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cerradas ({allUnifiedStays.filter((s) => s.status === 'completed').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cancelled')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'cancelled'
                    ? 'bg-rose-600 text-white shadow-xs font-black'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Anuladas ({allUnifiedStays.filter((s) => s.status === 'cancelled').length})</span>
              </button>
            </div>

            {/* Contador de resultados */}
            <span className="text-xs font-extrabold text-slate-500 font-mono">
              Mostrando {displayedStays.length} registros
            </span>
          </div>

          {/* Selectores de Filtro: Turno, Cajero, Categoría y Buscador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {/* Filtro por Turno */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                value={filterShiftType}
                onChange={(e) => setFilterShiftType(e.target.value)}
                className="w-full text-xs font-bold bg-transparent text-slate-700 focus:outline-none"
              >
                <option value="all">Turno: Todos los turnos</option>
                <option value="dia">Turno Día (08:00 - 20:00)</option>
                <option value="noche">Turno Noche (20:00 - 08:00)</option>
              </select>
            </div>

            {/* Filtro por Cajero */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <select
                value={filterReceptionist}
                onChange={(e) => setFilterReceptionist(e.target.value)}
                className="w-full text-xs font-bold bg-transparent text-slate-700 focus:outline-none"
              >
                <option value="all">Cajero: Todos los recepcionistas</option>
                {distinctReceptionists.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Tipo de Habitación */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <BedDouble className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <select
                value={filterRoomType}
                onChange={(e) => setFilterRoomType(e.target.value)}
                className="w-full text-xs font-bold bg-transparent text-slate-700 focus:outline-none"
              >
                <option value="all">Tipo: Todas las habitaciones</option>
                <option value="ventilador">Ventilador</option>
                <option value="aire">Aire Acondicionado</option>
                <option value="suite">Suite Tantra</option>
                <option value="jacuzzi">Jacuzzi</option>
                <option value="golden_suite">Golden Suite</option>
              </select>
            </div>

            {/* Buscador libre */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar habitación, placa, cajero..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. LISTA AUDITADA DE HABITACIONES Y MOVIMIENTOS */}
      {displayedStays.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BedDouble className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-700">No se encontraron habitaciones registradas</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No hay registros que coincidan con los filtros de fecha, turno, cajero o búsqueda seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedStays.map((stay) => {
            const isCancelled = stay.status === 'cancelled';
            const isActive = stay.status === 'active';
            const extraRate = tariffs[stay.roomType]?.extraHourPrice || (stay.roomType === 'jacuzzi' || stay.roomType === 'golden_suite' ? 40 : 30);
            const priceNight = tariffs[stay.roomType]?.priceNight || (stay.roomType === 'ventilador' ? 140 : stay.roomType === 'aire' ? 150 : stay.roomType === 'suite' ? 180 : stay.roomType === 'jacuzzi' ? 220 : 230);
            const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes, extraRate, Date.now(), {
              priceNight,
              baseRoomPrice: stay.baseRoomPrice,
              chosenPlan: stay.chosenPlan,
            });
            const consumptionsTotal = stay.consumptions ? stay.consumptions.reduce((sum, c) => sum + c.subtotal, 0) : 0;
            const paidConsumptionsTotal = stay.consumptions
              ? stay.consumptions.filter((c) => c.isPaid).reduce((sum, c) => sum + c.subtotal, 0)
              : 0;
            const stayOvertime = stay.overtimeCharge !== undefined ? stay.overtimeCharge : timeCalc.overtimeCharge;
            const totalDue = stay.totalAmount || (stay.baseRoomPrice + consumptionsTotal + stayOvertime);
            const prepaidAmt = stay.isPrepaid ? (stay.prepaidAmount || stay.baseRoomPrice) : 0;
            const totalAlreadyPaid = prepaidAmt + paidConsumptionsTotal;
            const pendingBalance = Math.max(0, totalDue - totalAlreadyPaid);
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
                      {stay.isCustomPackage || stay.chosenPlan === 'personalizado' ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-fuchsia-600 text-white flex items-center gap-1 shadow-xs">
                          <Sparkles className="w-3 h-3" />
                          {stay.customPackageName || 'Personalizada'}
                        </span>
                      ) : null}
                      {isCancelled ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1">
                          <Ban className="w-3 h-3" />
                          ANULADA
                        </span>
                      ) : isActive ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          En curso (Abierta)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-slate-400" />
                          Cerrada (Salida)
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <span>{stay.roomName}</span>
                    </h3>
                  </div>

                  {/* Estado de Cobro */}
                  <div className="text-right space-y-0.5">
                    <span className="text-xs font-black font-mono text-slate-900 block">
                      Total: {formatBs(totalDue)}
                    </span>
                    {stay.isPrepaid || paidConsumptionsTotal > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
                        ✓ Pagado: {formatBs(totalAlreadyPaid)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 inline-block">
                        Paga al salir
                      </span>
                    )}
                  </div>
                </div>

                {/* Desglose de Precios */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Plan</span>
                    <strong className="text-slate-800 font-extrabold truncate block">
                      {stay.isCustomPackage || stay.chosenPlan === 'personalizado'
                        ? `✨ ${stay.customPackageName || 'Personalizado'}`
                        : getPlanLabel(stay.chosenPlan)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Base Habitación</span>
                    <strong className="text-slate-800 font-mono font-bold">{formatBs(stay.baseRoomPrice)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Minibar</span>
                    <strong className="text-emerald-700 font-mono font-bold">+{formatBs(consumptionsTotal)}</strong>
                  </div>
                </div>

                {/* Movimientos del Cajero: Consumos Detallados */}
                {stay.consumptions && stay.consumptions.length > 0 && (
                  <div className="bg-rose-50/40 p-2.5 rounded-2xl border border-rose-100 text-xs space-y-1.5">
                    <span className="text-[10px] font-extrabold text-rose-800 flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-rose-600" />
                      Minibar cargado por cajero ({stay.consumptions.length} items):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {stay.consumptions.map((c, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-white px-2 py-1 rounded-lg border border-rose-200 font-semibold text-slate-800 flex items-center gap-1"
                        >
                          {c.isCustom && (
                            <span className="text-[8px] font-black px-1 py-0.2 rounded bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-0.5">
                              <Sparkles className="w-2 h-2 text-purple-600" />
                              Pers
                            </span>
                          )}
                          <span>{c.quantity}x {c.productName} (+{formatBs(c.subtotal)})</span>
                          {c.isPaid ? (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-black">
                              ✓ Contado
                            </span>
                          ) : (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-black">
                              ⏳ A la cuenta
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tiempos de Entrada, Salida y Horas Extras */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1.5 pt-0.5">
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
                        <span className="text-rose-700 font-black bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          +{formatBs(timeCalc.overtimeCharge)} Extra ({timeCalc.extraBlocksCount} bloques)
                        </span>
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

                {/* Cajero Responsable y Placa */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Cajero: <strong className="text-slate-800">{stay.receptionistName}</strong>
                  </span>
                  {stay.vehiclePlate && (
                    <span className="flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      <Car className="w-3 h-3 text-slate-400" />
                      {stay.vehiclePlate}
                    </span>
                  )}
                </div>

                {/* Motivo de anulación si aplica */}
                {isCancelled && (
                  <div className="bg-rose-100/70 p-3 rounded-2xl border border-rose-300 text-xs text-rose-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Anulada por: {stay.cancelledBy || 'Administrador'}</span>
                    </div>
                    <p className="text-[11px] text-rose-800 pl-5.5">
                      <strong>Motivo:</strong> {stay.cancellationReason || 'Registro anulado'}
                    </p>
                  </div>
                )}

                {/* BOTONES DE ADMINISTRACIÓN: MODIFICAR Y ANULAR */}
                {currentUser.role === 'admin' && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(stay)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-200 active:scale-95"
                      title="Modificar precio, minibar, tiempos o métodos de pago"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Modificar / Editar</span>
                    </button>

                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(stay)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-bold transition-all flex items-center gap-1.5 border border-rose-200 active:scale-95"
                        title="Anular habitación registrada"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Anular</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL DE EDICIÓN / MODIFICACIÓN PARA ADMINISTRADOR */}
      <EditStayModal
        stay={stayToEdit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setStayToEdit(null);
        }}
      />

      {/* 6. MODAL DE CONFIRMACIÓN DE ANULACIÓN */}
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

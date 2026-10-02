import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatBs, getRoomTypeLabel, getPlanLabel } from '../../utils/formatUtils';
import { formatDateTime, formatTimeOnly, getBoliviaStartOfDay, getBoliviaDayOfWeek, getBoliviaStartOfMonth } from '../../utils/timeUtils';
import { getNetworkTimestamp } from '../../services/firebase';
import { Stay, PaymentMethod } from '../../types';
import {
  BarChart3,
  Download,
  Upload,
  TrendingUp,
  DollarSign,
  QrCode,
  ShoppingBag,
  BedDouble,
  CheckCircle2,
  PieChart,
  Calendar,
  CalendarDays,
  Filter,
  UserCheck,
  Clock,
  Car,
  AlertTriangle,
  FileSpreadsheet,
  History,
  Layers,
  Sparkles,
  Ban,
} from 'lucide-react';
import { SYSTEM_USERS } from '../../data/initialData';

type DateFilterRange = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom' | 'all';
type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

export const SalesReports: React.FC = () => {
  const {
    completedStays,
    rooms,
    products,
    shiftsHistory,
    extraConsumptions,
    exportDatabaseJson,
    importDatabaseJson,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters State
  const [dateRange, setDateRange] = useState<DateFilterRange>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedReceptionist, setSelectedReceptionist] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Unify all stays (both active in rooms and completed in history)
  const allUnifiedStays: Stay[] = useMemo(() => {
    const staysMap = new Map<string, Stay>();

    // 1. Add completed / historical stays from cloud
    completedStays.forEach((s) => {
      if (s && s.id) {
        staysMap.set(s.id, s);
      }
    });

    // 2. Add currently active stays from occupied rooms
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

  // Date filtering logic (Bolivia timezone)
  const filteredStays = useMemo(() => {
    const nowMs = getNetworkTimestamp();
    const todayStart = getBoliviaStartOfDay(nowMs);
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const dayOfWeek = getBoliviaDayOfWeek(nowMs);
    const weekStart = todayStart - ((dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000);
    const monthStart = getBoliviaStartOfMonth(nowMs);

    // Mes anterior (Bolivia timezone)
    const nowD = new Date(nowMs);
    const prevMonthRef = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1);
    const lastMonthStart = getBoliviaStartOfMonth(prevMonthRef.getTime());
    const lastMonthEnd = monthStart - 1;

    // Rango personalizado
    const customStartMs = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : 0;
    const customEndMs = customEndDate ? new Date(`${customEndDate}T23:59:59.999`).getTime() : Infinity;

    return allUnifiedStays.filter((s) => {
      const stayTime = new Date(s.startTime).getTime();

      // Date range filter
      if (dateRange === 'today' && stayTime < todayStart) return false;
      if (dateRange === 'yesterday' && (stayTime < yesterdayStart || stayTime >= todayStart)) return false;
      if (dateRange === 'week' && stayTime < weekStart) return false;
      if (dateRange === 'month' && stayTime < monthStart) return false;
      if (dateRange === 'last_month' && (stayTime < lastMonthStart || stayTime > lastMonthEnd)) return false;
      if (dateRange === 'custom') {
        if (customStartMs && stayTime < customStartMs) return false;
        if (customEndMs && stayTime > customEndMs) return false;
      }

      // Receptionist filter
      if (selectedReceptionist !== 'all') {
        const matchRecep =
          s.receptionistId === selectedReceptionist ||
          s.receptionistName.toLowerCase().includes(selectedReceptionist.toLowerCase());
        if (!matchRecep) return false;
      }

      // Status filter
      if (statusFilter === 'active' && s.status !== 'active') return false;
      if (statusFilter === 'completed' && s.status !== 'completed') return false;
      if (statusFilter === 'cancelled' && s.status !== 'cancelled') return false;

      // Search query (Room name, receptionist, vehicle plate, notes)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchRoom = s.roomName.toLowerCase().includes(q);
        const matchRecep = s.receptionistName.toLowerCase().includes(q);
        const matchPlate = (s.vehiclePlate || '').toLowerCase().includes(q);
        const matchPlan = s.chosenPlan.toLowerCase().includes(q);
        if (!matchRoom && !matchRecep && !matchPlate && !matchPlan) return false;
      }

      return true;
    });
  }, [allUnifiedStays, dateRange, customStartDate, customEndDate, selectedReceptionist, statusFilter, searchQuery]);

  // Filtered extra consumptions (Bolivia timezone)
  const filteredExtraConsumptions = useMemo(() => {
    const nowMs = getNetworkTimestamp();
    const todayStart = getBoliviaStartOfDay(nowMs);
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const dayOfWeek = getBoliviaDayOfWeek(nowMs);
    const weekStart = todayStart - ((dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000);
    const monthStart = getBoliviaStartOfMonth(nowMs);

    const nowD = new Date(nowMs);
    const prevMonthRef = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1);
    const lastMonthStart = getBoliviaStartOfMonth(prevMonthRef.getTime());
    const lastMonthEnd = monthStart - 1;

    const customStartMs = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : 0;
    const customEndMs = customEndDate ? new Date(`${customEndDate}T23:59:59.999`).getTime() : Infinity;

    return extraConsumptions.filter((ec) => {
      const ecTime = new Date(ec.date).getTime();

      if (dateRange === 'today' && ecTime < todayStart) return false;
      if (dateRange === 'yesterday' && (ecTime < yesterdayStart || ecTime >= todayStart)) return false;
      if (dateRange === 'week' && ecTime < weekStart) return false;
      if (dateRange === 'month' && ecTime < monthStart) return false;
      if (dateRange === 'last_month' && (ecTime < lastMonthStart || ecTime > lastMonthEnd)) return false;
      if (dateRange === 'custom') {
        if (customStartMs && ecTime < customStartMs) return false;
        if (customEndMs && ecTime > customEndMs) return false;
      }

      if (selectedReceptionist !== 'all') {
        const matchRecep =
          ec.registeredById === selectedReceptionist ||
          ec.registeredByName.toLowerCase().includes(selectedReceptionist.toLowerCase());
        if (!matchRecep) return false;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchDesc = ec.description.toLowerCase().includes(q);
        const matchRecep = ec.registeredByName.toLowerCase().includes(q);
        const matchRoom = (ec.roomNumber || '').toLowerCase().includes(q);
        if (!matchDesc && !matchRecep && !matchRoom) return false;
      }

      return true;
    });
  }, [extraConsumptions, dateRange, customStartDate, customEndDate, selectedReceptionist, searchQuery]);

  // Valid non-cancelled stays for financial totals
  const validStays = filteredStays.filter((s) => s.status !== 'cancelled');

  // Financial aggregates calculated from filteredStays
  const totalStaysCount = validStays.length;
  const activeStaysCount = filteredStays.filter((s) => s.status === 'active').length;
  const completedStaysCount = filteredStays.filter((s) => s.status === 'completed').length;
  const cancelledStaysCount = filteredStays.filter((s) => s.status === 'cancelled').length;

  const totalBaseRoomRevenue = validStays.reduce((sum, s) => sum + (s.baseRoomPrice || 0), 0);
  const totalOvertimeRevenue = validStays.reduce((sum, s) => sum + (s.overtimeCharge || 0), 0);

  // Minibar consumptions calculation
  const productConsumptionMap: Record<string, { name: string; quantity: number; totalBs: number }> = {};
  let totalMinibarRevenue = 0;
  let totalMinibarUnits = 0;

  validStays.forEach((stay) => {
    (stay.consumptions || []).forEach((c) => {
      if (!productConsumptionMap[c.productId]) {
        productConsumptionMap[c.productId] = {
          name: c.productName,
          quantity: 0,
          totalBs: 0,
        };
      }
      productConsumptionMap[c.productId].quantity += c.quantity;
      productConsumptionMap[c.productId].totalBs += c.subtotal;
      totalMinibarRevenue += c.subtotal;
      totalMinibarUnits += c.quantity;
    });
  });

  // Include extra consumptions in product statistics
  filteredExtraConsumptions.forEach((ec) => {
    (ec.items || []).forEach((item) => {
      if (!productConsumptionMap[item.productId]) {
        productConsumptionMap[item.productId] = {
          name: item.productName,
          quantity: 0,
          totalBs: 0,
        };
      }
      productConsumptionMap[item.productId].quantity += item.quantity;
      productConsumptionMap[item.productId].totalBs += item.subtotal;
      totalMinibarRevenue += item.subtotal;
      totalMinibarUnits += item.quantity;
    });
  });

  const totalRevenue = totalBaseRoomRevenue + totalOvertimeRevenue + totalMinibarRevenue;

  // Cash vs QR breakdown
  let totalCash = 0;
  let totalQr = 0;

  filteredStays.forEach((s) => {
    if (s.cashPaid !== undefined || s.qrPaid !== undefined) {
      totalCash += s.cashPaid || 0;
      totalQr += s.qrPaid || 0;
    } else if (s.paymentMethod === 'efectivo') {
      totalCash += s.totalAmount || s.baseRoomPrice;
    } else if (s.paymentMethod === 'qr') {
      totalQr += s.totalAmount || s.baseRoomPrice;
    } else {
      // Mixed or default
      const half = Math.round((s.totalAmount || s.baseRoomPrice) / 2);
      totalCash += half;
      totalQr += (s.totalAmount || s.baseRoomPrice) - half;
    }
  });

  // Add extra consumptions cash / QR
  filteredExtraConsumptions.forEach((ec) => {
    if (ec.paymentMethod === 'efectivo') {
      totalCash += ec.totalAmount;
    } else {
      totalQr += ec.totalAmount;
    }
  });

  const topConsumedProducts = Object.values(productConsumptionMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // Room type breakdown
  const roomTypeMap: Record<string, { count: number; revenue: number }> = {};
  filteredStays.forEach((s) => {
    if (!roomTypeMap[s.roomType]) {
      roomTypeMap[s.roomType] = { count: 0, revenue: 0 };
    }
    roomTypeMap[s.roomType].count += 1;
    roomTypeMap[s.roomType].revenue += s.totalAmount || s.baseRoomPrice;
  });

  // Receptionist shift performance breakdown
  const receptionistMap: Record<string, { name: string; staysCount: number; totalRevenue: number; cash: number; qr: number }> = {};
  filteredStays.forEach((s) => {
    const key = s.receptionistId || s.receptionistName;
    if (!receptionistMap[key]) {
      receptionistMap[key] = {
        name: s.receptionistName || 'Recepcionista',
        staysCount: 0,
        totalRevenue: 0,
        cash: 0,
        qr: 0,
      };
    }
    const amt = s.totalAmount || s.baseRoomPrice;
    receptionistMap[key].staysCount += 1;
    receptionistMap[key].totalRevenue += amt;
    receptionistMap[key].cash += s.cashPaid || (s.paymentMethod === 'efectivo' ? amt : 0);
    receptionistMap[key].qr += s.qrPaid || (s.paymentMethod === 'qr' ? amt : 0);
  });

  const receptionistList = Object.values(receptionistMap);

  // ── Ranking individual de habitaciones (Habitación 1, 2, 3... Golden Suite) ──
  const individualRoomMap: Record<string, { name: string; type: string; count: number; revenue: number }> = {};
  filteredStays.forEach((s) => {
    if (s.status === 'cancelled') return;
    const key = s.roomId || s.roomName;
    if (!individualRoomMap[key]) {
      individualRoomMap[key] = {
        name: s.roomName,
        type: s.roomType,
        count: 0,
        revenue: 0,
      };
    }
    individualRoomMap[key].count += 1;
    individualRoomMap[key].revenue += (s.totalAmount || s.baseRoomPrice || 0);
  });

  const topIndividualRooms = Object.values(individualRoomMap)
    .sort((a, b) => b.count - a.count);

  // ── Ranking de promociones y planes más solicitados ──
  const planPopularityMap: Record<string, { planKey: string; label: string; count: number; revenue: number }> = {};
  filteredStays.forEach((s) => {
    if (s.status === 'cancelled') return;
    const planKey = s.chosenPlan || '1h';
    if (!planPopularityMap[planKey]) {
      planPopularityMap[planKey] = {
        planKey,
        label: getPlanLabel(planKey),
        count: 0,
        revenue: 0,
      };
    }
    planPopularityMap[planKey].count += 1;
    planPopularityMap[planKey].revenue += (s.baseRoomPrice || 0);
  });

  const topPlansAndPromos = Object.values(planPopularityMap)
    .sort((a, b) => b.count - a.count);

  // ── Ingresos Semanales y Mensuales (Globales) ──
  const nowMsAnalytics = getNetworkTimestamp();
  const todayStartAnalytics = getBoliviaStartOfDay(nowMsAnalytics);
  const dayOfWeekAnalytics = getBoliviaDayOfWeek(nowMsAnalytics);
  const thisWeekStartAnalytics = todayStartAnalytics - ((dayOfWeekAnalytics === 0 ? 6 : dayOfWeekAnalytics - 1) * 24 * 60 * 60 * 1000);
  const thisMonthStartAnalytics = getBoliviaStartOfMonth(nowMsAnalytics);

  const nowD = new Date(nowMsAnalytics);
  const prevMonthRef = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1);
  const lastMonthStartAnalytics = getBoliviaStartOfMonth(prevMonthRef.getTime());
  const lastMonthEndAnalytics = thisMonthStartAnalytics - 1;

  let thisWeekRevenue = 0;
  let thisWeekCount = 0;
  let thisMonthRevenue = 0;
  let thisMonthCount = 0;
  let lastMonthRevenue = 0;
  let lastMonthCount = 0;

  allUnifiedStays.forEach((s) => {
    if (s.status === 'cancelled') return;
    const stayTime = new Date(s.startTime).getTime();
    const amt = s.totalAmount || s.baseRoomPrice || 0;
    if (stayTime >= thisWeekStartAnalytics) {
      thisWeekRevenue += amt;
      thisWeekCount += 1;
    }
    if (stayTime >= thisMonthStartAnalytics) {
      thisMonthRevenue += amt;
      thisMonthCount += 1;
    } else if (stayTime >= lastMonthStartAnalytics && stayTime <= lastMonthEndAnalytics) {
      lastMonthRevenue += amt;
      lastMonthCount += 1;
    }
  });

  extraConsumptions.forEach((ec) => {
    const ecTime = new Date(ec.date).getTime();
    if (ecTime >= thisWeekStartAnalytics) {
      thisWeekRevenue += ec.totalAmount;
    }
    if (ecTime >= thisMonthStartAnalytics) {
      thisMonthRevenue += ec.totalAmount;
    } else if (ecTime >= lastMonthStartAnalytics && ecTime <= lastMonthEndAnalytics) {
      lastMonthRevenue += ec.totalAmount;
    }
  });

  const monthGrowthPercent = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  // ── Tendencia de Ingresos Diarios (Para Gráfico de Barras) ──
  const dailyTrendList = useMemo(() => {
    const map: Record<string, { dateStr: string; label: string; totalBs: number; count: number }> = {};
    validStays.forEach((s) => {
      const d = new Date(s.startTime);
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const label = `${day}/${month}`;

      if (!map[dateKey]) {
        map[dateKey] = { dateStr: dateKey, label, totalBs: 0, count: 0 };
      }
      map[dateKey].totalBs += (s.totalAmount || s.baseRoomPrice || 0);
      map[dateKey].count += 1;
    });

    const list = Object.values(map).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    const maxRevenue = Math.max(...list.map((item) => item.totalBs), 1);
    return { list, maxRevenue };
  }, [validStays]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabaseJson(content);
        if (success) {
          alert('¡Copia de seguridad restaurada con éxito!');
        } else {
          alert('Error al leer el archivo de respaldo.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Helper badge for room types
  const getRoomBadgeColor = (type: string) => {
    switch (type) {
      case 'suite':
        return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'ventilador':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'aire':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'jacuzzi':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'golden_suite':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Backup Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Reportes Generales y Gráficas de Ventas
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisión en vivo de habitaciones registradas, consumos, horas extras y cierres de caja en todo el mundo.
          </p>
        </div>

        {/* Data Management Buttons */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar Backup
          </button>

          <button
            onClick={exportDatabaseJson}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Backup JSON
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-brand-600" />
            Filtros Inteligentes de Consulta
          </div>
          <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
            {totalStaysCount} Registros encontrados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Date Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Rango de Fecha
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateFilterRange)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="month">🗓️ Este Mes (Actual)</option>
              <option value="last_month">⏪ Mes Anterior (Pasado)</option>
              <option value="custom">🛠️ Rango Personalizado</option>
              <option value="week">📆 Esta Semana (Lunes a Dom)</option>
              <option value="today">☀️ Hoy (Turnos del Día)</option>
              <option value="yesterday">🌙 Ayer</option>
              <option value="all">📅 Todo el Histórico</option>
            </select>
          </div>

          {/* 2. Receptionist / Shift */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Turno / Recepcionista
            </label>
            <select
              value={selectedReceptionist}
              onChange={(e) => setSelectedReceptionist(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">👥 Todos los Turnos</option>
              {SYSTEM_USERS.filter((u) => u.role !== 'admin').map((u) => (
                <option key={u.id} value={u.id}>
                  👤 {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Estado de Habitación
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">🛏️ Todas (En Curso + Finalizadas + Anuladas)</option>
              <option value="active">🟢 Solo En Curso (Ocupadas Ahora)</option>
              <option value="completed">✅ Solo Finalizadas (Cobradas)</option>
              <option value="cancelled">🚫 Solo Anuladas (Prueba / Error)</option>
            </select>
          </div>

          {/* 4. Search Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Buscar (Hab., Placa, Nota)
            </label>
            <input
              type="text"
              placeholder="Ej. Habitación 3, 2450-XYZ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Rango Personalizado Date Pickers */}
        {dateRange === 'custom' && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in bg-amber-50/70 p-3 rounded-xl border border-amber-200">
            <div>
              <label className="block text-[11px] font-extrabold text-amber-950 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Fecha Inicio (Desde):
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-amber-950 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Fecha Fin (Hasta):
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturado */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Total Ventas Facturadas
            </span>
            <Sparkles className="w-4 h-4 text-brand-400" />
          </div>
          <span className="text-3xl font-black font-mono text-white block mt-1.5">
            {formatBs(totalRevenue)}
          </span>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span>{totalStaysCount} estadías</span>
            <span>•</span>
            <span className="text-emerald-400">{completedStaysCount} cobradas</span>
            {activeStaysCount > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-300 font-bold">{activeStaysCount} en curso</span>
              </>
            )}
          </div>
        </div>

        {/* Efectivo */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-extrabold uppercase tracking-wider">
              <DollarSign className="w-4 h-4" />
              Recaudación Efectivo
            </div>
            <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              {totalRevenue > 0 ? `${((totalCash / totalRevenue) * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
          <span className="text-2xl font-black font-mono text-emerald-950 block mt-1.5">
            {formatBs(totalCash)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            Dinero ingresado a gavetas de caja
          </span>
        </div>

        {/* Pagos QR Vendis */}
        <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sky-700 text-xs font-extrabold uppercase tracking-wider">
              <QrCode className="w-4 h-4" />
              Recaudación QR Vendis
            </div>
            <span className="text-xs font-black text-sky-800 bg-sky-100 px-2 py-0.5 rounded-md">
              {totalRevenue > 0 ? `${((totalQr / totalRevenue) * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
          <span className="text-2xl font-black font-mono text-sky-950 block mt-1.5">
            {formatBs(totalQr)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            Transferencias bancarias / QR verificadas
          </span>
        </div>

        {/* Minibar & Horas Extras */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-brand-700 text-xs font-extrabold uppercase tracking-wider">
              <ShoppingBag className="w-4 h-4" />
              Minibar & Horas Extras
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-brand-950 block mt-1.5">
            {formatBs(totalMinibarRevenue + totalOvertimeRevenue)}
          </span>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Minibar: {formatBs(totalMinibarRevenue)} ({totalMinibarUnits} un.)</span>
            <span className="text-brand-600 font-bold">Extras: {formatBs(totalOvertimeRevenue)}</span>
          </div>
        </div>
      </div>

      {/* KPI 2: Comparativa "Este Mes" vs "Mes Anterior" y "Esta Semana" */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Generado Esta Semana */}
        <div className="bg-gradient-to-br from-brand-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-brand-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-brand-200 text-xs font-extrabold uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-brand-400" />
              Esta Semana (Lunes - Hoy)
            </div>
            <span className="text-3xl font-black font-mono text-white block mt-1">
              {formatBs(thisWeekRevenue)}
            </span>
            <span className="text-xs text-brand-300 font-medium mt-0.5 block">
              {thisWeekCount} habitaciones esta semana
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-brand-300 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Generado Este Mes (Mes Actual) */}
        <div className="bg-gradient-to-br from-purple-900 to-slate-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-purple-800 flex items-center justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center gap-2 text-purple-200 text-xs font-extrabold uppercase tracking-wider">
              <CalendarDays className="w-4 h-4 text-purple-400" />
              Este Mes (Mes Actual)
            </div>
            <span className="text-3xl font-black font-mono text-white block mt-1">
              {formatBs(thisMonthRevenue)}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-purple-200 font-medium">
                {thisMonthCount} estancias acumuladas
              </span>
              {lastMonthRevenue > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  monthGrowthPercent >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {monthGrowthPercent >= 0 ? `▲ +${monthGrowthPercent.toFixed(1)}%` : `▼ ${monthGrowthPercent.toFixed(1)}%`} vs Mes Pasado
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-purple-300 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        {/* Generado Mes Anterior (Mes Pasado) */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-300 text-xs font-extrabold uppercase tracking-wider">
              <History className="w-4 h-4 text-slate-400" />
              Mes Anterior (Pasado)
            </div>
            <span className="text-3xl font-black font-mono text-slate-100 block mt-1">
              {formatBs(lastMonthRevenue)}
            </span>
            <span className="text-xs text-slate-400 font-medium mt-0.5 block">
              {lastMonthCount} estancias cerradas el mes pasado
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-slate-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 📈 GRÁFICA DE TENDENCIA DIARIA / CRONOLÓGICA */}
      {dailyTrendList.list.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Gráfica de Tendencia: Evolución Diaria de Ventas
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {dailyTrendList.list.length} días graficados
            </span>
          </div>

          {/* Bar Chart Visual */}
          <div className="pt-4 pb-2">
            <div className="flex items-end justify-between gap-1.5 h-44 px-2">
              {dailyTrendList.list.map((item) => {
                const heightPercent = Math.max(8, (item.totalBs / dailyTrendList.maxRevenue) * 100);
                return (
                  <div key={item.dateStr} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[10px] font-mono font-bold px-2 py-1 rounded-lg shadow-md whitespace-nowrap z-20 pointer-events-none">
                      {item.label}: {formatBs(item.totalBs)} ({item.count} hab.)
                    </div>

                    <span className="text-[9px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatBs(item.totalBs)}
                    </span>

                    <div className="w-full max-w-[28px] bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-brand-600 to-rose-400 group-hover:from-brand-500 group-hover:to-rose-300 transition-all rounded-t-lg"
                      />
                    </div>

                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[32px]">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 👑 HABITACIONES Y PROMOCIONES MÁS BUSCADAS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* GRÁFICA / RANKING: Habitaciones Más Buscadas (Individual) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                🏆 Habitaciones Más Solicitadas (Ranking Individual)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Por ocupación</span>
          </div>

          {topIndividualRooms.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No hay registros de habitaciones en este período.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topIndividualRooms.map((r, idx) => {
                const maxCount = topIndividualRooms[0]?.count || 1;
                const percent = (r.count / maxCount) * 100;
                return (
                  <div key={r.name} className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full font-black flex items-center justify-center text-[10px] ${
                          idx === 0 ? 'bg-amber-400 text-amber-950' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <strong className="font-extrabold text-slate-800">{r.name}</strong>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoomBadgeColor(r.type)}`}>
                          {getRoomTypeLabel(r.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {r.count} usos
                        </span>
                        <span className="font-mono font-black text-brand-700">{formatBs(r.revenue)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="bg-gradient-to-r from-brand-600 to-rose-500 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GRÁFICA / RANKING: Promociones y Tarifas Más Buscadas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-900">
                🎯 Promociones y Tarifas Más Solicitadas
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Por elección del cliente</span>
          </div>

          {topPlansAndPromos.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No hay promociones registradas en este período.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topPlansAndPromos.map((p, idx) => {
                const maxCount = topPlansAndPromos[0]?.count || 1;
                const percent = (p.count / maxCount) * 100;
                return (
                  <div key={p.planKey} className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <strong className="font-extrabold text-slate-800">{p.label}</strong>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {p.count} contrataciones
                        </span>
                        <span className="font-mono font-black text-brand-700">{formatBs(p.revenue)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 💡 SUGERENCIAS ESTRATÉGICAS PARA AUMENTAR GANANCIAS */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 p-5 rounded-2xl border border-amber-300 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs font-bold">
            💡
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Sugerencias Estratégicas para Aumentar las Ganancias del Motel
            </h3>
            <p className="text-xs text-slate-600">
              Recomendaciones basadas en los hábitos de consumo y datos reales registrados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs">
              <Sparkles className="w-4 h-4 text-amber-500" />
              1. Potenciar Promociones Estrella
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Las promociones fijas como <strong>Promo 3h (99 Bs)</strong> y <strong>Promo 2h Golden (99 Bs)</strong> atraen un alto flujo de clientes. Mantener promociones atractivas en horarios de menor afluencia (ej. mañanas y tardes de lunes a miércoles) llenará habitaciones que normalmente estarían desocupadas.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-brand-800 font-extrabold text-xs">
              <ShoppingBag className="w-4 h-4 text-brand-500" />
              2. Impulsar las Ventas del Minibar
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ofrecer combos de bebidas y preservativos directamente en recepción durante el ingreso, o contar con vitrinas/exhibidores visibles, puede aumentar los consumos secundarios del minibar entre un 20% y 35% por estadía.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-purple-800 font-extrabold text-xs">
              <Clock className="w-4 h-4 text-purple-500" />
              3. Control Inteligente de Tiempo Extra
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Muchos clientes extienden sus estadías por 20 a 40 minutos extra. Las alertas automáticas del sistema facilitan que las recepcionistas cobren oportunamente el tiempo excedente o pregunten si desean ampliar la estadía a la tarifa de Noche Completa.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📊 GRÁFICAS DE VENTAS PARA EL ADMINISTRADOR */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* GRÁFICA 1: Rendimiento y Recaudación por Turno / Recepcionista */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Gráfica: Rendimiento y Ventas por Turno
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Total: {formatBs(totalRevenue)}</span>
          </div>

          {receptionistList.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No hay ventas registradas en el período seleccionado.
            </div>
          ) : (
            <div className="space-y-4">
              {receptionistList.map((rec) => {
                const percent = totalRevenue > 0 ? (rec.totalRevenue / totalRevenue) * 100 : 0;
                return (
                  <div key={rec.name} className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-brand-600" />
                        <strong className="text-slate-800 font-black">{rec.name}</strong>
                        <span className="text-[11px] bg-white px-2 py-0.5 rounded-md font-bold text-slate-600 border border-slate-200">
                          {rec.staysCount} habitaciones
                        </span>
                      </div>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {formatBs(rec.totalRevenue)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${percent}%` }}
                        className="bg-gradient-to-r from-brand-600 to-rose-500 h-full rounded-full transition-all duration-500"
                        title={`${percent.toFixed(1)}% del total`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>💵 Efectivo: <strong>{formatBs(rec.cash)}</strong></span>
                      <span>📱 QR Vendis: <strong>{formatBs(rec.qr)}</strong></span>
                      <span className="font-bold text-brand-700">{percent.toFixed(0)}% del total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GRÁFICA 2: Distribución de Medios de Pago (Donut / Pie Visual) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Gráfica: Composición de Medios de Pago
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Efectivo vs QR</span>
          </div>

          {totalRevenue === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Sin datos para graficar en este período.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Visual Ring Chart */}
              <div className="flex flex-col items-center justify-center p-3">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background ring */}
                    <path
                      className="text-slate-100"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Cash ring segment (Emerald) */}
                    <path
                      className="text-emerald-500"
                      strokeDasharray={`${(totalCash / totalRevenue) * 100}, 100`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* QR ring segment (Sky) */}
                    <path
                      className="text-sky-500"
                      strokeDasharray={`${(totalQr / totalRevenue) * 100}, 100`}
                      strokeDashoffset={`-${(totalCash / totalRevenue) * 100}`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                    <strong className="text-sm font-mono font-black text-slate-900">{formatBs(totalRevenue)}</strong>
                  </div>
                </div>
              </div>

              {/* Legends */}
              <div className="space-y-3">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                      Efectivo en Caja
                    </span>
                    <strong className="font-mono font-black text-emerald-950">{formatBs(totalCash)}</strong>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                    {((totalCash / totalRevenue) * 100).toFixed(1)}% de las ventas
                  </span>
                </div>

                <div className="bg-sky-50 p-3 rounded-xl border border-sky-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-sky-900 flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
                      Pagos QR (Vendis)
                    </span>
                    <strong className="font-mono font-black text-sky-950">{formatBs(totalQr)}</strong>
                  </div>
                  <span className="text-[11px] text-sky-700 font-bold block mt-0.5">
                    {((totalQr / totalRevenue) * 100).toFixed(1)}% de las ventas
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GRÁFICA 3: Ocupación e Ingresos por Tipo de Habitación */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Gráfica: Ocupación y Ventas por Tipo de Habitación
              </h3>
            </div>
          </div>

          {Object.keys(roomTypeMap).length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No hay habitaciones registradas en este período.
            </div>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(roomTypeMap).map(([typeKey, data]) => {
                const percent = totalStaysCount > 0 ? (data.count / totalStaysCount) * 100 : 0;
                return (
                  <div key={typeKey} className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{getRoomTypeLabel(typeKey)}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-600">{data.count} estancias ({percent.toFixed(0)}%)</span>
                        <span className="font-mono font-black text-brand-700">{formatBs(data.revenue)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="bg-brand-600 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GRÁFICA 4: Top Productos Más Vendidos del Minibar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Gráfica: Top Productos del Minibar Más Vendidos
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">Total: {formatBs(totalMinibarRevenue)}</span>
          </div>

          {topConsumedProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No hay consumos de minibar en el período seleccionado.
            </div>
          ) : (
            <div className="space-y-2">
              {topConsumedProducts.map((p, idx) => {
                const maxQty = topConsumedProducts[0]?.quantity || 1;
                const barPercent = (p.quantity / maxQty) * 100;
                return (
                  <div key={p.name} className="space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-800 font-black flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {p.quantity} unid.
                        </span>
                        <span className="font-mono font-black text-brand-700">{formatBs(p.totalBs)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${barPercent}%` }}
                        className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📋 TABLA EN VIVO: REGISTRO DE TODAS LAS HABITACIONES POR TURNO */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-600" />
              <h3 className="font-black text-base text-slate-900">
                Registro Detallado de Habitaciones por Turno (En Vivo)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Lista cronológica completa con hora de entrada, consumos de minibar, recargos y recepcionista responsable.
            </p>
          </div>

          <span className="text-xs font-extrabold px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-700">
            Mostrando {filteredStays.length} habitaciones
          </span>
        </div>

        {filteredStays.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No se encontraron habitaciones registradas con los filtros actuales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ingreso / Salida</th>
                  <th className="py-3 px-4">Habitación</th>
                  <th className="py-3 px-4">Turno / Recepcionista</th>
                  <th className="py-3 px-4">Plan & Pago</th>
                  <th className="py-3 px-4">Consumos Minibar</th>
                  <th className="py-3 px-4">Tiempo Extra</th>
                  <th className="py-3 px-4 text-right">Total Cobrado</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStays.map((stay) => {
                  const consumptionsSum = (stay.consumptions || []).reduce((sum, c) => sum + c.subtotal, 0);
                  const isPrepaid = stay.isPrepaid;
                  const prepaidAmt = isPrepaid ? (stay.prepaidAmount || stay.baseRoomPrice) : 0;
                  const finalTotal = stay.totalAmount || (stay.baseRoomPrice + (stay.overtimeCharge || 0) + consumptionsSum);

                  return (
                    <tr key={stay.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Ingreso / Salida */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <strong className="text-slate-900 font-bold block">
                            {formatDateTime(stay.startTime)}
                          </strong>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {stay.endTime ? `Salida: ${formatTimeOnly(stay.endTime)}` : <span className="text-emerald-600 font-bold">En curso</span>}
                          </div>
                        </div>
                      </td>

                      {/* 2. Habitación */}
                      <td className="py-3.5 px-4">
                        <div>
                          <strong className="font-extrabold text-slate-900 text-sm block">
                            {stay.roomName}
                          </strong>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${getRoomBadgeColor(stay.roomType)}`}>
                            {getRoomTypeLabel(stay.roomType)}
                          </span>
                          {stay.vehiclePlate && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 font-mono">
                              <Car className="w-3 h-3 text-slate-400" />
                              {stay.vehiclePlate}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Recepcionista */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                          <span className="font-bold text-slate-800">{stay.receptionistName}</span>
                        </div>
                      </td>

                      {/* 4. Plan & Modalidad de Pago */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-slate-900">
                              {getPlanLabel(stay.chosenPlan)}
                            </span>
                            <span className="text-slate-500 font-mono">({formatBs(stay.baseRoomPrice)})</span>
                          </div>

                          {isPrepaid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Pagado Adelantado ({formatBs(prepaidAmt)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Paga al Salir
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Consumos Minibar */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {!stay.consumptions || stay.consumptions.length === 0 ? (
                          <span className="text-slate-400 text-[11px] italic">Sin consumos</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {stay.consumptions.map((c) => (
                                <span
                                  key={c.id}
                                  className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-semibold"
                                >
                                  {c.quantity}x {c.productName} ({formatBs(c.subtotal)})
                                </span>
                              ))}
                            </div>
                            <span className="text-[11px] font-black text-brand-700 font-mono block">
                              Total: +{formatBs(consumptionsSum)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 6. Tiempo Extra */}
                      <td className="py-3.5 px-4">
                        {stay.overtimeCharge && stay.overtimeCharge > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded bg-rose-100 text-brand-800 border border-rose-200 font-mono">
                            <AlertTriangle className="w-3 h-3 text-brand-600" />
                            +{formatBs(stay.overtimeCharge)} ({stay.overtimeMinutes} min)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0.00 Bs</span>
                        )}
                      </td>

                      {/* 7. Total Final Cobrado */}
                      <td className="py-3.5 px-4 text-right">
                        <div>
                          <strong className="text-base font-black font-mono text-slate-900 block">
                            {formatBs(finalTotal)}
                          </strong>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">
                            {stay.paymentMethod === 'efectivo' ? '💵 Efectivo' : stay.paymentMethod === 'qr' ? '📱 QR Vendis' : '💳 Mixto'}
                          </span>
                        </div>
                      </td>

                      {/* 8. Estado */}
                      <td className="py-3.5 px-4 text-center">
                        {stay.status === 'cancelled' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-600 text-white shadow-2xs">
                              <Ban className="w-3 h-3" />
                              ANULADA
                            </span>
                            {stay.cancellationReason && (
                              <span className="text-[9px] text-rose-700 block max-w-xs truncate font-medium mx-auto" title={stay.cancellationReason}>
                                {stay.cancellationReason}
                              </span>
                            )}
                          </div>
                        ) : stay.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Ocupada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Finalizada
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

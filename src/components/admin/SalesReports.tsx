import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatBs, getRoomTypeLabel, getPlanLabel } from '../../utils/formatUtils';
import { formatDateTime, formatTimeOnly } from '../../utils/timeUtils';
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
  Filter,
  UserCheck,
  Clock,
  Car,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Ban,
} from 'lucide-react';
import { SYSTEM_USERS } from '../../data/initialData';

type DateFilterRange = 'today' | 'yesterday' | 'week' | 'month' | 'all';
type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

export const SalesReports: React.FC = () => {
  const {
    completedStays,
    rooms,
    products,
    shiftsHistory,
    exportDatabaseJson,
    importDatabaseJson,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters State
  const [dateRange, setDateRange] = useState<DateFilterRange>('all');
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

  // Date filtering logic
  const filteredStays = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekStart = todayStart - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return allUnifiedStays.filter((s) => {
      const stayTime = new Date(s.startTime).getTime();

      // Date range filter
      if (dateRange === 'today' && stayTime < todayStart) return false;
      if (dateRange === 'yesterday' && (stayTime < yesterdayStart || stayTime >= todayStart)) return false;
      if (dateRange === 'week' && stayTime < weekStart) return false;
      if (dateRange === 'month' && stayTime < monthStart) return false;

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
  }, [allUnifiedStays, dateRange, selectedReceptionist, statusFilter, searchQuery]);

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
              <option value="all">📅 Todo el Histórico</option>
              <option value="today">☀️ Hoy (Turnos del Día)</option>
              <option value="yesterday">🌙 Ayer</option>
              <option value="week">📆 Esta Semana (Lunes a Dom)</option>
              <option value="month">🗓️ Este Mes</option>
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

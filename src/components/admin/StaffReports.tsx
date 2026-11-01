import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Shift, StaffMember, StaffConsumption } from '../../types';
import { formatBs, getPaymentMethodLabel, getCategoryLabel } from '../../utils/formatUtils';
import { formatDateTime, formatDateOnly, formatTimeOnly } from '../../utils/timeUtils';
import { getNetworkTimestamp } from '../../services/firebase';
import { SYSTEM_USERS } from '../../data/initialData';
import {
  UserCheck,
  Calendar,
  DollarSign,
  QrCode,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Coffee,
  Coins,
  Receipt,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Eye,
  Info,
  CalendarDays,
  ShoppingBag,
  Layers,
  ArrowRightLeft,
  Mail,
  RefreshCw,
} from 'lucide-react';

type TimeFilterOption = '7d' | '15d' | '30d' | 'all';

interface ReceptionistProfile {
  id: string;
  name: string;
  role: string;
  shiftName: string;
  defaultWeeklySalary: number;
  avatarColor: string;
  isRegisteredUser: boolean;
}

interface StaffReportsProps {
  onBackToRooms?: () => void;
}

export const StaffReports: React.FC<StaffReportsProps> = ({ onBackToRooms }) => {
  const {
    currentUser,
    staffMembers,
    shiftsHistory,
    staffConsumptions,
    staffSettlements,
    reloadFromFirebase,
    showToast,
  } = useApp();

  // Control de acceso de seguridad estricto
  const hasAccess =
    currentUser.role === 'admin' ||
    currentUser.role === 'recepcionista_dia' ||
    currentUser.id === 'user-admin' ||
    currentUser.id === 'user-recep-dia';

  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('7d');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all'); // 'all' o ID de recepcionista
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'shifts' | 'consumptions'>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 1. Obtener lista consolidada de todos los recepcionistas registrados
  const receptionistsList: ReceptionistProfile[] = useMemo(() => {
    const map = new Map<string, ReceptionistProfile>();

    // A. Recepcionistas de SYSTEM_USERS
    SYSTEM_USERS.filter((u) => u.role.includes('recepcionista')).forEach((u) => {
      map.set(u.id, {
        id: u.id,
        name: u.name,
        role: u.role,
        shiftName: u.shiftName,
        defaultWeeklySalary: 700,
        avatarColor: u.avatarColor || 'bg-amber-600',
        isRegisteredUser: true,
      });
    });

    // B. Recepcionistas de staffMembers
    staffMembers
      .filter((m) => m.role === 'recepcionista' || m.name.toLowerCase().includes('recep'))
      .forEach((m) => {
        const existing = map.get(m.id);
        if (existing) {
          map.set(m.id, {
            ...existing,
            name: m.name || existing.name,
            shiftName: m.shiftName || existing.shiftName,
            defaultWeeklySalary: m.defaultWeeklySalary || existing.defaultWeeklySalary,
          });
        } else {
          map.set(m.id, {
            id: m.id,
            name: m.name,
            role: m.role,
            shiftName: m.shiftName || 'Turno Asignado',
            defaultWeeklySalary: m.defaultWeeklySalary || 700,
            avatarColor: m.name.toLowerCase().includes('noche') ? 'bg-indigo-600' : 'bg-amber-600',
            isRegisteredUser: false,
          });
        }
      });

    // C. Detectar recepcionistas que hayan cerrado turnos con nombres físicos personalizados
    shiftsHistory.forEach((s) => {
      const name = (s.responsiblePersonName || s.receptionistName || '').trim();
      if (!name) return;

      // Buscar si ya coincide con alguno
      const alreadyInList = Array.from(map.values()).some(
        (p) =>
          p.id === s.receptionistId ||
          p.name.toLowerCase() === name.toLowerCase()
      );

      if (!alreadyInList) {
        const generatedId = `custom-recep-${name.toLowerCase().replace(/\s+/g, '-')}`;
        map.set(generatedId, {
          id: generatedId,
          name: name,
          role: 'recepcionista',
          shiftName: s.shiftType === 'noche' ? 'Turno Noche' : 'Turno Día',
          defaultWeeklySalary: 700,
          avatarColor: 'bg-slate-700',
          isRegisteredUser: false,
        });
      }
    });

    return Array.from(map.values());
  }, [staffMembers, shiftsHistory]);

  // 2. Rango de fecha según filtro (7, 15, 30 días o todo)
  const filterDateThresholdMs = useMemo(() => {
    const now = getNetworkTimestamp();
    switch (timeFilter) {
      case '7d':
        return now - 7 * 24 * 60 * 60 * 1000;
      case '15d':
        return now - 15 * 24 * 60 * 60 * 1000;
      case '30d':
        return now - 30 * 24 * 60 * 60 * 1000;
      case 'all':
      default:
        return 0;
    }
  }, [timeFilter]);

  // Función para determinar si un turno pertenece a un recepcionista
  const isShiftOfReceptionist = (shift: Shift, recep: ReceptionistProfile) => {
    const sId = shift.receptionistId;
    const sName = (shift.responsiblePersonName || shift.receptionistName || '').toLowerCase().trim();
    const rName = recep.name.toLowerCase().trim();

    return (
      sId === recep.id ||
      sName.includes(rName) ||
      rName.includes(sName) ||
      (recep.id === 'user-recep-dia' && (sId === 'user-recep-dia' || sName.includes('día') || sName.includes('dia'))) ||
      (recep.id === 'user-recep-noche' && (sId === 'user-recep-noche' || sName.includes('noche')))
    );
  };

  // Función para determinar si un consumo pertenece a un recepcionista
  const isConsumptionOfReceptionist = (consumption: StaffConsumption, recep: ReceptionistProfile) => {
    const cId = consumption.staffId;
    const cName = (consumption.staffName || '').toLowerCase().trim();
    const rName = recep.name.toLowerCase().trim();

    return (
      cId === recep.id ||
      cName.includes(rName) ||
      rName.includes(cName) ||
      (recep.id === 'user-recep-dia' && (cId === 'user-recep-dia' || cName.includes('día') || cName.includes('dia'))) ||
      (recep.id === 'user-recep-noche' && (cId === 'user-recep-noche' || cName.includes('noche')))
    );
  };

  // 3. Cálculos completos por recepcionista
  const receptionistsData = useMemo(() => {
    return receptionistsList.map((recep) => {
      // Todos los turnos cerrados del recepcionista (historial completo)
      const allShifts = shiftsHistory.filter(
        (s) => s.status === 'closed' && isShiftOfReceptionist(s, recep)
      );

      // Turnos filtrados por el período de tiempo (7, 15, 30 días)
      const periodShifts = allShifts.filter((s) => {
        const time = new Date(s.endTime || s.startTime).getTime();
        return time >= filterDateThresholdMs;
      });

      // Todos los consumos del recepcionista
      const allConsumptions = staffConsumptions.filter((c) =>
        isConsumptionOfReceptionist(c, recep)
      );

      // Consumos filtrados por el período
      const periodConsumptions = allConsumptions.filter((c) => {
        const time = new Date(c.date).getTime();
        return time >= filterDateThresholdMs;
      });

      // --- CÁLCULO DE DEUDA ACTUAL ("CUÁNTO DEBE") ---
      // A. Faltantes de caja que aún NO han sido liquidados / descontados
      const pendingShortageShifts = allShifts.filter(
        (s) => !s.isSettled && (s.discountAmount || 0) > 0.01
      );
      const totalPendingShortageAmount = pendingShortageShifts.reduce(
        (sum, s) => sum + (s.discountAmount || 0),
        0
      );

      // B. Consumos de personal que NO fueron pagados al contado y NO han sido liquidados
      const pendingConsumptions = allConsumptions.filter(
        (c) => !c.isPaid && !c.isSettled
      );
      const totalPendingConsumptionAmount = pendingConsumptions.reduce(
        (sum, c) => sum + (c.totalAmount || 0),
        0
      );

      // Total acumulado que DEBE actualmente
      const totalOwedAmount = totalPendingShortageAmount + totalPendingConsumptionAmount;

      // Consumos pagados al contado en el acto
      const paidUpfrontConsumptions = periodConsumptions.filter((c) => c.isPaid);
      const paidUpfrontAmount = paidUpfrontConsumptions.reduce(
        (sum, c) => sum + (c.totalAmount || 0),
        0
      );

      // --- CÁLCULO DE CÓMO CERRARON CAJA EN EL PERÍODO ---
      let positiveShiftsCount = 0;
      let positiveAmount = 0;
      let shortageShiftsCount = 0;
      let shortageAmount = 0;
      let exactShiftsCount = 0;
      let netBalance = 0;

      let totalExpectedSales = 0;
      let totalDeclaredSales = 0;
      let totalEnvelopesDelivered = 0;
      let totalExpensesPaid = 0;

      periodShifts.forEach((s) => {
        const diff = s.totalDifference !== undefined ? s.totalDifference : ((s.differenceCash || 0) + (s.differenceQr || 0));
        netBalance += diff;

        totalExpectedSales += (s.expectedCash || 0) + (s.expectedQr || 0);
        totalDeclaredSales += (s.declaredCash || 0) + (s.declaredQr || 0);
        totalEnvelopesDelivered += s.cashDeliveredAtClose || 0;
        totalExpensesPaid += s.operationalExpensesCash !== undefined ? s.operationalExpensesCash : (s.totalExpensesCash || 0);

        if (diff > 0.01) {
          positiveShiftsCount += 1;
          positiveAmount += diff;
        } else if (diff < -0.01) {
          shortageShiftsCount += 1;
          shortageAmount += Math.abs(diff);
        } else {
          exactShiftsCount += 1;
        }
      });

      const totalPeriodConsumptionAmount = periodConsumptions.reduce(
        (sum, c) => sum + (c.totalAmount || 0),
        0
      );

      return {
        profile: recep,
        allShifts,
        periodShifts,
        allConsumptions,
        periodConsumptions,
        // Deuda actual
        pendingShortageShifts,
        totalPendingShortageAmount,
        pendingConsumptions,
        totalPendingConsumptionAmount,
        totalOwedAmount,
        paidUpfrontAmount,
        // Cierre de cajas en período
        positiveShiftsCount,
        positiveAmount,
        shortageShiftsCount,
        shortageAmount,
        exactShiftsCount,
        netBalance,
        totalExpectedSales,
        totalDeclaredSales,
        totalEnvelopesDelivered,
        totalExpensesPaid,
        totalPeriodConsumptionAmount,
      };
    });
  }, [receptionistsList, shiftsHistory, staffConsumptions, filterDateThresholdMs]);

  // Recepcionista seleccionado (o null si es 'all')
  const currentSelectedData = useMemo(() => {
    if (selectedStaffId === 'all') return null;
    return receptionistsData.find((d) => d.profile.id === selectedStaffId) || receptionistsData[0];
  }, [selectedStaffId, receptionistsData]);

  // Totales consolidados de todos los recepcionistas (para vista 'all')
  const globalConsolidated = useMemo(() => {
    return receptionistsData.reduce(
      (acc, curr) => {
        acc.totalOwed += curr.totalOwedAmount;
        acc.totalPendingShortages += curr.totalPendingShortageAmount;
        acc.totalPendingConsumptions += curr.totalPendingConsumptionAmount;
        acc.totalPeriodShifts += curr.periodShifts.length;
        acc.positiveShiftsCount += curr.positiveShiftsCount;
        acc.positiveAmount += curr.positiveAmount;
        acc.shortageShiftsCount += curr.shortageShiftsCount;
        acc.shortageAmount += curr.shortageAmount;
        acc.exactShiftsCount += curr.exactShiftsCount;
        acc.netBalance += curr.netBalance;
        acc.totalPeriodConsumptions += curr.totalPeriodConsumptionAmount;
        acc.totalEnvelopesDelivered += curr.totalEnvelopesDelivered;
        return acc;
      },
      {
        totalOwed: 0,
        totalPendingShortages: 0,
        totalPendingConsumptions: 0,
        totalPeriodShifts: 0,
        positiveShiftsCount: 0,
        positiveAmount: 0,
        shortageShiftsCount: 0,
        shortageAmount: 0,
        exactShiftsCount: 0,
        netBalance: 0,
        totalPeriodConsumptions: 0,
        totalEnvelopesDelivered: 0,
      }
    );
  }, [receptionistsData]);

  // Filtrado de turnos por búsqueda de texto (observaciones, nombres, fechas)
  const filteredShifts = useMemo(() => {
    const list = currentSelectedData ? currentSelectedData.periodShifts : shiftsHistory.filter(s => s.status === 'closed' && (new Date(s.endTime || s.startTime).getTime() >= filterDateThresholdMs));
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((s) => {
      const notes = (s.notes || '').toLowerCase();
      const respName = (s.responsiblePersonName || s.receptionistName || '').toLowerCase();
      const handed = (s.handedOverTo || '').toLowerCase();
      const dateStr = formatDateOnly(s.endTime || s.startTime).toLowerCase();
      return notes.includes(q) || respName.includes(q) || handed.includes(q) || dateStr.includes(q);
    });
  }, [currentSelectedData, shiftsHistory, filterDateThresholdMs, searchQuery]);

  // Filtrado de consumos por búsqueda de texto
  const filteredConsumptions = useMemo(() => {
    const list = currentSelectedData ? currentSelectedData.periodConsumptions : staffConsumptions.filter(c => new Date(c.date).getTime() >= filterDateThresholdMs);
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((c) => {
      const staff = (c.staffName || '').toLowerCase();
      const notes = (c.notes || '').toLowerCase();
      const items = c.items.map((i) => i.productName.toLowerCase()).join(' ');
      return staff.includes(q) || notes.includes(q) || items.includes(q);
    });
  }, [currentSelectedData, staffConsumptions, filterDateThresholdMs, searchQuery]);

  // Manejo de sincronización desde la nube
  const handleCloudSync = async () => {
    setIsSyncing(true);
    try {
      const data = await reloadFromFirebase();
      const count = data?.shifts?.length || shiftsHistory.length;
      showToast({
        title: 'Sincronización Completa',
        message: `Se actualizaron ${count} turnos e historial de consumos.`,
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Error de Conexión',
        message: 'No se pudo sincronizar con la nube.',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Verificación de permiso visual
  if (!hasAccess) {
    return (
      <div className="bg-white rounded-3xl p-8 max-w-xl mx-auto my-12 text-center shadow-xl border border-rose-200 animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Acceso Restringido</h2>
        <p className="text-sm text-slate-600 mb-6">
          Este informe contiene datos confidenciales de arqueo, deudas y consumos de personal. Solo es visible para el Administrador General y la Recepcionista de Turno Día.
        </p>
        {onBackToRooms && (
          <button
            onClick={onBackToRooms}
            className="px-6 py-2.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Regresar a Habitaciones
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-fade-in print:p-0">
      {/* 1. HEADER PRINCIPAL CON BOTONES DE ACCIÓN */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">
                  Informe de Personal & Cajas de Recepción
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <ShieldCheck className="w-3 h-3" />
                  Admin & Recep. Día
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Auditoría detallada de deudas, cuadres de caja (positivos y faltantes), consumos y observaciones registradas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
            <button
              onClick={handleCloudSync}
              disabled={isSyncing}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Sincronizar datos frescos desde Firebase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Imprimir informe o guardar en PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir</span>
            </button>

            {onBackToRooms && (
              <button
                onClick={onBackToRooms}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>← Habitaciones</span>
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE FILTROS TEMPORALES: 7, 15, 30 DÍAS */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl w-fit">
            <span className="text-[11px] font-bold text-slate-500 uppercase px-2 hidden sm:inline">
              Período:
            </span>
            <button
              onClick={() => setTimeFilter('7d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeFilter === '7d'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => setTimeFilter('15d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeFilter === '15d'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Últimos 15 días
            </button>
            <button
              onClick={() => setTimeFilter('30d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeFilter === '30d'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Últimos 30 días
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeFilter === 'all'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todo el Historial
            </button>
          </div>

          {/* Buscador de texto para observaciones, productos, turnos */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por notas, productos o fecha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. SELECTOR DE RECEPCIONISTAS REGISTRADOS */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Recepcionistas Registrados:
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
              {receptionistsList.length} en sistema
            </span>
          </div>
          {selectedStaffId !== 'all' && (
            <button
              onClick={() => setSelectedStaffId('all')}
              className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Ver Comparativa de Todos →
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {/* Opción Todos */}
          <button
            onClick={() => setSelectedStaffId('all')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedStaffId === 'all'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black">🌟 TODOS</span>
              <Layers className={`w-4 h-4 ${selectedStaffId === 'all' ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <div className="mt-2">
              <span className={`text-[10px] block ${selectedStaffId === 'all' ? 'text-indigo-100' : 'text-slate-400'}`}>
                Deuda Total Personal:
              </span>
              <span className="text-xs font-black font-mono">
                {formatBs(globalConsolidated.totalOwed)}
              </span>
            </div>
          </button>

          {/* Tarjetas individuales de cada recepcionista */}
          {receptionistsData.map((d) => {
            const isSelected = selectedStaffId === d.profile.id;
            const hasDebt = d.totalOwedAmount > 0.01;

            return (
              <button
                key={d.profile.id}
                onClick={() => setSelectedStaffId(d.profile.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 ${
                      isSelected ? 'bg-white/20' : d.profile.avatarColor
                    }`}
                  >
                    {d.profile.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-black truncate block leading-tight">
                      {d.profile.name}
                    </span>
                    <span
                      className={`text-[9px] block truncate ${
                        isSelected ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      {d.profile.shiftName}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100/20 flex items-center justify-between">
                  <div>
                    <span
                      className={`text-[9px] block uppercase font-bold leading-none ${
                        isSelected ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      Debe:
                    </span>
                    <span
                      className={`text-xs font-black font-mono leading-tight ${
                        isSelected
                          ? 'text-white'
                          : hasDebt
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {formatBs(d.totalOwedAmount)}
                    </span>
                  </div>

                  {hasDebt ? (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-rose-500/30 text-rose-100 border border-rose-300/30'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Deuda
                    </span>
                  ) : (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-emerald-500/30 text-emerald-100 border border-emerald-300/30'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Al día
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. RESUMEN KPI PRINCIPAL (TARJETAS DE CUÁNTO DEBE, CIERRES POSITIVOS/FALTANTES Y CONSUMO) */}
      {currentSelectedData ? (
        // Vista para un solo recepcionista seleccionado
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CUÁNTO DEBE (DEUDA TOTAL PENDIENTE) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Cuánto Debe Actualmente
              </span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  currentSelectedData.totalOwedAmount > 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Coins className="w-5 h-5" />
              </div>
            </div>

            <div className="my-3">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono block ${
                  currentSelectedData.totalOwedAmount > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatBs(currentSelectedData.totalOwedAmount)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {currentSelectedData.totalOwedAmount > 0
                  ? 'Saldo pendiente de cobro / liquidación'
                  : 'Totalmente al día, sin deudas acumuladas'}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Faltantes en caja por descontar:</span>
                <span className="font-bold text-rose-600 font-mono">
                  {formatBs(currentSelectedData.totalPendingShortageAmount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Consumo de minibar pendiente:</span>
                <span className="font-bold text-amber-700 font-mono">
                  {formatBs(currentSelectedData.totalPendingConsumptionAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* CIERRES CON NÚMEROS POSITIVOS (SOBRANTES) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Cierres Positivos ({timeFilter})
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                  +{formatBs(currentSelectedData.positiveAmount)}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {currentSelectedData.positiveShiftsCount} turnos cerraron con saldo a favor
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] flex justify-between text-slate-600">
              <span>Cuadres exactos (0 diferencia):</span>
              <span className="font-bold text-slate-800 font-mono">
                {currentSelectedData.exactShiftsCount} turnos
              </span>
            </div>
          </div>

          {/* CIERRES CON FALTANTE (DÉFICIT / DESCUENTO) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Cierres con Faltante ({timeFilter})
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono block">
                -{formatBs(currentSelectedData.shortageAmount)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {currentSelectedData.shortageShiftsCount} turnos cerraron con faltante en caja
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] flex justify-between text-slate-600">
              <span>Balance neto en el período:</span>
              <span
                className={`font-black font-mono ${
                  currentSelectedData.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {currentSelectedData.netBalance >= 0 ? '+' : ''}
                {formatBs(currentSelectedData.netBalance)}
              </span>
            </div>
          </div>

          {/* CONSUMOS DE MINIBAR DEL PERSONAL */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Consumo Personal ({timeFilter})
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Coffee className="w-5 h-5" />
              </div>
            </div>

            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-black text-purple-950 font-mono block">
                {formatBs(currentSelectedData.totalPeriodConsumptionAmount)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {currentSelectedData.periodConsumptions.length} registros de consumo en período
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] flex justify-between text-slate-600">
              <span>Pagado al contado en el acto:</span>
              <span className="font-bold text-emerald-700 font-mono">
                {formatBs(currentSelectedData.paidUpfrontAmount)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        // Vista Global (Todos los recepcionistas juntos)
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Deuda Total Todo Personal
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono block">
                {formatBs(globalConsolidated.totalOwed)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {formatBs(globalConsolidated.totalPendingShortages)} faltantes + {formatBs(globalConsolidated.totalPendingConsumptions)} consumos
              </span>
            </div>
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              Suma de saldos pendientes de recepcionistas
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Cierres Positivos Global ({timeFilter})
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono block">
                +{formatBs(globalConsolidated.positiveAmount)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {globalConsolidated.positiveShiftsCount} turnos cerrados con superávit
              </span>
            </div>
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              {globalConsolidated.exactShiftsCount} turnos cerraron exactamente en cero
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Cierres con Faltante ({timeFilter})
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono block">
                -{formatBs(globalConsolidated.shortageAmount)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {globalConsolidated.shortageShiftsCount} turnos con déficit en caja
              </span>
            </div>
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              Balance neto: {formatBs(globalConsolidated.netBalance)}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Consumo Global ({timeFilter})
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Coffee className="w-5 h-5" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-black text-purple-950 font-mono block">
                {formatBs(globalConsolidated.totalPeriodConsumptions)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Tomado por personal en minibar
              </span>
            </div>
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
              Sobres entregados: {formatBs(globalConsolidated.totalEnvelopesDelivered)}
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-PESTAÑAS DE NAVEGACIÓN: RESUMEN / CIERRES DE CAJA / CONSUMOS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Resumen Integral & Balances</span>
        </button>

        <button
          onClick={() => setActiveSubTab('shifts')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'shifts'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Cierres de Caja & Observaciones ({filteredShifts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('consumptions')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'consumptions'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Consumo de Minibar ({filteredConsumptions.length})</span>
        </button>
      </div>

      {/* 5. CONTENIDO SEGÚN LA SUB-PESTAÑA SELECCIONADA */}

      {/* A. SUB-PESTAÑA: RESUMEN INTEGRAL & TABLA COMPARATIVA */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* TABLA COMPARATIVA DE RECEPCIONISTAS */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Cuadro Comparativo de Desempeño y Deudas por Recepcionista
                </h3>
                <p className="text-xs text-slate-500">
                  Resumen de turnos cerrados en {timeFilter === '7d' ? 'los últimos 7 días' : timeFilter === '15d' ? 'los últimos 15 días' : timeFilter === '30d' ? 'los últimos 30 días' : 'todo el historial'}.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Recepcionista</th>
                    <th className="py-3 px-3 text-center">Turnos Cerrados</th>
                    <th className="py-3 px-3 text-center">Cierres Positivos</th>
                    <th className="py-3 px-3 text-center">Cierres Faltante</th>
                    <th className="py-3 px-3 text-center">Cuadre Exacto</th>
                    <th className="py-3 px-4 text-right">Balance de Caja</th>
                    <th className="py-3 px-4 text-right">Consumo Período</th>
                    <th className="py-3 px-4 text-right">Deuda Actual (Total)</th>
                    <th className="py-3 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receptionistsData.map((d) => {
                    const hasDebt = d.totalOwedAmount > 0.01;
                    return (
                      <tr
                        key={d.profile.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          selectedStaffId === d.profile.id ? 'bg-indigo-50/40 font-semibold' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 ${d.profile.avatarColor}`}
                            >
                              {d.profile.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 block leading-tight">
                                {d.profile.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {d.profile.shiftName}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                          {d.periodShifts.length}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {d.positiveShiftsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                              <TrendingUp className="w-3 h-3" />
                              {d.positiveShiftsCount} (+{formatBs(d.positiveAmount)})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">0</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {d.shortageShiftsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[11px]">
                              <TrendingDown className="w-3 h-3" />
                              {d.shortageShiftsCount} (-{formatBs(d.shortageAmount)})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">0</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center font-bold text-slate-600 font-mono">
                          {d.exactShiftsCount}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black font-mono">
                          <span className={d.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {d.netBalance >= 0 ? '+' : ''}
                            {formatBs(d.netBalance)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-slate-700 font-mono">
                          {formatBs(d.totalPeriodConsumptionAmount)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-black font-mono text-xs px-2 py-1 rounded-lg ${
                              hasDebt
                                ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {formatBs(d.totalOwedAmount)}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedStaffId(d.profile.id);
                              setActiveSubTab('shifts');
                            }}
                            className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 hover:underline px-2 py-1"
                          >
                            Ver Cierres →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DESGLOSE DETALLADO DE DEUDA SI HAY SELECCIONADO */}
          {currentSelectedData && currentSelectedData.totalOwedAmount > 0 && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h4 className="text-sm font-black text-rose-950">
                  Desglose de la Deuda Pendiente de {currentSelectedData.profile.name}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lista de Faltantes Pendientes */}
                <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-800">
                      Faltantes en Caja por Descontar ({currentSelectedData.pendingShortageShifts.length})
                    </span>
                    <span className="text-xs font-black text-rose-600 font-mono">
                      {formatBs(currentSelectedData.totalPendingShortageAmount)}
                    </span>
                  </div>

                  {currentSelectedData.pendingShortageShifts.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No tiene faltantes de caja pendientes.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {currentSelectedData.pendingShortageShifts.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {formatDateOnly(s.endTime || s.startTime)}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {formatTimeOnly(s.startTime)} - {formatTimeOnly(s.endTime || '')}
                            </span>
                            {s.notes && (
                              <span className="text-[10px] text-amber-800 block italic truncate max-w-[200px]">
                                "{s.notes}"
                              </span>
                            )}
                          </div>
                          <span className="font-black text-rose-700 font-mono">
                            -{formatBs(s.discountAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lista de Consumos Pendientes */}
                <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-800">
                      Consumos de Minibar por Descontar ({currentSelectedData.pendingConsumptions.length})
                    </span>
                    <span className="text-xs font-black text-amber-700 font-mono">
                      {formatBs(currentSelectedData.totalPendingConsumptionAmount)}
                    </span>
                  </div>

                  {currentSelectedData.pendingConsumptions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No tiene consumos pendientes de cobro.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {currentSelectedData.pendingConsumptions.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {formatDateOnly(c.date)}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {c.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                            </span>
                          </div>
                          <span className="font-black text-amber-800 font-mono">
                            {formatBs(c.totalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* B. SUB-PESTAÑA: CIERRES DE CAJA & OBSERVACIONES (DETALLE COMPLETO) */}
      {activeSubTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              {filteredShifts.length} Cierres de Caja Registrados en el Período
            </span>
            <span className="text-xs text-slate-400">
              Haga clic en cualquier turno para ver o colapsar el desglose financiero
            </span>
          </div>

          {filteredShifts.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">
                No se encontraron cierres de caja en el período seleccionado.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Pruebe ampliando el filtro a 15, 30 días o seleccionando otro recepcionista.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredShifts.map((shift) => {
                const isExpanded = expandedShiftId === shift.id;
                const diff = shift.totalDifference !== undefined ? shift.totalDifference : ((shift.differenceCash || 0) + (shift.differenceQr || 0));
                const isPositive = diff > 0.01;
                const isShortage = diff < -0.01;
                const isExact = Math.abs(diff) <= 0.01;

                const responsible = shift.responsiblePersonName || shift.receptionistName;
                const handedTo = shift.handedOverTo || 'Siguiente turno';

                return (
                  <div
                    key={shift.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
                  >
                    {/* ENCABEZADO DEL CIERRE */}
                    <div
                      onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800'
                              : isShortage
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-5 h-5" />
                          ) : isShortage ? (
                            <TrendingDown className="w-5 h-5" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-slate-900">
                              {formatDateOnly(shift.endTime || shift.startTime)}
                            </span>
                            <span className="text-xs font-bold text-slate-500 font-mono">
                              ({formatTimeOnly(shift.startTime)} → {formatTimeOnly(shift.endTime || '')})
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                shift.shiftType === 'noche'
                                  ? 'bg-indigo-100 text-indigo-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              Turno {shift.shiftType}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <span>
                              Entregó:{' '}
                              <strong className="text-slate-800 font-bold">{responsible}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Recibió:{' '}
                              <strong className="text-slate-800 font-bold">{handedTo}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BADGE DE RESULTADO DE CIERRE */}
                      <div className="flex items-center gap-3 self-end md:self-center">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">
                            Resultado Cuadre:
                          </span>
                          <div className="flex items-center gap-1.5 justify-end">
                            {isPositive && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                🟢 Sobrante +{formatBs(diff)}
                              </span>
                            )}
                            {isShortage && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                                🔴 Faltante -{formatBs(Math.abs(diff))}
                              </span>
                            )}
                            {isExact && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
                                ⚪ Cuadre Exacto (0 Bs)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* CAJA DE OBSERVACIONES DEL RECEPCIONISTA (SIEMPRE VISIBLE O DESTACADA) */}
                    <div className="px-4 sm:px-5 pb-4">
                      <div
                        className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
                          shift.notes
                            ? 'bg-amber-50/90 border border-amber-200/90 text-amber-950'
                            : 'bg-slate-50 border border-slate-200/80 text-slate-500'
                        }`}
                      >
                        <HelpCircle className={`w-4 h-4 shrink-0 mt-0.5 ${shift.notes ? 'text-amber-600' : 'text-slate-400'}`} />
                        <div className="flex-1">
                          <span className="font-extrabold uppercase text-[10px] tracking-wider block mb-0.5">
                            Observaciones registradas en el cierre de turno:
                          </span>
                          {shift.notes ? (
                            <p className="font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">
                              "{shift.notes}"
                            </p>
                          ) : (
                            <p className="italic text-slate-400">
                              El recepcionista no registró observaciones ni notas adicionales al cerrar este turno.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* DESGLOSE FINANCIERO EXPANDIBLE */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-scale-in">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          {/* Fondo de Caja Chica */}
                          <div className="bg-white p-3 rounded-2xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                              Fondo Inicial / Dejado
                            </span>
                            <span className="font-black text-slate-800 font-mono text-sm block mt-0.5">
                              {formatBs(shift.initialCashFloat || 100)} → {formatBs(shift.handoverCashFloat || 100)}
                            </span>
                            <span className="text-[9px] text-slate-500">Traspaso al relevo</span>
                          </div>

                          {/* Efectivo en Sobre */}
                          <div className="bg-white p-3 rounded-2xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                              Sobre Administración
                            </span>
                            <span className="font-black text-amber-800 font-mono text-sm block mt-0.5">
                              {formatBs(shift.cashDeliveredAtClose || 0)}
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {shift.envelopeStatus === 'recogido' ? '✅ Recogido' : '🕒 Pendiente'}
                            </span>
                          </div>

                          {/* Ventas en Efectivo */}
                          <div className="bg-white p-3 rounded-2xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                              Efectivo en Gaveta
                            </span>
                            <span className="font-black text-slate-800 font-mono text-sm block mt-0.5">
                              {formatBs(shift.totalPhysicalCashInDrawer || shift.declaredCash)}
                            </span>
                            <span className="text-[9px] text-slate-500">
                              Esperado: {formatBs(shift.expectedCash)}
                            </span>
                          </div>

                          {/* Ventas QR Total */}
                          <div className="bg-white p-3 rounded-2xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                              QR Total (Vendis + Unión)
                            </span>
                            <span className="font-black text-slate-800 font-mono text-sm block mt-0.5">
                              {formatBs(shift.declaredQr || shift.expectedQr)}
                            </span>
                            <span className="text-[9px] text-slate-500">
                              Esperado: {formatBs(shift.expectedQr)}
                            </span>
                          </div>
                        </div>

                        {/* Detalle de diferencias */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-slate-800 block">
                              Diferencia en Efectivo:
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                (shift.differenceCash || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {(shift.differenceCash || 0) >= 0 ? '+' : ''}
                              {formatBs(shift.differenceCash || 0)}
                            </span>
                          </div>

                          <div>
                            <span className="font-bold text-slate-800 block">
                              Diferencia QR Vendis:
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                (shift.differenceQrVendis || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {(shift.differenceQrVendis || 0) >= 0 ? '+' : ''}
                              {formatBs(shift.differenceQrVendis || 0)}
                            </span>
                          </div>

                          <div>
                            <span className="font-bold text-slate-800 block">
                              Diferencia QR Banco Unión:
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                (shift.differenceQrUnion || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {(shift.differenceQrUnion || 0) >= 0 ? '+' : ''}
                              {formatBs(shift.differenceQrUnion || 0)}
                            </span>
                          </div>

                          <div className="pt-2 sm:pt-0 sm:border-l sm:border-slate-200 sm:pl-4">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Estado de Liquidación:
                            </span>
                            <span
                              className={`font-black ${
                                shift.isSettled ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {shift.isSettled ? 'Liquidado en Planilla' : 'Pendiente / En Registro'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* C. SUB-PESTAÑA: CONSUMO DE MINIBAR */}
      {activeSubTab === 'consumptions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              {filteredConsumptions.length} Consumos de Personal Registrados
            </span>
          </div>

          {filteredConsumptions.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
              <Coffee className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">
                No hay consumos de minibar registrados en este período.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4">Personal</th>
                      <th className="py-3 px-4">Productos Consumidos</th>
                      <th className="py-3 px-3 text-center">Modalidad</th>
                      <th className="py-3 px-3 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredConsumptions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block leading-tight">
                            {formatDateOnly(c.date)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatTimeOnly(c.date)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {c.staffName}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {c.items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-bold text-slate-700">
                                  {item.quantity}x
                                </span>
                                <span className="text-slate-600">{item.productName}</span>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  ({formatBs(item.unitPrice)} c/u)
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {c.isPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                              Pagado al Contado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                              Descuento Semanal
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {c.isSettled ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                              Liquidado
                            </span>
                          ) : c.isPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                              Cancelado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 animate-pulse">
                              Pendiente
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black font-mono text-slate-900 whitespace-nowrap">
                          {formatBs(c.totalAmount)}
                        </td>

                        <td className="py-3.5 px-4">
                          {c.notes ? (
                            <span className="text-slate-700 italic text-[11px] block max-w-xs">
                              "{c.notes}"
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">
                              Sin observaciones
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            Reg: {c.recordedBy}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Room, Stay } from '../../types';
import { formatBs, getRoomTypeBadge, getRoomTypeLabel } from '../../utils/formatUtils';
import { formatDateTime, formatTimeOnly, calculateStayTime, formatTimerDisplay } from '../../utils/timeUtils';
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
} from 'lucide-react';

export const RegisteredRoomsView: React.FC = () => {
  const { rooms, tariffs, completedStays, nowTimestamp } = useApp();

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPrepaid, setFilterPrepaid] = useState<string>('all');

  // Active rooms calculations
  const occupiedRooms = rooms.filter((r) => r.status === 'ocupada' && r.currentStay);
  const cleaningRooms = rooms.filter((r) => r.status === 'limpieza');
  const availableRooms = rooms.filter((r) => r.status === 'disponible');

  let totalActiveBasePrice = 0;
  let totalActiveConsumptions = 0;
  let totalActiveOvertime = 0;
  let totalActivePrepaid = 0;

  occupiedRooms.forEach((r) => {
    const s = r.currentStay!;
    const extraRate = tariffs[r.type]?.extraHourPrice || (r.type === 'jacuzzi' || r.type === 'golden_suite' ? 40 : 30);
    const timeCalc = calculateStayTime(s.startTime, s.chosenDurationMinutes, extraRate, nowTimestamp);
    const consSum = s.consumptions.reduce((sum, c) => sum + c.subtotal, 0);
    totalActiveBasePrice += s.baseRoomPrice;
    totalActiveConsumptions += consSum;
    totalActiveOvertime += timeCalc.overtimeCharge;
    if (s.isPrepaid) {
      totalActivePrepaid += s.prepaidAmount || s.baseRoomPrice;
    }
  });

  const totalActiveRevenue = totalActiveBasePrice + totalActiveConsumptions + totalActiveOvertime;
  const totalActivePendingBalance = Math.max(0, totalActiveRevenue - totalActivePrepaid);

  // Filter active rooms
  const filteredActiveRooms = occupiedRooms.filter((r) => {
    const s = r.currentStay!;
    const matchSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.vehiclePlate && s.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.receptionistName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' || r.type === filterType;
    const matchPrepaid =
      filterPrepaid === 'all' ||
      (filterPrepaid === 'prepaid' && s.isPrepaid) ||
      (filterPrepaid === 'pending' && !s.isPrepaid);

    return matchSearch && matchType && matchPrepaid;
  });

  // Filter completed stays
  const filteredCompletedStays = completedStays.filter((s) => {
    const matchSearch =
      s.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.vehiclePlate && s.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.receptionistName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' || s.roomType === filterType;
    const matchPrepaid =
      filterPrepaid === 'all' ||
      (filterPrepaid === 'prepaid' && s.isPrepaid) ||
      (filterPrepaid === 'pending' && !s.isPrepaid);

    return matchSearch && matchType && matchPrepaid;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BedDouble className="w-6 h-6 text-brand-600" />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Control y Registro de Habitaciones en Vivo
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo en tiempo real de todas las habitaciones registradas, precios, pagos adelantados y consumos.
          </p>
        </div>

        {/* Tab switcher: En Curso vs Histórico */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-white text-brand-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Ocupadas Ahora ({occupiedRooms.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-brand-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial de Estadías ({completedStays.length})
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Habitaciones Ocupadas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Habitaciones Ocupadas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-700 font-mono">
              {occupiedRooms.length}
            </span>
            <span className="text-xs text-slate-400">/ 12 totales</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
            {availableRooms.length} libres • {cleaningRooms.length} en limpieza
          </span>
        </div>

        {/* Total Comprometido Activo */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Valor de Estadías en Curso
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {formatBs(totalActiveRevenue)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">
            Habitaciones + Consumos + Recargos
          </span>
        </div>

        {/* Pagado por Adelantado */}
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Cobrado por Adelantado
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-700 font-mono">
              {formatBs(totalActivePrepaid)}
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium mt-1 block">
            Ingresado a caja al registrar
          </span>
        </div>

        {/* Saldo Pendiente por Cobrar al Salir */}
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
            Por Cobrar al Salir
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-800 font-mono">
              {formatBs(totalActivePendingBalance)}
            </span>
          </div>
          <span className="text-[10px] text-amber-700 font-medium mt-1 block">
            Pendiente de cobro a la salida
          </span>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por habitación, placa, recepcionista..."
            className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Tipo de Habitación */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none"
          >
            <option value="all">Todos los Tipos</option>
            <option value="suite">Suite</option>
            <option value="ventilador">Ventilador</option>
            <option value="jacuzzi">Jacuzzi</option>
            <option value="aire">Aire Acondicionado</option>
            <option value="golden_suite">Golden Suite</option>
          </select>

          {/* Pago Adelantado vs Pendiente */}
          <select
            value={filterPrepaid}
            onChange={(e) => setFilterPrepaid(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none"
          >
            <option value="all">Todos los Pagos</option>
            <option value="prepaid">🟢 Pago Adelantado</option>
            <option value="pending">🟡 Pendiente al Salir</option>
          </select>
        </div>
      </div>

      {/* TAB 1: HABITACIONES ACTIVAS EN CURSO */}
      {activeTab === 'active' && (
        <div className="space-y-3">
          {filteredActiveRooms.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-300 text-slate-400">
              <BedDouble className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="font-bold text-slate-600 text-sm">No hay habitaciones ocupadas en este momento.</p>
              <p className="text-xs text-slate-400 mt-1">
                Todas las habitaciones están disponibles o en limpieza.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActiveRooms.map((room) => {
                const stay = room.currentStay!;
                const extraRate = tariffs[room.type]?.extraHourPrice || (room.type === 'jacuzzi' || room.type === 'golden_suite' ? 40 : 30);
                const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes, extraRate, nowTimestamp);
                const consumptionsTotal = stay.consumptions.reduce((sum, c) => sum + c.subtotal, 0);
                const totalDue = stay.baseRoomPrice + consumptionsTotal + timeCalc.overtimeCharge;
                const prepaidAmt = stay.isPrepaid ? stay.prepaidAmount || stay.baseRoomPrice : 0;
                const pendingBalance = Math.max(0, totalDue - prepaidAmt);
                const badge = getRoomTypeBadge(room.type);

                return (
                  <div
                    key={room.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 hover:border-brand-300 transition-all"
                  >
                    {/* Top Room Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <h3 className="font-black text-slate-900 text-base">{room.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                          {room.tag}
                        </span>
                      </div>

                      {/* Prepaid Status Badge */}
                      {stay.isPrepaid ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Pago Adelantado: {formatBs(prepaidAmt)}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Paga al Salir
                        </span>
                      )}
                    </div>

                    {/* Plan & Pricing Breakdown Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Plan Elegido</span>
                        <strong className="text-slate-800 uppercase font-extrabold">{stay.chosenPlan}</strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Precio Tarifa</span>
                        <strong className="text-slate-800 font-mono font-bold">{formatBs(stay.baseRoomPrice)}</strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Consumos Extra</span>
                        <strong className="text-slate-800 font-mono font-bold">+{formatBs(consumptionsTotal)}</strong>
                      </div>
                    </div>

                    {/* Consumptions itemized */}
                    {stay.consumptions.length > 0 && (
                      <div className="space-y-1 bg-rose-50/50 p-2 rounded-xl border border-rose-100 text-xs">
                        <span className="text-[10px] font-bold text-rose-800 flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-rose-600" />
                          Consumos ({stay.consumptions.length} items):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {stay.consumptions.map((c) => (
                            <span key={c.id} className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-rose-200 font-semibold text-slate-700">
                              {c.quantity}x {c.productName} ({formatBs(c.subtotal)})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Time Progress */}
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Entrada: <strong>{formatTimeOnly(stay.startTime)}</strong></span>
                      </div>
                      <div>
                        {timeCalc.isOvertime ? (
                          timeCalc.gracePeriodActive ? (
                            <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Espera (+{timeCalc.overtimeMinutes} min • 0 Bs)
                            </span>
                          ) : (
                            <span className="text-rose-700 font-black flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              +{timeCalc.extraHoursCount}h Extra (+{formatBs(timeCalc.overtimeCharge)})
                            </span>
                          )
                        ) : (
                          <span className="text-slate-700 font-bold">
                            Quedan {formatTimerDisplay(timeCalc.remainingMinutes, timeCalc.remainingSeconds)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Receptionist & Vehicle Plate */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        Recepcionista: <strong className="text-slate-700">{stay.receptionistName}</strong>
                      </span>
                      {stay.vehiclePlate && (
                        <span className="flex items-center gap-1 text-slate-700 font-mono font-bold">
                          <Car className="w-3 h-3 text-slate-400" />
                          {stay.vehiclePlate}
                        </span>
                      )}
                    </div>

                    {/* Total & Remaining Balance Footer */}
                    <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Total Estancia: {formatBs(totalDue)}
                        </span>
                        {stay.isPrepaid && (
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            Pagado al entrar: -{formatBs(prepaidAmt)}
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-amber-300 uppercase font-black block">
                          Saldo a Cobrar al Salir
                        </span>
                        <span className="text-lg font-black font-mono text-white">
                          {formatBs(pendingBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORIAL DE ESTADÍAS COMPLETADAS */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Fecha / Hora</th>
                  <th className="px-4 py-3">Habitación</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Precio Base</th>
                  <th className="px-4 py-3">Consumos / Recargo</th>
                  <th className="px-4 py-3">Total Cobrado</th>
                  <th className="px-4 py-3">Tipo de Pago</th>
                  <th className="px-4 py-3">Recepcionista</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompletedStays.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No hay estadías registradas que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredCompletedStays.map((stay) => {
                    const badge = getRoomTypeBadge(stay.roomType);
                    const consumptionsTotal = stay.consumptions.reduce((sum, c) => sum + c.subtotal, 0);
                    return (
                      <tr key={stay.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold text-slate-800 block">{formatDateTime(stay.startTime)}</span>
                          {stay.endTime && (
                            <span className="text-[10px] text-slate-400">
                              Salida: {formatTimeOnly(stay.endTime)}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900">{stay.roomName}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${badge.bg} ${badge.text}`}>
                              {stay.roomType}
                            </span>
                          </div>
                          {stay.vehiclePlate && (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              Placa: {stay.vehiclePlate}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-700 uppercase">
                          {stay.chosenPlan}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-800">
                          {formatBs(stay.baseRoomPrice)}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {consumptionsTotal > 0 && (
                            <span className="text-[11px] font-bold text-slate-700 block">
                              +{formatBs(consumptionsTotal)} ({stay.consumptions.length} items)
                            </span>
                          )}
                          {(stay.overtimeCharge || 0) > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 block">
                              +{formatBs(stay.overtimeCharge || 0)} recargo ({stay.overtimeMinutes}m)
                            </span>
                          )}
                          {consumptionsTotal === 0 && (!stay.overtimeCharge || stay.overtimeCharge === 0) && (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-mono font-black text-slate-900 text-sm">
                          {formatBs(stay.totalAmount || stay.baseRoomPrice + consumptionsTotal)}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {stay.isPrepaid ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                Adelantado ({stay.paymentMethod.toUpperCase()})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700">
                                Al Salir ({stay.paymentMethod.toUpperCase()})
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          <span className="font-semibold">{stay.receptionistName}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

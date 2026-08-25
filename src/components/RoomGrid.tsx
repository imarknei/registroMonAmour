import React, { useState } from 'react';
import { Room, RoomStatus } from '../types';
import { RoomCard } from './RoomCard';
import { BedDouble, CheckCircle2, Clock, Sparkles, Filter } from 'lucide-react';

interface RoomGridProps {
  rooms: Room[];
  onOpenRegister: (room: Room) => void;
  onOpenDetail: (room: Room) => void;
  onOpenQuickConsumption: (room: Room) => void;
  onOpenCheckout: (room: Room) => void;
  onOpenChangeRoom?: (room: Room) => void;
}

export const RoomGrid: React.FC<RoomGridProps> = ({
  rooms,
  onOpenRegister,
  onOpenDetail,
  onOpenQuickConsumption,
  onOpenCheckout,
  onOpenChangeRoom,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | RoomStatus>('all');

  const filteredRooms = rooms.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const availableCount = rooms.filter((r) => r.status === 'disponible').length;
  const occupiedCount = rooms.filter((r) => r.status === 'ocupada').length;
  const cleaningCount = rooms.filter((r) => r.status === 'limpieza').length;

  return (
    <div className="space-y-5">
      {/* Filter Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <BedDouble className="w-5 h-5 text-brand-600" />
          <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
            Panel de Habitaciones
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {rooms.length} habitaciones
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === 'all'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({rooms.length})
          </button>

          <button
            onClick={() => setStatusFilter('disponible')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'disponible'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Libres ({availableCount})
          </button>

          <button
            onClick={() => setStatusFilter('ocupada')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'ocupada'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Ocupadas ({occupiedCount})
          </button>

          <button
            onClick={() => setStatusFilter('limpieza')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'limpieza'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Limpieza ({cleaningCount})
          </button>
        </div>
      </div>

      {/* Grid of Room Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {filteredRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onOpenRegister={onOpenRegister}
            onOpenDetail={onOpenDetail}
            onOpenQuickConsumption={onOpenQuickConsumption}
            onOpenCheckout={onOpenCheckout}
            onOpenChangeRoom={onOpenChangeRoom}
          />
        ))}
      </div>
    </div>
  );
};

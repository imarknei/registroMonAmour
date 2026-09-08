import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Shift } from '../../types';
import { formatBs } from '../../utils/formatUtils';
import { formatDateTime } from '../../utils/timeUtils';
import {
  Mail,
  CheckCircle2,
  Clock,
  User,
  DollarSign,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Undo2,
  Calendar,
  Eye,
  Check,
  PackageCheck,
  Sparkles,
} from 'lucide-react';

export const EnvelopesManager: React.FC = () => {
  const { shiftsHistory, markShiftEnvelopeCollected, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'pending' | 'collected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShiftForCollection, setSelectedShiftForCollection] = useState<Shift | null>(null);
  const [collectorName, setCollectorName] = useState('Marco');
  const [collectionNotes, setCollectionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrar todos los turnos que tengan un sobre registrado
  const envelopeShifts = useMemo(() => {
    return shiftsHistory
      .filter((s) => s.status === 'closed' && (s.cashDeliveredAtClose || 0) > 0)
      .sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
  }, [shiftsHistory]);

  // Totales y Métricas
  const metrics = useMemo(() => {
    let pendingTotal = 0;
    let pendingCount = 0;
    let collectedTotal = 0;
    let collectedCount = 0;

    envelopeShifts.forEach((s) => {
      const amt = s.cashDeliveredAtClose || 0;
      const isCollected = s.envelopeStatus === 'recogido';
      if (isCollected) {
        collectedTotal += amt;
        collectedCount++;
      } else {
        pendingTotal += amt;
        pendingCount++;
      }
    });

    return {
      pendingTotal,
      pendingCount,
      collectedTotal,
      collectedCount,
      totalCount: envelopeShifts.length,
    };
  }, [envelopeShifts]);

  // Turnos según pestaña y búsqueda
  const filteredShifts = useMemo(() => {
    return envelopeShifts.filter((s) => {
      const isCollected = s.envelopeStatus === 'recogido';
      if (activeTab === 'pending' && isCollected) return false;
      if (activeTab === 'collected' && !isCollected) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const name = (s.responsiblePersonName || s.receptionistName || '').toLowerCase();
        const nextName = (s.handedOverTo || '').toLowerCase();
        const notes = (s.notes || s.envelopeNotes || '').toLowerCase();
        const dateStr = s.endTime ? new Date(s.endTime).toLocaleDateString('es-BO') : '';
        return name.includes(query) || nextName.includes(query) || notes.includes(query) || dateStr.includes(query);
      }

      return true;
    });
  }, [envelopeShifts, activeTab, searchTerm]);

  // Manejar acción de recojo
  const handleConfirmCollection = () => {
    if (!selectedShiftForCollection) return;
    setIsSubmitting(true);
    markShiftEnvelopeCollected(
      selectedShiftForCollection.id,
      collectorName.trim() || 'Marco',
      collectionNotes.trim() || undefined
    );
    setIsSubmitting(false);
    setSelectedShiftForCollection(null);
    setCollectionNotes('');
  };

  // Revertir recojo (volver a pendiente)
  const handleRevertCollection = (shiftId: string) => {
    if (confirm('¿Deseas marcar este sobre nuevamente como PENDIENTE de recojo en recepción?')) {
      markShiftEnvelopeCollected(shiftId, undefined, undefined, 'pendiente');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-rose-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-amber-100 text-xs font-bold uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5" />
              <span>Control de Efectivo en Recepción</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Sobres por Cobrar (En Recepción)
            </h1>
            <p className="text-sm text-amber-100/90 max-w-2xl leading-relaxed">
              Supervisión de los sobres con dinero en efectivo que cada recepcionista deja en recepción al cerrar su turno. Registra y marca los sobres cuando vayas a recogerlos físicamente.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-900 flex items-center justify-center font-black shadow-inner">
              <DollarSign className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold text-amber-200 tracking-wider block">
                Por Recoger en Recepción
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white block">
                {formatBs(metrics.pendingTotal)}
              </span>
              <span className="text-[11px] text-amber-100">
                {metrics.pendingCount} sobre{metrics.pendingCount === 1 ? '' : 's'} esperando recojo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border-2 border-amber-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              Pendientes en Recepción
            </span>
            <div className="text-2xl font-black font-mono text-slate-900">
              {formatBs(metrics.pendingTotal)}
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {metrics.pendingCount} sobre{metrics.pendingCount === 1 ? '' : 's'} sin recoger
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <Mail className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Total Sobres Recogidos
            </span>
            <div className="text-2xl font-black font-mono text-emerald-700">
              {formatBs(metrics.collectedTotal)}
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {metrics.collectedCount} sobre{metrics.collectedCount === 1 ? '' : 's'} ya cobrados
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
              Total Acumulado de Turnos
            </span>
            <div className="text-2xl font-black font-mono text-slate-800">
              {formatBs(metrics.pendingTotal + metrics.collectedTotal)}
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {metrics.totalCount} sobre{metrics.totalCount === 1 ? '' : 's'} registrados en total
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Pestañas */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🟡 Pendientes por Cobrar</span>
            {metrics.pendingCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'pending' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'}`}>
                {metrics.pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('collected')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === 'collected'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🟢 Recogidos ({metrics.collectedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Todos ({metrics.totalCount})</span>
          </button>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por recepcionista, fecha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:border-brand-500 bg-slate-50"
          />
        </div>
      </div>

      {/* Lista de Sobres */}
      {filteredShifts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800">
            {activeTab === 'pending'
              ? '¡No hay sobres pendientes por cobrar!'
              : 'No se encontraron sobres con este filtro'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'pending'
              ? 'Todos los sobres de efectivo dejados en recepción ya fueron retirados por administración.'
              : 'Intenta cambiar el criterio de búsqueda o la pestaña seleccionada.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShifts.map((shift) => {
            const isCollected = shift.envelopeStatus === 'recogido';
            const amount = shift.cashDeliveredAtClose || 0;
            const responsible = shift.responsiblePersonName || shift.receptionistName;
            const handoverFloat = shift.handoverCashFloat || shift.initialCashFloat || 100;

            return (
              <div
                key={shift.id}
                className={`bg-white rounded-3xl border-2 transition-all shadow-sm overflow-hidden flex flex-col justify-between ${
                  isCollected
                    ? 'border-slate-200 hover:border-slate-300'
                    : 'border-amber-300 hover:border-amber-400 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Top Banner */}
                  <div className={`px-5 py-3.5 flex items-center justify-between border-b ${
                    isCollected
                      ? 'bg-slate-50 border-slate-100 text-slate-600'
                      : 'bg-amber-50/80 border-amber-100 text-amber-950'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black">
                        {shift.shiftType === 'noche' ? '🌙 Turno Noche' : '☀️ Turno Día'}
                      </span>
                      <span className="text-[10px] text-slate-400">•</span>
                      <span className="text-[11px] font-medium text-slate-600">
                        {formatDateTime(shift.endTime || shift.startTime)}
                      </span>
                    </div>

                    {isCollected ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Recogido
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        En Recepción
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Monto del Sobre */}
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                          Efectivo en Sobre
                        </span>
                        <span className="text-xl font-black font-mono text-slate-900">
                          {formatBs(amount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                          Caja Chica Dejada
                        </span>
                        <span className="text-xs font-bold font-mono text-emerald-700">
                          {formatBs(handoverFloat)}
                        </span>
                      </div>
                    </div>

                    {/* Detalle de personas */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          Dejó el sobre:
                        </span>
                        <strong className="font-extrabold text-slate-800">{responsible}</strong>
                      </div>
                      {shift.handedOverTo && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            Recibió relevo:
                          </span>
                          <span className="font-medium text-slate-700">{shift.handedOverTo}</span>
                        </div>
                      )}
                    </div>

                    {/* Observaciones del Cierre */}
                    {shift.notes && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900">
                        <strong className="font-bold block text-amber-950 text-[10px] uppercase">
                          Observaciones del Turno:
                        </strong>
                        <p className="line-clamp-2 mt-0.5">{shift.notes}</p>
                      </div>
                    )}

                    {/* Detalle de Recojo */}
                    {isCollected && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 space-y-0.5">
                        <div className="flex items-center justify-between font-bold text-[10px] uppercase text-emerald-950">
                          <span>Recogido por:</span>
                          <span>{shift.envelopeCollectedBy || 'Marco'}</span>
                        </div>
                        {shift.envelopeCollectedAt && (
                          <span className="text-[10px] text-emerald-700 block">
                            Fecha: {formatDateTime(shift.envelopeCollectedAt)}
                          </span>
                        )}
                        {shift.envelopeNotes && (
                          <p className="text-[10px] text-emerald-800 italic mt-0.5">"{shift.envelopeNotes}"</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 pt-0">
                  {!isCollected ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedShiftForCollection(shift);
                        setCollectorName('Marco');
                        setCollectionNotes('');
                      }}
                      className="w-full py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Marcar como Recogido</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRevertCollection(shift.id)}
                      className="w-full py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5"
                      title="Volver a marcar como pendiente en recepción"
                    >
                      <Undo2 className="w-3 h-3" />
                      <span>Deshacer (Volver a Pendiente)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación de Recojo */}
      {selectedShiftForCollection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Confirmar Recojo de Sobre
                </h3>
                <span className="text-xs text-slate-500">
                  Turno de {selectedShiftForCollection.responsiblePersonName || selectedShiftForCollection.receptionistName}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-1">
              <span className="text-xs font-bold text-amber-800 uppercase block">
                Monto que estás retirando en sobre
              </span>
              <div className="text-3xl font-black font-mono text-amber-950">
                {formatBs(selectedShiftForCollection.cashDeliveredAtClose || 0)}
              </div>
              <span className="text-[11px] text-amber-800 block">
                Caja chica que quedó en gaveta: {formatBs(selectedShiftForCollection.handoverCashFloat || 100)}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Persona que Recoge el Sobre <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  placeholder="Ej: Marco"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Notas / Observaciones del Recojo (Opcional)
                </label>
                <input
                  type="text"
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                  placeholder="Ej: Recogido personalmente en sobre cerrado..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedShiftForCollection(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCollection}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Guardando...' : 'Confirmar Recojo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

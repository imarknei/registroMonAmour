import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Stay, Room, Product, PlanType, PaymentMethod, ConsumptionItem } from '../../types';
import { formatBs, getRoomTypeBadge, getRoomTypeLabel, getPlanLabel } from '../../utils/formatUtils';
import { formatDateTime } from '../../utils/timeUtils';
import { SYSTEM_USERS } from '../../data/initialData';
import {
  X,
  Edit,
  Save,
  BedDouble,
  Clock,
  DollarSign,
  QrCode,
  ShoppingBag,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  UserCheck,
  Car,
  FileText,
  PlusCircle,
  MinusCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface EditStayModalProps {
  stay: Stay | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditStayModal: React.FC<EditStayModalProps> = ({ stay, isOpen, onClose }) => {
  const { rooms, products, updateStay } = useApp();

  // Estados locales editables
  const [roomId, setRoomId] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [roomType, setRoomType] = useState<any>('suite');
  const [chosenPlan, setChosenPlan] = useState<PlanType>('1h');
  const [baseRoomPrice, setBaseRoomPrice] = useState<number>(0);
  const [chosenDurationMinutes, setChosenDurationMinutes] = useState<number>(60);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState<number>(0);
  const [overtimeCharge, setOvertimeCharge] = useState<number>(0);
  const [receptionistName, setReceptionistName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [isPrepaid, setIsPrepaid] = useState<boolean>(true);
  const [prepaidAmount, setPrepaidAmount] = useState<number>(0);
  const [cashPaid, setCashPaid] = useState<number>(0);
  const [qrVendisPaid, setQrVendisPaid] = useState<number>(0);
  const [qrUnionPaid, setQrUnionPaid] = useState<number>(0);
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isCustomPackage, setIsCustomPackage] = useState<boolean>(false);
  const [customPackageName, setCustomPackageName] = useState<string>('');
  const [consumptions, setConsumptions] = useState<ConsumptionItem[]>([]);

  // Para agregar nuevo producto
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newProductQty, setNewProductQty] = useState<number>(1);
  const [newProductPaidDirectly, setNewProductPaidDirectly] = useState<boolean>(false);

  // Inicializar campos cuando se abre o cambia la estadía
  useEffect(() => {
    if (stay) {
      setRoomId(stay.roomId || '');
      setRoomName(stay.roomName || '');
      setRoomType(stay.roomType || 'suite');
      setChosenPlan(stay.chosenPlan || '1h');
      setBaseRoomPrice(stay.baseRoomPrice || 0);
      setChosenDurationMinutes(stay.chosenDurationMinutes || 60);

      // Formato compatible con datetime-local (YYYY-MM-DDTHH:mm)
      if (stay.startTime) {
        const d = new Date(stay.startTime);
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setStartTime(localIso);
      } else {
        setStartTime('');
      }

      if (stay.endTime) {
        const d = new Date(stay.endTime);
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setEndTime(localIso);
        setIsCompleted(true);
      } else {
        setEndTime('');
        setIsCompleted(stay.status === 'completed');
      }

      setOvertimeMinutes(stay.overtimeMinutes || 0);
      setOvertimeCharge(stay.overtimeCharge || 0);
      setReceptionistName(stay.receptionistName || '');
      setPaymentMethod(stay.paymentMethod || 'efectivo');
      setIsPrepaid(stay.isPrepaid || false);
      setPrepaidAmount(stay.prepaidAmount || 0);
      setCashPaid(stay.cashPaid || 0);
      setQrVendisPaid(stay.qrVendisPaid || 0);
      setQrUnionPaid(stay.qrUnionPaid || 0);
      setVehiclePlate(stay.vehiclePlate || '');
      setNotes(stay.notes || '');
      setIsCustomPackage(stay.isCustomPackage || stay.chosenPlan === 'personalizado');
      setCustomPackageName(stay.customPackageName || '');
      setConsumptions(stay.consumptions ? JSON.parse(JSON.stringify(stay.consumptions)) : []);
    }
  }, [stay, isOpen]);

  if (!isOpen || !stay) return null;

  // Manejar cambio de habitación
  const handleRoomChange = (selectedId: string) => {
    const foundRoom = rooms.find((r) => r.id === selectedId);
    if (foundRoom) {
      setRoomId(foundRoom.id);
      setRoomName(foundRoom.name);
      setRoomType(foundRoom.type);
    }
  };

  // Manejar consumos
  const handleAddConsumption = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const existingIndex = consumptions.findIndex((c) => c.productId === selectedProductId);
    if (existingIndex >= 0) {
      setConsumptions((prev) =>
        prev.map((item, idx) => {
          if (idx === existingIndex) {
            const newQty = item.quantity + newProductQty;
            return {
              ...item,
              quantity: newQty,
              subtotal: item.unitPrice * newQty,
            };
          }
          return item;
        })
      );
    } else {
      const newItem: ConsumptionItem = {
        id: `cons-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: prod.id,
        productName: prod.name,
        quantity: newProductQty,
        unitPrice: prod.price,
        subtotal: prod.price * newProductQty,
        isPaid: newProductPaidDirectly,
        timestamp: new Date().toISOString(),
      };
      setConsumptions((prev) => [...prev, newItem]);
    }

    setSelectedProductId('');
    setNewProductQty(1);
    setNewProductPaidDirectly(false);
  };

  const handleUpdateConsumptionQty = (index: number, delta: number) => {
    setConsumptions((prev) =>
      prev
        .map((item, idx) => {
          if (idx === index) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: item.unitPrice * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as ConsumptionItem[]
    );
  };

  const handleToggleConsumptionPaid = (index: number) => {
    setConsumptions((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, isPaid: !item.isPaid } : item))
    );
  };

  const handleRemoveConsumption = (index: number) => {
    setConsumptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Totales calculados
  const consumptionsTotal = consumptions.reduce((sum, c) => sum + c.subtotal, 0);
  const paidConsumptionsTotal = consumptions.filter((c) => c.isPaid).reduce((sum, c) => sum + c.subtotal, 0);
  const totalCalculated = baseRoomPrice + overtimeCharge + consumptionsTotal;
  const totalAlreadyPaid = (isPrepaid ? prepaidAmount : 0) + paidConsumptionsTotal;
  const balancePending = Math.max(0, totalCalculated - totalAlreadyPaid);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    let finalStartTimeIso = stay.startTime;
    if (startTime) {
      finalStartTimeIso = new Date(startTime).toISOString();
    }

    let finalEndTimeIso = stay.endTime;
    if (isCompleted) {
      finalEndTimeIso = endTime ? new Date(endTime).toISOString() : (stay.endTime || new Date().toISOString());
    } else {
      finalEndTimeIso = undefined;
    }

    const updatedStay: Stay = {
      ...stay,
      roomId,
      roomName,
      roomType,
      chosenPlan,
      baseRoomPrice: Number(baseRoomPrice),
      chosenDurationMinutes: Number(chosenDurationMinutes),
      startTime: finalStartTimeIso,
      endTime: finalEndTimeIso,
      status: isCompleted ? 'completed' : (stay.status === 'cancelled' ? 'cancelled' : 'active'),
      overtimeMinutes: Number(overtimeMinutes),
      overtimeCharge: Number(overtimeCharge),
      totalAmount: totalCalculated,
      receptionistName: receptionistName.trim() || stay.receptionistName,
      paymentMethod,
      isPrepaid,
      prepaidAmount: isPrepaid ? Number(prepaidAmount) : 0,
      cashPaid: Number(cashPaid),
      qrVendisPaid: Number(qrVendisPaid),
      qrUnionPaid: Number(qrUnionPaid),
      qrPaid: Number(qrVendisPaid) + Number(qrUnionPaid),
      vehiclePlate: vehiclePlate.trim() || undefined,
      notes: notes.trim() || undefined,
      isCustomPackage: isCustomPackage || chosenPlan === 'personalizado',
      customPackageName: customPackageName.trim() || undefined,
      consumptions,
    };

    updateStay(updatedStay, {
      previousConsumptions: stay.consumptions,
      restoreStockDiff: true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scale-in my-auto">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/30 shrink-0">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  Modificar Registro de Habitación
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40">
                  Panel Admin
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-indigo-200">
                {roomName} • Plan: {getPlanLabel(chosenPlan)} • ID: {stay.id.slice(0, 16)}...
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. Habitación, Plan y Tarifa */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BedDouble className="w-4 h-4 text-indigo-600" />
              1. Habitación, Plan y Precio Base
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Habitación Asignada</label>
                <select
                  value={roomId}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({getRoomTypeLabel(r.type)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Plan / Modalidad</label>
                <select
                  value={chosenPlan}
                  onChange={(e) => {
                    const newPlan = e.target.value as PlanType;
                    setChosenPlan(newPlan);
                    if (newPlan === 'personalizado') {
                      setIsCustomPackage(true);
                      if (!customPackageName) setCustomPackageName('Promoción Especial');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="1h">1 Hora (60 min)</option>
                  <option value="2h">2 Horas (120 min)</option>
                  <option value="2h_noche">2h Suite Noche (120 min)</option>
                  <option value="bonflix_2h">2h Bonflix (120 min)</option>
                  <option value="bonflix_4h">4h Bonflix (240 min)</option>
                  <option value="3h">3 Horas (180 min)</option>
                  <option value="promo3h">Promo 3 Horas (180 min)</option>
                  <option value="noche">Noche Completa (12 Horas)</option>
                  <option value="personalizado">✨ Paquete Personalizado (Libre)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Precio Base Habitación (Bs)</label>
                <input
                  type="number"
                  min="0"
                  value={baseRoomPrice}
                  onChange={(e) => setBaseRoomPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-black text-indigo-950 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {(chosenPlan === 'personalizado' || isCustomPackage) && (
              <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-fuchsia-900 mb-1">
                    ✨ Nombre / Motivo del Paquete Especial
                  </label>
                  <input
                    type="text"
                    value={customPackageName}
                    onChange={(e) => setCustomPackageName(e.target.value)}
                    placeholder="Ej. Promo Especial 3h x 290 Bs"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-fuchsia-200 bg-fuchsia-50/50 text-fuchsia-950 font-bold focus:ring-2 focus:ring-fuchsia-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-fuchsia-900 mb-1">
                    Duración Contratada (Minutos)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={chosenDurationMinutes}
                    onChange={(e) => setChosenDurationMinutes(parseInt(e.target.value, 10) || 60)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-fuchsia-200 bg-fuchsia-50/50 text-fuchsia-950 font-bold focus:ring-2 focus:ring-fuchsia-500/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Tiempos, Fechas y Horas Extras */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-600" />
              2. Horarios y Tiempos de Estadía
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha y Hora de Entrada</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600">Fecha y Hora de Salida</label>
                  <label className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={(e) => setIsCompleted(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    Marcar como Finalizada / Cerrada
                  </label>
                </div>
                <input
                  type="datetime-local"
                  value={endTime}
                  disabled={!isCompleted}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Minutos Extras Acumulados</label>
                <input
                  type="number"
                  min="0"
                  value={overtimeMinutes}
                  onChange={(e) => setOvertimeMinutes(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Recargo por Tiempo Extra (Bs)</label>
                <input
                  type="number"
                  min="0"
                  value={overtimeCharge}
                  onChange={(e) => setOvertimeCharge(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-black text-rose-700 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* 3. Consumos de Minibar */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-brand-600" />
                3. Consumos de Minibar ({consumptions.length} items • {formatBs(consumptionsTotal)})
              </h3>
            </div>

            {/* Agregar nuevo consumo */}
            <div className="p-3 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col sm:flex-row items-center gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full sm:w-1/2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 font-bold"
              >
                <option value="">-- Seleccionar producto para añadir --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatBs(p.price)} - Stock: {p.stock})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-bold">Cant:</span>
                <input
                  type="number"
                  min="1"
                  value={newProductQty}
                  onChange={(e) => setNewProductQty(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 text-xs rounded-lg border border-slate-200 font-mono font-bold text-center"
                />
              </div>

              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={newProductPaidDirectly}
                  onChange={(e) => setNewProductPaidDirectly(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                Pagado al contado
              </label>

              <button
                type="button"
                disabled={!selectedProductId}
                onClick={handleAddConsumption}
                className="w-full sm:w-auto px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir
              </button>
            </div>

            {/* Lista de consumos */}
            {consumptions.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">
                No hay consumos de minibar registrados en esta habitación.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {consumptions.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-bold text-slate-800 truncate">{item.productName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({formatBs(item.unitPrice)} c/u)
                      </span>
                      {item.isPaid ? (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          ✓ Pagado
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                          A la salida
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleUpdateConsumptionQty(idx, -1)}
                          className="text-slate-500 hover:text-slate-800 p-0.5"
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold font-mono px-1">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateConsumptionQty(idx, +1)}
                          className="text-slate-500 hover:text-slate-800 p-0.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-mono font-black text-slate-900 w-16 text-right">
                        {formatBs(item.subtotal)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleConsumptionPaid(idx)}
                        className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 px-1.5 py-0.5 rounded border border-slate-200"
                        title="Cambiar estado pagado / a la salida"
                      >
                        {item.isPaid ? 'Marcar pendiente' : 'Marcar pagado'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveConsumption(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Quitar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Cajero, Método de Pago & Desglose Financiero */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              4. Cajero, Método de Pago y Montos Registrados
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Cajero / Recepcionista</label>
                <input
                  type="text"
                  value={receptionistName}
                  onChange={(e) => setReceptionistName(e.target.value)}
                  placeholder="Nombre del recepcionista"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Método de Pago Principal</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="qr_vendis">📱 QR Vendis</option>
                  <option value="qr_union">🏦 QR Banco Unión</option>
                  <option value="qr">📱 QR General</option>
                  <option value="mixto">💳 Pago Mixto (Efectivo + QR)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Prepago de Habitación (Bs)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPrepaid}
                    onChange={(e) => setIsPrepaid(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <input
                    type="number"
                    min="0"
                    disabled={!isPrepaid}
                    value={prepaidAmount}
                    onChange={(e) => setPrepaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Monto Pagado en Efectivo (Bs)</label>
                <input
                  type="number"
                  min="0"
                  value={cashPaid}
                  onChange={(e) => setCashPaid(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">QR Vendis (Bs)</label>
                <input
                  type="number"
                  min="0"
                  value={qrVendisPaid}
                  onChange={(e) => setQrVendisPaid(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold text-indigo-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">QR Banco Unión (Bs)</label>
                <input
                  type="number"
                  min="0"
                  value={qrUnionPaid}
                  onChange={(e) => setQrUnionPaid(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold text-blue-800"
                />
              </div>
            </div>
          </div>

          {/* 5. Placa y Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-slate-500" />
                Placa del Vehículo
              </label>
              <input
                type="text"
                placeholder="Ej. 4022-ABC"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 uppercase font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Observaciones / Notas
              </label>
              <input
                type="text"
                placeholder="Ej. Cambio de tarifa autorizado por administración..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Banner de Resumen Total */}
          <div className="p-4 bg-slate-950 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
                TOTAL DE LA ESTADÍA:
              </span>
              <span className="text-[11px] text-slate-400">
                Base: {formatBs(baseRoomPrice)} • Minibar: {formatBs(consumptionsTotal)} • Extra: {formatBs(overtimeCharge)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-400 block">
                {formatBs(totalCalculated)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Ya pagado: {formatBs(totalAlreadyPaid)} | Saldo: {formatBs(balancePending)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 text-xs hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="w-1/2 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Guardar Modificaciones
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

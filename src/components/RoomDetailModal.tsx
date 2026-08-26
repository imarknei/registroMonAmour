import React, { useState, useEffect } from 'react';
import { Room, Product, PaymentMethod, Stay } from '../types';
import { useApp } from '../context/AppContext';
import { calculateStayTime, formatDateTime, formatTimeOnly } from '../utils/timeUtils';
import { formatBs, getRoomTypeBadge } from '../utils/formatUtils';
import {
  X,
  PlusCircle,
  Trash2,
  DollarSign,
  QrCode,
  Layers,
  Sparkles,
  ShoppingBag,
  FileText,
  BedDouble,
  LogOut,
  Printer,
  Car,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
} from 'lucide-react';

interface RoomDetailModalProps {
  room: Room | null;
  onClose: () => void;
  onOpenReceipt: (stay: Stay) => void;
  onOpenChangeRoom?: (room: Room) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  onClose,
  onOpenReceipt,
  onOpenChangeRoom,
}) => {
  const { tariffs, products, addConsumptionToRoom, removeConsumptionFromRoom, closeStayAndCheckout } = useApp();

  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<'checkout' | 'consumptions'>('checkout');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchProduct, setSearchProduct] = useState<string>('');
  const [finalPaymentMethod, setFinalPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [qrAmount, setQrAmount] = useState<string>('');
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');
  const [sendToCleaning, setSendToCleaning] = useState<boolean>(true);

  if (!room || !room.currentStay) return null;

  const stay = room.currentStay;
  const roomTariff = tariffs[room.type];
  const extraHourRate = roomTariff?.extraHourPrice || (room.type === 'jacuzzi' || room.type === 'golden_suite' ? 40 : 30);
  const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes, extraHourRate, Date.now());
  const consumptionsTotal = stay.consumptions.reduce((sum, item) => sum + item.subtotal, 0);
  const totalDue = stay.baseRoomPrice + timeCalc.overtimeCharge + consumptionsTotal;

  // Prepaid calculations
  const isPrepaid = stay.isPrepaid || false;
  const prepaidAmt = isPrepaid ? (stay.prepaidAmount || stay.baseRoomPrice) : 0;
  const remainingBalance = Math.max(0, totalDue - prepaidAmt);

  // Sync mixed payment amounts when remaining balance changes
  useEffect(() => {
    if (finalPaymentMethod === 'mixto') {
      const half = Math.round(remainingBalance / 2);
      setCashAmount(half.toString());
      setQrAmount((remainingBalance - half).toString());
    }
  }, [remainingBalance, finalPaymentMethod]);

  const handleCashChange = (val: string) => {
    setCashAmount(val);
    const num = parseFloat(val) || 0;
    const rem = Math.max(0, remainingBalance - num);
    setQrAmount(rem.toString());
  };

  const handleQrChange = (val: string) => {
    setQrAmount(val);
    const num = parseFloat(val) || 0;
    const rem = Math.max(0, remainingBalance - num);
    setCashAmount(rem.toString());
  };

  // Filter products for minibar addition
  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchProduct.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleCheckout = () => {
    let finalCash = 0;
    let finalQr = 0;

    if (remainingBalance > 0) {
      if (finalPaymentMethod === 'efectivo') {
        finalCash = remainingBalance;
        finalQr = 0;
      } else if (finalPaymentMethod === 'qr') {
        finalCash = 0;
        finalQr = remainingBalance;
      } else if (finalPaymentMethod === 'mixto') {
        finalCash = parseFloat(cashAmount) || 0;
        finalQr = parseFloat(qrAmount) || 0;
      }
    }

    const completed = closeStayAndCheckout(room.id, {
      finalPaymentMethod: remainingBalance > 0 ? finalPaymentMethod : stay.paymentMethod,
      cashPaid: finalCash,
      qrPaid: finalQr,
      notes: checkoutNotes || stay.notes,
      setCleaning: sendToCleaning,
    });

    if (completed) {
      onClose();
    }
  };

  const handleOpenReceiptPreview = () => {
    let finalCash = 0;
    let finalQr = 0;

    if (remainingBalance > 0) {
      if (finalPaymentMethod === 'efectivo') {
        finalCash = remainingBalance;
      } else if (finalPaymentMethod === 'qr') {
        finalQr = remainingBalance;
      } else if (finalPaymentMethod === 'mixto') {
        finalCash = parseFloat(cashAmount) || 0;
        finalQr = parseFloat(qrAmount) || 0;
      }
    }

    const tempStay: Stay = {
      ...stay,
      endTime: new Date().toISOString(),
      overtimeMinutes: timeCalc.overtimeMinutes,
      overtimeCharge: timeCalc.overtimeCharge,
      totalAmount: totalDue,
      paymentMethod: finalPaymentMethod,
      cashPaid: (stay.prepaidCash || 0) + finalCash,
      qrPaid: (stay.prepaidQr || 0) + finalQr,
    };
    onOpenReceipt(tempStay);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-in my-6">
        {/* Header */}
        <div
          className={`px-6 py-5 text-white flex items-center justify-between transition-colors ${
            timeCalc.isOvertime ? 'bg-brand-700' : 'bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center font-bold shrink-0">
              <BedDouble className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">{room.name}</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                  {room.tag}
                </span>
                {isPrepaid && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Pago Adelantado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  Reg: {stay.receptionistName}
                </span>
                <span>•</span>
                <span>Entrada: {formatTimeOnly(stay.startTime)}</span>
                {stay.vehiclePlate && (
                  <>
                    <span>•</span>
                    <span className="font-mono bg-white/10 px-1.5 py-0.2 rounded font-bold text-white">
                      Placa: {stay.vehiclePlate}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('checkout')}
              className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 ${
                activeTab === 'checkout'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Cobro & Salida
            </button>

            <button
              onClick={() => setActiveTab('consumptions')}
              className={`pb-2.5 px-4 text-xs font-extrabold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'consumptions'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              + Agregar Consumos ({stay.consumptions.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenChangeRoom?.(room)}
            className="pb-2.5 px-3.5 text-xs font-black text-amber-900 hover:text-amber-950 flex items-center gap-1.5 bg-amber-100/80 hover:bg-amber-200/90 rounded-t-xl transition-all border-t border-x border-amber-300 shadow-xs"
            title="Cambiar a otra habitación disponible"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700" />
            CAMBIO DE HABITACIÓN
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {/* TAB 1: COBRO & SALIDA */}
          {activeTab === 'checkout' && (
            <div className="space-y-4">
              {/* Change Room Banner */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-amber-950 font-medium">
                    ¿Inconveniente técnico, avería o error al asignar la habitación?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChangeRoom?.(room)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] rounded-xl shadow-xs transition-all flex items-center gap-1 shrink-0"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  Cambio de Habitación
                </button>
              </div>

              {/* Overtime Notice */}
              {timeCalc.isOvertime && (
                <div
                  className={`p-3.5 border rounded-2xl flex items-center justify-between text-xs ${
                    timeCalc.gracePeriodActive
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-rose-50 border-brand-300 text-brand-950 animate-pulse'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-5 h-5 shrink-0 ${
                        timeCalc.gracePeriodActive ? 'text-amber-600' : 'text-brand-600'
                      }`}
                    />
                    <div>
                      <strong className="block font-black">
                        {timeCalc.gracePeriodActive
                          ? `Tiempo Excedido (${timeCalc.overtimeMinutes} min) • Espera / Tolerancia Activa`
                          : `¡Tiempo Excedido por ${timeCalc.overtimeMinutes} minutos!`}
                      </strong>
                      <span className="text-[11px] text-slate-600">
                        {timeCalc.gracePeriodActive
                          ? 'Durante los 10 minutos de espera no se cobra nada (0 Bs de recargo).'
                          : `Superó los 10 min de espera. Se aplica recargo automático de ${timeCalc.extraHoursCount} hora(s) extra (${formatBs(timeCalc.extraHourRate)} c/u).`}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`font-mono text-sm font-black ${
                      timeCalc.gracePeriodActive ? 'text-amber-700' : 'text-brand-700'
                    }`}
                  >
                    {timeCalc.gracePeriodActive ? '0.00 Bs' : `+${formatBs(timeCalc.overtimeCharge)}`}
                  </span>
                </div>
              )}

              {/* Consumptions Summary in Stay */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-brand-600" />
                    Consumos de Minibar ({stay.consumptions.length})
                  </span>
                  <button
                    onClick={() => setActiveTab('consumptions')}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    + Añadir Más
                  </button>
                </div>

                {stay.consumptions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">
                    No se han registrado consumos en esta habitación aún.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {stay.consumptions.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 font-mono">
                            {item.quantity}x
                          </span>
                          <div>
                            <span className="font-semibold text-slate-800 block">{item.productName}</span>
                            <span className="text-[10px] text-slate-400">
                              {formatBs(item.unitPrice)} c/u
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold font-mono text-slate-900">{formatBs(item.subtotal)}</span>
                          <button
                            onClick={() => removeConsumptionFromRoom(room.id, item.id)}
                            title="Deshacer / Anular consumo y reponer stock"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Anular
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Tarifa Habitación ({stay.chosenPlan.toUpperCase()}):</span>
                  <span className="font-mono font-semibold">{formatBs(stay.baseRoomPrice)}</span>
                </div>

                {isPrepaid && (
                  <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Pagado por Adelantado al Ingresar:
                    </span>
                    <span className="font-mono">-{formatBs(prepaidAmt)}</span>
                  </div>
                )}

                {timeCalc.overtimeCharge > 0 && (
                  <div className="flex justify-between text-xs text-amber-300">
                    <span>
                      Recargo Tiempo Extra (+{timeCalc.overtimeMinutes} min • {timeCalc.extraBlocksCount} x 20 min):
                    </span>
                    <span className="font-mono font-semibold">+{formatBs(timeCalc.overtimeCharge)}</span>
                  </div>
                )}

                {consumptionsTotal > 0 && (
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Subtotal Consumos Extra:</span>
                    <span className="font-mono font-semibold">+{formatBs(consumptionsTotal)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300 block">
                      {remainingBalance === 0 ? 'ESTADÍA CANCELADA' : 'SALDO A COBRAR AL SALIR'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Total estancia: {formatBs(totalDue)}
                    </span>
                  </div>
                  <span className={`text-3xl font-black font-mono tracking-tight ${
                    remainingBalance === 0 ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {formatBs(remainingBalance)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector if remaining balance > 0 */}
              {remainingBalance > 0 ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                      Método de Pago para el Saldo Pendiente ({formatBs(remainingBalance)})
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFinalPaymentMethod('efectivo')}
                        className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          finalPaymentMethod === 'efectivo'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        Efectivo
                      </button>

                      <button
                        type="button"
                        onClick={() => setFinalPaymentMethod('qr')}
                        className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          finalPaymentMethod === 'qr'
                            ? 'border-sky-600 bg-sky-50 text-sky-800 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-sky-600" />
                        QR (Vendis)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFinalPaymentMethod('mixto');
                          const half = Math.round(remainingBalance / 2);
                          setCashAmount(half.toString());
                          setQrAmount((remainingBalance - half).toString());
                        }}
                        className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          finalPaymentMethod === 'mixto'
                            ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <Layers className="w-4 h-4 text-purple-600" />
                        Pago Mixto
                      </button>
                    </div>

                    {/* Mixed Payment Details in Checkout */}
                    {finalPaymentMethod === 'mixto' && (
                      <div className="mt-3 p-3 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2 animate-fade-in">
                        <span className="text-[11px] font-bold text-purple-900 block">
                          Desglose de Pago Mixto (Total: {formatBs(remainingBalance)})
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Cobrado en Efectivo (Bs)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={remainingBalance}
                              value={cashAmount}
                              onChange={(e) => handleCashChange(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 font-mono font-bold text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Cobrado en QR (Bs)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={remainingBalance}
                              value={qrAmount}
                              onChange={(e) => handleQrChange(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 font-mono font-bold text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    El cliente canceló la tarifa completa al ingresar. No hay saldo pendiente por cobrar.
                  </span>
                </div>
              )}

              {/* Cleaning checkbox & notes */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={sendToCleaning}
                    onChange={(e) => setSendToCleaning(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                  />
                  <span>Enviar habitación a limpieza tras el cobro</span>
                </label>

                <button
                  type="button"
                  onClick={handleOpenReceiptPreview}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Ver Comprobante
                </button>
              </div>

              {/* Primary Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleCheckout}
                  className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {remainingBalance === 0
                    ? 'LIBERAR HABITACIÓN (0 Bs Pendientes)'
                    : `COBRAR SALIDA Y LIBERAR (${formatBs(remainingBalance)})`}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AGREGAR CONSUMOS */}
          {activeTab === 'consumptions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full sm:w-56 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />

                {/* Category filters */}
                <div className="flex gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'preservativos', label: 'Preservativos' },
                    { key: 'bebidas_alcohol', label: 'Licores' },
                    { key: 'bebidas_sin_alcohol', label: 'Sodas' },
                    { key: 'snacks', label: 'Snacks' },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedCategory === cat.key
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    disabled={p.stock <= 0}
                    onClick={() => addConsumptionToRoom(room.id, p.id, 1)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      p.stock <= 0
                        ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-brand-500 hover:shadow-md active:scale-95'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-900 block leading-tight mb-1">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Stock: {p.stock} unid.
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                      <span className="font-extrabold text-xs font-mono text-brand-700">
                        {formatBs(p.price)}
                      </span>
                      <span className="p-1 rounded-lg bg-brand-50 text-brand-600">
                        <PlusCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">
                  Los consumos se sincronizan automáticamente en tiempo real en todos los dispositivos.
                </span>
                <button
                  onClick={() => setActiveTab('checkout')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Volver al Cobro
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

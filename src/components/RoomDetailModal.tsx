import React, { useState, useEffect } from 'react';
import { Room, Product, PaymentMethod, Stay, ConsumptionItem } from '../types';
import { useApp } from '../context/AppContext';
import { getNetworkTimestamp } from '../services/firebase';
import { calculateStayTime, formatDateTime, formatTimeOnly, formatTimerDisplay } from '../utils/timeUtils';
import { formatBs, getRoomTypeBadge, getPaymentMethodLabel } from '../utils/formatUtils';
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
  Landmark,
  Receipt,
  Check,
  AlertCircle,
  Coins,
  ChevronDown,
} from 'lucide-react';

interface RoomDetailModalProps {
  room: Room | null;
  onClose: () => void;
  onOpenReceipt: (stay: Stay) => void;
  onOpenChangeRoom: (room: Room) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  onClose,
  onOpenReceipt,
  onOpenChangeRoom,
}) => {
  const {
    tariffs,
    products,
    addConsumptionToRoom,
    addCustomConsumptionToRoom,
    removeConsumptionFromRoom,
    closeStayAndCheckout,
    nowTimestamp,
  } = useApp();

  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<'checkout' | 'consumptions'>('checkout');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchProduct, setSearchProduct] = useState<string>('');
  const [finalPaymentMethod, setFinalPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [mixedQrChannel, setMixedQrChannel] = useState<'qr_vendis' | 'qr_union'>('qr_vendis');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [qrAmount, setQrAmount] = useState<string>('');
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');
  const [sendToCleaning, setSendToCleaning] = useState<boolean>(true);

  // Modo de pago para consumos agregados: 'later' (Cargar a la cuenta) o al contado ('efectivo', 'qr_vendis', 'qr_union')
  const [consumptionPayMode, setConsumptionPayMode] = useState<'later' | 'efectivo' | 'qr_vendis' | 'qr_union'>('later');

  // Estado para Consumo Personalizado con Precio Manual
  const [showCustomConsumption, setShowCustomConsumption] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [customQty, setCustomQty] = useState<number>(1);
  const [customNotes, setCustomNotes] = useState<string>('');

  if (!room || !room.currentStay) return null;

  const stay = room.currentStay;
  const roomTariff = tariffs[room.type];
  const extraHourRate = roomTariff?.extraHourPrice || (room.type === 'jacuzzi' || room.type === 'golden_suite' ? 40 : 30);
  const priceNight = roomTariff?.priceNight || (room.type === 'ventilador' ? 140 : room.type === 'aire' ? 150 : room.type === 'suite' ? 180 : room.type === 'jacuzzi' ? 220 : 230);
  const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes, extraHourRate, nowTimestamp || getNetworkTimestamp(), {
    priceNight,
    baseRoomPrice: stay.baseRoomPrice,
    chosenPlan: stay.chosenPlan,
  });

  // Consumos desglosados (pagados en el momento vs pendientes)
  const consumptionsTotal = stay.consumptions.reduce((sum, item) => sum + item.subtotal, 0);
  const paidConsumptionsTotal = stay.consumptions
    .filter((item) => item.isPaid)
    .reduce((sum, item) => sum + item.subtotal, 0);
  const unpaidConsumptionsTotal = stay.consumptions
    .filter((item) => !item.isPaid)
    .reduce((sum, item) => sum + item.subtotal, 0);

  const totalDue = stay.baseRoomPrice + timeCalc.overtimeCharge + consumptionsTotal;

  // Prepago de la habitación
  const isPrepaid = stay.isPrepaid || false;
  const prepaidAmt = isPrepaid ? (stay.prepaidAmount || stay.baseRoomPrice) : 0;

  // Saldo pendiente por cobrar al desocupar = Total - (Prepago de habitación + Consumos ya pagados al momento)
  const totalAlreadyPaid = prepaidAmt + paidConsumptionsTotal;
  const remainingBalance = Math.max(0, totalDue - totalAlreadyPaid);

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

  const handleAddProduct = (productId: string) => {
    const isPaid = consumptionPayMode !== 'later';
    const paymentMethod = isPaid ? consumptionPayMode : undefined;
    addConsumptionToRoom(room.id, productId, 1, {
      isPaid,
      paymentMethod,
    });
  };

  const handleAddCustomProduct = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customName.trim()) {
      alert('Por favor ingrese el nombre o concepto del consumo personalizado.');
      return;
    }
    const priceNum = parseFloat(customPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Por favor ingrese un precio válido (número mayor o igual a 0).');
      return;
    }
    const qty = Math.max(1, customQty || 1);
    const isPaid = consumptionPayMode !== 'later';
    const paymentMethod = isPaid ? consumptionPayMode : undefined;

    addCustomConsumptionToRoom(room.id, {
      name: customName.trim(),
      unitPrice: priceNum,
      quantity: qty,
      isPaid,
      paymentMethod,
      notes: customNotes.trim() || undefined,
    });

    setCustomName('');
    setCustomPrice('');
    setCustomQty(1);
    setCustomNotes('');
    setShowCustomConsumption(false);
  };

  const handleCheckout = () => {
    // Si hay saldo pendiente, validar obligatoriamente que se haya elegido método de pago válido
    if (remainingBalance > 0) {
      if (!finalPaymentMethod) {
        alert(`⚠️ Hay un saldo pendiente por cobrar de ${formatBs(remainingBalance)}. Por favor seleccione el método de pago utilizado por el huésped.`);
        return;
      }

      if (finalPaymentMethod === 'mixto') {
        const cashNum = parseFloat(cashAmount) || 0;
        const qrNum = parseFloat(qrAmount) || 0;
        if (Math.abs((cashNum + qrNum) - remainingBalance) > 0.01) {
          alert(`⚠️ La suma del pago mixto (${formatBs(cashNum + qrNum)}) debe ser exactamente igual al saldo pendiente (${formatBs(remainingBalance)}).`);
          return;
        }
      }
    }

    let finalCash = 0;
    let finalQrVendis = 0;
    let finalQrUnion = 0;
    let finalQr = 0;

    if (remainingBalance > 0) {
      if (finalPaymentMethod === 'efectivo') {
        finalCash = remainingBalance;
      } else if (finalPaymentMethod === 'qr_vendis' || finalPaymentMethod === 'qr') {
        finalQrVendis = remainingBalance;
        finalQr = remainingBalance;
      } else if (finalPaymentMethod === 'qr_union') {
        finalQrUnion = remainingBalance;
        finalQr = remainingBalance;
      } else if (finalPaymentMethod === 'mixto') {
        finalCash = parseFloat(cashAmount) || 0;
        const qVal = parseFloat(qrAmount) || 0;
        finalQr = qVal;
        if (mixedQrChannel === 'qr_union') {
          finalQrUnion = qVal;
        } else {
          finalQrVendis = qVal;
        }
      }
    }

    const completed = closeStayAndCheckout(room.id, {
      finalPaymentMethod: remainingBalance > 0 ? finalPaymentMethod : stay.paymentMethod,
      cashPaid: finalCash,
      qrVendisPaid: finalQrVendis,
      qrUnionPaid: finalQrUnion,
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
    let finalQrVendis = 0;
    let finalQrUnion = 0;
    let finalQr = 0;

    if (remainingBalance > 0) {
      if (finalPaymentMethod === 'efectivo') {
        finalCash = remainingBalance;
      } else if (finalPaymentMethod === 'qr_vendis' || finalPaymentMethod === 'qr') {
        finalQrVendis = remainingBalance;
        finalQr = remainingBalance;
      } else if (finalPaymentMethod === 'qr_union') {
        finalQrUnion = remainingBalance;
        finalQr = remainingBalance;
      } else if (finalPaymentMethod === 'mixto') {
        finalCash = parseFloat(cashAmount) || 0;
        const qVal = parseFloat(qrAmount) || 0;
        finalQr = qVal;
        if (mixedQrChannel === 'qr_union') {
          finalQrUnion = qVal;
        } else {
          finalQrVendis = qVal;
        }
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
      qrVendisPaid: (stay.prepaidQrVendis || 0) + finalQrVendis,
      qrUnionPaid: (stay.prepaidQrUnion || 0) + finalQrUnion,
      qrPaid: (stay.prepaidQr || 0) + finalQr,
    };
    onOpenReceipt(tempStay);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scale-in my-auto">
        {/* Header */}
        <div
          className={`px-5 sm:px-6 py-4 text-white flex items-center justify-between transition-colors shrink-0 shadow-sm z-10 ${
            timeCalc.isOvertime ? 'bg-brand-700' : 'bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center font-bold shrink-0">
              <BedDouble className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight">{room.name}</h2>
                <span className="text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                  {room.tag}
                </span>
                {stay.isCustomPackage || stay.chosenPlan === 'personalizado' ? (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-fuchsia-600 text-white flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3" />
                    {stay.customPackageName || 'Paquete Personalizado'}
                  </span>
                ) : null}
                {isPrepaid && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Adelanto Pagado
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium">
                {stay.isCustomPackage || stay.chosenPlan === 'personalizado'
                  ? `✨ ${stay.customPackageName || 'PAQUETE PERSONALIZADO'} (${stay.chosenDurationMinutes} min)`
                  : stay.chosenPlan.toUpperCase()} • Ingreso: {formatTimeOnly(stay.startTime)} • Atendido por: {stay.receptionistName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 pt-3 bg-slate-50 shrink-0">
          <div className="flex gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab('checkout')}
              className={`pb-2.5 px-2 text-xs font-extrabold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'checkout'
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Cobro & Salida
            </button>

            <button
              onClick={() => setActiveTab('consumptions')}
              className={`pb-2.5 px-2 sm:px-4 text-xs font-extrabold transition-all border-b-2 flex items-center gap-1.5 ${
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
            className="pb-2 px-2.5 sm:px-3.5 text-[11px] sm:text-xs font-black text-amber-900 hover:text-amber-950 flex items-center gap-1.5 bg-amber-100/80 hover:bg-amber-200/90 rounded-t-xl transition-all border-t border-x border-amber-300 shadow-xs"
            title="Cambiar a otra habitación disponible"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">CAMBIO DE HABITACIÓN</span>
            <span className="sm:hidden">CAMBIAR</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 sm:space-y-5">
          {/* TAB 1: COBRO & SALIDA */}
          {activeTab === 'checkout' && (
            <div className="space-y-4">
              {/* Auto Night Conversion Notice */}
              {timeCalc.autoNightConverted && (
                <div className="p-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl border border-indigo-400 shadow-md space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <strong className="text-xs font-black text-amber-300 uppercase tracking-wide">
                      Convertido Automáticamente a Noche Completa (12 Horas)
                    </strong>
                  </div>
                  <p className="text-xs text-indigo-100 leading-relaxed">
                    El huésped superó las 3 horas de permanencia. El sistema ajustó automáticamente la tarifa al <strong>Precio por Noche ({formatBs(timeCalc.nightPriceApplied || 140)})</strong>, otorgándole derecho a permanecer 12 horas completas ({formatTimerDisplay(timeCalc.remainingMinutes, timeCalc.remainingSeconds)} restantes).
                  </p>
                </div>
              )}

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
                          : `Superó los 10 min de espera. Se aplica recargo automático de 10 Bs por cada 20 min (+${formatBs(timeCalc.overtimeCharge)}).`}
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
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-800 block">{item.productName}</span>
                              {item.isCustom && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-0.5 shadow-2xs">
                                  <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                                  Personalizado
                                </span>
                              )}
                              {item.isPaid ? (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  ✓ PAGADO EN EL ACTO ({getPaymentMethodLabel(item.paymentMethod || 'efectivo')})
                                </span>
                              ) : (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  ⏳ PAGA AL SALIR
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {formatBs(item.unitPrice)} c/u • {formatTimeOnly(item.timestamp)}
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
                      {timeCalc.autoNightConverted
                        ? `Ajuste Automático a Tarifa de Noche (12 Horas por superar 3h):`
                        : `Recargo Tiempo Extra (+${timeCalc.overtimeMinutes} min • ${timeCalc.extraBlocksCount} x 20 min):`}
                    </span>
                    <span className="font-mono font-semibold">+{formatBs(timeCalc.overtimeCharge)}</span>
                  </div>
                )}

                {paidConsumptionsTotal > 0 && (
                  <div className="flex justify-between text-xs text-emerald-300">
                    <span>Consumos Pagados en el Acto:</span>
                    <span className="font-mono font-semibold">+{formatBs(paidConsumptionsTotal)} (Ya cancelado)</span>
                  </div>
                )}

                {unpaidConsumptionsTotal > 0 && (
                  <div className="flex justify-between text-xs text-amber-300 font-semibold">
                    <span>Consumos Pendientes de Cobro:</span>
                    <span className="font-mono font-semibold">+{formatBs(unpaidConsumptionsTotal)}</span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-slate-700 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-rose-300 block">
                      {remainingBalance === 0 ? 'CUENTA TOTALMENTE LIQUIDADA' : 'SALDO PENDIENTE POR COBRAR AL SALIR'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Total estancia: {formatBs(totalDue)} • Ya abonado: {formatBs(totalAlreadyPaid)}
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
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-black text-amber-950 text-xs">
                        Deuda pendiente de {formatBs(remainingBalance)}
                      </strong>
                      <span>
                        El huésped debe cancelar el saldo pendiente. Selecciona el método de pago utilizado para poder liberar la habitación.
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                      Método de Pago para el Saldo Pendiente ({formatBs(remainingBalance)}) <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setFinalPaymentMethod('efectivo')}
                        className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          finalPaymentMethod === 'efectivo'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm font-black'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        Efectivo
                      </button>

                      <button
                        type="button"
                        onClick={() => setFinalPaymentMethod('qr_vendis')}
                        className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          finalPaymentMethod === 'qr_vendis' || finalPaymentMethod === 'qr'
                            ? 'border-sky-600 bg-sky-50 text-sky-800 shadow-sm font-black'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-sky-600" />
                        QR Vendis
                      </button>

                      <button
                        type="button"
                        onClick={() => setFinalPaymentMethod('qr_union')}
                        className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          finalPaymentMethod === 'qr_union'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-sm font-black'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Landmark className="w-4 h-4 text-indigo-600" />
                        QR B. Unión
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
                            ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-sm font-black'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Layers className="w-4 h-4 text-purple-600" />
                        Pago Mixto
                      </button>
                    </div>

                    {/* Mixed Payment Details in Checkout */}
                    {finalPaymentMethod === 'mixto' && (
                      <div className="mt-3 p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2.5 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-purple-900 block">
                            Desglose de Pago Mixto (Total: {formatBs(remainingBalance)})
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setMixedQrChannel('qr_vendis')}
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                mixedQrChannel === 'qr_vendis'
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              Vendis
                            </button>
                            <button
                              type="button"
                              onClick={() => setMixedQrChannel('qr_union')}
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                mixedQrChannel === 'qr_union'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              B. Unión
                            </button>
                          </div>
                        </div>
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
                              {mixedQrChannel === 'qr_union' ? 'Cobrado en QR B. Unión (Bs)' : 'Cobrado en QR Vendis (Bs)'}
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
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="block font-black text-emerald-950">Cuenta Liquidada al 100%</strong>
                    <span>La tarifa y consumos ya fueron cancelados. Puedes liberar la habitación directamente.</span>
                  </div>
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
                  className={`w-full py-3.5 text-white font-black text-sm rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                    remainingBalance === 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                      : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/30'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  {remainingBalance === 0
                    ? 'LIBERAR HABITACIÓN (Cuenta Liquidada • 0 Bs)'
                    : `CONFIRMAR PAGO Y LIBERAR (${formatBs(remainingBalance)} EN ${getPaymentMethodLabel(finalPaymentMethod).toUpperCase()})`}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AGREGAR CONSUMOS */}
          {activeTab === 'consumptions' && (
            <div className="space-y-4">
              {/* SELECTOR DE MODO DE PAGO DEL CONSUMO (Pagar ahora vs Pagar al desocupar) */}
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 space-y-2.5">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-brand-600" />
                  ¿Cómo pagará el huésped los productos que vas a agregar?
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Opción 1: Cargar a la cuenta (Paga al salir) */}
                  <button
                    type="button"
                    onClick={() => setConsumptionPayMode('later')}
                    className={`p-2.5 rounded-xl border-2 font-bold text-xs flex flex-col items-center text-center gap-1 transition-all ${
                      consumptionPayMode === 'later'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm font-black'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Cargar a Cuenta</span>
                    <span className="text-[9px] font-normal text-slate-400">Paga al desocupar</span>
                  </button>

                  {/* Opción 2: Pagó ahora en Efectivo */}
                  <button
                    type="button"
                    onClick={() => setConsumptionPayMode('efectivo')}
                    className={`p-2.5 rounded-xl border-2 font-bold text-xs flex flex-col items-center text-center gap-1 transition-all ${
                      consumptionPayMode === 'efectivo'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm font-black'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Pagó Efectivo</span>
                    <span className="text-[9px] font-normal text-slate-400">Cobrado ahora</span>
                  </button>

                  {/* Opción 3: Pagó ahora en QR Vendis */}
                  <button
                    type="button"
                    onClick={() => setConsumptionPayMode('qr_vendis')}
                    className={`p-2.5 rounded-xl border-2 font-bold text-xs flex flex-col items-center text-center gap-1 transition-all ${
                      consumptionPayMode === 'qr_vendis'
                        ? 'border-sky-600 bg-sky-50 text-sky-900 shadow-sm font-black'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-sky-600" />
                    <span>Pagó QR Vendis</span>
                    <span className="text-[9px] font-normal text-slate-400">Cobrado ahora</span>
                  </button>

                  {/* Opción 4: Pagó ahora en QR Banco Unión */}
                  <button
                    type="button"
                    onClick={() => setConsumptionPayMode('qr_union')}
                    className={`p-2.5 rounded-xl border-2 font-bold text-xs flex flex-col items-center text-center gap-1 transition-all ${
                      consumptionPayMode === 'qr_union'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm font-black'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Landmark className="w-4 h-4 text-indigo-600" />
                    <span>Pagó QR Unión</span>
                    <span className="text-[9px] font-normal text-slate-400">Cobrado ahora</span>
                  </button>
                </div>
              </div>

              {/* BOTÓN Y FORMULARIO DE CONSUMO PERSONALIZADO (PRECIO MANUAL) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowCustomConsumption(!showCustomConsumption)}
                  className={`w-full p-3 rounded-2xl border-2 transition-all flex items-center justify-between shadow-xs ${
                    showCustomConsumption
                      ? 'bg-purple-900 text-white border-purple-900 shadow-md'
                      : 'bg-linear-to-r from-purple-50 via-fuchsia-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-950 border-purple-300 font-extrabold'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs ${showCustomConsumption ? 'bg-purple-700 text-white' : 'bg-purple-600 text-white'}`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-black">
                        {showCustomConsumption ? 'Ocultar Formulario de Consumo Personalizado' : '✨ Consumo Personalizado / Precio Manual'}
                      </span>
                      <span className={`text-[10px] block ${showCustomConsumption ? 'text-purple-200' : 'text-purple-700'}`}>
                        Registrar producto, bebida especial o servicio indicando nombre y precio manual
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCustomConsumption ? 'rotate-180 text-white' : 'text-purple-700'}`} />
                </button>

                {/* Formulario Desplegable */}
                {showCustomConsumption && (
                  <form onSubmit={handleAddCustomProduct} className="p-4 bg-purple-50/90 border-2 border-purple-300 rounded-2xl space-y-3 animate-fade-in shadow-sm">
                    <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                      <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        Detalles del Consumo Personalizado
                      </span>
                      <span className="text-[10px] font-bold text-purple-900 bg-purple-200/70 px-2 py-0.5 rounded-md">
                        {consumptionPayMode === 'later' ? '⏳ Paga al Salir' : `✓ Cobrado ahora (${getPaymentMethodLabel(consumptionPayMode)})`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-black text-purple-950 uppercase tracking-wider mb-1">
                          ¿Qué es el consumo? (Nombre / Concepto) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Whisky Red Label, Decoración con rosas, Cena..."
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-black text-purple-950 uppercase tracking-wider mb-1">
                          Precio Unitario (Bs) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          placeholder="0 Bs"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs font-mono font-black text-purple-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-black text-purple-950 uppercase tracking-wider mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={customQty}
                          onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs font-mono font-black text-purple-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-purple-200/60">
                      <span className="text-[11px] font-bold text-purple-900">
                        Subtotal a registrar:{' '}
                        <strong className="text-purple-700 font-black text-sm">
                          {formatBs((parseFloat(customPrice) || 0) * (customQty || 1))}
                        </strong>
                      </span>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setShowCustomConsumption(false)}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-purple-200 text-purple-900 text-xs font-bold bg-white hover:bg-purple-100 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          + Añadir a la Habitación
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Barra de Filtros y Búsqueda */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full sm:w-56 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />

                <div className="flex gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'preservativos', label: 'Preservativos' },
                    { key: 'bebidas_alcohol', label: 'Licores' },
                    { key: 'bebidas_sin_alcohol', label: 'Sodas' },
                    { key: 'snacks', label: 'Snacks' },
                    { key: 'higiene_otros', label: 'Higiene' },
                    { key: 'limpieza_utensilios', label: 'Limpieza' },
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
                {/* Botón especial dentro del Grid para Consumo Personalizado */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomConsumption(true);
                  }}
                  className="p-3 rounded-2xl border-2 border-dashed border-purple-400 bg-purple-50/60 hover:bg-purple-100 hover:border-purple-600 text-left transition-all flex flex-col justify-between active:scale-95 group shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-1 text-purple-900 font-black text-xs mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Personalizado</span>
                    </div>
                    <span className="text-[10px] text-purple-700 block font-medium">
                      Nombre y precio manual
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-purple-200">
                    <span className="font-extrabold text-xs font-mono text-purple-800">
                      Precio libre
                    </span>
                    <span className="p-1 rounded-lg bg-purple-600 text-white group-hover:scale-110 transition-transform">
                      <PlusCircle className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    disabled={p.stock <= 0}
                    onClick={() => handleAddProduct(p.id)}
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
                  {consumptionPayMode === 'later'
                    ? 'Los productos añadidos se sumarán a la cuenta para cobrar al desocupar.'
                    : `Los productos añadidos ingresarán inmediatamente a la caja del turno en ${getPaymentMethodLabel(consumptionPayMode)}.`}
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

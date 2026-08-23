import React, { useState, useEffect } from 'react';
import { Room, ProductCategory, PaymentMethod, Stay } from '../types';
import { useApp } from '../context/AppContext';
import {
  calculateStayTime,
  formatTimerDisplay,
  formatTimeOnly,
} from '../utils/timeUtils';
import {
  formatBs,
  getCategoryLabel,
  getRoomTypeBadge,
} from '../utils/formatUtils';
import {
  X,
  Clock,
  AlertTriangle,
  ShoppingBag,
  Plus,
  Trash2,
  DollarSign,
  QrCode,
  Layers,
  Printer,
  Sparkles,
  BedDouble,
  Car,
  FileText,
  UserCheck,
  CheckCircle2,
  RotateCcw,
  Minus,
} from 'lucide-react';

interface RoomDetailModalProps {
  room: Room | null;
  onClose: () => void;
  onOpenReceipt: (stay: Stay) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  onClose,
  onOpenReceipt,
}) => {
  const {
    products,
    addConsumptionToRoom,
    removeConsumptionFromRoom,
    closeStayAndCheckout,
    nowTimestamp,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'details' | 'minibar'>('details');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchProduct, setSearchProduct] = useState('');
  const [finalPaymentMethod, setFinalPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [qrAmount, setQrAmount] = useState<string>('');
  const [sendToCleaning, setSendToCleaning] = useState(true);
  const [checkoutNotes, setCheckoutNotes] = useState('');

  if (!room || !room.currentStay) return null;

  const stay = room.currentStay;
  const badge = getRoomTypeBadge(room.type);
  const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes);
  const consumptionsTotal = stay.consumptions.reduce((sum, c) => sum + c.subtotal, 0);
  const totalDue = stay.baseRoomPrice + timeCalc.overtimeCharge + consumptionsTotal;

  // Initialize or sync mixed payment amounts
  useEffect(() => {
    if (finalPaymentMethod === 'mixto') {
      const half = Math.round(totalDue / 2);
      setCashAmount(half.toString());
      setQrAmount((totalDue - half).toString());
    }
  }, [totalDue, finalPaymentMethod]);

  const handleCashChange = (val: string) => {
    setCashAmount(val);
    const num = parseFloat(val) || 0;
    const rem = Math.max(0, totalDue - num);
    setQrAmount(rem.toString());
  };

  const handleQrChange = (val: string) => {
    setQrAmount(val);
    const num = parseFloat(val) || 0;
    const rem = Math.max(0, totalDue - num);
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

    if (finalPaymentMethod === 'efectivo') {
      finalCash = totalDue;
      finalQr = 0;
    } else if (finalPaymentMethod === 'qr') {
      finalCash = 0;
      finalQr = totalDue;
    } else if (finalPaymentMethod === 'mixto') {
      finalCash = parseFloat(cashAmount) || 0;
      finalQr = parseFloat(qrAmount) || 0;
    }

    const completed = closeStayAndCheckout(room.id, {
      finalPaymentMethod,
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

    if (finalPaymentMethod === 'efectivo') {
      finalCash = totalDue;
    } else if (finalPaymentMethod === 'qr') {
      finalQr = totalDue;
    } else if (finalPaymentMethod === 'mixto') {
      finalCash = parseFloat(cashAmount) || 0;
      finalQr = parseFloat(qrAmount) || 0;
    }

    const tempStay: Stay = {
      ...stay,
      endTime: new Date().toISOString(),
      overtimeMinutes: timeCalc.overtimeMinutes,
      overtimeCharge: timeCalc.overtimeCharge,
      totalAmount: totalDue,
      paymentMethod: finalPaymentMethod,
      cashPaid: finalCash,
      qrPaid: finalQr,
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
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  Reg: {stay.receptionistName}
                </span>
                <span>•</span>
                <span>Entrada: {formatTimeOnly(stay.startTime)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-4 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Detalle de Cuenta & Cierre
          </button>

          <button
            onClick={() => setActiveTab('minibar')}
            className={`pb-3 px-4 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'minibar'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Minibar / Añadir Consumo ({stay.consumptions.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {activeTab === 'details' ? (
            <>
              {/* Timer status banner */}
              <div
                className={`rounded-2xl p-4 text-center border ${
                  timeCalc.isOvertime
                    ? 'bg-rose-50 border-brand-300 text-brand-900'
                    : timeCalc.isWarning
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider block mb-1">
                  {timeCalc.isOvertime ? 'Tiempo Excedido (Cronómetro de Cobro Extra)' : 'Tiempo Restante de Estadía'}
                </span>
                <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight block">
                  {timeCalc.isOvertime
                    ? `+ ${formatTimerDisplay(timeCalc.overtimeMinutes, timeCalc.overtimeSeconds)}`
                    : formatTimerDisplay(timeCalc.remainingMinutes, timeCalc.remainingSeconds)}
                </span>

                {timeCalc.isOvertime && (
                  <div className="mt-2 text-xs font-semibold bg-white py-1.5 px-3 rounded-xl inline-block border border-rose-200 text-brand-700 shadow-2xs">
                    {timeCalc.gracePeriodActive ? (
                      'Dentro del periodo de gracia (Primeros 5 min: 0 Bs)'
                    ) : (
                      `Recargo aplicado: +${formatBs(timeCalc.overtimeCharge)} (${timeCalc.overtimeMinutes} min extras)`
                    )}
                  </div>
                )}
              </div>

              {/* Stay Information Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-400 font-bold block mb-0.5">Plan Registrado</span>
                  <span className="font-bold text-slate-800 text-sm capitalize">
                    {stay.chosenPlan === 'noche12h'
                      ? 'Noche (12 Horas)'
                      : stay.chosenPlan === 'promo190'
                      ? 'Promoción 3 Horas'
                      : `${stay.chosenDurationMinutes / 60} Hora(s)`}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-400 font-bold block mb-0.5">Placa de Vehículo</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {stay.vehiclePlate || 'Sin placa'}
                  </span>
                </div>
              </div>

              {/* Consumed Items Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Consumos / Minibar Registrados ({stay.consumptions.length})
                  </h4>
                  <button
                    onClick={() => setActiveTab('minibar')}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Producto
                  </button>
                </div>

                {stay.consumptions.length === 0 ? (
                  <div className="text-center py-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No se han registrado consumos aún.
                  </div>
                ) : (
                  <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
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
                  <span>Tarifa de Habitación:</span>
                  <span className="font-mono font-semibold">{formatBs(stay.baseRoomPrice)}</span>
                </div>

                {timeCalc.overtimeCharge > 0 && (
                  <div className="flex justify-between text-xs text-amber-300">
                    <span>Recargo Tiempo Extra ({timeCalc.overtimeMinutes} min):</span>
                    <span className="font-mono font-semibold">+{formatBs(timeCalc.overtimeCharge)}</span>
                  </div>
                )}

                {consumptionsTotal > 0 && (
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Subtotal Consumos:</span>
                    <span className="font-mono font-semibold">{formatBs(consumptionsTotal)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300 block">
                      TOTAL A COBRAR
                    </span>
                    <span className="text-[10px] text-slate-400">Incluye habitación + consumos + recargos</span>
                  </div>
                  <span className="text-3xl font-black font-mono text-white tracking-tight">
                    {formatBs(totalDue)}
                  </span>
                </div>
              </div>

              {/* Payment Method & Checkout Options with Mixed Support */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                    Método de Pago Final
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
                        const half = Math.round(totalDue / 2);
                        setCashAmount(half.toString());
                        setQrAmount((totalDue - half).toString());
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
                        Desglose de Pago Mixto (Total: {formatBs(totalDue)})
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
                            max={totalDue}
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
                            max={totalDue}
                            value={qrAmount}
                            onChange={(e) => handleQrChange(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 font-mono font-bold text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Send to cleaning toggle */}
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={sendToCleaning}
                    onChange={(e) => setSendToCleaning(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">Enviar a Limpieza tras cerrar</span>
                    <span className="text-[10px] text-slate-400">
                      La habitación pasará a estado de limpieza antes de quedar disponible
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleOpenReceiptPreview}
                  className="py-3 px-4 rounded-2xl border border-slate-300 font-bold text-slate-700 text-xs hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Ticket
                </button>

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  CERRAR HABITACIÓN ({formatBs(totalDue)})
                </button>
              </div>
            </>
          ) : (
            /* MINIBAR & CONSUMPTIONS TAB */
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'preservativos', label: 'Preservativos' },
                  { key: 'bebidas_alcohol', label: 'Cerveza & Licores' },
                  { key: 'bebidas_sin_alcohol', label: 'Gaseosas & Agua' },
                  { key: 'snacks', label: 'Snacks' },
                  { key: 'higiene_otros', label: 'Higiene / Otros' },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key as ProductCategory | 'all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat.key
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Product Search Input */}
              <input
                type="text"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Buscar bebida, preservativo o snack..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />

              {/* Product Catalog Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 transition-all flex items-center justify-between shadow-2xs"
                  >
                    <div className="pr-2">
                      <span className="font-bold text-xs text-slate-800 block line-clamp-1">
                        {prod.name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-extrabold text-xs text-brand-700 font-mono">
                          {formatBs(prod.price)}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            prod.stock <= prod.minStockAlert
                              ? 'bg-rose-50 text-rose-700 font-bold'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          Stock: {prod.stock}
                        </span>
                      </div>
                    </div>

                    <button
                      disabled={prod.stock <= 0}
                      onClick={() => addConsumptionToRoom(room.id, prod.id, 1)}
                      className={`p-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                        prod.stock <= 0
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-rose-50 hover:bg-brand-600 text-brand-700 hover:text-white border border-rose-200 shadow-2xs active:scale-95'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

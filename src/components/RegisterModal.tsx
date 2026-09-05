import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getNetworkTimestamp } from '../services/firebase';
import { Room, PlanType, PaymentMethod } from '../types';
import { formatBs, getRoomTypeBadge, getEffective2hPrice, isWeekendTariffDay } from '../utils/formatUtils';
import {
  X,
  Clock,
  DollarSign,
  QrCode,
  Sparkles,
  Layers,
  Car,
  FileText,
  BedDouble,
  Check,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Moon,
  Tv,
  Landmark,
  Sliders,
  Tag,
} from 'lucide-react';

interface RegisterModalProps {
  room: Room | null;
  onClose: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ room, onClose }) => {
  const { tariffs, registerStay } = useApp();

  // Estados para paquete personalizado (tiempo y costo libre)
  const [customHours, setCustomHours] = useState<string>('3');
  const [customMinutes, setCustomMinutes] = useState<string>('0');
  const [customPrice, setCustomPrice] = useState<string>('290');
  const [customPackageName, setCustomPackageName] = useState<string>('Promoción Especial 3h x 290 Bs');

  if (!room) return null;

  const roomTariff = tariffs[room.type];
  const badge = getRoomTypeBadge(room.type);
  const isWeekend = isWeekendTariffDay();
  const effective2hPrice = getEffective2hPrice(room.type, roomTariff);

  const parsedCustomHours = Math.max(0, parseFloat(customHours) || 0);
  const parsedCustomMinutes = Math.max(0, parseFloat(customMinutes) || 0);
  const totalCustomDurationMinutes = Math.max(15, Math.round(parsedCustomHours * 60 + parsedCustomMinutes));
  const parsedCustomPrice = Math.max(0, parseFloat(customPrice) || 0);

  // Available plans for this room
  type PlanOption = {
    key: PlanType;
    title: string;
    subtitle: string;
    durationMinutes: number;
    price: number;
    icon: React.ReactNode;
    isPromo?: boolean;
    isNight?: boolean;
    isCustom?: boolean;
  };

  const planOptions: PlanOption[] = [];

  if (roomTariff?.price1h) {
    planOptions.push({
      key: '1h',
      title: '1 Hora',
      subtitle: 'Estadía Rápida (60 min)',
      durationMinutes: 60,
      price: roomTariff.price1h,
      icon: <Clock className="w-4 h-4 text-emerald-600" />,
    });
  }

  if (roomTariff?.price2h || roomTariff?.price2hWeekend || effective2hPrice) {
    planOptions.push({
      key: '2h',
      title: isWeekend ? '2 Horas (Fin de Semana)' : '2 Horas',
      subtitle: isWeekend ? `Estadía 2h (Vie, Sáb y Dom • ${formatBs(effective2hPrice)})` : 'Estadía Estándar (120 min)',
      durationMinutes: 120,
      price: effective2hPrice,
      icon: <Clock className="w-4 h-4 text-brand-600" />,
      isPromo: isWeekend,
    });
  }

  // Paquete 2 Horas Suite Noche (100 Bs) para habitaciones Suite
  if (roomTariff?.price2hNight || room.type === 'suite') {
    const suiteNight2hPrice = roomTariff?.price2hNight || 100;
    planOptions.push({
      key: '2h_noche',
      title: '2h Suite Noche',
      subtitle: 'Paquete Nocturno 2 Horas (120 min)',
      durationMinutes: 120,
      price: suiteNight2hPrice,
      icon: <Moon className="w-4 h-4 text-indigo-600" />,
      isNight: true,
    });
  }

  // PROMOCIONES BONFLIX: Exclusivas en Suites de 65 Bs la hora (2h por 150 Bs y 4h por 190 Bs)
  if (room.type === 'suite') {
    const bonflix2h = roomTariff?.bonflix2hPrice || tariffs?.bonflix2hPrice || 150;
    const bonflix4h = roomTariff?.bonflix4hPrice || tariffs?.bonflix4hPrice || 190;

    planOptions.push({
      key: 'bonflix_2h',
      title: '2h Bonflix (150 Bs)',
      subtitle: '2 Horas + Promo Bonflix (120 min)',
      durationMinutes: 120,
      price: bonflix2h,
      icon: <Tv className="w-4 h-4 text-rose-600" />,
      isPromo: true,
    });

    planOptions.push({
      key: 'bonflix_4h',
      title: '4h Bonflix (190 Bs)',
      subtitle: '4 Horas + Promo Bonflix (240 min)',
      durationMinutes: 240,
      price: bonflix4h,
      icon: <Tv className="w-4 h-4 text-rose-600" />,
      isPromo: true,
    });
  }

  if (roomTariff?.price3h) {
    planOptions.push({
      key: '3h',
      title: '3 Horas',
      subtitle: 'Estadía Extendida (180 min)',
      durationMinutes: 180,
      price: roomTariff.price3h,
      icon: <Clock className="w-4 h-4 text-purple-600" />,
    });
  }

  if (roomTariff?.priceNight) {
    planOptions.push({
      key: 'noche',
      title: 'Noche Completa',
      subtitle: 'Estadía Nocturna (12 Horas)',
      durationMinutes: 720,
      price: roomTariff.priceNight,
      icon: <Sparkles className="w-4 h-4 text-indigo-600" />,
    });
  }

  // Promo 3 Horas estándar si existe
  if (tariffs?.promo3hPrice) {
    planOptions.push({
      key: 'promo3h',
      title: 'Promo 3 Horas',
      subtitle: `Tarifa Especial Promoción (${tariffs.promo3hPrice} Bs - 180 min)`,
      durationMinutes: 180,
      price: tariffs.promo3hPrice,
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      isPromo: true,
    });
  }

  // ✨ PAQUETE PERSONALIZADO (Disponible en TODAS las habitaciones)
  planOptions.push({
    key: 'personalizado',
    title: '✨ Paquete Personalizado',
    subtitle: `Tiempo y costo libre (${parsedCustomHours > 0 ? `${parsedCustomHours}h` : ''}${parsedCustomMinutes > 0 ? ` ${parsedCustomMinutes}m` : ''} • ${formatBs(parsedCustomPrice)})`,
    durationMinutes: totalCustomDurationMinutes,
    price: parsedCustomPrice,
    icon: <Sliders className="w-4 h-4 text-fuchsia-600" />,
    isPromo: true,
    isCustom: true,
  });

  // State
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(planOptions[0]?.key || '1h');
  const [isPrepaid, setIsPrepaid] = useState<boolean>(true); // Por defecto se cobra por adelantado
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [mixedQrChannel, setMixedQrChannel] = useState<'qr_vendis' | 'qr_union'>('qr_vendis');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [qrAmount, setQrAmount] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [notes, setNotes] = useState('');

  const currentOption = planOptions.find((p) => p.key === selectedPlan) || planOptions[0];
  const durationMinutes =
    selectedPlan === 'personalizado' ? totalCustomDurationMinutes : currentOption ? currentOption.durationMinutes : 60;
  const basePrice =
    selectedPlan === 'personalizado' ? parsedCustomPrice : currentOption ? currentOption.price : 45;

  // Sync mixed payment amounts when plan or base price changes
  useEffect(() => {
    if (paymentMethod === 'mixto') {
      const half = Math.round(basePrice / 2);
      setCashAmount(half.toString());
      setQrAmount((basePrice - half).toString());
    }
  }, [selectedPlan, basePrice, paymentMethod, customPrice]);

  const handleCashChange = (val: string) => {
    setCashAmount(val);
    const num = parseFloat(val) || 0;
    const rem = Math.max(0, basePrice - num);
    setQrAmount(rem.toString());
  };

  const handleQrChange = (val: string) => {
    setQrAmount(val);
    const num = parseFloat(val) || 0;
    const rem = Math.max(0, basePrice - num);
    setCashAmount(rem.toString());
  };

  // Quick helper to set custom hours
  const handleSetQuickCustomHours = (hours: number) => {
    setCustomHours(hours.toString());
    setCustomMinutes('0');
  };

  // Expected exit time calculation
  const exitDate = new Date(getNetworkTimestamp() + durationMinutes * 60 * 1000);
  const formattedExitTime = exitDate.toLocaleTimeString('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalCash = 0;
    let finalQrVendis = 0;
    let finalQrUnion = 0;
    let finalQr = 0;

    if (isPrepaid) {
      if (paymentMethod === 'efectivo') {
        finalCash = basePrice;
      } else if (paymentMethod === 'qr_vendis' || paymentMethod === 'qr') {
        finalQrVendis = basePrice;
        finalQr = basePrice;
      } else if (paymentMethod === 'qr_union') {
        finalQrUnion = basePrice;
        finalQr = basePrice;
      } else if (paymentMethod === 'mixto') {
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

    const isCustom = selectedPlan === 'personalizado';
    const effectiveCustomTitle = isCustom
      ? customPackageName.trim() || `Paquete ${parsedCustomHours}h (${formatBs(basePrice)})`
      : undefined;

    registerStay({
      roomId: room.id,
      chosenPlan: selectedPlan,
      chosenDurationMinutes: durationMinutes,
      basePrice,
      paymentMethod,
      isPrepaid,
      isCustomPackage: isCustom,
      customPackageName: effectiveCustomTitle,
      prepaidCash: finalCash,
      prepaidQrVendis: finalQrVendis,
      prepaidQrUnion: finalQrUnion,
      prepaidQr: finalQr,
      vehiclePlate: vehiclePlate.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scale-in my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 to-rose-600 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold shrink-0">
              <BedDouble className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight">{room.name}</span>
                <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {room.tag}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-rose-100 font-medium">Registro de nueva estadía</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Plan Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2.5">
              1. Seleccionar Plan / Tiempo
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {planOptions.map((opt) => {
                const isSelected = selectedPlan === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedPlan(opt.key)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all relative ${
                      isSelected
                        ? opt.isCustom
                          ? 'border-fuchsia-600 bg-fuchsia-50/80 shadow-md ring-2 ring-fuchsia-500/20'
                          : 'border-brand-600 bg-rose-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1.5 rounded-lg bg-slate-100">{opt.icon}</div>
                      {isSelected && (
                        <div
                          className={`w-5 h-5 rounded-full text-white flex items-center justify-center ${
                            opt.isCustom ? 'bg-fuchsia-600' : 'bg-brand-600'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="font-extrabold text-xs text-slate-900 block">{opt.title}</span>
                        {opt.isNight && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            NOCHE
                          </span>
                        )}
                        {opt.isPromo && !opt.isCustom && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                            PROMO
                          </span>
                        )}
                        {opt.isCustom && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-800">
                            LIBRE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block mb-1">{opt.subtitle}</span>
                      <span
                        className={`font-extrabold text-sm font-mono block ${
                          opt.isCustom ? 'text-fuchsia-700 font-black' : 'text-brand-700'
                        }`}
                      >
                        {formatBs(opt.price)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ⚙️ PANEL DE CONFIGURACIÓN DE PAQUETE PERSONALIZADO */}
          {selectedPlan === 'personalizado' && (
            <div className="bg-gradient-to-br from-fuchsia-50 via-purple-50 to-pink-50 p-4 sm:p-5 rounded-3xl border-2 border-fuchsia-300 shadow-md space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-fuchsia-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-fuchsia-950 uppercase tracking-tight">
                      Configuración de Paquete Personalizado
                    </h4>
                    <span className="text-[10px] text-fuchsia-700 font-medium">
                      Define el tiempo y costo acordado para esta habitación
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-fuchsia-200 text-fuchsia-900 border border-fuchsia-300">
                  Especial
                </span>
              </div>

              {/* Botones de Horas Rápidas */}
              <div>
                <span className="block text-[11px] font-bold text-fuchsia-900 mb-1.5">
                  Selección rápida de duración:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 8, 12].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSetQuickCustomHours(h)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                        parsedCustomHours === h && parsedCustomMinutes === 0
                          ? 'bg-fuchsia-600 text-white shadow-xs font-black'
                          : 'bg-white text-fuchsia-900 border border-fuchsia-200 hover:bg-fuchsia-100'
                      }`}
                    >
                      {h}h ({h * 60}m)
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Duración en Horas y Minutos */}
                <div>
                  <label className="block text-[11px] font-bold text-fuchsia-900 mb-1">
                    Duración (Horas y Minutos)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="72"
                        step="0.5"
                        value={customHours}
                        onChange={(e) => setCustomHours(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-fuchsia-200 bg-white text-fuchsia-950 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                        placeholder="Ej. 3"
                      />
                      <span className="text-[10px] text-fuchsia-600 font-bold absolute right-2.5 top-1/2 -translate-y-1/2">
                        hrs
                      </span>
                    </div>

                    <div className="relative w-24">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="5"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border border-fuchsia-200 bg-white text-fuchsia-950 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                        placeholder="0"
                      />
                      <span className="text-[10px] text-fuchsia-600 font-bold absolute right-2 top-1/2 -translate-y-1/2">
                        min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Precio Acordado */}
                <div>
                  <label className="block text-[11px] font-bold text-fuchsia-900 mb-1">
                    Precio Total Acordado (Bs)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-black font-mono rounded-xl border border-fuchsia-200 bg-white text-fuchsia-950 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                      placeholder="Ej. 290"
                    />
                    <span className="text-[10px] text-fuchsia-600 font-bold absolute right-2.5 top-1/2 -translate-y-1/2">
                      Bs
                    </span>
                  </div>
                </div>
              </div>

              {/* Nombre o Motivo del Paquete */}
              <div>
                <label className="block text-[11px] font-bold text-fuchsia-900 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-fuchsia-600" />
                  Nombre / Motivo del Paquete Especial
                </label>
                <input
                  type="text"
                  value={customPackageName}
                  onChange={(e) => setCustomPackageName(e.target.value)}
                  placeholder="Ej. Promoción 3h por 290 Bs, Cumpleaños, etc."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-fuchsia-200 bg-white text-fuchsia-950 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>

              {/* Resumen del paquete */}
              <div className="bg-white/80 p-2.5 rounded-xl border border-fuchsia-200 text-xs flex items-center justify-between">
                <span className="text-fuchsia-900 font-semibold">
                  Total estancia: <strong>{totalCustomDurationMinutes} minutos</strong> ({parsedCustomHours}h {parsedCustomMinutes > 0 ? `${parsedCustomMinutes}m` : ''})
                </span>
                <span className="text-fuchsia-950 font-black font-mono text-sm">
                  {formatBs(parsedCustomPrice)}
                </span>
              </div>
            </div>
          )}

          {/* PREPAID / POSTPAID TIMING SELECTOR */}
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
              2. Modalidad de Cobro de la Habitación
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Cobro por Adelantado */}
              <button
                type="button"
                onClick={() => setIsPrepaid(true)}
                className={`py-3 px-3 rounded-2xl border-2 font-bold text-xs flex flex-col items-center text-center gap-1 transition-all ${
                  isPrepaid
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1 font-extrabold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Pago por Adelantado</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold leading-tight">
                  Paga {formatBs(basePrice)} ahora al entrar
                </span>
              </button>

              {/* Pagar al Salir */}
              <button
                type="button"
                onClick={() => setIsPrepaid(false)}
                className={`py-3 px-3 rounded-2xl border-2 font-bold text-xs flex flex-col items-center text-center gap-1 transition-all ${
                  !isPrepaid
                    ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1 font-extrabold text-xs">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Pagar al Salir</span>
                </div>
                <span className="text-[10px] text-amber-700 font-semibold leading-tight">
                  Cancela todo al desocupar
                </span>
              </button>
            </div>
          </div>

          {/* Payment Method Selector (visible if Prepaid) */}
          {isPrepaid && (
            <div className="animate-fade-in space-y-2">
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                3. Método de Pago del Adelanto ({formatBs(basePrice)})
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Efectivo */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`py-2.5 px-2 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'efectivo'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm font-black'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Efectivo
                </button>

                {/* QR Vendis */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('qr_vendis')}
                  className={`py-2.5 px-2 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'qr_vendis' || paymentMethod === 'qr'
                      ? 'border-sky-600 bg-sky-50 text-sky-800 shadow-sm font-black'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-sky-600" />
                  QR Vendis
                </button>

                {/* QR Banco Unión */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('qr_union')}
                  className={`py-2.5 px-2 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'qr_union'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-sm font-black'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <Landmark className="w-4 h-4 text-indigo-600" />
                  QR B. Unión
                </button>

                {/* Mixto */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('mixto');
                    const half = Math.round(basePrice / 2);
                    setCashAmount(half.toString());
                    setQrAmount((basePrice - half).toString());
                  }}
                  className={`py-2.5 px-2 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'mixto'
                      ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-sm font-black'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <Layers className="w-4 h-4 text-purple-600" />
                  Mixto
                </button>
              </div>

              {/* If Mixed, show inputs & channel picker */}
              {paymentMethod === 'mixto' && (
                <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-900 block">
                      Desglose de Pago Mixto (Total: {formatBs(basePrice)})
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setMixedQrChannel('qr_vendis')}
                        className={`px-2 py-0.5 rounded-lg border transition-all ${
                          mixedQrChannel === 'qr_vendis'
                            ? 'bg-sky-600 text-white border-sky-700'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Vendis
                      </button>
                      <button
                        type="button"
                        onClick={() => setMixedQrChannel('qr_union')}
                        className={`px-2 py-0.5 rounded-lg border transition-all ${
                          mixedQrChannel === 'qr_union'
                            ? 'bg-indigo-600 text-white border-indigo-700'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        B. Unión
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Efectivo (Bs)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={basePrice}
                        value={cashAmount}
                        onChange={(e) => handleCashChange(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-purple-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        {mixedQrChannel === 'qr_union' ? 'QR Unión (Bs)' : 'QR Vendis (Bs)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={basePrice}
                        value={qrAmount}
                        onChange={(e) => handleQrChange(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-purple-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vehicle Plate (Optional) */}
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
              4. Placa del Vehículo (Opcional)
            </label>
            <div className="relative">
              <Car className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ej. 4022-ABC"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 uppercase font-mono font-bold"
              />
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
              5. Observaciones / Notas (Opcional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                rows={2}
                placeholder="Ej. Cliente solicitó toallas extra, pago con billete de 200..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] text-slate-400 block">
                {selectedPlan === 'personalizado'
                  ? `✨ ${customPackageName.trim() || 'Paquete Personalizado'} (${durationMinutes} min)`
                  : `${currentOption.title} (${durationMinutes} min)`}
              </span>
              <span className="text-xs font-extrabold text-emerald-400">
                Salida Estimada: {formattedExitTime}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl font-black font-mono text-white block">
                {formatBs(basePrice)}
              </span>
              <span className="text-[10px] font-bold text-slate-300">
                {isPrepaid ? '✓ Pagado' : '⏳ Paga al Salir'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-2/3 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-black text-xs rounded-xl shadow-md shadow-brand-600/20 hover:shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Confirmar e Ingresar Huésped
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

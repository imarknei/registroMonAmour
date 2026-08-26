import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Room, PlanType, PaymentMethod } from '../types';
import { formatBs, getRoomTypeBadge } from '../utils/formatUtils';
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
} from 'lucide-react';

interface RegisterModalProps {
  room: Room | null;
  onClose: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ room, onClose }) => {
  const { tariffs, registerStay } = useApp();

  if (!room) return null;

  const roomTariff = tariffs[room.type];
  const badge = getRoomTypeBadge(room.type);

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

  if (roomTariff?.price2h) {
    planOptions.push({
      key: '2h',
      title: '2 Horas',
      subtitle: 'Estadía Estándar (120 min)',
      durationMinutes: 120,
      price: roomTariff.price2h,
      icon: <Clock className="w-4 h-4 text-brand-600" />,
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

  // Add Promo 3h if configured (para habitaciones distintas de ventilador y suite)
  if (tariffs?.promo3hPrice && room.type !== 'ventilador' && room.type !== 'suite') {
    planOptions.push({
      key: 'promo3h',
      title: 'Promo 3 Horas',
      subtitle: 'Tarifa Promo Especial (180 min)',
      durationMinutes: 180,
      price: tariffs.promo3hPrice,
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      isPromo: true,
    });
  }

  // State
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(planOptions[0]?.key || '1h');
  const [isPrepaid, setIsPrepaid] = useState<boolean>(true); // Por defecto se cobra por adelantado
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [qrAmount, setQrAmount] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [notes, setNotes] = useState('');

  const currentOption = planOptions.find((p) => p.key === selectedPlan) || planOptions[0];
  const durationMinutes = currentOption ? currentOption.durationMinutes : 60;
  const basePrice = currentOption ? currentOption.price : 45;

  // Sync mixed payment amounts when plan or base price changes
  useEffect(() => {
    if (paymentMethod === 'mixto') {
      const half = Math.round(basePrice / 2);
      setCashAmount(half.toString());
      setQrAmount((basePrice - half).toString());
    }
  }, [selectedPlan, basePrice, paymentMethod]);

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

  // Expected exit time calculation
  const exitDate = new Date(Date.now() + durationMinutes * 60 * 1000);
  const formattedExitTime = exitDate.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalCash: number | undefined;
    let finalQr: number | undefined;

    if (isPrepaid) {
      if (paymentMethod === 'efectivo') {
        finalCash = basePrice;
        finalQr = 0;
      } else if (paymentMethod === 'qr') {
        finalCash = 0;
        finalQr = basePrice;
      } else if (paymentMethod === 'mixto') {
        finalCash = parseFloat(cashAmount) || 0;
        finalQr = parseFloat(qrAmount) || 0;
      }
    } else {
      finalCash = 0;
      finalQr = 0;
    }

    registerStay({
      roomId: room.id,
      chosenPlan: selectedPlan,
      durationMinutes,
      basePrice,
      paymentMethod,
      isPrepaid,
      prepaidAmount: isPrepaid ? basePrice : 0,
      prepaidCash: isPrepaid ? finalCash : 0,
      prepaidQr: isPrepaid ? finalQr : 0,
      cashPaid: finalCash,
      qrPaid: finalQr,
      vehiclePlate,
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-in my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 to-rose-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold">
              <BedDouble className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight">{room.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {room.tag}
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium">Registro de nueva estadía</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
                        ? 'border-brand-600 bg-rose-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1.5 rounded-lg bg-slate-100">{opt.icon}</div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
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
                        {opt.isPromo && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                            PROMO
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block mb-1">{opt.subtitle}</span>
                      <span className="font-extrabold text-sm text-brand-700 font-mono block">
                        {formatBs(opt.price)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

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
              <div className="grid grid-cols-3 gap-2">
                {/* Efectivo */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`py-2.5 px-2 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'efectivo'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Efectivo
                </button>

                {/* QR */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('qr')}
                  className={`py-2.5 px-2 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'qr'
                      ? 'border-sky-600 bg-sky-50 text-sky-800 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-sky-600" />
                  QR (Vendis)
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
                      ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <Layers className="w-4 h-4 text-purple-600" />
                  Mixto
                </button>
              </div>

              {/* If Mixed, show inputs */}
              {paymentMethod === 'mixto' && (
                <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2 animate-fade-in">
                  <span className="text-[11px] font-bold text-purple-900 block">
                    Desglose de Pago Mixto (Total: {formatBs(basePrice)})
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Efectivo (Bs)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={basePrice}
                        value={cashAmount}
                        onChange={(e) => handleCashChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 font-mono font-bold text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        QR (Bs)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={basePrice}
                        value={qrAmount}
                        onChange={(e) => handleQrChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 font-mono font-bold text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optional Details (Vehicle Plate & Notes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-slate-400" />
                Placa Vehículo (Opcional)
              </label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="Ej. 4521-ABC"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Notas / Observación
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Toalla extra, etc."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Summary Banner */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Salida Estimada:</span>
              <strong className="text-slate-800 font-mono text-sm font-black">{formattedExitTime}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                {isPrepaid ? 'Total a Cobrar Ahora:' : 'Total a Cobrar al Salir:'}
              </span>
              <strong className="text-brand-700 font-mono text-lg font-black">{formatBs(basePrice)}</strong>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-2xl border border-slate-300 font-bold text-slate-600 text-xs hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="w-2/3 py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              {isPrepaid ? `Registrar y Cobrar (${formatBs(basePrice)})` : 'Registrar Habitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

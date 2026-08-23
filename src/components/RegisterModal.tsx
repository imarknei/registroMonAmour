import React, { useState, useEffect } from 'react';
import { Room, PlanType, PaymentMethod } from '../types';
import { useApp } from '../context/AppContext';
import { formatBs, getRoomTypeBadge } from '../utils/formatUtils';
import {
  X,
  Clock,
  Moon,
  Sparkles,
  DollarSign,
  QrCode,
  Layers,
  Car,
  FileText,
  BedDouble,
  Check,
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
  };

  const planOptions: PlanOption[] = [];

  // 1 Hour
  if (roomTariff?.price1h) {
    planOptions.push({
      key: '1h',
      title: '1 Hora',
      subtitle: 'Estadía corta',
      durationMinutes: 60,
      price: roomTariff.price1h,
      icon: <Clock className="w-4 h-4 text-brand-600" />,
    });
  }

  // 2 Hours
  if (roomTariff?.price2h) {
    planOptions.push({
      key: '2h',
      title: '2 Horas',
      subtitle: 'Estadía estándar',
      durationMinutes: 120,
      price: roomTariff.price2h,
      icon: <Clock className="w-4 h-4 text-brand-600" />,
    });
  }

  // 3 Hours (for Jacuzzi or if configured)
  if (roomTariff?.price3h) {
    planOptions.push({
      key: '3h',
      title: '3 Horas',
      subtitle: 'Especial Jacuzzi',
      durationMinutes: 180,
      price: roomTariff.price3h,
      icon: <Clock className="w-4 h-4 text-purple-600" />,
    });
  }

  // Noche / 12 Horas
  if (roomTariff?.priceNight) {
    planOptions.push({
      key: 'noche12h',
      title: 'Noche (12h)',
      subtitle: 'Tarifa nocturna',
      durationMinutes: 720,
      price: roomTariff.priceNight,
      icon: <Moon className="w-4 h-4 text-indigo-600" />,
    });
  }

  // Promoción 3 horas por 190 Bs (Applicable to Suite or general)
  if (tariffs.promo3hPrice) {
    planOptions.push({
      key: 'promo190',
      title: 'Promoción 3 Horas',
      subtitle: 'Tarifa promo especial',
      durationMinutes: 180,
      price: tariffs.promo3hPrice,
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      isPromo: true,
    });
  }

  // State
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(planOptions[0]?.key || '1h');
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

    registerStay({
      roomId: room.id,
      chosenPlan: selectedPlan,
      durationMinutes,
      basePrice,
      paymentMethod,
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Plan Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2.5">
              1. Seleccionar Tarifa / Tiempo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {planOptions.map((opt) => {
                const isSelected = selectedPlan === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedPlan(opt.key)}
                    className={`relative p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-brand-600 bg-rose-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {opt.isPromo && (
                      <span className="absolute -top-2.5 right-2 text-[9px] font-black uppercase bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                        Promo
                      </span>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                        {opt.icon}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{opt.title}</span>
                      <span className="text-[10px] text-slate-400 block mb-1">{opt.subtitle}</span>
                      <span className="font-extrabold text-sm text-brand-700 font-mono block">
                        {formatBs(opt.price)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method Selector with Mixed Option */}
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2.5">
              2. Método de Pago Inicial
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Efectivo */}
              <button
                type="button"
                onClick={() => setPaymentMethod('efectivo')}
                className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
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
                className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
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
                className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'mixto'
                    ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <Layers className="w-4 h-4 text-purple-600" />
                Pago Mixto
              </button>
            </div>

            {/* If Mixed, show inputs */}
            {paymentMethod === 'mixto' && (
              <div className="mt-3 p-3 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2 animate-fade-in">
                <span className="text-[11px] font-bold text-purple-900 block">
                  Desglose de Pago Mixto (Total: {formatBs(basePrice)})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Parte en Efectivo (Bs)
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
                      Parte en QR (Bs)
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

          {/* Stay Live Summary Callout */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                Salida Estimada ({durationMinutes} min)
              </span>
              <span className="text-lg font-extrabold font-mono text-emerald-400">
                {formattedExitTime}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                Total Tarifa Base
              </span>
              <span className="text-2xl font-black font-mono text-rose-400">
                {formatBs(basePrice)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
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
              className="w-2/3 py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Iniciar Registro ({formatBs(basePrice)})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

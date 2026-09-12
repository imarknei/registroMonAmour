import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatBs } from '../utils/formatUtils';
import { IncomeCategory } from '../types';
import {
  X,
  DollarSign,
  QrCode,
  PlusCircle,
  Landmark,
  Coins,
  Building2,
  ShoppingBag,
  ArrowDownLeft,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_INCOME_SUGGESTIONS = [
  { label: 'Pago de Alquiler (Local / Garaje / Espacio)', category: 'alquiler' as IncomeCategory },
  { label: 'Cambio / Vuelto de Compras de Insumos', category: 'cambio_compras' as IncomeCategory },
  { label: 'Dinero en Caja para Cambios (Sencillo dejado en caja)', category: 'dinero_para_cambio' as IncomeCategory },
  { label: 'Pago de Alquiler de Antena / Techo', category: 'alquiler' as IncomeCategory },
  { label: 'Devolución / Reembolso de Dinero', category: 'ingreso_extra' as IncomeCategory },
  { label: 'Ingreso Extraordinario / Varios', category: 'otros' as IncomeCategory },
];

export const IncomeModal: React.FC<IncomeModalProps> = ({ isOpen, onClose }) => {
  const { currentShift, currentUser, addIncomeToShift } = useApp();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IncomeCategory>('alquiler');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'qr_vendis' | 'qr_union'>('efectivo');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!description.trim()) {
      alert('Por favor ingrese el concepto o detalle del ingreso.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      alert('Por favor ingrese un monto válido mayor a 0.');
      return;
    }

    addIncomeToShift({
      description: description.trim(),
      category,
      amount: numAmount,
      paymentMethod,
      receiptNumber: receiptNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
    setDescription('');
    setAmount('');
    setReceiptNumber('');
    setNotes('');
  };

  const handleSelectSuggestion = (s: typeof QUICK_INCOME_SUGGESTIONS[0]) => {
    setDescription(s.label);
    setCategory(s.category);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scale-in my-auto">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold shadow-inner shrink-0">
              <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight flex items-center gap-2">
                <span>Registrar Ingreso a Caja</span>
                <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                  En Vivo
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-100 font-medium">
                {currentUser.name} • {currentUser.shiftName || 'Turno Activo'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Active Shift Info */}
          {currentShift ? (
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-700">Turno en curso:</span>
                <span className="font-extrabold text-emerald-900">{currentShift.receptionistName}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 font-mono">
                Gaveta actual: {formatBs((currentShift.initialCashFloat || 100) + currentShift.expectedCash + (currentShift.totalIncomesCash || 0) - (currentShift.operationalExpensesCash || 0))}
              </span>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800 font-bold flex items-center gap-2">
              <X className="w-4 h-4 text-rose-600" />
              <span>No hay un turno activo abierto. Inicie sesión en recepción para registrar ingresos.</span>
            </div>
          )}

          {/* Quick Suggestions Chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Sugerencias Rápidas
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {QUICK_INCOME_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-950 text-slate-700 text-xs font-semibold transition-all border border-slate-200 active:scale-95"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Concept / Detail */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
              Concepto / Detalle del Ingreso <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Pago de alquiler de garaje / Cambio de compra de sodas / Dinero para sencillo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            />
          </div>

          {/* Amount and Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                Monto del Ingreso (Bs) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                  Bs
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-emerald-500 font-black text-lg text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                Canal de Ingreso
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`py-2 px-1.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'efectivo'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs font-black'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Efectivo
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('qr_vendis')}
                  className={`py-2 px-1.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'qr_vendis'
                      ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-xs font-black'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-purple-600" />
                  QR Vendis
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('qr_union')}
                  className={`py-2 px-1.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'qr_union'
                      ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-xs font-black'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5 text-blue-600" />
                  B. Unión
                </button>
              </div>
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
              Tipo / Categoría de Ingreso
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IncomeCategory)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="alquiler">🏢 Pago de Alquiler (Local comercial, garaje, espacio, antena)</option>
              <option value="cambio_compras">🛒 Cambio / Vuelto de Compras de Insumos</option>
              <option value="dinero_para_cambio">🪙 Dinero para Cambio en Caja (Fondo para dar cambio / Sencillo)</option>
              <option value="ingreso_extra">💵 Ingreso Extraordinario / Devolución</option>
              <option value="otros">📌 Otros Ingresos</option>
            </select>
          </div>

          {/* Receipt / Invoice # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                N° de Recibo / Comprobante (Opcional)
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Ej. Recibo #1024"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Nota Adicional / Quien Entregó (Opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Dejado por Don Marco / Vuelto farmacia"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
              />
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-3 rounded-2xl text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-tight">
              {paymentMethod === 'efectivo'
                ? `Al ingresar en efectivo, se sumará automáticamente ${amount ? formatBs(parseFloat(amount) || 0) : 'este monto'} al total físico esperado en gaveta para el cierre de turno.`
                : 'Al registrar por QR, se sumará a los comprobantes digitales esperados en el arqueo del turno.'}
            </span>
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
              className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Confirmar y Registrar Ingreso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

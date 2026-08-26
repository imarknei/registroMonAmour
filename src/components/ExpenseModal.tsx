import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatBs } from '../utils/formatUtils';
import { ExpenseCategory } from '../types';
import {
  X,
  DollarSign,
  QrCode,
  Receipt,
  PlusCircle,
  Sparkles,
  ShoppingBag,
  Wrench,
  Zap,
  Sparkle,
  User,
  HelpCircle,
  Coins,
  Landmark,
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_SUGGESTIONS = [
  { label: 'Coca-Cola (Sodas/Bebidas)', category: 'proveedores' as ExpenseCategory },
  { label: 'Cerveza / Licores', category: 'proveedores' as ExpenseCategory },
  { label: 'Preservativos / Minibar', category: 'proveedores' as ExpenseCategory },
  { label: 'Albañil / Reparación', category: 'mantenimiento' as ExpenseCategory },
  { label: 'Plomería / Baños', category: 'mantenimiento' as ExpenseCategory },
  { label: 'Insumos de Limpieza (Detergente/Papel)', category: 'limpieza_insumos' as ExpenseCategory },
  { label: 'Servicios Básicos (Luz/Agua/Gas)', category: 'servicios' as ExpenseCategory },
  { label: 'Adelanto de Personal', category: 'personal_adelanto' as ExpenseCategory },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose }) => {
  const { currentShift, currentUser, addExpenseToShift } = useApp();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('proveedores');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'qr_vendis' | 'qr_union'>('efectivo');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!description.trim()) {
      alert('Por favor ingrese el concepto o detalle del pago.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      alert('Por favor ingrese un monto válido.');
      return;
    }

    addExpenseToShift({
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

  const handleSelectSuggestion = (s: typeof QUICK_SUGGESTIONS[0]) => {
    setDescription(s.label);
    setCategory(s.category);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-in my-6">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold shadow-inner">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Registrar Pago / Salida de Caja
              </h2>
              <p className="text-xs text-rose-100 font-medium">
                {currentUser.name} • {currentUser.shiftName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Quick suggestions */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Sugerencias Rápidas de Pago:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-brand-700 hover:border-rose-200 border border-slate-200/80 text-[11px] font-semibold text-slate-600 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
              ¿Qué se está pagando? (Concepto / Detalle) *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Coca-Cola (10 mini sodas), Albañil arreglo hab 3, etc."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
            />
          </div>

          {/* Amount & Payment Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                Monto Pagado (Bs) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border-2 border-rose-400 font-mono text-lg font-black text-slate-900 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                  Bs
                </span>
              </div>
            </div>

            {/* Payment Source */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                Pagado Desde *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`py-2 px-1.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'efectivo'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm font-black'
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
                      ? 'border-sky-600 bg-sky-50 text-sky-800 shadow-sm font-black'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-sky-600" />
                  QR Vendis
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('qr_union')}
                  className={`py-2 px-1.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'qr_union'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-sm font-black'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                  B. Unión
                </button>
              </div>
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
              Categoría del Gasto
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="proveedores">📦 Proveedores (Coca-Cola, Bebidas, Insumos)</option>
              <option value="mantenimiento">🔧 Mantenimiento / Reparaciones (Albañil, Plomería)</option>
              <option value="servicios">⚡ Servicios Básicos (Luz, Agua, Internet, Gas)</option>
              <option value="limpieza_insumos">🧼 Limpieza & Aseo</option>
              <option value="personal_adelanto">👤 Personal / Jornales / Adelantos</option>
              <option value="otros">📌 Otros Pagos</option>
            </select>
          </div>

          {/* Receipt / Invoice # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                N° de Recibo / Factura (Opcional)
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Ej. Recibo #4589"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Nota Adicional (Opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Entregado a Don Juan"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
              />
            </div>
          </div>

          {/* Cash deduction explanation note */}
          <div className="bg-amber-50 border border-amber-200 text-amber-950 p-3 rounded-2xl text-xs flex items-start gap-2.5">
            <Coins className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-tight">
              {paymentMethod === 'efectivo'
                ? `Al pagar en efectivo de gaveta, se restará automáticamente ${amount ? formatBs(parseFloat(amount) || 0) : 'este monto'} del dinero físico esperado en el arqueo al cerrar tu turno.`
                : 'Al pagar por QR/Banco, este gasto se registrará como egreso por transferencia bancaria.'}
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
              className="w-2/3 py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Confirmar y Registrar Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

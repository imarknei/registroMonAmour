import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatBs, getPaymentMethodLabel } from '../utils/formatUtils';
import { formatDateTime } from '../utils/timeUtils';
import { ExpenseCategory, StaffMember } from '../types';
import {
  X,
  DollarSign,
  QrCode,
  Receipt,
  PlusCircle,
  Coins,
  Landmark,
  CheckCircle2,
  Clock,
  UserCheck,
  Users,
  CheckSquare,
  Square,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Coffee,
  Check,
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'register' | 'discounts';
}

const QUICK_SUGGESTIONS = [
  { label: 'Retiro de Efectivo a Marco (Dueño)', category: 'retiro_administracion' as ExpenseCategory },
  { label: 'Entrega de Turno en Sobre / Administración', category: 'retiro_administracion' as ExpenseCategory },
  { label: 'Coca-Cola (Sodas/Bebidas)', category: 'proveedores' as ExpenseCategory },
  { label: 'Cerveza / Licores', category: 'proveedores' as ExpenseCategory },
  { label: 'Preservativos / Minibar', category: 'proveedores' as ExpenseCategory },
  { label: 'Albañil / Reparación', category: 'mantenimiento' as ExpenseCategory },
  { label: 'Plomería / Baños', category: 'mantenimiento' as ExpenseCategory },
  { label: 'Insumos de Limpieza (Detergente/Papel)', category: 'limpieza_insumos' as ExpenseCategory },
  { label: 'Servicios Básicos (Luz/Agua/Gas)', category: 'servicios' as ExpenseCategory },
  { label: 'Adelanto de Personal', category: 'personal_adelanto' as ExpenseCategory },
];

const QUICK_DISCOUNT_CONCEPTS = [
  'Consumo de Bebidas / Minibar',
  'Adelanto de Sueldo / Vale',
  'Rotura / Daño de Sábanas o Toalla',
  'Faltante o Diferencia en Turno',
  'Descuento por Llegada Tarde / Falta',
  'Insumos / Compra Particular',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'register',
}) => {
  const {
    currentShift,
    currentUser,
    addExpenseToShift,
    staffConsumptions,
    shiftsHistory,
    staffMembers,
    toggleStaffConsumptionPaid,
    updateShiftInHistory,
    removeStaffConsumption,
    addDirectStaffDiscount,
    showToast,
  } = useApp();

  // Control de Acceso: Solamente el Administrador y el Recepcionista Turno Día pueden ver los descuentos de personal
  const canViewDiscounts =
    currentUser.role === 'admin' ||
    currentUser.role === 'recepcionista_dia' ||
    currentUser.id === 'user-admin' ||
    currentUser.id === 'user-recep-dia';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'register' | 'discounts'>(() => {
    return canViewDiscounts && defaultTab === 'discounts' ? 'discounts' : 'register';
  });

  // State for expense form
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('proveedores');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'qr_vendis' | 'qr_union'>('efectivo');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  // State for personal discounts view
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDiscountOpen, setIsAddDiscountOpen] = useState(false);

  // Form state for creating a new direct staff discount
  const [newDiscStaffId, setNewDiscStaffId] = useState<string>(staffMembers[0]?.id || 'user-recep-dia');
  const [newDiscConcept, setNewDiscConcept] = useState<string>('');
  const [newDiscAmount, setNewDiscAmount] = useState<string>('');
  const [newDiscIsPaid, setNewDiscIsPaid] = useState<boolean>(false);
  const [newDiscNotes, setNewDiscNotes] = useState<string>('');

  if (!isOpen) return null;

  // Combine discounts: Staff Consumptions + Shifts with shortage
  const allDiscountsList = useMemo(() => {
    // 1. Staff Consumptions
    const cons = (staffConsumptions || []).map((c) => {
      const isPaid = !!(c.isPaid || c.isSettled);
      return {
        id: c.id,
        type: 'consumption' as const,
        staffId: c.staffId,
        staffName: c.staffName,
        date: c.date,
        amount: c.totalAmount,
        title: c.items.map((it) => `${it.quantity}x ${it.productName}`).join(', '),
        notes: c.notes,
        recordedBy: c.recordedBy,
        isPaid,
        settledAt: c.settledAt,
      };
    });

    // 2. Faltantes de turno registrados
    const shortages = (shiftsHistory || [])
      .filter((s) => (s.discountAmount || 0) > 0)
      .map((s) => {
        const isPaid = !!s.isSettled;
        return {
          id: s.id,
          type: 'shift_shortage' as const,
          staffId: s.receptionistId || '',
          staffName: s.responsiblePersonName || s.receptionistName,
          date: s.endTime || s.startTime,
          amount: s.discountAmount || 0,
          title: `Faltante de caja en turno ${s.shiftType === 'dia' ? 'Día' : 'Noche'} (${s.receptionistName})`,
          notes: s.notes,
          recordedBy: 'Cierre de Turno',
          isPaid,
          settledAt: undefined,
        };
      });

    const combined = [...cons, ...shortages];
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combined;
  }, [staffConsumptions, shiftsHistory]);

  // Pending count for badge
  const pendingDiscountsCount = allDiscountsList.filter((d) => !d.isPaid).length;
  const totalPendingAmount = allDiscountsList
    .filter((d) => !d.isPaid)
    .reduce((sum, d) => sum + d.amount, 0);
  const totalPaidAmount = allDiscountsList
    .filter((d) => d.isPaid)
    .reduce((sum, d) => sum + d.amount, 0);

  // Filtered list
  const filteredDiscounts = allDiscountsList.filter((d) => {
    // Staff filter
    if (selectedStaffFilter !== 'all') {
      const staffMember = staffMembers.find((m) => m.id === selectedStaffFilter);
      const targetName = staffMember ? staffMember.name.toLowerCase() : selectedStaffFilter.toLowerCase();
      const matchesId = d.staffId === selectedStaffFilter;
      const matchesName = d.staffName?.toLowerCase().includes(targetName);
      if (!matchesId && !matchesName) return false;
    }

    // Status filter
    if (statusFilter === 'pending' && d.isPaid) return false;
    if (statusFilter === 'paid' && !d.isPaid) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchStaff = d.staffName?.toLowerCase().includes(q);
      const matchTitle = d.title?.toLowerCase().includes(q);
      const matchNotes = d.notes?.toLowerCase().includes(q);
      if (!matchStaff && !matchTitle && !matchNotes) return false;
    }

    return true;
  });

  // Toggle paid status for a discount
  const handleTogglePaid = (discount: typeof allDiscountsList[0]) => {
    const nextStatus = !discount.isPaid;
    if (discount.type === 'consumption') {
      toggleStaffConsumptionPaid(discount.id, nextStatus);
    } else if (discount.type === 'shift_shortage') {
      updateShiftInHistory(discount.id, { isSettled: nextStatus });
      showToast({
        title: nextStatus ? '✓ Faltante Marcado como Pagado' : '⏳ Faltante Marcado como Pendiente',
        message: nextStatus
          ? `El faltante de ${formatBs(discount.amount)} de ${discount.staffName} fue marcado como PAGADO.`
          : `El faltante de ${formatBs(discount.amount)} de ${discount.staffName} quedó como PENDIENTE.`,
        type: nextStatus ? 'success' : 'info',
      });
    }
  };

  // Submit new expense
  const handleExpenseSubmit = (e: React.FormEvent) => {
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

  // Submit direct new staff discount
  const handleAddDirectDiscountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(newDiscAmount);
    if (!newDiscConcept.trim()) {
      alert('Por favor ingrese el motivo o concepto del descuento.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      alert('Por favor ingrese un monto válido en Bs.');
      return;
    }

    const selectedStaff = staffMembers.find((m) => m.id === newDiscStaffId) || {
      id: newDiscStaffId,
      name: newDiscStaffId,
    };

    addDirectStaffDiscount({
      staffId: selectedStaff.id,
      staffName: selectedStaff.name,
      concept: newDiscConcept.trim(),
      amount: numAmount,
      isPaid: newDiscIsPaid,
      notes: newDiscNotes.trim() || undefined,
    });

    setNewDiscConcept('');
    setNewDiscAmount('');
    setNewDiscNotes('');
    setNewDiscIsPaid(false);
    setIsAddDiscountOpen(false);
  };

  const handleSelectSuggestion = (s: typeof QUICK_SUGGESTIONS[0]) => {
    setDescription(s.label);
    setCategory(s.category);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className={`bg-white rounded-3xl shadow-2xl border border-slate-200 w-full ${canViewDiscounts ? 'max-w-2xl sm:max-w-3xl' : 'max-w-lg'} max-h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-scale-in my-auto`}>
        {/* Top Header */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 px-4 sm:px-6 py-3.5 text-white flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold shadow-inner shrink-0">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                  Módulo de Pagos y Salidas
                </h2>
                {canViewDiscounts && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white border border-white/30">
                    <ShieldCheck className="w-3 h-3" />
                    Vista Autorizada
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-rose-100 font-medium">
                {currentUser.name} • {currentUser.shiftName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector (Solo si tiene permisos: Administrador o Recepcionista Turno Día) */}
        {canViewDiscounts && (
          <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 pt-2.5 pb-0 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm border-t-2 transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-rose-700 border-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Registrar Pago / Salida</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('discounts')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm border-t-2 transition-all relative ${
                activeTab === 'discounts'
                  ? 'bg-white text-brand-700 border-brand-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Descuentos de Personal</span>
              {pendingDiscountsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {pendingDiscountsCount} pendientes
                </span>
              )}
            </button>
          </div>
        )}

        {/* TAB 1: REGISTRAR PAGO / SALIDA DE CAJA */}
        {activeTab === 'register' && (
          <form onSubmit={handleExpenseSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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
                <option value="retiro_administracion">💰 Retiro de Efectivo (Marco / Dueño / Administración)</option>
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
        )}

        {/* TAB 2: DESCUENTOS DE PERSONAL (CHECKLIST CON FECHA Y MONTO) */}
        {activeTab === 'discounts' && canViewDiscounts && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 flex flex-col">
            {/* Top KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
              {/* Pendiente */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    Total Pendiente
                  </span>
                  <span className="text-lg font-black font-mono text-amber-950">
                    {formatBs(totalPendingAmount)}
                  </span>
                  <span className="text-[10px] text-amber-700 block font-semibold">
                    {pendingDiscountsCount} items sin cobrar
                  </span>
                </div>
              </div>

              {/* Ya Pagados */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Total Ya Pagado
                  </span>
                  <span className="text-lg font-black font-mono text-emerald-950">
                    {formatBs(totalPaidAmount)}
                  </span>
                  <span className="text-[10px] text-emerald-700 block font-semibold">
                    {allDiscountsList.filter((d) => d.isPaid).length} items saldados
                  </span>
                </div>
              </div>

              {/* Acceso Rápido a Registrar Descuento */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Gestión Rápida
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 block">
                    ¿Nuevo Descuento?
                  </span>
                  <span className="text-[10px] text-slate-500">Adelantos, minibar o multas</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDiscountOpen(!isAddDiscountOpen)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm ${
                    isAddDiscountOpen
                      ? 'bg-rose-600 text-white'
                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                  }`}
                >
                  {isAddDiscountOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{isAddDiscountOpen ? 'Cerrar' : '+ Agregar'}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Form: Add Direct Staff Discount */}
            {isAddDiscountOpen && (
              <form
                onSubmit={handleAddDirectDiscountSubmit}
                className="bg-brand-50/70 border-2 border-brand-200 rounded-2xl p-4 space-y-3 animate-fade-in shrink-0"
              >
                <div className="flex items-center justify-between border-b border-brand-200/60 pb-2">
                  <span className="text-xs font-black text-brand-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    Registrar Nuevo Descuento / Adelanto para Empleado
                  </span>
                  <span className="text-[10px] text-brand-700 font-semibold">
                    Se sumará a la lista con fecha y monto
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Staff Select */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Personal a Descontar *
                    </label>
                    <select
                      value={newDiscStaffId}
                      onChange={(e) => setNewDiscStaffId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-white text-slate-800"
                    >
                      {staffMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Concept */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Concepto o Motivo del Descuento *
                    </label>
                    <input
                      type="text"
                      required
                      value={newDiscConcept}
                      onChange={(e) => setNewDiscConcept(e.target.value)}
                      placeholder="Ej. Adelanto de sueldo, Rotura sábana, Consumo minibar..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Quick suggestions pills for concept */}
                <div className="flex flex-wrap gap-1">
                  {QUICK_DISCOUNT_CONCEPTS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewDiscConcept(q)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-brand-200 text-brand-800 hover:bg-brand-100 transition-colors font-medium"
                    >
                      + {q}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* Amount */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Monto a Descontar (Bs) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        required
                        value={newDiscAmount}
                        onChange={(e) => setNewDiscAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border-2 border-brand-400 font-mono font-black text-sm bg-white"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                        Bs
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nota adicional (opcional)
                    </label>
                    <input
                      type="text"
                      value={newDiscNotes}
                      onChange={(e) => setNewDiscNotes(e.target.value)}
                      placeholder="Ej. Entregado en efectivo"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  {/* Checklist option: ya pagado */}
                  <div className="pt-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200">
                      <input
                        type="checkbox"
                        checked={newDiscIsPaid}
                        onChange={(e) => setNewDiscIsPaid(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        ¿Ya fue pagado / saldado?
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddDiscountOpen(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs shadow-sm flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Guardar Descuento
                  </button>
                </div>
              </form>
            )}

            {/* Filter Bar: Staff & Status */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 border border-slate-200/80 p-2.5 rounded-2xl shrink-0">
              {/* Staff filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Personal:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStaffFilter('all')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedStaffFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Todos ({allDiscountsList.length})
                </button>
                {staffMembers.map((m) => {
                  const staffItems = allDiscountsList.filter(
                    (d) =>
                      d.staffId === m.id ||
                      d.staffName?.toLowerCase().includes(m.name.toLowerCase())
                  );
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedStaffFilter(m.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        selectedStaffFilter === m.id
                          ? 'bg-brand-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {m.name.split(' ')[0]} ({staffItems.length})
                    </button>
                  );
                })}
              </div>

              {/* Status filter: All / Pending / Paid */}
              <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                    statusFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Pendientes ({pendingDiscountsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                    statusFilter === 'paid'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Pagados ({allDiscountsList.filter((d) => d.isPaid).length})
                </button>
              </div>
            </div>

            {/* Checklist items list */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
              {filteredDiscounts.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-black text-slate-700">No se encontraron descuentos</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    No hay descuentos registrados para el filtro seleccionado. Puedes usar el botón &ldquo;+ Agregar&rdquo; para registrar un descuento.
                  </p>
                </div>
              ) : (
                filteredDiscounts.map((discount) => {
                  return (
                    <div
                      key={discount.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        discount.isPaid
                          ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                          : 'bg-white border-amber-200 shadow-2xs hover:border-amber-300'
                      }`}
                    >
                      {/* Left: Interactive Checklist Toggle + Detalle */}
                      <div className="flex items-start gap-3 w-full sm:w-auto flex-1">
                        {/* Checkbox button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(discount)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                            discount.isPaid
                              ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 hover:scale-105'
                              : 'bg-white border-2 border-amber-400 text-transparent hover:border-amber-500 hover:bg-amber-50'
                          }`}
                          title={discount.isPaid ? 'Haga clic para desmarcar como pendiente' : 'Haga clic para marcar como ya pagado'}
                        >
                          <Check className={`w-4 h-4 sm:w-5 sm:h-5 stroke-[3] ${discount.isPaid ? 'text-white' : 'text-slate-300 opacity-40 hover:opacity-100'}`} />
                        </button>

                        {/* Discount Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">
                              {discount.staffName}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                discount.type === 'consumption'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {discount.type === 'consumption' ? 'Consumo Minibar' : 'Faltante Turno'}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                discount.isPaid
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-900 border border-amber-200 animate-pulse-subtle'
                              }`}
                            >
                              {discount.isPaid ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  ✓ YA PAGADO
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  ⏳ PENDIENTE
                                </>
                              )}
                            </span>
                          </div>

                          {/* Description items */}
                          <p className="text-xs font-semibold text-slate-700 mt-1 leading-snug">
                            {discount.title}
                          </p>

                          {/* Notes and Meta */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatDateTime(discount.date)}
                            </span>
                            {discount.recordedBy && (
                              <span>Registrado por: <strong>{discount.recordedBy}</strong></span>
                            )}
                            {discount.notes && (
                              <span className="text-slate-500 italic">
                                Nota: &ldquo;{discount.notes}&rdquo;
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Monto y Acciones */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none">
                            Monto a Descontar
                          </span>
                          <span
                            className={`text-base sm:text-lg font-black font-mono tracking-tight ${
                              discount.isPaid ? 'text-emerald-700' : 'text-brand-700'
                            }`}
                          >
                            {formatBs(discount.amount)}
                          </span>
                        </div>

                        {/* Quick Checklist Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(discount)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 active:scale-95 shadow-2xs ${
                            discount.isPaid
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{discount.isPaid ? 'Desmarcar' : 'Marcar Pagado'}</span>
                        </button>

                        {/* Delete Consumption option (if not locked by weekly settlement) */}
                        {discount.type === 'consumption' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Desea anular este consumo de ${discount.staffName} por ${formatBs(discount.amount)} y reponer el inventario?`)) {
                                removeStaffConsumption(discount.id, true);
                              }
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Anular consumo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Footer Info */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Información confidencial: visible solo para <strong>Administración</strong> y <strong>Recepcionista Turno Día</strong>.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory, StaffMember } from '../types';
import { formatBs, getCategoryLabel, getStaffDiscountedPrice } from '../utils/formatUtils';
import {
  X,
  Coffee,
  Plus,
  Trash2,
  Search,
  UserCheck,
  Package,
  ShoppingBag,
  AlertCircle,
  Check,
  PlusCircle,
  MinusCircle,
  FileText,
  Calendar,
  DollarSign,
  QrCode,
  Wallet,
  Sparkles,
  Tag,
} from 'lucide-react';

interface StaffConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  discountPerUnit: number;
}

export const StaffConsumptionModal: React.FC<StaffConsumptionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, staffMembers, addStaffConsumption, currentUser } = useApp();

  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    currentUser.role !== 'admin' ? currentUser.id : staffMembers[0]?.id || 'user-recep-dia'
  );
  const [customStaffName, setCustomStaffName] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'descuento_semanal' | 'pagado_ahora'>('descuento_semanal');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'qr_vendis' | 'qr_union'>('efectivo');
  const [searchProduct, setSearchProduct] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const categories: { key: ProductCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'bebidas_sin_alcohol', label: 'Sodas & Aguas' },
    { key: 'bebidas_alcohol', label: 'Cervezas' },
    { key: 'snacks', label: 'Snacks & Galletas' },
    { key: 'higiene_otros', label: 'Otros' },
  ];

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchProduct.toLowerCase());
    return matchCat && matchSearch;
  });

  const selectedStaffMember = staffMembers.find((m) => m.id === selectedStaffId);
  const effectiveStaffName =
    selectedStaffId === 'other'
      ? customStaffName.trim() || 'Personal Sin Asignar'
      : selectedStaffMember?.name || currentUser.name;

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    const { originalPrice, staffPrice, discount } = getStaffDiscountedPrice(product);

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: staffPrice,
          originalPrice,
          discountPerUnit: discount,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalCartAmount = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const totalSavings = cart.reduce(
    (sum, item) => sum + item.discountPerUnit * item.quantity,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Por favor añade al menos un producto a la lista de consumo.');
      return;
    }
    if (selectedStaffId === 'other' && !customStaffName.trim()) {
      alert('Por favor escribe el nombre del empleado que está consumiendo.');
      return;
    }

    const items = cart.map((c) => ({
      productId: c.product.id,
      productName: c.product.name,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      subtotal: c.unitPrice * c.quantity,
    }));

    addStaffConsumption({
      staffId: selectedStaffId === 'other' ? `custom-${Date.now()}` : selectedStaffId,
      staffName: effectiveStaffName,
      items,
      totalAmount: totalCartAmount,
      isPaid: paymentType === 'pagado_ahora',
      paymentType,
      paymentMethod: paymentType === 'pagado_ahora' ? paymentMethod : undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
    setCart([]);
    setNotes('');
    setCustomStaffName('');
    setPaymentType('descuento_semanal');
    setPaymentMethod('efectivo');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scale-in my-auto">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-brand-700 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-200 border border-white/30 shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                Consumo de Personal / Empleados
              </h2>
              <p className="text-xs text-orange-100">
                Registra productos consumidos con descuento oficial para empleados
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

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Banner de Descuento de Empleados */}
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center gap-3 text-emerald-900 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-200/80 text-emerald-800 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <strong className="font-black block text-emerald-950">
                🏷️ Tarifa Especial de Empleados Aplicada:
              </strong>
              <span className="text-[11px] text-emerald-800 font-medium">
                Descuento de <strong>2 Bs</strong> en Bebidas (sodas, cervezas, aguas) y <strong>1 Bs</strong> en Galletas/Snacks. El stock se descuenta automáticamente.
              </span>
            </div>
          </div>

          {/* Selector de Empleado */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-brand-600" />
              1. Selecciona el Personal que Consume
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {staffMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setSelectedStaffId(member.id);
                    setCustomStaffName('');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selectedStaffId === member.id
                      ? 'bg-brand-50 border-brand-500 shadow-xs ring-2 ring-brand-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs text-slate-900 block leading-tight">
                    {member.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 capitalize font-medium">
                    {member.role === 'limpieza' ? 'Personal de Limpieza' : 'Recepción / Caja'}
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setSelectedStaffId('other')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedStaffId === 'other'
                    ? 'bg-brand-50 border-brand-500 shadow-xs ring-2 ring-brand-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="font-bold text-xs text-slate-900 block leading-tight">
                  + Otro Empleado
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-medium">
                  Escribir nombre manual
                </span>
              </button>
            </div>

            {selectedStaffId === 'other' && (
              <div className="pt-2 animate-fade-in">
                <input
                  type="text"
                  placeholder="Nombre completo del empleado..."
                  value={customStaffName}
                  onChange={(e) => setCustomStaffName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            )}
          </div>

          {/* Modalidad de Pago: Descuento Semanal vs Pagado en el Acto */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              2. Modalidad de Cobro del Consumo
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opción 1: Descuento Semanal */}
              <button
                type="button"
                onClick={() => setPaymentType('descuento_semanal')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  paymentType === 'descuento_semanal'
                    ? 'bg-amber-50/90 border-amber-400 shadow-xs ring-2 ring-amber-500/20 text-amber-950'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-amber-600" />
                    Descontar de su Semana (Sueldo)
                  </span>
                  {paymentType === 'descuento_semanal' && (
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Se acumula a su cuenta personal y se descuenta al momento de pagarle su sueldo semanal.
                </p>
              </button>

              {/* Opción 2: Pagado en el Acto */}
              <button
                type="button"
                onClick={() => setPaymentType('pagado_ahora')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  paymentType === 'pagado_ahora'
                    ? 'bg-emerald-50/90 border-emerald-400 shadow-xs ring-2 ring-emerald-500/20 text-emerald-950'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Pagó en el Acto (Al Contado)
                  </span>
                  {paymentType === 'pagado_ahora' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  El empleado <strong>pagó ahora mismo</strong>. Ingresa a la caja del turno activo y no se le descuenta de su sueldo.
                </p>
              </button>
            </div>

            {/* Sub-selector de método de pago si pagó ahora */}
            {paymentType === 'pagado_ahora' && (
              <div className="pt-2.5 border-t border-slate-200/80 animate-fade-in space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Selecciona el método de pago recibido:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('efectivo')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'efectivo'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    💵 Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qr_vendis')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'qr_vendis'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📱 QR Vendis
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qr_union')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'qr_union'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🏦 QR B. Unión
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Selector de Productos */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-600" />
                3. Seleccionar Productos del Minibar
              </span>

              {/* Categorías */}
              <div className="flex gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
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

            {/* Buscador de productos */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Grid de productos con precios con descuento de empleado */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {filteredProducts.map((p) => {
                const inCart = cart.find((item) => item.product.id === p.id);
                const { originalPrice, staffPrice, discount } = getStaffDiscountedPrice(p);

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={p.stock <= 0}
                    onClick={() => handleAddToCart(p)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      p.stock <= 0
                        ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                        : inCart
                        ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-brand-500 hover:shadow-xs active:scale-95'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs text-slate-900 truncate leading-tight">
                          {p.name}
                        </span>
                        {discount > 0 && (
                          <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                            -{discount} Bs
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Stock: {p.stock} unid.
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="font-extrabold text-xs font-mono text-emerald-700">
                          {formatBs(staffPrice)}
                        </span>
                        {discount > 0 && (
                          <span className="text-[10px] line-through text-slate-400 font-mono">
                            {formatBs(originalPrice)}
                          </span>
                        )}
                      </div>
                      <span className="p-1 rounded-md bg-brand-50 text-brand-700">
                        <Plus className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Carrito de Consumo Seleccionado */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-brand-600" />
                Detalle del Consumo ({cart.length} productos)
              </span>
              <span className="text-xs font-bold text-slate-500">
                Empleado: <strong className="text-brand-800">{effectiveStaffName}</strong>
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs italic bg-white rounded-xl border border-dashed border-slate-200">
                Haz clic en los productos arriba para agregarlos al consumo del personal con descuento.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{item.product.name}</span>
                      <span className="text-[10px] text-emerald-700 font-mono font-bold">
                        ({formatBs(item.unitPrice)} c/u)
                      </span>
                      {item.discountPerUnit > 0 && (
                        <span className="text-[9px] text-emerald-600 font-medium">
                          (-{formatBs(item.discountPerUnit)} desc.)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                          className="text-slate-500 hover:text-slate-800 p-0.5"
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold font-mono px-1">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                          className="text-slate-500 hover:text-slate-800 p-0.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-mono font-extrabold text-slate-900 w-16 text-right">
                        {formatBs(item.unitPrice * item.quantity)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Notas u Observaciones (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Consumo almuerzo, turno tarde, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Total Banner */}
          <div className="p-4 bg-slate-950 text-white rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
                {paymentType === 'descuento_semanal'
                  ? 'TOTAL A DESCONTAR DE SU SEMANA:'
                  : 'TOTAL A COBRAR EN EL ACTO:'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} productos en total
                {totalSavings > 0 && ` • Ahorro empleado aplicado: -${formatBs(totalSavings)}`}
              </span>
            </div>
            <span className="text-2xl font-black font-mono text-emerald-400">
              {formatBs(totalCartAmount)}
            </span>
          </div>

          {/* Submit / Cancel Buttons */}
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
              disabled={cart.length === 0}
              className={`w-1/2 py-2.5 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                paymentType === 'descuento_semanal'
                  ? 'bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white'
              }`}
            >
              <Check className="w-4 h-4" />
              {paymentType === 'descuento_semanal'
                ? 'Registrar Consumo a Descontar'
                : 'Cobrar Consumo al Contado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

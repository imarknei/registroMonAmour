import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory, StaffMember } from '../types';
import { formatBs, getCategoryLabel } from '../utils/formatUtils';
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
} from 'lucide-react';

interface StaffConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
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
  const [searchProduct, setSearchProduct] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const categories: { key: ProductCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'bebidas_sin_alcohol', label: 'Sodas & Aguas' },
    { key: 'bebidas_alcohol', label: 'Cervezas' },
    { key: 'snacks', label: 'Snacks' },
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
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
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
    (sum, item) => sum + item.product.price * item.quantity,
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
      unitPrice: c.product.price,
      subtotal: c.product.price * c.quantity,
    }));

    addStaffConsumption({
      staffId: selectedStaffId === 'other' ? `custom-${Date.now()}` : selectedStaffId,
      staffName: effectiveStaffName,
      items,
      totalAmount: totalCartAmount,
      notes: notes.trim() || undefined,
    });

    onClose();
    setCart([]);
    setNotes('');
    setCustomStaffName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-in my-6">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-brand-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Consumo de Personal</h2>
              <p className="text-xs text-rose-100 font-medium">
                Descuento de minibar para liquidación en el pago semanal
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
        <form onSubmit={handleSubmit} className="p-6 max-h-[78vh] overflow-y-auto space-y-5">
          {/* Selector de Empleado */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-brand-600" />
              ¿Quién es el empleado que consume? <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {staffMembers.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => setSelectedStaffId(staff.id)}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                    selectedStaffId === staff.id
                      ? 'border-brand-600 bg-rose-50/80 text-brand-900 font-black shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-medium'
                  }`}
                >
                  <div>
                    <span className="text-xs block leading-tight">{staff.name}</span>
                    <span className="text-[10px] text-slate-400 block">{staff.shiftName || staff.role}</span>
                  </div>
                  {selectedStaffId === staff.id && (
                    <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                  )}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setSelectedStaffId('other')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                  selectedStaffId === 'other'
                    ? 'border-brand-600 bg-rose-50/80 text-brand-900 font-black shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-medium'
                }`}
              >
                <div>
                  <span className="text-xs block leading-tight">+ Otro Empleado</span>
                  <span className="text-[10px] text-slate-400 block">Escribir nombre manualmente</span>
                </div>
                {selectedStaffId === 'other' && (
                  <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                )}
              </button>
            </div>

            {selectedStaffId === 'other' && (
              <div className="pt-2">
                <input
                  type="text"
                  required
                  placeholder="Nombre completo del empleado (Ej. Juan Pérez - Albañil)..."
                  value={customStaffName}
                  onChange={(e) => setCustomStaffName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            )}
          </div>

          {/* Selector de Productos */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-600" />
                Seleccionar Productos del Minibar
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

            {/* Grid de productos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {filteredProducts.map((p) => {
                const inCart = cart.find((item) => item.product.id === p.id);
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
                        ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-brand-500 hover:shadow-xs active:scale-95'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-900 block leading-tight mb-0.5">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Stock: {p.stock} unid.
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                      <span className="font-extrabold text-xs font-mono text-brand-700">
                        {formatBs(p.price)}
                      </span>
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
                Detalle del Consumo a Descontar ({cart.length} productos)
              </span>
              <span className="text-xs font-bold text-slate-500">
                Empleado: <strong className="text-brand-800">{effectiveStaffName}</strong>
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs italic bg-white rounded-xl border border-dashed border-slate-200">
                Haz clic en los productos arriba para agregarlos al consumo del personal.
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
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({formatBs(item.product.price)} c/u)
                      </span>
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
                          onClick={() => handleUpdateQuantity(item.product.id, +1)}
                          disabled={item.quantity >= item.product.stock}
                          className="text-slate-500 hover:text-slate-800 p-0.5 disabled:opacity-30"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-mono font-black text-slate-900 w-16 text-right">
                        {formatBs(item.product.price * item.quantity)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Quitar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-rose-300 block">
                  TOTAL A DESCONTAR EN PAGO SEMANAL:
                </span>
                <span className="text-[10px] text-slate-400">
                  Se descontará del sueldo de {effectiveStaffName}
                </span>
              </div>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {formatBs(totalCartAmount)}
              </span>
            </div>
          </div>

          {/* Notas / Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notas u Observación (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Consumo turno tarde / merienda..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Action Buttons */}
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
              className="w-1/2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Registrar Consumo ({formatBs(totalCartAmount)})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

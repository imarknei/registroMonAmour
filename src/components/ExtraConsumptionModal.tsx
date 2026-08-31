import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory } from '../types';
import { formatBs, getPaymentMethodLabel } from '../utils/formatUtils';
import {
  X,
  ShoppingBag,
  Plus,
  Trash2,
  Search,
  Check,
  PlusCircle,
  MinusCircle,
  DollarSign,
  QrCode,
  Store,
  DoorClosed,
  User,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface ExtraConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const ExtraConsumptionModal: React.FC<ExtraConsumptionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, addExtraConsumption, rooms } = useApp();

  const [originType, setOriginType] = useState<'habitacion_cerrada' | 'mostrador_recepcion' | 'cliente_espera' | 'otro'>('habitacion_cerrada');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('1');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'qr_vendis' | 'qr_union'>('efectivo');
  const [searchProduct, setSearchProduct] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Estado para Consumo Personalizado con Precio Manual
  const [showCustomForm, setShowCustomForm] = useState<boolean>(false);
  const [customItemName, setCustomItemName] = useState<string>('');
  const [customItemPrice, setCustomItemPrice] = useState<string>('');
  const [customItemQty, setCustomItemQty] = useState<number>(1);

  if (!isOpen) return null;

  const categories: { key: ProductCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'bebidas_sin_alcohol', label: 'Sodas & Aguas' },
    { key: 'bebidas_alcohol', label: 'Cervezas' },
    { key: 'snacks', label: 'Snacks' },
    { key: 'higiene_otros', label: 'Otros' },
    { key: 'limpieza_utensilios', label: 'Limpieza' },
  ];

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchProduct.toLowerCase());
    return matchCat && matchSearch;
  });

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

  const handleAddCustomToCart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customItemName.trim()) {
      alert('Por favor ingrese el nombre del producto o consumo personalizado.');
      return;
    }
    const priceNum = parseFloat(customItemPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Por favor ingrese un precio válido (número mayor o igual a 0).');
      return;
    }
    const qty = Math.max(1, customItemQty || 1);
    const customProd: Product = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: customItemName.trim(),
      category: 'higiene_otros',
      price: priceNum,
      stock: 9999,
      minStockAlert: 0,
      description: 'Consumo personalizado',
    };

    setCart((prev) => [...prev, { product: customProd, quantity: qty }]);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty(1);
    setShowCustomForm(false);
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

  const getEffectiveDescription = () => {
    if (originType === 'habitacion_cerrada') {
      return `Consumo Habitación ${selectedRoomNumber} (Cerrada / Salida)`;
    }
    if (originType === 'mostrador_recepcion') {
      return 'Venta Directa en Mostrador / Recepción';
    }
    if (originType === 'cliente_espera') {
      return 'Consumo Cliente en Espera / Pasillo';
    }
    return customDescription.trim() || 'Consumo Extra / Venta Directa';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Por favor añade al menos un producto a la lista de consumo.');
      return;
    }

    const items = cart.map((c) => ({
      productId: c.product.id,
      productName: c.product.name,
      quantity: c.quantity,
      unitPrice: c.product.price,
      subtotal: c.product.price * c.quantity,
      isCustom: c.product.id.startsWith('custom-'),
    }));

    addExtraConsumption({
      description: getEffectiveDescription(),
      roomNumber: originType === 'habitacion_cerrada' ? selectedRoomNumber : undefined,
      originType,
      items,
      totalAmount: totalCartAmount,
      paymentMethod,
      notes: notes.trim() || undefined,
    });

    onClose();
    setCart([]);
    setNotes('');
    setCustomDescription('');
    setPaymentMethod('efectivo');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scale-in my-auto">
        {/* Top Header - Always Fixed at top */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-brand-600 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                Registrar Consumo Extra / Venta Mostrador
              </h2>
              <p className="text-[11px] sm:text-xs text-purple-100 font-medium">
                Cobro de minibar de habitación ya cerrada o venta directa en recepción
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable Area */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Origen del Consumo */}
          <div className="bg-purple-50/70 p-3.5 sm:p-4 rounded-2xl border border-purple-200/80 space-y-3">
            <label className="block text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-4 h-4 text-purple-600" />
              ¿De dónde proviene este consumo? <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOriginType('habitacion_cerrada')}
                className={`p-2 sm:p-2.5 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${
                  originType === 'habitacion_cerrada'
                    ? 'border-purple-600 bg-white text-purple-950 shadow-xs'
                    : 'border-purple-100 bg-purple-50/50 text-slate-700 hover:bg-white'
                }`}
              >
                <DoorClosed className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="leading-tight">
                  <span className="text-xs font-bold block">Habitación Cerrada</span>
                  <span className="text-[10px] text-slate-500">Salida / Fuera de tiempo</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOriginType('mostrador_recepcion')}
                className={`p-2 sm:p-2.5 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${
                  originType === 'mostrador_recepcion'
                    ? 'border-purple-600 bg-white text-purple-950 shadow-xs'
                    : 'border-purple-100 bg-purple-50/50 text-slate-700 hover:bg-white'
                }`}
              >
                <Store className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="leading-tight">
                  <span className="text-xs font-bold block">Mostrador Recepción</span>
                  <span className="text-[10px] text-slate-500">Venta directa al paso</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOriginType('cliente_espera')}
                className={`p-2 sm:p-2.5 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${
                  originType === 'cliente_espera'
                    ? 'border-purple-600 bg-white text-purple-950 shadow-xs'
                    : 'border-purple-100 bg-purple-50/50 text-slate-700 hover:bg-white'
                }`}
              >
                <User className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="leading-tight">
                  <span className="text-xs font-bold block">Cliente en Espera</span>
                  <span className="text-[10px] text-slate-500">Pasillo / Entrada</span>
                </div>
              </button>
            </div>

            {/* Selector de número de habitación si es cerrada */}
            {originType === 'habitacion_cerrada' && (
              <div className="pt-2 border-t border-purple-200/60 animate-fade-in space-y-1.5">
                <span className="text-[11px] font-bold text-purple-900 block">
                  Selecciona la habitación que consumió:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {rooms.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRoomNumber(r.number)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        selectedRoomNumber === r.number
                          ? 'bg-purple-700 text-white shadow-xs scale-105'
                          : 'bg-white border border-purple-200 text-slate-700 hover:bg-purple-100'
                      }`}
                    >
                      Hab {r.number}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Forma de Pago Recibido */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-2.5">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Método de Pago Recibido <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('efectivo')}
                className={`py-2 px-2.5 sm:px-3 rounded-xl border-2 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === 'efectivo'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                💵 Efectivo
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('qr_vendis')}
                className={`py-2 px-2.5 sm:px-3 rounded-xl border-2 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === 'qr_vendis'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                📱 QR Vendis
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('qr_union')}
                className={`py-2 px-2.5 sm:px-3 rounded-xl border-2 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === 'qr_union'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                🏦 QR B. Unión
              </button>
            </div>
          </div>

          {/* BOTÓN Y FORMULARIO DE CONSUMO PERSONALIZADO (PRECIO MANUAL) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowCustomForm(!showCustomForm)}
              className={`w-full p-2.5 sm:p-3 rounded-2xl border-2 transition-all flex items-center justify-between shadow-xs ${
                showCustomForm
                  ? 'bg-purple-900 text-white border-purple-900 shadow-md'
                  : 'bg-linear-to-r from-purple-50 via-fuchsia-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-950 border-purple-300 font-extrabold'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-xs ${showCustomForm ? 'bg-purple-700 text-white' : 'bg-purple-600 text-white'}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black">
                    {showCustomForm ? 'Ocultar Formulario de Consumo Personalizado' : '✨ Consumo Personalizado / Precio Manual'}
                  </span>
                  <span className={`text-[10px] block ${showCustomForm ? 'text-purple-200' : 'text-purple-700'}`}>
                    Ingresar producto o servicio indicando concepto y precio libre
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showCustomForm ? 'rotate-180 text-white' : 'text-purple-700'}`} />
            </button>

            {showCustomForm && (
              <form onSubmit={handleAddCustomToCart} className="p-3.5 bg-purple-50/90 border-2 border-purple-300 rounded-2xl space-y-2.5 animate-fade-in shadow-sm">
                <span className="text-xs font-black text-purple-950 flex items-center gap-1.5 border-b border-purple-200 pb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Agregar Ítem Personalizado al Cobro
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black text-purple-950 uppercase tracking-wider mb-0.5">
                      ¿Qué producto / consumo es? *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Whisky Red Label, Bebida preparada..."
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-purple-300 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-black text-purple-950 uppercase tracking-wider mb-0.5">
                      Precio (Bs) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="0"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-purple-300 text-xs font-mono font-black text-purple-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-black text-purple-950 uppercase tracking-wider mb-0.5">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={customItemQty}
                      onChange={(e) => setCustomItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-purple-300 text-xs font-mono font-black text-purple-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-200/60">
                  <span className="text-[11px] font-bold text-purple-900">
                    Subtotal:{' '}
                    <strong className="text-purple-700 font-black">
                      {formatBs((parseFloat(customItemPrice) || 0) * (customItemQty || 1))}
                    </strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      className="px-2.5 py-1 rounded-xl border border-purple-200 text-purple-900 text-xs font-bold bg-white hover:bg-purple-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow-xs flex items-center gap-1 active:scale-95"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      + Agregar al Cobro
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Selector de Productos */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-purple-600" />
                Seleccionar Productos del Inventario
              </span>

              {/* Categorías */}
              <div className="flex gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar pb-1 sm:pb-0">
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
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Grid de productos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 sm:max-h-48 overflow-y-auto p-1 bg-slate-50/50 rounded-2xl border border-slate-200/60">
              {/* Tarjeta de acceso directo a consumo personalizado */}
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="p-2.5 rounded-xl border-2 border-dashed border-purple-400 bg-purple-50/70 hover:bg-purple-100 hover:border-purple-600 text-left transition-all flex flex-col justify-between active:scale-95 group shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-1 text-purple-900 font-black text-xs mb-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Personalizado</span>
                  </div>
                  <span className="text-[10px] text-purple-700 block font-medium">
                    Precio y nombre manual
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-purple-200">
                  <span className="font-extrabold text-xs font-mono text-purple-800">
                    Precio libre
                  </span>
                  <span className="p-1 rounded-md bg-purple-600 text-white group-hover:scale-110 transition-transform">
                    <Plus className="w-3 h-3" />
                  </span>
                </div>
              </button>

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
                        ? 'bg-purple-50/90 border-purple-400 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-purple-500 hover:shadow-xs active:scale-95'
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
                      <span className="font-extrabold text-xs font-mono text-purple-700">
                        {formatBs(p.price)}
                      </span>
                      <span className="p-1 rounded-md bg-purple-100 text-purple-700">
                        <Plus className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Carrito de Productos Seleccionados */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-purple-600" />
                Detalle del Consumo Extra ({cart.length} productos)
              </span>
              <span className="text-xs font-bold text-slate-500 truncate max-w-[200px]">
                {getEffectiveDescription()}
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-3 text-center text-slate-400 text-xs italic bg-white rounded-xl border border-dashed border-slate-200">
                Haz clic en los productos de arriba para añadirlos a este cobro extra.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-32 sm:max-h-36 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const isCustom = item.product.id.startsWith('custom-');
                  return (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="font-bold text-slate-800 truncate">{item.product.name}</span>
                        {isCustom && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 border border-purple-300 shrink-0 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                            Personalizado
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          ({formatBs(item.product.price)})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
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
                            disabled={!isCustom && item.quantity >= item.product.stock}
                            className="text-slate-500 hover:text-slate-800 p-0.5 disabled:opacity-30"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="font-mono font-black text-slate-900 w-14 sm:w-16 text-right">
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
                  );
                })}
              </div>
            )}

            {/* Total Banner */}
            <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300 block">
                  TOTAL A COBRAR EN CAJA:
                </span>
                <span className="text-[10px] text-slate-400">
                  Ingresa en {getPaymentMethodLabel(paymentMethod)}
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
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
              placeholder="Ej. Huésped pagó 2 sodas tras desocupar habitación..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2 pb-1">
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
              className="w-1/2 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Cobrar Venta ({formatBs(totalCartAmount)})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

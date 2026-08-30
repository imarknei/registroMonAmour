import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory, InventoryMovementLog, InventoryActionType } from '../../types';
import { formatBs, getCategoryLabel, getStaffDiscountedPrice } from '../../utils/formatUtils';
import { formatDateTime } from '../../utils/timeUtils';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
  Check,
  X,
  PlusCircle,
  MinusCircle,
  TrendingUp,
  Boxes,
  ArrowDownToLine,
  Layers,
  Sparkles,
  History,
  Calendar,
  User,
  Filter,
  ArrowLeft,
  DollarSign,
  Tag,
  CheckCircle2,
  FileText,
  Clock,
  Sliders,
} from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const { products, saveProduct, deleteProductById, inventoryLogs, deleteInventoryLogById, currentUser } = useApp();

  // Pestaña activa: 'catalog' (Gestión de Stock) o 'reports' (Informe de Ingresos y Movimientos)
  const [activeTab, setActiveTab] = useState<'catalog' | 'reports'>('catalog');

  // --- Estados de Catálogo ---
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Quick Restock Modal state
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [addedStockQuantity, setAddedStockQuantity] = useState<string>('');
  const [restockNotes, setRestockNotes] = useState<string>('');

  // New/Edit product form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'preservativos',
    price: 20,
    stock: 20,
    minStockAlert: 5,
    description: '',
  });
  const [formAddStock, setFormAddStock] = useState<string>('');

  // --- Estados de Informe / Auditoría de Movimientos ---
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

  const categories: { key: ProductCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'Todos los Productos' },
    { key: 'preservativos', label: 'Preservativos e Íntimo' },
    { key: 'bebidas_alcohol', label: 'Cervezas & Licores' },
    { key: 'bebidas_sin_alcohol', label: 'Gaseosas & Bebidas' },
    { key: 'snacks', label: 'Snacks & Chocolates' },
    { key: 'higiene_otros', label: 'Higiene & Otros' },
  ];

  // Filtrado de productos en catálogo
  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const handleOpenCreate = () => {
    setFormData({
      id: `prod-${Date.now()}`,
      name: '',
      category: 'preservativos',
      price: 20,
      stock: 20,
      minStockAlert: 5,
      description: '',
    });
    setFormAddStock('');
    setIsCreating(true);
    setEditingProduct(null);
  };

  const handleOpenEdit = (product: Product) => {
    setFormData({ ...product });
    setFormAddStock('');
    setEditingProduct(product);
    setIsCreating(false);
  };

  const handleOpenQuickRestock = (product: Product) => {
    setRestockProduct(product);
    setAddedStockQuantity('');
    setRestockNotes('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || formData.price === undefined || formData.stock === undefined) {
      return;
    }

    const additionalStock = parseInt(formAddStock, 10) || 0;
    const baseStock = Number(formData.stock) || 0;
    const finalStock = isCreating ? baseStock : Math.max(0, baseStock + additionalStock);

    const productToSave: Product = {
      id: formData.id || `prod-${Date.now()}`,
      name: formData.name.trim(),
      category: (formData.category as ProductCategory) || 'preservativos',
      price: Number(formData.price),
      stock: finalStock,
      minStockAlert: Number(formData.minStockAlert) || 5,
      description: formData.description?.trim() || undefined,
    };

    saveProduct(productToSave, {
      logAction: isCreating ? 'create_product' : additionalStock > 0 ? 'restock' : 'manual_adjustment',
      quantityAdded: isCreating ? finalStock : additionalStock,
      notes: isCreating
        ? `Creación de nuevo producto con ${finalStock} unid. a ${formatBs(productToSave.price)}`
        : additionalStock > 0
        ? `Edición de producto: ingreso de +${additionalStock} unidades`
        : `Modificación de datos de producto`,
    });

    setIsCreating(false);
    setEditingProduct(null);
  };

  const handleConfirmQuickRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;
    const toAdd = parseInt(addedStockQuantity, 10) || 0;
    if (toAdd <= 0) return;

    const newStock = restockProduct.stock + toAdd;
    saveProduct(
      { ...restockProduct, stock: newStock },
      {
        logAction: 'restock',
        quantityAdded: toAdd,
        notes: restockNotes.trim() || `Reabastecimiento rápido de +${toAdd} unidades`,
      }
    );
    setRestockProduct(null);
    setAddedStockQuantity('');
    setRestockNotes('');
  };

  const handleQuickStockAdd = (productId: string, amount: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const newStock = prod.stock + amount;
    saveProduct(
      { ...prod, stock: newStock },
      {
        logAction: 'restock',
        quantityAdded: amount,
        notes: `Ingreso directo rápido (+${amount} unidades)`,
      }
    );
  };

  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalStockValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStockAlert).length;

  // --- Filtrado del Informe de Movimientos ---
  const filteredLogs = useMemo(() => {
    return inventoryLogs.filter((log) => {
      // Filtro por acción
      if (filterAction !== 'all' && log.action !== filterAction) return false;

      // Filtro por producto
      if (filterProduct !== 'all' && log.productId !== filterProduct) return false;

      // Filtro por fecha
      if (filterDateRange !== 'all') {
        const logDate = new Date(log.date || log.timestamp);
        const now = new Date();

        if (filterDateRange === 'today') {
          const todayIso = now.toISOString().slice(0, 10);
          if (!log.date?.startsWith(todayIso)) return false;
        } else if (filterDateRange === 'yesterday') {
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const yestIso = yesterday.toISOString().slice(0, 10);
          if (!log.date?.startsWith(yestIso)) return false;
        } else if (filterDateRange === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (logDate < sevenDaysAgo) return false;
        } else if (filterDateRange === 'month') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (logDate < thirtyDaysAgo) return false;
        } else if (filterDateRange === 'custom' && customDate) {
          if (!log.date?.startsWith(customDate)) return false;
        }
      }

      // Buscador
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const matchProd = log.productName.toLowerCase().includes(q);
        const matchResp = log.responsibleName.toLowerCase().includes(q);
        const matchNotes = log.notes?.toLowerCase().includes(q) || false;
        if (!matchProd && !matchResp && !matchNotes) return false;
      }

      return true;
    });
  }, [inventoryLogs, filterAction, filterProduct, filterDateRange, customDate, logSearchQuery]);

  // Métricas del informe filtrado
  const totalUnitsAddedInReport = useMemo(() => {
    return filteredLogs
      .filter((l) => l.quantityAdded > 0)
      .reduce((sum, l) => sum + l.quantityAdded, 0);
  }, [filteredLogs]);

  const totalRestockCount = useMemo(() => {
    return filteredLogs.filter((l) => l.action === 'restock' || l.action === 'create_product').length;
  }, [filteredLogs]);

  const getActionBadge = (action: InventoryActionType, qty: number) => {
    switch (action) {
      case 'restock':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ArrowDownToLine className="w-3 h-3 text-emerald-600" />
            +{qty} unid. Reabastecido
          </span>
        );
      case 'create_product':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            Nuevo Producto ({qty} unid.)
          </span>
        );
      case 'manual_adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
            <Sliders className="w-3 h-3 text-amber-600" />
            Ajuste de Stock ({qty >= 0 ? `+${qty}` : qty})
          </span>
        );
      case 'price_change':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-300">
            <DollarSign className="w-3 h-3 text-purple-600" />
            Cambio de Precio
          </span>
        );
      case 'delete_product':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            <Trash2 className="w-3 h-3 text-rose-600" />
            Producto Eliminado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Navigation */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-600/25">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Control de Inventario y Minibar</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Agregue productos, modifique precios, aumente stock y consulte el informe de auditoría por fecha.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Tab Navigation: Catálogo vs Informe de Movimientos */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'catalog'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>📦 Catálogo & Gestión de Stock</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>📋 Informe de Ingresos y Movimientos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {inventoryLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PESTAÑA 1: CATÁLOGO & GESTIÓN DE STOCK */}
      {/* ============================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Productos
              </span>
              <span className="text-2xl font-extrabold text-slate-800 block mt-1">
                {products.length} variedades
              </span>
              <span className="text-xs text-slate-500">{totalStockUnits} unidades físicas en almacén</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Valor de Inventario (PVP)
              </span>
              <span className="text-2xl font-extrabold font-mono text-brand-700 block mt-1">
                {formatBs(totalStockValue)}
              </span>
              <span className="text-xs text-slate-500">Precio de venta total</span>
            </div>

            <div
              className={`p-4 rounded-2xl border shadow-sm ${
                lowStockCount > 0 ? 'bg-rose-50 border-rose-200 text-brand-900' : 'bg-white border-slate-200'
              }`}
            >
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Alertas de Stock Bajo
              </span>
              <div className="flex items-center gap-2 mt-1">
                {lowStockCount > 0 && <AlertTriangle className="w-5 h-5 text-brand-600" />}
                <span className={`text-2xl font-extrabold ${lowStockCount > 0 ? 'text-brand-700' : 'text-slate-800'}`}>
                  {lowStockCount} productos
                </span>
              </div>
              <span className="text-xs text-slate-500">Por debajo del umbral mínimo</span>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search bar */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar producto por nombre..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
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
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4 text-right">Precio Venta</th>
                    <th className="py-3 px-4 text-center">Stock Actual</th>
                    <th className="py-3 px-4 text-center">Ingreso Rápido (+Stock)</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No se encontraron productos coincidentes.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => {
                      const isLow = prod.stock <= prod.minStockAlert;
                      return (
                        <tr
                          key={prod.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isLow ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div>
                              <strong className="font-extrabold text-slate-900 block text-xs">
                                {prod.name}
                              </strong>
                              {prod.description && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                                  {prod.description}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              {getCategoryLabel(prod.category)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span className="font-mono font-extrabold text-brand-700 block text-sm">
                              {formatBs(prod.price)}
                            </span>
                            {(() => {
                              const { staffPrice, discount } = getStaffDiscountedPrice(prod);
                              return discount > 0 ? (
                                <span
                                  className="text-[10px] text-emerald-700 font-bold block"
                                  title="Precio especial para personal"
                                >
                                  Pers: {formatBs(staffPrice)} (-{discount}Bs)
                                </span>
                              ) : null;
                            })()}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`font-mono text-sm font-black inline-block px-2.5 py-0.5 rounded-lg ${
                                prod.stock <= 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {prod.stock} unid.
                            </span>
                          </td>

                          {/* Quick Add Buttons */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleQuickStockAdd(prod.id, 5)}
                                className="px-2 py-0.5 bg-white hover:bg-emerald-600 hover:text-white text-slate-700 font-bold text-[10px] rounded-lg transition-colors shadow-2xs"
                                title="Ingresar +5 unidades"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStockAdd(prod.id, 10)}
                                className="px-2 py-0.5 bg-white hover:bg-emerald-600 hover:text-white text-slate-700 font-bold text-[10px] rounded-lg transition-colors shadow-2xs"
                                title="Ingresar +10 unidades"
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStockAdd(prod.id, 24)}
                                className="px-2 py-0.5 bg-white hover:bg-emerald-600 hover:text-white text-slate-700 font-bold text-[10px] rounded-lg transition-colors shadow-2xs"
                                title="Ingresar +24 unidades (caja)"
                              >
                                +24
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenQuickRestock(prod)}
                                className="px-2 py-0.5 bg-emerald-600 text-white font-black text-[10px] rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs flex items-center gap-0.5"
                                title="Reabastecimiento personalizado con nota"
                              >
                                <Plus className="w-3 h-3" />
                                Otro
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {prod.stock <= 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                <AlertTriangle className="w-3 h-3" />
                                Agotado
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3" />
                                Stock Bajo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="w-3 h-3" />
                                Óptimo
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(prod)}
                                className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Editar precio, stock o datos"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar definitivamente el producto "${prod.name}" del catálogo?`)) {
                                    deleteProductById(prod.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Eliminar producto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: INFORME DE INGRESOS Y MOVIMIENTOS DE INVENTARIO */}
      {/* ============================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in">
          {/* Métricas del Reporte */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Movimientos Filtrados
              </span>
              <span className="text-2xl font-black text-indigo-900 block mt-1">
                {filteredLogs.length} registros
              </span>
              <span className="text-xs text-slate-500">Historial de entradas y cambios</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Unidades Aumentadas (+Stock)
              </span>
              <span className="text-2xl font-black font-mono text-emerald-700 block mt-1">
                +{totalUnitsAddedInReport} unid.
              </span>
              <span className="text-xs text-slate-500">Ingresadas en el período seleccionado</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Reabastecimientos Registrados
              </span>
              <span className="text-2xl font-black text-slate-800 block mt-1">
                {totalRestockCount} ingresos
              </span>
              <span className="text-xs text-slate-500">Lotes de inventario abastecidos</span>
            </div>
          </div>

          {/* Filtros del Informe */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Filtros de Auditoría de Inventario
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                Mostrando {filteredLogs.length} de {inventoryLogs.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Filtro por Período */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Período / Fecha</label>
                <select
                  value={filterDateRange}
                  onChange={(e: any) => setFilterDateRange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">Todo el Historial</option>
                  <option value="today">Hoy</option>
                  <option value="yesterday">Ayer</option>
                  <option value="week">Últimos 7 días</option>
                  <option value="month">Últimos 30 días</option>
                  <option value="custom">Fecha Específica...</option>
                </select>
              </div>

              {/* Fecha Personalizada */}
              {filterDateRange === 'custom' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Seleccionar Día</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              {/* Filtro por Tipo de Acción */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de Movimiento</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">Todos los Movimientos</option>
                  <option value="restock">Reabastecimiento (+Stock)</option>
                  <option value="create_product">Creación de Nuevo Producto</option>
                  <option value="manual_adjustment">Ajustes Manuales</option>
                  <option value="price_change">Cambios de Precio</option>
                  <option value="delete_product">Productos Eliminados</option>
                </select>
              </div>

              {/* Filtro por Producto */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Producto Específico</label>
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">Todos los Productos</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buscador de Auditoría */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar por Cajero / Nota</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Ej. Carlos, Coca cola..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Registros de Auditoría */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Fecha y Hora</th>
                    <th className="py-3.5 px-4">Producto</th>
                    <th className="py-3.5 px-4 text-center">Tipo de Movimiento</th>
                    <th className="py-3.5 px-4 text-center">Cambio de Stock</th>
                    <th className="py-3.5 px-4">Responsable / Usuario</th>
                    <th className="py-3.5 px-4">Detalles / Notas</th>
                    <th className="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <History className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="font-bold text-slate-600">No hay movimientos registrados</p>
                          <p className="text-[11px] text-slate-400">
                            Los ingresos de stock, creaciones y modificaciones aparecerán aquí con su fecha y responsable.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Fecha */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDateTime(log.date || new Date(log.timestamp).toISOString())}</span>
                          </div>
                        </td>

                        {/* Producto */}
                        <td className="py-3 px-4">
                          <div>
                            <strong className="font-extrabold text-slate-900 block text-xs">
                              {log.productName}
                            </strong>
                            {log.category && (
                              <span className="text-[10px] text-slate-400 block">
                                {getCategoryLabel(log.category)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Tipo de Movimiento */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {getActionBadge(log.action, log.quantityAdded)}
                        </td>

                        {/* Cambio de Stock */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                            <span className="text-slate-400 font-semibold">{log.previousStock}</span>
                            <span className="text-slate-300">➔</span>
                            <strong className="font-black text-slate-900">{log.newStock} unid.</strong>
                            {log.quantityAdded > 0 && (
                              <span className="text-[11px] font-black text-emerald-600 ml-1">
                                (+{log.quantityAdded})
                              </span>
                            )}
                            {log.quantityAdded < 0 && (
                              <span className="text-[11px] font-black text-rose-600 ml-1">
                                ({log.quantityAdded})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Responsable */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-[10px]">
                              {log.responsibleName?.charAt(0) || 'U'}
                            </div>
                            <span className="font-bold text-slate-800 text-xs">{log.responsibleName}</span>
                          </div>
                        </td>

                        {/* Notas */}
                        <td className="py-3 px-4 text-slate-600 text-xs max-w-xs">
                          <span className="line-clamp-2" title={log.notes}>
                            {log.notes || '—'}
                          </span>
                        </td>

                        {/* Eliminar log individual si es admin */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {currentUser.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('¿Eliminar este registro de auditoría?')) {
                                  deleteInventoryLogById(log.id);
                                }
                              }}
                              className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CREAR / EDITAR PRODUCTO */}
      {/* ============================================================== */}
      {(isCreating || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-in my-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-700 to-rose-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    {isCreating ? 'Añadir Nuevo Producto' : `Editar: ${editingProduct?.name}`}
                  </h3>
                  <p className="text-xs text-rose-100">
                    {isCreating ? 'Crea un nuevo ítem para el catálogo' : 'Modifica precios y cantidades'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingProduct(null);
                }}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Cerveza Corona 355ml"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.category || 'preservativos'}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ProductCategory })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-bold"
                  >
                    <option value="preservativos">Preservativos e Íntimo</option>
                    <option value="bebidas_alcohol">Cervezas & Licores</option>
                    <option value="bebidas_sin_alcohol">Gaseosas & Bebidas</option>
                    <option value="snacks">Snacks & Chocolates</option>
                    <option value="higiene_otros">Higiene & Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Precio de Venta (Bs) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-black text-brand-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    {isCreating ? 'Stock Inicial (unid.) *' : 'Stock Base (unid.)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock !== undefined ? formData.stock : ''}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                {!isCreating && (
                  <div>
                    <label className="block text-xs font-black text-emerald-700 uppercase tracking-wider mb-1">
                      + Ingresar Stock (+Unid.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formAddStock}
                      onChange={(e) => setFormAddStock(e.target.value)}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 text-xs font-mono font-black text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Alerta de Stock Mínimo
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.minStockAlert || 5}
                  onChange={(e) =>
                    setFormData({ ...formData, minStockAlert: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ej: Lata 355ml fría"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingProduct(null);
                  }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  {isCreating ? 'Crear Producto' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: REABASTECIMIENTO RÁPIDO (+STOCK) CON NOTAS */}
      {/* ============================================================== */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in my-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 to-teal-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold">
                  <ArrowDownToLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Ingreso / Reabastecer Stock</h3>
                  <p className="text-xs text-emerald-100 truncate max-w-xs">{restockProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setRestockProduct(null)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmQuickRestock} className="p-6 space-y-4">
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Stock Actual</span>
                  <span className="text-xl font-black font-mono text-emerald-950">
                    {restockProduct.stock} unidades
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Precio PVP</span>
                  <span className="text-base font-black font-mono text-emerald-950">
                    {formatBs(restockProduct.price)}
                  </span>
                </div>
              </div>

              {/* Botones rápidos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Selección rápida de cantidad a ingresar:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[6, 12, 24, 48].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setAddedStockQuantity(qty.toString())}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        addedStockQuantity === qty.toString()
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      +{qty}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Cantidad a Ingresar (+Unidades) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  autoFocus
                  value={addedStockQuantity}
                  onChange={(e) => setAddedStockQuantity(e.target.value)}
                  placeholder="Ej: 24"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-emerald-300 text-base font-mono font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Nota / Proveedor / Motivo (Opcional)
                </label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="Ej: Compra Coca-Cola, Factura #1234, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>

              {addedStockQuantity && parseInt(addedStockQuantity, 10) > 0 && (
                <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between text-xs">
                  <span>Stock Resultante:</span>
                  <strong className="font-mono font-black text-emerald-400 text-sm">
                    {restockProduct.stock + (parseInt(addedStockQuantity, 10) || 0)} unidades
                  </strong>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!addedStockQuantity || parseInt(addedStockQuantity, 10) <= 0}
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Confirmar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

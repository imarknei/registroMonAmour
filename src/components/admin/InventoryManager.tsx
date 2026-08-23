import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import { formatBs, getCategoryLabel } from '../../utils/formatUtils';
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
} from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const { products, saveProduct, deleteProductById } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New product initial state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'preservativos',
    price: 20,
    stock: 20,
    minStockAlert: 5,
    description: '',
  });

  const categories: { key: ProductCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'Todos los Productos' },
    { key: 'preservativos', label: 'Preservativos e Íntimo' },
    { key: 'bebidas_alcohol', label: 'Cervezas & Licores' },
    { key: 'bebidas_sin_alcohol', label: 'Gaseosas & Bebidas' },
    { key: 'snacks', label: 'Snacks & Chocolates' },
    { key: 'higiene_otros', label: 'Higiene & Otros' },
  ];

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
    setIsCreating(true);
    setEditingProduct(null);
  };

  const handleOpenEdit = (product: Product) => {
    setFormData({ ...product });
    setEditingProduct(product);
    setIsCreating(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || formData.price === undefined || formData.stock === undefined) {
      return;
    }

    const productToSave: Product = {
      id: formData.id || `prod-${Date.now()}`,
      name: formData.name.trim(),
      category: (formData.category as ProductCategory) || 'preservativos',
      price: Number(formData.price),
      stock: Number(formData.stock),
      minStockAlert: Number(formData.minStockAlert) || 5,
      description: formData.description?.trim() || undefined,
    };

    saveProduct(productToSave);
    setIsCreating(false);
    setEditingProduct(null);
  };

  const handleQuickStockChange = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const newStock = Math.max(0, prod.stock + delta);
    saveProduct({ ...prod, stock: newStock });
  };

  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalStockValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStockAlert).length;

  return (
    <div className="space-y-6">
      {/* Header & Quick stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-600" />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Control de Inventario y Minibar
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestione productos, precios de venta y reposición de stock. Los consumos se descuentan automáticamente al registrarse en habitaciones.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Añadir Nuevo Producto
        </button>
      </div>

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

        <div className={`p-4 rounded-2xl border shadow-sm ${
          lowStockCount > 0 ? 'bg-rose-50 border-rose-200 text-brand-900' : 'bg-white border-slate-200'
        }`}>
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
              placeholder="Buscar por nombre o descripción..."
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

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Producto</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4 text-right">Precio Venta</th>
                <th className="py-3.5 px-4 text-center">Stock Actual</th>
                <th className="py-3.5 px-4 text-center">Ajuste Rápido</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No se encontraron productos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isLow = prod.stock <= prod.minStockAlert;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block text-xs">{prod.name}</span>
                        {prod.description && (
                          <span className="text-[10px] text-slate-400 block line-clamp-1">
                            {prod.description}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                          {getCategoryLabel(prod.category)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-brand-700 text-sm">
                        {formatBs(prod.price)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-sm text-slate-800">{prod.stock}</span>
                        <span className="text-[10px] text-slate-400 block">mín: {prod.minStockAlert}</span>
                      </td>

                      {/* Quick stock adjustment */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleQuickStockChange(prod.id, -1)}
                            disabled={prod.stock <= 0}
                            title="Restar 1 unidad"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded disabled:opacity-30"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleQuickStockChange(prod.id, +5)}
                            title="Sumar +5 unidades"
                            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded font-mono font-bold text-[10px]"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => handleQuickStockChange(prod.id, +10)}
                            title="Sumar +10 unidades"
                            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded font-mono font-bold text-[10px]"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            prod.stock <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {prod.stock <= 0 ? 'Agotado' : isLow ? 'Stock Bajo' : 'Disponible'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            title="Editar producto"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-rose-50 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar ${prod.name} del inventario?`)) {
                                deleteProductById(prod.id);
                              }
                            }}
                            title="Eliminar producto"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal Create/Edit Product */}
      {(isCreating || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="bg-gradient-to-r from-brand-700 to-rose-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base">
                {isCreating ? 'Añadir Nuevo Producto' : 'Editar Producto'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingProduct(null);
                }}
                className="p-1 rounded-full hover:bg-white/20 text-white/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Cerveza Corona 330ml"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                <select
                  value={formData.category || 'preservativos'}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as ProductCategory })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                >
                  <option value="preservativos">Preservativos e Íntimo</option>
                  <option value="bebidas_alcohol">Bebidas con Alcohol</option>
                  <option value="bebidas_sin_alcohol">Bebidas sin Alcohol</option>
                  <option value="snacks">Snacks y Chocolates</option>
                  <option value="higiene_otros">Higiene y Otros</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Precio (Bs) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={formData.price ?? ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Actual *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock ?? ''}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alerta Mínima</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStockAlert ?? 5}
                    onChange={(e) =>
                      setFormData({ ...formData, minStockAlert: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalle o características"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingProduct(null);
                  }}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 text-xs hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

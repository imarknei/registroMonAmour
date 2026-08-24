import React, { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { formatBs, getRoomTypeLabel } from '../../utils/formatUtils';
import {
  BarChart3,
  Download,
  Upload,
  RefreshCw,
  TrendingUp,
  DollarSign,
  QrCode,
  ShoppingBag,
  BedDouble,
  CheckCircle2,
  PieChart,
} from 'lucide-react';

export const SalesReports: React.FC = () => {
  const {
    completedStays,
    products,
    exportDatabaseJson,
    importDatabaseJson,
    resetAllDataToDefaults,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Financial aggregates
  const totalStays = completedStays.length;
  const totalRevenue = completedStays.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalCash = completedStays.reduce((sum, s) => {
    if (s.cashPaid !== undefined) return sum + s.cashPaid;
    if (s.paymentMethod === 'efectivo') return sum + (s.totalAmount || 0);
    return sum;
  }, 0);
  const totalQr = completedStays.reduce((sum, s) => {
    if (s.qrPaid !== undefined) return sum + s.qrPaid;
    if (s.paymentMethod === 'qr') return sum + (s.totalAmount || 0);
    return sum;
  }, 0);
  const totalOvertimeRevenue = completedStays.reduce(
    (sum, s) => sum + (s.overtimeCharge || 0),
    0
  );

  // Minibar products consumed
  const productConsumptionMap: Record<string, { name: string; quantity: number; totalBs: number }> = {};
  completedStays.forEach((stay) => {
    stay.consumptions.forEach((c) => {
      if (!productConsumptionMap[c.productId]) {
        productConsumptionMap[c.productId] = {
          name: c.productName,
          quantity: 0,
          totalBs: 0,
        };
      }
      productConsumptionMap[c.productId].quantity += c.quantity;
      productConsumptionMap[c.productId].totalBs += c.subtotal;
    });
  });

  const topConsumedProducts = Object.values(productConsumptionMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const totalMinibarRevenue = Object.values(productConsumptionMap).reduce(
    (sum, p) => sum + p.totalBs,
    0
  );

  // Room type breakdown
  const roomTypeMap: Record<string, number> = {};
  completedStays.forEach((s) => {
    roomTypeMap[s.roomType] = (roomTypeMap[s.roomType] || 0) + 1;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabaseJson(content);
        if (success) {
          alert('¡Copia de seguridad restaurada con éxito!');
        } else {
          alert('Error al leer el archivo de respaldo.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Reportes Generales y Estadísticas
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas clave de rendimiento, ventas por método de pago y productos más solicitados.
          </p>
        </div>

        {/* Data Management Buttons */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar Backup
          </button>

          <button
            onClick={exportDatabaseJson}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Backup JSON
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Ingresos Totales Registrados
          </span>
          <span className="text-2xl font-black font-mono text-slate-900 block mt-1">
            {formatBs(totalRevenue)}
          </span>
          <span className="text-xs text-slate-500">{totalStays} estadías completadas</span>
        </div>

        <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <DollarSign className="w-4 h-4" />
            Total Efectivo
          </div>
          <span className="text-2xl font-black font-mono text-emerald-950 block mt-1">
            {formatBs(totalCash)}
          </span>
          <span className="text-xs text-emerald-700">
            {totalRevenue > 0 ? `${((totalCash / totalRevenue) * 100).toFixed(0)}% del total` : '0%'}
          </span>
        </div>

        <div className="bg-sky-50/80 p-4 rounded-2xl border border-sky-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-sky-700 text-xs font-bold uppercase tracking-wider">
            <QrCode className="w-4 h-4" />
            Total Pagos QR
          </div>
          <span className="text-2xl font-black font-mono text-sky-950 block mt-1">
            {formatBs(totalQr)}
          </span>
          <span className="text-xs text-sky-700">
            {totalRevenue > 0 ? `${((totalQr / totalRevenue) * 100).toFixed(0)}% del total` : '0%'}
          </span>
        </div>

        <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-brand-700 text-xs font-bold uppercase tracking-wider">
            <ShoppingBag className="w-4 h-4" />
            Venta Minibar & Extras
          </div>
          <span className="text-2xl font-black font-mono text-brand-950 block mt-1">
            {formatBs(totalMinibarRevenue)}
          </span>
          <span className="text-xs text-brand-700">
            +{formatBs(totalOvertimeRevenue)} en tiempo extra
          </span>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Minibar Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Productos Más Vendidos (Minibar)
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">Top 8</span>
          </div>

          {topConsumedProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No hay registros de consumos completados todavía.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topConsumedProducts.map((p, idx) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-800 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{p.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-white font-mono font-bold text-slate-700 border border-slate-200">
                      {p.quantity} unid.
                    </span>
                    <span className="font-mono font-bold text-brand-700 w-20 text-right">
                      {formatBs(p.totalBs)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Room Types Popularity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Ocupación por Tipo de Habitación
              </h3>
            </div>
          </div>

          {totalStays === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No hay estadías completadas aún.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(roomTypeMap).map(([type, count]) => {
                const percent = ((count / totalStays) * 100).toFixed(0);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{getRoomTypeLabel(type)}</span>
                      <span className="font-mono">{count} estadías ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-brand-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone: Reset Data */}
      <div className="bg-rose-50/70 border border-rose-200 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-extrabold text-xs text-brand-900 uppercase tracking-wider">
            Zona de Mantenimiento
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            Restablecer la base de datos a los valores de fábrica iniciales (elimina estadías y turnos de prueba).
          </p>
        </div>

        <button
          onClick={() => {
            if (
              confirm(
                '¿ADVERTENCIA: Desea reiniciar todos los datos a los valores iniciales de fábrica?'
              )
            ) {
              resetAllDataToDefaults();
              alert('Base de datos restablecida.');
            }
          }}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Restablecer Sistema
        </button>
      </div>
    </div>
  );
};

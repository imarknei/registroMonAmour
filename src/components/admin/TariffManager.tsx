import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TariffCatalog, RoomType } from '../../types';
import { formatBs, getRoomTypeLabel } from '../../utils/formatUtils';
import { INITIAL_TARIFFS } from '../../data/initialData';
import { Sliders, Save, RotateCcw, Lock, CheckCircle2, Moon, Sparkles, Tv } from 'lucide-react';

export const TariffManager: React.FC = () => {
  const { tariffs, updateTariffCatalog } = useApp();
  const [currentTariffs, setCurrentTariffs] = useState<TariffCatalog>(tariffs);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleUpdateField = (
    type: RoomType,
    field:
      | 'price1h'
      | 'price2h'
      | 'price3h'
      | 'price2hNight'
      | 'bonflix2hPrice'
      | 'bonflix4hPrice'
      | 'priceNight'
      | 'extraHourPrice',
    value: string
  ) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setCurrentTariffs((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: numValue,
      },
    }));
  };

  const handleUpdatePromo = (value: string) => {
    const num = parseFloat(value) || 0;
    setCurrentTariffs((prev) => ({
      ...prev,
      promo3hPrice: num,
    }));
  };

  const handleUpdateBonflix = (field: 'bonflix2hPrice' | 'bonflix4hPrice', value: string) => {
    const num = value === '' ? undefined : parseFloat(value);
    setCurrentTariffs((prev) => ({
      ...prev,
      [field]: num,
      suite: {
        ...prev.suite,
        [field]: num,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTariffCatalog(currentTariffs);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (confirm('¿Restablecer todas las tarifas y precios de noche a sus valores iniciales?')) {
      setCurrentTariffs(INITIAL_TARIFFS);
      updateTariffCatalog(INITIAL_TARIFFS);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const roomTypes: { key: RoomType; label: string; desc: string }[] = [
    {
      key: 'ventilador',
      label: 'Habitación con Ventilador',
      desc: 'Habitaciones 2 y 14',
    },
    {
      key: 'aire',
      label: 'Habitación con Aire Acondicionado',
      desc: 'Habitación 4',
    },
    {
      key: 'suite',
      label: 'Suite Estándar',
      desc: 'Habitaciones 1, 5, 6, 11, 13, 15 y 16',
    },
    {
      key: 'jacuzzi',
      label: 'Habitación con Jacuzzi',
      desc: 'Habitación 3',
    },
    {
      key: 'golden_suite',
      label: 'Golden Suite (Karaoke & Bar)',
      desc: 'Habitación Golden Suite',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-6 h-6 text-brand-600" />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Gestión de Tarifas y Precios
            </h2>
            <span className="bg-rose-50 text-brand-700 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Solo Administrador
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure los precios oficiales por hora, noche (12 horas), hora adicional y promociones vigentes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Valores por Defecto
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar Tarifas
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ¡Tarifas actualizadas correctamente en todo el sistema!
        </div>
      )}

      {/* Tariffs Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roomTypes.map((type) => {
            const config = currentTariffs[type.key];
            return (
              <div
                key={type.key}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{type.label}</h3>
                    <span className="text-[11px] text-slate-400 font-medium">{type.desc}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {getRoomTypeLabel(type.key)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* 1 Hour */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      1 Hora (Bs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={config.price1h ?? ''}
                      onChange={(e) => handleUpdateField(type.key, 'price1h', e.target.value)}
                      placeholder="-"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  {/* 2 Hours */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      2 Horas (Bs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={config.price2h ?? ''}
                      onChange={(e) => handleUpdateField(type.key, 'price2h', e.target.value)}
                      placeholder="-"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  {/* 3 Hours (If Jacuzzi) */}
                  {type.key === 'jacuzzi' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        3 Horas (Bs)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.price3h ?? ''}
                        onChange={(e) => handleUpdateField(type.key, 'price3h', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                  ) : null}

                  {/* 2 Horas Noche / Paquete */}
                  <div className="bg-purple-50/70 p-2 rounded-xl border border-purple-100 col-span-1">
                    <label className="block text-[11px] font-bold text-purple-900 mb-1 flex items-center gap-1">
                      <Moon className="w-3 h-3 text-purple-600" />
                      2h Noche (Bs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={config.price2hNight ?? ''}
                      onChange={(e) => handleUpdateField(type.key, 'price2hNight', e.target.value)}
                      placeholder={type.key === 'suite' ? '100' : '-'}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 font-mono font-extrabold text-purple-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  {/* Noche / 12 Horas */}
                  <div className="bg-indigo-50/70 p-2 rounded-xl border border-indigo-100 col-span-1">
                    <label className="block text-[11px] font-bold text-indigo-900 mb-1 flex items-center gap-1">
                      <Moon className="w-3 h-3 text-indigo-600" />
                      Noche / 12h
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={config.priceNight ?? ''}
                      onChange={(e) => handleUpdateField(type.key, 'priceNight', e.target.value)}
                      placeholder="-"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 font-mono font-extrabold text-indigo-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Hora Adicional */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Hora Extra (Bs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={config.extraHourPrice ?? ''}
                      onChange={(e) =>
                        handleUpdateField(type.key, 'extraHourPrice', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Si es Suite: Mostrar inputs de Promociones Bonflix */}
                {type.key === 'suite' && (
                  <div className="mt-3 pt-3 border-t border-rose-100 bg-rose-50/50 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-rose-900 font-extrabold">
                      <Tv className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Promociones Bonflix (Suites):</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-600 text-[11px]">2h:</span>
                        <input
                          type="number"
                          min="0"
                          value={config.bonflix2hPrice ?? ''}
                          onChange={(e) => handleUpdateField(type.key, 'bonflix2hPrice', e.target.value)}
                          placeholder="150"
                          className="w-16 px-2 py-1 rounded-lg border border-rose-200 font-mono font-bold text-rose-700 bg-white text-xs"
                        />
                        <span className="text-[10px] text-slate-400">Bs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-600 text-[11px]">4h:</span>
                        <input
                          type="number"
                          min="0"
                          value={config.bonflix4hPrice ?? ''}
                          onChange={(e) => handleUpdateField(type.key, 'bonflix4hPrice', e.target.value)}
                          placeholder="190"
                          className="w-16 px-2 py-1 rounded-lg border border-rose-200 font-mono font-bold text-rose-700 bg-white text-xs"
                        />
                        <span className="text-[10px] text-slate-400">Bs</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bonflix Promotions Banner Card */}
        <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-purple-50 p-5 rounded-2xl border border-rose-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-600/30">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Promociones Bonflix (Exclusivas para Suites de 65 Bs/hora)
                </h3>
                <span className="bg-rose-100 text-rose-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-rose-200">
                  2h / 150 Bs • 4h / 190 Bs
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tarifas de streaming y estadía para suites estándar (Habitaciones 1, 5, 6, 11, 13, 15 y 16).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-xs font-bold text-slate-700">2h Bonflix:</span>
              <div className="w-20">
                <input
                  type="number"
                  min="0"
                  value={currentTariffs.suite?.bonflix2hPrice ?? currentTariffs.bonflix2hPrice ?? 150}
                  onChange={(e) => handleUpdateBonflix('bonflix2hPrice', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg border border-rose-300 font-mono font-extrabold text-rose-700 text-xs bg-rose-50/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <span className="text-xs font-bold text-slate-400">Bs</span>
            </div>

            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-xs font-bold text-slate-700">4h Bonflix:</span>
              <div className="w-20">
                <input
                  type="number"
                  min="0"
                  value={currentTariffs.suite?.bonflix4hPrice ?? currentTariffs.bonflix4hPrice ?? 190}
                  onChange={(e) => handleUpdateBonflix('bonflix4hPrice', e.target.value)}
                  className="w-full px-2 py-1 rounded-lg border border-rose-300 font-mono font-extrabold text-rose-700 text-xs bg-rose-50/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <span className="text-xs font-bold text-slate-400">Bs</span>
            </div>
          </div>
        </div>

        {/* Global Promotions Card */}
        <div className="bg-gradient-to-r from-amber-50 to-rose-50 p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Tarifa Especial: Promoción 3 Horas
              </h3>
              <p className="text-xs text-slate-500">
                Precio de promoción general disponible en la pantalla de registro para todas las habitaciones del motel (Ventilador, Aire, Suite, Jacuzzi y Golden Suite).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Precio Promoción:</span>
            <div className="w-32">
              <input
                type="number"
                min="0"
                value={currentTariffs.promo3hPrice}
                onChange={(e) => handleUpdatePromo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 font-mono font-extrabold text-brand-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">Bs</span>
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar Cambios de Tarifas
          </button>
        </div>
      </form>
    </div>
  );
};

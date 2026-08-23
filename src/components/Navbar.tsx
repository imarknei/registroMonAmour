import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatBs } from '../utils/formatUtils';
import {
  Volume2,
  VolumeX,
  UserCheck,
  LogOut,
  DollarSign,
  QrCode,
  Lock,
  Unlock,
  ChevronDown,
  Sparkles,
  BedDouble,
  Package,
  Sliders,
  History,
  CalendarDays,
  BarChart3,
  Flame,
  Cloud,
  ShieldAlert,
} from 'lucide-react';
import { SYSTEM_USERS } from '../data/initialData';

export type AdminViewType = 'rooms' | 'inventory' | 'tariffs' | 'shifts' | 'weekly' | 'reports' | 'firebase';

interface NavbarProps {
  currentView: AdminViewType;
  setCurrentView: (view: AdminViewType) => void;
  onOpenShiftCloseModal: () => void;
  onOpenAdminLogin: () => void;
  onLockAdmin: () => void;
  isAdminAuthenticated: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenShiftCloseModal,
  onOpenAdminLogin,
  onLockAdmin,
  isAdminAuthenticated,
}) => {
  const {
    currentUser,
    setCurrentUserById,
    currentShift,
    soundAlertsEnabled,
    toggleSoundAlerts,
    nowTimestamp,
  } = useApp();

  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const formattedTime = new Date(nowTimestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = new Date(nowTimestamp).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const handleUserSelect = (user: typeof SYSTEM_USERS[0]) => {
    setShowUserDropdown(false);
    if (user.role === 'admin') {
      if (!isAdminAuthenticated) {
        onOpenAdminLogin();
      } else {
        setCurrentUserById(user.id);
        setCurrentView('rooms');
      }
    } else {
      setCurrentUserById(user.id);
      setCurrentView('rooms');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                setCurrentView('rooms');
              }}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform">
                <Flame className="w-6 h-6 fill-white" />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-brand-700 via-brand-600 to-rose-600 bg-clip-text text-transparent">
                  MON AMOUR
                </span>
                <span className="block text-[10px] sm:text-xs font-semibold tracking-widest text-slate-400 uppercase -mt-1">
                  Motel • Sistema de Registro
                </span>
              </div>
            </button>
          </div>

          {/* Center: Live Clock and Active Shift Cash indicator */}
          <div className="hidden md:flex items-center gap-6">
            {/* Clock */}
            <div className="text-center px-3 py-1 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium capitalize block">{formattedDate}</span>
              <span className="text-sm font-bold font-mono text-slate-800 tracking-wide">{formattedTime}</span>
            </div>

            {/* Current Shift Cash Overview for Receptionist */}
            {currentUser.role !== 'admin' && currentShift && (
              <div className="flex items-center gap-3 bg-rose-50/70 border border-rose-200/80 rounded-xl px-3.5 py-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-none">Caja Chica</span>
                    <span className="text-xs font-bold font-mono">{formatBs(currentShift.initialCashFloat || 100)}</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-rose-200" />
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <DollarSign className="w-4 h-4" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block leading-none">Ventas Efec.</span>
                    <span className="text-xs font-bold font-mono">{formatBs(currentShift.expectedCash)}</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-rose-200" />
                <div className="flex items-center gap-1.5 text-sky-700">
                  <QrCode className="w-4 h-4" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block leading-none">QR (Vendis)</span>
                    <span className="text-xs font-bold font-mono">{formatBs(currentShift.expectedQr)}</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-rose-200" />
                <button
                  onClick={onOpenShiftCloseModal}
                  className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  title="Cerrar turno y realizar arqueo de caja"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar Turno
                </button>
              </div>
            )}
          </div>

          {/* Right Controls: Sound, Shift Action, User Selector */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Toggle */}
            <button
              onClick={toggleSoundAlerts}
              title={soundAlertsEnabled ? 'Alertas sonoras activadas' : 'Alertas sonoras silenciadas'}
              className={`p-2 rounded-xl border transition-all ${
                soundAlertsEnabled
                  ? 'bg-rose-50 text-brand-600 border-rose-200 hover:bg-rose-100'
                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {soundAlertsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Shift Close button for mobile */}
            {currentUser.role !== 'admin' && (
              <button
                onClick={onOpenShiftCloseModal}
                className="md:hidden px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                Caja
              </button>
            )}

            {/* Admin Lock Button (when logged in as admin) */}
            {currentUser.role === 'admin' && (
              <button
                onClick={onLockAdmin}
                title="Bloquear y Salir de Administrador"
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-brand-700 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bloquear Admin</span>
              </button>
            )}

            {/* User Dropdown Selector */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm text-left"
              >
                <div className={`w-8 h-8 rounded-lg ${currentUser.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                  {currentUser.role === 'admin' ? <Lock className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 block leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    {currentUser.shiftName}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-scale-in">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Cambiar de Cuenta / Turno
                    </span>
                    <span className="text-[11px] text-slate-500">
                      El acceso a Administrador (/admin) requiere contraseña
                    </span>
                  </div>

                  <div className="space-y-1">
                    {SYSTEM_USERS.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                          currentUser.id === user.id
                            ? 'bg-rose-50 border border-brand-200 text-brand-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg ${user.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                          {user.role === 'admin' ? <Lock className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold block truncate">{user.name}</span>
                            {user.role === 'admin' && (
                              <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                                /admin
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate">{user.shiftName}</span>
                        </div>
                        {currentUser.id === user.id && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        {currentUser.role === 'admin' && (
          <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2.5 border-t border-slate-100 no-scrollbar">
            <button
              onClick={() => setCurrentView('rooms')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                currentView === 'rooms'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              Habitaciones (Panel)
            </button>

            <button
              onClick={() => setCurrentView('inventory')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                currentView === 'inventory'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Inventario & Productos
            </button>

            <button
              onClick={() => setCurrentView('tariffs')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                currentView === 'tariffs'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Tarifas & Precios
            </button>

            <button
              onClick={() => setCurrentView('shifts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                currentView === 'shifts'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Historial de Cajas / Turnos
            </button>

            <button
              onClick={() => setCurrentView('weekly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                currentView === 'weekly'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Descuentos Semanales
            </button>

            <button
              onClick={() => setCurrentView('reports')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                currentView === 'reports'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Reportes y Ventas
            </button>

            <button
              onClick={() => setCurrentView('firebase')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                currentView === 'firebase'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              Base de Datos Firebase
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};

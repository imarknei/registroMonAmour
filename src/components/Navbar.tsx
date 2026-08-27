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
  Receipt,
  MinusCircle,
  Coffee,
  Coins,
} from 'lucide-react';
import { SYSTEM_USERS } from '../data/initialData';

export type AdminViewType = 'rooms' | 'registered_rooms' | 'inventory' | 'tariffs' | 'shifts' | 'weekly' | 'reports' | 'firebase';

interface NavbarProps {
  currentView: AdminViewType;
  setCurrentView: (view: AdminViewType) => void;
  onOpenShiftCloseModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenStaffConsumptionModal: () => void;
  onOpenAdminLogin: () => void;
  onLockAdmin: () => void;
  isAdminAuthenticated: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenShiftCloseModal,
  onOpenExpenseModal,
  onOpenStaffConsumptionModal,
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
    isFirestoreConnected,
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

  const totalShiftExpenses = (currentShift?.totalExpensesCash || 0) + (currentShift?.totalExpensesQr || 0);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo & Cloud Status */}
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
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-brand-700 via-brand-600 to-rose-600 bg-clip-text text-transparent">
                    MON AMOUR
                  </span>
                  {isFirestoreConnected && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      En vivo (Nube)
                    </span>
                  )}
                </div>
                <span className="block text-[10px] sm:text-xs font-semibold tracking-widest text-slate-400 uppercase -mt-1">
                  Motel • Sistema de Registro
                </span>
              </div>
            </button>
          </div>

          {/* Center: Live Clock and Active Shift Cash indicator */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {/* Clock */}
            <div className="text-center px-3 py-1 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium capitalize block">{formattedDate}</span>
              <span className="text-sm font-bold font-mono text-slate-800 tracking-wide">{formattedTime}</span>
            </div>

            {/* Current Shift Info for Receptionist (Arqueo ciego) */}
            {currentUser.role !== 'admin' && currentShift && (
              <div className="flex items-center gap-2.5 bg-rose-50/80 border border-rose-200/80 rounded-xl px-3 py-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block leading-none">Sesión</span>
                    <span className="text-xs font-black text-brand-800">{currentUser.shiftName}</span>
                  </div>
                </div>

                <div className="h-6 w-px bg-rose-200" />
                <div className="flex items-center gap-1.5 text-slate-700">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-none">Caja Chica</span>
                    <span className="text-xs font-bold font-mono">{formatBs(currentShift.initialCashFloat || 100)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Live Shift Overview */}
            {currentUser.role === 'admin' && currentShift && (
              <div className="flex items-center gap-2.5 bg-slate-900 text-white rounded-xl px-3 py-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <DollarSign className="w-3.5 h-3.5" />
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold block leading-none">Efec.</span>
                    <span className="text-xs font-bold font-mono">+{formatBs(currentShift.expectedCash)}</span>
                  </div>
                </div>

                <div className="h-5 w-px bg-slate-700" />
                <div className="flex items-center gap-1.5 text-sky-300">
                  <QrCode className="w-3.5 h-3.5" />
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold block leading-none">QR Total</span>
                    <span className="text-xs font-bold font-mono">+{formatBs(currentShift.expectedQr)}</span>
                  </div>
                </div>

                {totalShiftExpenses > 0 && (
                  <>
                    <div className="h-5 w-px bg-slate-700" />
                    <div className="flex items-center gap-1.5 text-rose-400">
                      <MinusCircle className="w-3.5 h-3.5" />
                      <div>
                        <span className="text-[9px] text-rose-300 uppercase font-semibold block leading-none">Pagos</span>
                        <span className="text-xs font-bold font-mono">-{formatBs(totalShiftExpenses)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Action Tools: Expense Modal, Sound Toggle, Shift Close & User Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* BOTÓN CONSUMO DEL PERSONAL */}
            <button
              onClick={onOpenStaffConsumptionModal}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-extrabold bg-rose-50 hover:bg-rose-100 text-brand-800 border border-rose-200 shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
              title="Registrar consumo de minibar tomado por el personal (para descontar en pago semanal)"
            >
              <Coffee className="w-3.5 h-3.5 text-brand-600" />
              <span className="hidden sm:inline">Consumo Personal</span>
              <span className="sm:hidden">Consumo</span>
            </button>

            {/* BOTÓN HACER PAGOS / SALIDA DE CAJA */}
            {currentUser.role !== 'admin' && (
              <button
                onClick={onOpenExpenseModal}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 border border-amber-600"
                title="Registrar pagos de turno (Coca-cola, albañil, insumos, jornales)"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Hacer Pagos</span>
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={toggleSoundAlerts}
              className={`p-2 sm:p-2.5 rounded-xl border transition-colors ${
                soundAlertsEnabled
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  : 'bg-rose-50 border-rose-300 text-rose-600 hover:bg-rose-100'
              }`}
              title={soundAlertsEnabled ? 'Alertas sonoras activadas' : 'Alertas sonoras silenciadas'}
            >
              {soundAlertsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Shift Button (Only for Receptionists) */}
            {currentUser.role !== 'admin' && (
              <button
                onClick={onOpenShiftCloseModal}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Cerrar Turno</span>
                <span className="sm:hidden">Cerrar</span>
              </button>
            )}

            {/* Admin Lock / Unlock Status Toggle */}
            {isAdminAuthenticated && (
              <button
                onClick={onLockAdmin}
                className="p-2 sm:px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors flex items-center gap-1"
                title="Bloquear sesión de Administrador"
              >
                <Unlock className="w-4 h-4 text-amber-600" />
                <span className="hidden lg:inline">Admin Activo</span>
              </button>
            )}

            {/* User Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors text-left"
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white ${
                    currentUser.role === 'admin'
                      ? 'bg-purple-600'
                      : currentUser.role === 'recepcionista_dia'
                      ? 'bg-amber-600'
                      : 'bg-indigo-600'
                  }`}
                >
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500 block leading-none">{currentUser.shiftName}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-scale-in">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Cambiar Usuario / Turno
                    </span>
                  </div>

                  <div className="py-1">
                    {SYSTEM_USERS.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className={`w-full px-3.5 py-2 text-left text-xs flex items-center gap-2.5 transition-colors ${
                          currentUser.id === user.id ? 'bg-rose-50/80 font-bold text-brand-700' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white shrink-0 ${
                            user.role === 'admin'
                              ? 'bg-purple-600'
                              : user.role === 'recepcionista_dia'
                              ? 'bg-amber-600'
                              : 'bg-indigo-600'
                          }`}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{user.name}</span>
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
              Panel de Habitaciones
            </button>

            <button
              onClick={() => setCurrentView('registered_rooms')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                currentView === 'registered_rooms'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5 text-rose-500" />
              Habitaciones & Precios (En Vivo)
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

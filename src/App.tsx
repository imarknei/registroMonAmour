import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Navbar, AdminViewType } from './components/Navbar';
import { HeaderStats } from './components/HeaderStats';
import { RoomGrid } from './components/RoomGrid';
import { RegisterModal } from './components/RegisterModal';
import { RoomDetailModal } from './components/RoomDetailModal';
import { ChangeRoomModal } from './components/ChangeRoomModal';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ExpenseModal } from './components/ExpenseModal';
import { StaffConsumptionModal } from './components/StaffConsumptionModal';
import { ExtraConsumptionModal } from './components/ExtraConsumptionModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ToastContainer } from './components/Toast';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Room, Stay } from './types';
import { Flame, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const { rooms, currentUser, setCurrentUserById, toasts, dismissToast, showToast } = useApp();

  // Navigation state
  const [currentView, setCurrentView] = useState<AdminViewType>('rooms');

  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('mon_amour_admin_auth') === 'true';
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // Modal states
  const [registerRoom, setRegisterRoom] = useState<Room | null>(null);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [changeRoomTarget, setChangeRoomTarget] = useState<Room | null>(null);
  const [isShiftCloseOpen, setIsShiftCloseOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isStaffConsumptionModalOpen, setIsStaffConsumptionModalOpen] = useState(false);
  const [isExtraConsumptionModalOpen, setIsExtraConsumptionModalOpen] = useState(false);
  const [receiptStay, setReceiptStay] = useState<Stay | null>(null);

  // Check URL path /admin or hash #admin on load & popstate
  useEffect(() => {
    const handleUrlRouting = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path === '/admin' || hash === '#admin') {
        if (!isAdminAuthenticated) {
          setIsAdminLoginModalOpen(true);
        } else {
          setCurrentUserById('user-admin');
          if (currentView === 'rooms') {
            setCurrentView('inventory');
          }
        }
      }
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    window.addEventListener('hashchange', handleUrlRouting);
    return () => {
      window.removeEventListener('popstate', handleUrlRouting);
      window.removeEventListener('hashchange', handleUrlRouting);
    };
  }, [isAdminAuthenticated]);

  // Modal handlers
  const handleOpenRegister = (room: Room) => {
    setRegisterRoom(room);
  };

  const handleOpenDetail = (room: Room) => {
    setDetailRoom(room);
  };

  const handleOpenQuickConsumption = (room: Room) => {
    setDetailRoom(room);
  };

  const handleOpenCheckout = (room: Room) => {
    setDetailRoom(room);
  };

  const handleOpenChangeRoom = (room: Room) => {
    setChangeRoomTarget(room);
  };

  const handleOpenReceipt = (stay: Stay) => {
    setReceiptStay(stay);
  };

  // Admin Login success handler
  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('mon_amour_admin_auth', 'true');
    setIsAdminLoginModalOpen(false);
    setCurrentUserById('user-admin');
    setCurrentView('inventory');
    showToast({
      title: '¡Acceso de Administrador Concedido!',
      message: 'Bienvenido al panel de control de Mon Amour.',
      type: 'success',
      durationMs: 4000,
    });
  };

  // Lock / Logout Admin
  const handleLockAdmin = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('mon_amour_admin_auth');
    setCurrentUserById('user-recep-dia');
    setCurrentView('rooms');
    window.history.pushState({}, '', '/');
    showToast({
      title: 'Sesión de Administrador Bloqueada',
      message: 'Regresando a la vista de Recepción.',
      type: 'info',
      durationMs: 4000,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Navbar with brand identity & user session */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenShiftCloseModal={() => setIsShiftCloseOpen(true)}
        onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
        onOpenStaffConsumptionModal={() => setIsStaffConsumptionModalOpen(true)}
        onOpenExtraConsumptionModal={() => setIsExtraConsumptionModalOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        onLockAdmin={handleLockAdmin}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Top Stats (Always visible or in room view) */}
        {currentView === 'rooms' && <HeaderStats />}

        {/* View Switcher */}
        {currentView === 'rooms' ? (
          <RoomGrid
            rooms={rooms}
            onOpenRegister={handleOpenRegister}
            onOpenDetail={handleOpenDetail}
            onOpenQuickConsumption={handleOpenQuickConsumption}
            onOpenCheckout={handleOpenCheckout}
            onOpenChangeRoom={handleOpenChangeRoom}
          />
        ) : (
          <AdminDashboard currentView={currentView} />
        )}
      </main>

      {/* Modals */}
      {registerRoom && (
        <RegisterModal
          room={registerRoom}
          onClose={() => setRegisterRoom(null)}
        />
      )}

      {detailRoom && (
        <RoomDetailModal
          room={detailRoom}
          onClose={() => setDetailRoom(null)}
          onOpenReceipt={handleOpenReceipt}
          onOpenChangeRoom={handleOpenChangeRoom}
        />
      )}

      {changeRoomTarget && (
        <ChangeRoomModal
          sourceRoom={changeRoomTarget}
          onClose={() => setChangeRoomTarget(null)}
          onSuccess={() => {
            setDetailRoom(null);
            setChangeRoomTarget(null);
          }}
        />
      )}

      {isShiftCloseOpen && (
        <ShiftCloseModal
          isOpen={isShiftCloseOpen}
          onClose={() => setIsShiftCloseOpen(false)}
        />
      )}

      {isExpenseModalOpen && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
        />
      )}

      <StaffConsumptionModal
        isOpen={isStaffConsumptionModalOpen}
        onClose={() => setIsStaffConsumptionModalOpen(false)}
      />

      <ExtraConsumptionModal
        isOpen={isExtraConsumptionModalOpen}
        onClose={() => setIsExtraConsumptionModalOpen(false)}
      />

      {receiptStay && (
        <ReceiptModal
          stay={receiptStay}
          onClose={() => setReceiptStay(null)}
        />
      )}

      {/* Admin Password Gate Modal for /admin and 'Imark133' */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* Interactive Toast Notifications with Sound & Undo */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-brand-600 flex items-center justify-center text-white">
              <Flame className="w-3 h-3 fill-white" />
            </div>
            <span className="font-extrabold text-slate-800 tracking-wider">MON AMOUR</span>
            <span>•</span>
            <span>Sistema de Registro & Gestión de Habitaciones</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>
              Usuario actual: <strong className="text-slate-700">{currentUser.name}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Sesión Segura
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

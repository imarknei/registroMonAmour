import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { InventoryManager } from './InventoryManager';
import { TariffManager } from './TariffManager';
import { ShiftHistory } from './ShiftHistory';
import { WeeklyDiscounts } from './WeeklyDiscounts';
import { SalesReports } from './SalesReports';
import { FirebaseConfigManager } from './FirebaseConfigManager';
import { RegisteredRoomsView } from './RegisteredRoomsView';
import { EnvelopesManager } from './EnvelopesManager';
import { StaffReports } from './StaffReports';

export type AdminSubView =
  | 'registered_rooms'
  | 'inventory'
  | 'tariffs'
  | 'shifts'
  | 'weekly'
  | 'reports'
  | 'firebase'
  | 'envelopes'
  | 'staff_reports';

interface AdminDashboardProps {
  currentView: AdminSubView;
  onBackToRooms?: () => void;
  onLockInventory?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentView,
  onBackToRooms,
  onLockInventory,
}) => {
  const { currentUser } = useApp();

  const canAccessStaffReports =
    currentUser.role === 'admin' ||
    currentUser.role === 'recepcionista_dia' ||
    currentUser.id === 'user-admin' ||
    currentUser.id === 'user-recep-dia';

  // Si no es admin y no está autorizado para inventario o informe de personal, regresar de inmediato a habitaciones
  useEffect(() => {
    if (currentUser.role !== 'admin') {
      if (currentView === 'inventory') return;
      if (currentView === 'staff_reports' && canAccessStaffReports) return;
      onBackToRooms?.();
    }
  }, [currentUser.role, currentView, onBackToRooms, canAccessStaffReports]);

  if (currentUser.role !== 'admin') {
    if (currentView === 'inventory') {
      return <InventoryManager onBackToRooms={onBackToRooms} onLockInventory={onLockInventory} />;
    }
    if (currentView === 'staff_reports' && canAccessStaffReports) {
      return <StaffReports onBackToRooms={onBackToRooms} />;
    }
    return null;
  }

  switch (currentView) {
    case 'registered_rooms':
      return <RegisteredRoomsView />;
    case 'envelopes':
      return <EnvelopesManager />;
    case 'inventory':
      return <InventoryManager onBackToRooms={onBackToRooms} onLockInventory={onLockInventory} />;
    case 'tariffs':
      return <TariffManager />;
    case 'shifts':
      return <ShiftHistory />;
    case 'weekly':
      return <WeeklyDiscounts />;
    case 'reports':
      return <SalesReports />;
    case 'firebase':
      return <FirebaseConfigManager />;
    case 'staff_reports':
      return <StaffReports onBackToRooms={onBackToRooms} />;
    default:
      return currentUser.role === 'admin' ? <RegisteredRoomsView /> : null;
  }
};

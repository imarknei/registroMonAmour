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

export type AdminSubView = 'registered_rooms' | 'inventory' | 'tariffs' | 'shifts' | 'weekly' | 'reports' | 'firebase' | 'envelopes';

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

  // Si no es admin y la vista no es inventario, regresar de inmediato a habitaciones
  useEffect(() => {
    if (currentUser.role !== 'admin' && currentView !== 'inventory') {
      onBackToRooms?.();
    }
  }, [currentUser.role, currentView, onBackToRooms]);

  if (currentUser.role !== 'admin' && currentView !== 'inventory') {
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
    default:
      return currentUser.role === 'admin' ? <RegisteredRoomsView /> : null;
  }
};

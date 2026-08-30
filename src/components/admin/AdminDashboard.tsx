import React from 'react';
import { InventoryManager } from './InventoryManager';
import { TariffManager } from './TariffManager';
import { ShiftHistory } from './ShiftHistory';
import { WeeklyDiscounts } from './WeeklyDiscounts';
import { SalesReports } from './SalesReports';
import { FirebaseConfigManager } from './FirebaseConfigManager';
import { RegisteredRoomsView } from './RegisteredRoomsView';

export type AdminSubView = 'registered_rooms' | 'inventory' | 'tariffs' | 'shifts' | 'weekly' | 'reports' | 'firebase';

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
  switch (currentView) {
    case 'registered_rooms':
      return <RegisteredRoomsView />;
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
      return <RegisteredRoomsView />;
  }
};

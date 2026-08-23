import React from 'react';
import { InventoryManager } from './InventoryManager';
import { TariffManager } from './TariffManager';
import { ShiftHistory } from './ShiftHistory';
import { WeeklyDiscounts } from './WeeklyDiscounts';
import { SalesReports } from './SalesReports';
import { FirebaseConfigManager } from './FirebaseConfigManager';

interface AdminDashboardProps {
  currentView: 'inventory' | 'tariffs' | 'shifts' | 'weekly' | 'reports' | 'firebase';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentView }) => {
  switch (currentView) {
    case 'inventory':
      return <InventoryManager />;
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
      return null;
  }
};

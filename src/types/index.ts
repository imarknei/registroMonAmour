export type RoomType = 'suite' | 'ventilador' | 'jacuzzi' | 'aire' | 'golden_suite';

export type RoomStatus = 'disponible' | 'ocupada' | 'limpieza';

export interface RoomTariffConfig {
  price1h?: number;
  price2h?: number;
  price3h?: number;
  priceNight?: number; // 12 horas / Noche
  extraHourPrice: number;
}

export type TariffCatalog = Record<RoomType, RoomTariffConfig> & {
  promo3hPrice: number; // Promoción 3 horas por 190 Bs
};

export interface Room {
  id: string;
  number: string;
  name: string;
  type: RoomType;
  tag: string;
  status: RoomStatus;
  currentStay?: Stay;
  cleaningStartTime?: string;
}

export type PlanType = '1h' | '2h' | '3h' | 'promo190' | 'promo3h' | 'noche12h' | 'noche' | 'personalizado';

export type PaymentMethod = 'efectivo' | 'qr' | 'mixto';

export interface ConsumptionItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  timestamp: string;
}

export interface Stay {
  id: string;
  roomId: string;
  roomName: string;
  roomType: RoomType;
  receptionistId: string;
  receptionistName: string;
  startTime: string; // ISO String
  chosenDurationMinutes: number;
  chosenPlan: PlanType;
  baseRoomPrice: number;
  paymentMethod: PaymentMethod;
  cashPaid?: number; // Para pago mixto o desglose
  qrPaid?: number;   // Para pago mixto o desglose
  consumptions: ConsumptionItem[];
  vehiclePlate?: string;
  notes?: string;
  overtimeMinutes?: number;
  overtimeCharge?: number;
  totalAmount?: number;
  status: 'active' | 'completed' | 'cancelled';
  endTime?: string;
  closedBy?: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  undoAction?: () => void;
  undoLabel?: string;
  durationMs?: number;
}

export type ProductCategory = 
  | 'preservativos' 
  | 'bebidas_alcohol' 
  | 'bebidas_sin_alcohol' 
  | 'snacks' 
  | 'higiene_otros';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  minStockAlert: number;
  description?: string;
}

export type UserRole = 'admin' | 'recepcionista_dia' | 'recepcionista_noche';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  username: string;
  shiftName: string;
  avatarColor: string;
}

export type ShiftType = 'dia' | 'noche';

export type ExpenseCategory =
  | 'proveedores'       // Ej: Coca-Cola, Cerveza, Bebidas, Preservativos
  | 'mantenimiento'     // Ej: Albañil, Plomero, Electricista, Reparaciones
  | 'servicios'         // Ej: Luz, Agua, Internet, Gas
  | 'limpieza_insumos'  // Ej: Detergentes, Papel higiénico, Jabón
  | 'personal_adelanto' // Ej: Pago de jornales, adelanto de sueldo
  | 'otros';

export interface Expense {
  id: string;
  description: string; // Ej: "Coca-Cola (packs de mini sodas)", "Albañil reparación hab 3"
  category: ExpenseCategory;
  amount: number;
  paymentMethod: 'efectivo' | 'qr';
  timestamp: string;
  shiftId: string;
  registeredById: string;
  registeredByName: string;
  receiptNumber?: string;
  notes?: string;
}

export interface Shift {
  id: string;
  receptionistId: string;
  receptionistName: string;
  responsiblePersonName?: string; // Nombre de la persona física que entrega el turno
  shiftType: ShiftType;
  startTime: string;
  endTime?: string;
  status: 'open' | 'closed';
  initialCashFloat: number; // Fondo de caja chica recibido al iniciar
  handoverCashFloat?: number; // Fondo de caja chica dejado al siguiente turno
  expectedCash: number; // Ventas esperadas en efectivo
  expectedQr: number;   // Ventas esperadas en QR
  expenses?: Expense[]; // Lista de pagos/egresos registrados durante el turno
  totalExpensesCash?: number; // Total egresos pagados en efectivo
  totalExpensesQr?: number;   // Total egresos pagados en QR
  totalPhysicalCashInDrawer?: number; // Total físico contado en gaveta
  declaredCash?: number; // Ventas netas declaradas en efectivo (Total contado - Fondo + Egresos)
  declaredQr?: number;   // Ventas declaradas en QR
  differenceCash?: number;
  differenceQr?: number;
  totalDifference?: number; // differenceCash + differenceQr (negative = deficit/discount)
  discountAmount?: number; // Positive number representing the penalty/discount to be deducted
  notes?: string;
  salesCount: number;
  stayIds: string[];
  handoverActiveRoomsCount?: number; // Habitaciones que quedaron ocupadas al traspasar el turno
}

export interface WeeklyDiscountReport {
  weekKey: string; // e.g. "2026-W34"
  startDate: string;
  endDate: string;
  receptionistId: string;
  receptionistName: string;
  shifts: Shift[];
  totalExpectedCash: number;
  totalExpectedQr: number;
  totalDeclaredCash: number;
  totalDeclaredQr: number;
  totalExpensesCash?: number;
  totalExpensesQr?: number;
  totalFaltante: number;
  totalDiscount: number;
}

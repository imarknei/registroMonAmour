export type RoomType = 'suite' | 'ventilador' | 'jacuzzi' | 'aire' | 'golden_suite';

export type RoomStatus = 'disponible' | 'ocupada' | 'limpieza';

export interface RoomTariffConfig {
  price1h?: number;
  price2h?: number;
  price2hWeekend?: number; // Tarifa 2 Horas Fin de Semana (Viernes, Sábado y Domingo)
  price3h?: number;
  price2hNight?: number; // Paquete 2 Horas Suite Noche (100 Bs)
  bonflix2hPrice?: number; // Promoción 2 Horas con Bonflix (150 Bs)
  bonflix4hPrice?: number; // Promoción 4 Horas con Bonflix (190 Bs)
  priceNight?: number; // 12 horas / Noche
  extraHourPrice: number;
}

export type TariffCatalog = Record<RoomType, RoomTariffConfig> & {
  promo3hPrice: number; // Promoción 3 horas por 190 Bs
  bonflix2hPrice?: number; // Promoción Bonflix 2 horas por 150 Bs
  bonflix4hPrice?: number; // Promoción Bonflix 4 horas por 190 Bs
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

export type PlanType =
  | '1h'
  | '2h'
  | '3h'
  | '2h_noche'
  | 'bonflix_2h'
  | 'bonflix_4h'
  | 'promo190'
  | 'promo3h'
  | 'noche12h'
  | 'noche'
  | 'personalizado';

export type PaymentMethod = 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr' | 'mixto';

export interface ConsumptionItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  timestamp: string;
  isPaid?: boolean; // True si se pagó en el momento (al contado), False si se carga a la cuenta
  paymentMethod?: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
  paidAt?: string;
  paidShiftId?: string;
  paidReceptionistId?: string;
  paidReceptionistName?: string;
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
  isPrepaid?: boolean; // Verdadero si el cliente pagó por adelantado al ingresar
  prepaidAmount?: number; // Monto pagado al entrar
  prepaidCash?: number;
  prepaidQrVendis?: number;
  prepaidQrUnion?: number;
  prepaidQr?: number; // Suma QR
  cashPaid?: number; // Total acumulado cobrado en efectivo
  qrVendisPaid?: number; // Total acumulado cobrado en QR Vendis
  qrUnionPaid?: number; // Total acumulado cobrado en QR Banco Unión
  qrPaid?: number;   // Total acumulado cobrado en QR
  finalCashPaid?: number; // Cobrado en efectivo exclusivamente al checkout
  finalQrVendisPaid?: number; // Cobrado en QR Vendis exclusivamente al checkout
  finalQrUnionPaid?: number; // Cobrado en QR Banco Unión exclusivamente al checkout
  finalQrPaid?: number; // Cobrado en QR total exclusivamente al checkout
  entryShiftId?: string; // ID del turno donde se registró el ingreso / adelanto
  checkoutShiftId?: string; // ID del turno donde se realizó el cobro de salida / checkout
  checkoutReceptionistId?: string; // ID del recepcionista que cobró la salida
  checkoutReceptionistName?: string; // Nombre del recepcionista que cobró la salida
  consumptions: ConsumptionItem[];
  vehiclePlate?: string;
  notes?: string;
  overtimeMinutes?: number;
  overtimeCharge?: number;
  totalAmount?: number;
  status: 'active' | 'completed' | 'cancelled';
  endTime?: string;
  closedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  restoreInventoryOnCancel?: boolean;
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
  paymentMethod: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
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
  expectedQrVendis?: number; // Ventas esperadas en QR Vendis
  expectedQrUnion?: number; // Ventas esperadas en QR Banco Unión
  expectedQr: number;   // Ventas esperadas en QR total
  expenses?: Expense[]; // Lista de pagos/egresos registrados durante el turno
  totalExpensesCash?: number; // Total egresos pagados en efectivo
  totalExpensesQrVendis?: number; // Total egresos pagados en QR Vendis
  totalExpensesQrUnion?: number; // Total egresos pagados en QR Banco Unión
  totalExpensesQr?: number;   // Total egresos pagados en QR total
  totalPhysicalCashInDrawer?: number; // Total físico contado en gaveta por el recepcionista
  declaredCash?: number; // Ventas netas declaradas en efectivo (Total contado - Fondo + Egresos)
  declaredQrVendis?: number; // Ventas declaradas en QR Vendis
  declaredQrUnion?: number; // Ventas declaradas en QR Banco Unión
  declaredQr?: number;   // Ventas declaradas en QR total
  differenceCash?: number;
  differenceQrVendis?: number;
  differenceQrUnion?: number;
  differenceQr?: number;
  totalDifference?: number; // differenceCash + differenceQr (negative = deficit/discount, positive = surplus)
  discountAmount?: number; // Faltante a descontar (positivo)
  surplusAmount?: number; // Demasía / Sobrante (positivo)
  notes?: string;
  salesCount: number;
  stayIds: string[];
  handoverActiveRoomsCount?: number; // Habitaciones que quedaron ocupadas al traspasar el turno
  handedOverTo?: string; // Nombre del recepcionista a quien entrega la caja (turno entrante)
  isSettled?: boolean; // True si el faltante ya fue descontado en un pago semanal
  settlementId?: string; // ID del comprobante de liquidación
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

// ----------------------------------------------------
// MODELO DE CONSUMO DE PERSONAL Y LIQUIDACIÓN SEMANAL
// ----------------------------------------------------

export interface StaffMember {
  id: string;
  name: string;
  role: string; // 'recepcionista', 'limpieza', 'mantenimiento', 'administracion', 'otro'
  shiftName?: string;
  defaultWeeklySalary?: number; // Sueldo base semanal sugerido (ej: 700 Bs)
  active?: boolean;
}

export interface StaffConsumptionItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface StaffConsumption {
  id: string;
  staffId: string; // ID o nombre del empleado
  staffName: string;
  date: string; // ISO date
  items: StaffConsumptionItem[];
  totalAmount: number;
  notes?: string;
  shiftId?: string;
  recordedBy: string; // Nombre de quien lo registró
  isPaid?: boolean; // True si pagó al contado/en el acto, False si es a descontar de su semana
  paymentType?: 'descuento_semanal' | 'pagado_ahora';
  paymentMethod?: PaymentMethod; // 'efectivo', 'qr_vendis', 'qr_union'
  isSettled?: boolean; // True si ya fue descontado en una liquidación semanal
  settlementId?: string; // ID del pago semanal
  settledAt?: string;
}

export interface StaffSettlementDiscountItem {
  id: string;
  type: 'shift_shortage' | 'staff_consumption' | 'custom_discount';
  refId?: string; // ID del turno o del consumo
  description: string;
  amount: number;
  date: string;
}

export interface StaffSettlement {
  id: string;
  staffId: string;
  staffName: string;
  periodStart: string;
  periodEnd: string;
  weekKey: string;
  baseSalary: number;
  daysWorkedCount?: number;
  shiftsWorkedCount?: number;
  discounts: StaffSettlementDiscountItem[];
  totalDiscounts: number;
  netPaidAmount: number; // baseSalary - totalDiscounts
  paymentDate: string;
  paidBy: string; // Administrador
  status: 'paid';
  notes?: string;
  paymentMethod: 'efectivo' | 'transferencia' | 'qr';
}

// ----------------------------------------------------
// MODELO DE CONSUMOS EXTRAS / VENTAS DIRECTAS EN RECEPCIÓN
// ----------------------------------------------------

export interface ExtraConsumptionItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ExtraConsumption {
  id: string;
  description: string; // Ej: "Consumo Habitación 3 (Salida / Cerrada)", "Venta Mostrador Recepción"
  roomNumber?: string; // Opcional: "3", "1", "Recepción"
  originType: 'habitacion_cerrada' | 'mostrador_recepcion' | 'cliente_espera' | 'otro';
  date: string; // ISO date
  items: ExtraConsumptionItem[];
  totalAmount: number;
  paymentMethod: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
  shiftId?: string;
  registeredById: string;
  registeredByName: string;
  notes?: string;
}


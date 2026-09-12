import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  Room,
  RoomStatus,
  Product,
  TariffCatalog,
  User,
  Shift,
  Stay,
  ToastMessage,
  PaymentMethod,
  ConsumptionItem,
  Expense,
  ExpenseCategory,
  ShiftIncome,
  IncomeCategory,
  PlanType,
  StaffMember,
  StaffConsumption,
  StaffSettlement,
  StaffSettlementDiscountItem,
  ExtraConsumption,
  InventoryMovementLog,
  InventoryActionType,
  ShiftReconciledMetrics,
} from '../types';
import {
  INITIAL_ROOMS,
  INITIAL_TARIFFS,
  INITIAL_PRODUCTS,
  SYSTEM_USERS,
  INITIAL_STAFF_MEMBERS,
} from '../data/initialData';
import { calculateStayTime, formatDateTime } from '../utils/timeUtils';
import {
  playWarningBeep,
  playOvertimeAlert,
  playSuccessChime,
  playAddConsumptionSound,
  playUndoSound,
} from '../utils/soundUtils';
import { formatBs, getPaymentMethodLabel } from '../utils/formatUtils';
import {
  initializeFirebaseClient,
  getNetworkTimestamp,
  getNetworkDate,
  getNetworkIsoString,
  subscribeToRooms,
  subscribeToProducts,
  subscribeToTariffs,
  subscribeToExpenses,
  subscribeToIncomes,
  subscribeToAllShifts,
  subscribeToAllStays,
  subscribeToStaffConsumptions,
  syncStaffConsumptionToFirestore,
  deleteStaffConsumptionFromFirebase,
  subscribeToStaffSettlements,
  syncStaffSettlementToFirestore,
  subscribeToExtraConsumptions,
  syncExtraConsumptionToFirestore,
  deleteExtraConsumptionFromFirebase,
  subscribeToInventoryLogs,
  syncInventoryLogToFirestore,
  deleteInventoryLogFromFirebase,
  syncRoomToFirestore,
  syncProductToFirestore,
  deleteProductFromFirestore,
  syncTariffsToFirestore,
  syncShiftToFirestore,
  deleteShiftFromFirebase,
  syncStayToFirebase,
  syncCompletedStayToFirebase,
  syncExpenseToFirestore,
  syncIncomeToFirestore,
  deleteIncomeFromFirebase,
  getFirebaseDb,
  getStoredFirebaseConfig,
  fetchInitialDataRest,
} from '../services/firebase';

interface AppContextType {
  // State
  rooms: Room[];
  tariffs: TariffCatalog;
  products: Product[];
  currentUser: User;
  currentShift: Shift | null;
  shiftsHistory: Shift[];
  completedStays: Stay[];
  expenses: Expense[];
  incomes: ShiftIncome[];
  staffConsumptions: StaffConsumption[];
  staffSettlements: StaffSettlement[];
  staffMembers: StaffMember[];
  extraConsumptions: ExtraConsumption[];
  inventoryLogs: InventoryMovementLog[];
  soundAlertsEnabled: boolean;
  toasts: ToastMessage[];
  nowTimestamp: number;
  isFirestoreConnected: boolean;

  // Actions
  reloadFromFirebase: () => Promise<any>;
  setCurrentUserById: (userId: string) => void;
  toggleSoundAlerts: () => void;
  showToast: (toast: Omit<ToastMessage, 'id'>) => string;
  dismissToast: (id: string) => void;

  registerStay: (entryData: {
    roomId: string;
    chosenPlan: PlanType;
    durationMinutes?: number;
    chosenDurationMinutes?: number;
    basePrice: number;
    paymentMethod: PaymentMethod;
    isPrepaid?: boolean;
    prepaidAmount?: number;
    prepaidCash?: number;
    prepaidQrVendis?: number;
    prepaidQrUnion?: number;
    prepaidQr?: number;
    cashPaid?: number;
    qrVendisPaid?: number;
    qrUnionPaid?: number;
    qrPaid?: number;
    vehiclePlate?: string;
    notes?: string;
    isCustomPackage?: boolean;
    customPackageName?: string;
  }) => void;
  registerRoomEntry: (entryData: {
    roomId: string;
    chosenPlan: PlanType;
    durationMinutes?: number;
    chosenDurationMinutes?: number;
    basePrice: number;
    paymentMethod: PaymentMethod;
    isPrepaid?: boolean;
    prepaidAmount?: number;
    prepaidCash?: number;
    prepaidQrVendis?: number;
    prepaidQrUnion?: number;
    prepaidQr?: number;
    cashPaid?: number;
    qrVendisPaid?: number;
    qrUnionPaid?: number;
    qrPaid?: number;
    vehiclePlate?: string;
    notes?: string;
    isCustomPackage?: boolean;
    customPackageName?: string;
  }) => void;
  addConsumptionToRoom: (
    roomId: string,
    productId: string,
    quantity?: number,
    paymentOptions?: {
      isPaid: boolean;
      paymentMethod?: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
    }
  ) => boolean;
  addCustomConsumptionToRoom: (
    roomId: string,
    customData: {
      name: string;
      unitPrice: number;
      quantity?: number;
      isPaid?: boolean;
      paymentMethod?: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
      notes?: string;
    }
  ) => boolean;
  removeConsumptionFromRoom: (roomId: string, consumptionId: string, silent?: boolean) => void;
  closeStayAndCheckout: (
    roomId: string,
    checkoutData: {
      finalPaymentMethod?: PaymentMethod;
      cashPaid?: number;
      qrVendisPaid?: number;
      qrUnionPaid?: number;
      qrPaid?: number;
      notes?: string;
      setCleaning?: boolean;
    }
  ) => Stay | null;
  changeRoomStatus: (roomId: string, newStatus: RoomStatus) => void;
  changeRoom: (
    currentRoomId: string,
    targetRoomId: string,
    reason: string,
    options?: {
      oldRoomStatus?: 'limpieza' | 'disponible';
    }
  ) => boolean;

  // Expenses / Shift Payments
  addExpenseToShift: (expenseData: {
    description: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
    receiptNumber?: string;
    notes?: string;
  }) => void;

  // Incomes / Cash Inflows (Alquileres, cambio de compras, dinero para cambio)
  addIncomeToShift: (incomeData: {
    description: string;
    category: IncomeCategory;
    amount: number;
    paymentMethod: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
    receiptNumber?: string;
    notes?: string;
  }) => void;
  removeIncomeFromShift: (id: string) => void;

  // Extra Consumptions / Direct Counter Sales
  addExtraConsumption: (data: {
    description: string;
    roomNumber?: string;
    originType?: 'habitacion_cerrada' | 'mostrador_recepcion' | 'cliente_espera' | 'otro';
    items: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[];
    totalAmount: number;
    paymentMethod: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
    notes?: string;
  }) => ExtraConsumption;
  removeExtraConsumption: (id: string, restoreInventory?: boolean) => void;

  // Staff Consumptions & Payroll Settlements
  addStaffConsumption: (consumptionData: {
    staffId: string;
    staffName: string;
    items: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[];
    totalAmount: number;
    isPaid?: boolean;
    paymentType?: 'descuento_semanal' | 'pagado_ahora';
    paymentMethod?: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
    notes?: string;
  }) => StaffConsumption;
  removeStaffConsumption: (id: string, restoreInventory?: boolean) => void;
  recordStaffSettlement: (settlementData: {
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
    netPaidAmount: number;
    notes?: string;
    paymentMethod: 'efectivo' | 'transferencia' | 'qr';
  }) => StaffSettlement;
  saveStaffMember: (member: StaffMember) => void;

  // Shift & Cash Closing
  closeCurrentShift: (
    responsiblePersonName: string,
    nextReceptionistName: string,
    totalPhysicalCashInDrawer: number,
    declaredQrVendis: number,
    declaredQrUnion: number,
    handoverCashFloat: number,
    notes?: string,
    cashDeliveredAtClose?: number
  ) => Shift | null;
  updateShiftInHistory: (shiftId: string, updatedData: Partial<Shift>) => boolean;
  deleteShiftFromHistory: (shiftId: string) => void;
  recalculateShiftSales: (shift: Shift) => Shift;
  recalculateAllSeptemberShifts: () => Promise<number>;
  markShiftEnvelopeCollected: (
    shiftId: string,
    collectedBy?: string,
    notes?: string,
    status?: 'pendiente' | 'recogido'
  ) => boolean;

  // Admin functions
  cancelStay: (stayId: string, reason: string, restoreInventory?: boolean) => boolean;
  updateStay: (
    updatedStay: Stay,
    options?: { previousConsumptions?: ConsumptionItem[]; restoreStockDiff?: boolean }
  ) => boolean;
  cleanupOrphanShifts: () => Promise<number>;
  saveProduct: (
    product: Product,
    options?: { logAction?: InventoryActionType; quantityAdded?: number; notes?: string }
  ) => void;
  deleteProductById: (productId: string) => void;
  addInventoryLog: (log: Omit<InventoryMovementLog, 'id' | 'timestamp' | 'date'> & { date?: string }) => void;
  deleteInventoryLogById: (logId: string) => void;
  updateTariffCatalog: (tariffs: TariffCatalog) => void;
  resetAllDataToDefaults: () => void;
  exportDatabaseJson: () => void;
  importDatabaseJson: (jsonString: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROOMS: 'mon_amour_rooms_v1',
  TARIFFS: 'mon_amour_tariffs_v1',
  PRODUCTS: 'mon_amour_products_v1',
  CURRENT_USER_ID: 'mon_amour_user_id_v1',
  SHIFTS_HISTORY: 'mon_amour_shifts_v1',
  ACTIVE_SHIFTS: 'mon_amour_active_shifts_v1',
  COMPLETED_STAYS: 'mon_amour_completed_stays_v1',
  EXPENSES: 'mon_amour_expenses_v1',
  INCOMES: 'mon_amour_incomes_v1',
  SOUND_ENABLED: 'mon_amour_sound_enabled_v1',
  STAFF_CONSUMPTIONS: 'mon_amour_staff_consumptions_v1',
  STAFF_SETTLEMENTS: 'mon_amour_staff_settlements_v1',
  STAFF_MEMBERS: 'mon_amour_staff_members_v1',
  EXTRA_CONSUMPTIONS: 'mon_amour_extra_consumptions_v1',
  INVENTORY_LOGS: 'mon_amour_inventory_logs_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State from LocalStorage
  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROOMS);
      return saved ? JSON.parse(saved) : INITIAL_ROOMS;
    } catch {
      return INITIAL_ROOMS;
    }
  });

  const [tariffs, setTariffs] = useState<TariffCatalog>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TARIFFS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_TARIFFS,
          ...parsed,
          ventilador: { ...INITIAL_TARIFFS.ventilador, ...(parsed.ventilador || {}) },
          aire: { ...INITIAL_TARIFFS.aire, ...(parsed.aire || {}) },
          suite: { ...INITIAL_TARIFFS.suite, ...(parsed.suite || {}) },
          jacuzzi: { ...INITIAL_TARIFFS.jacuzzi, ...(parsed.jacuzzi || {}) },
          golden_suite: { ...INITIAL_TARIFFS.golden_suite, ...(parsed.golden_suite || {}) },
        };
      }
      return INITIAL_TARIFFS;
    } catch {
      return INITIAL_TARIFFS;
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || SYSTEM_USERS[1].id;
    } catch {
      return SYSTEM_USERS[1].id;
    }
  });

  const [shiftsHistory, setShiftsHistory] = useState<Shift[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHIFTS_HISTORY);
      if (saved) {
        const parsed: Shift[] = JSON.parse(saved);
        const openShifts = parsed.filter((s) => s.status === 'open');
        if (openShifts.length > 1) {
          openShifts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
          const latestOpen = openShifts[0];
          const orphanIds = new Set(openShifts.slice(1).map((s) => s.id));
          return parsed.map((s) =>
            orphanIds.has(s.id)
              ? { ...s, status: 'closed' as const, endTime: s.endTime || new Date().toISOString() }
              : s
          );
        }
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [activeShifts, setActiveShifts] = useState<Record<string, Shift>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFTS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [completedStays, setCompletedStays] = useState<Stay[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPLETED_STAYS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [incomes, setIncomes] = useState<ShiftIncome[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INCOMES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [staffConsumptions, setStaffConsumptions] = useState<StaffConsumption[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STAFF_CONSUMPTIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [staffSettlements, setStaffSettlements] = useState<StaffSettlement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STAFF_SETTLEMENTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STAFF_MEMBERS);
      return saved ? JSON.parse(saved) : INITIAL_STAFF_MEMBERS;
    } catch {
      return INITIAL_STAFF_MEMBERS;
    }
  });

  const [extraConsumptions, setExtraConsumptions] = useState<ExtraConsumption[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXTRA_CONSUMPTIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [inventoryLogs, setInventoryLogs] = useState<InventoryMovementLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVENTORY_LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => getNetworkTimestamp());
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const shiftsLoadedFromFirestoreRef = useRef<boolean>(false);

  // Carga ultra rápida instantánea vía REST API (inmune a retrasos de WebSocket y cachés locales vacíos)
  const reloadFromFirebase = useCallback(async () => {
    try {
      const data = await fetchInitialDataRest();
      if (data) {
        if (data.shifts && data.shifts.length > 0) {
          shiftsLoadedFromFirestoreRef.current = true;
          setShiftsHistory(data.shifts);
          localStorage.setItem(STORAGE_KEYS.SHIFTS_HISTORY, JSON.stringify(data.shifts));

          const openShifts = data.shifts.filter((s) => s.status === 'open');
          if (openShifts.length > 0) {
            const activeMap: Record<string, Shift> = {};
            openShifts.forEach((s) => {
              activeMap[s.receptionistId] = s;
            });
            setActiveShifts(activeMap);
          }
        }
        if (data.stays && data.stays.length > 0) {
          setCompletedStays(data.stays);
          localStorage.setItem(STORAGE_KEYS.COMPLETED_STAYS, JSON.stringify(data.stays));
        }
        if (data.rooms && data.rooms.length > 0) {
          setRooms(data.rooms);
          localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(data.rooms));
        }
        if (data.incomes) {
          setIncomes(data.incomes);
          localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(data.incomes));
        }
        if (data.expenses && data.expenses.length > 0) {
          setExpenses(data.expenses);
          localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
        }
        if (data.products && data.products.length > 0) {
          setProducts(data.products);
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
        }
        setIsFirestoreConnected(true);
        return data;
      }
    } catch (err) {
      console.warn('Aviso recargando desde Firebase:', err);
    }
    return null;
  }, []);

  // Cargar inmediatamente vía REST al iniciar la app
  useEffect(() => {
    reloadFromFirebase();
  }, [reloadFromFirebase]);

  // 2. Persist to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TARIFFS, JSON.stringify(tariffs));
  }, [tariffs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHIFTS_HISTORY, JSON.stringify(shiftsHistory));
  }, [shiftsHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SHIFTS, JSON.stringify(activeShifts));
  }, [activeShifts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPLETED_STAYS, JSON.stringify(completedStays));
  }, [completedStays]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STAFF_CONSUMPTIONS, JSON.stringify(staffConsumptions));
  }, [staffConsumptions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STAFF_SETTLEMENTS, JSON.stringify(staffSettlements));
  }, [staffSettlements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STAFF_MEMBERS, JSON.stringify(staffMembers));
  }, [staffMembers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXTRA_CONSUMPTIONS, JSON.stringify(extraConsumptions));
  }, [extraConsumptions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVENTORY_LOGS, JSON.stringify(inventoryLogs));
  }, [inventoryLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, JSON.stringify(soundAlertsEnabled));
  }, [soundAlertsEnabled]);

  // 3. Current User object
  const currentUser = useMemo<User>(() => {
    const found = SYSTEM_USERS.find((u) => u.id === currentUserId);
    return found || SYSTEM_USERS[1];
  }, [currentUserId]);

  // 4. Realtime Tick & Sound Alerts
  useEffect(() => {
    const timer = setInterval(() => {
      const now = getNetworkTimestamp();
      setNowTimestamp(now);

      if (soundAlertsEnabled) {
        rooms.forEach((room) => {
          if (room.status === 'ocupada' && room.currentStay) {
            const extraRate = tariffs[room.type]?.extraHourPrice || 30;
            const priceNight = tariffs[room.type]?.priceNight || 140;
            const timeCalc = calculateStayTime(
              room.currentStay.startTime,
              room.currentStay.chosenDurationMinutes,
              extraRate,
              now,
              {
                priceNight,
                baseRoomPrice: room.currentStay.baseRoomPrice,
                chosenPlan: room.currentStay.chosenPlan,
              }
            );

            if (timeCalc.remainingMinutes === 5 && timeCalc.remainingSeconds === 0) {
              playWarningBeep();
            }

            if (timeCalc.isOvertime && timeCalc.overtimeSeconds === 1) {
              playOvertimeAlert();
            }
          }
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [rooms, tariffs, soundAlertsEnabled]);

  // 5. Firebase Realtime Synchronization
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const setupFirebaseSync = async () => {
      const initResult = await initializeFirebaseClient();
      setIsFirestoreConnected(initResult.success);

      if (!initResult.success) {
        return;
      }

      // Rooms
      subscribeToRooms((firestoreRooms) => {
        if (firestoreRooms && firestoreRooms.length > 0) {
          setRooms(firestoreRooms);
          setIsFirestoreConnected(true);
        }
      }).then((unsub) => { if (unsub) unsubs.push(unsub); }).catch((err) => console.warn('Aviso rooms sync:', err));

      // Products
      subscribeToProducts((firestoreProducts) => {
        if (firestoreProducts && firestoreProducts.length > 0) {
          setProducts(firestoreProducts);
          setIsFirestoreConnected(true);
        }
      }).then((unsub) => { if (unsub) unsubs.push(unsub); }).catch((err) => console.warn('Aviso products sync:', err));

      // Tariffs
      subscribeToTariffs((firestoreTariffs) => {
        if (firestoreTariffs) {
          setTariffs(firestoreTariffs);
          setIsFirestoreConnected(true);
        }
      }).then((unsub) => { if (unsub) unsubs.push(unsub); }).catch((err) => console.warn('Aviso tariffs sync:', err));

      // Expenses
      subscribeToExpenses((firestoreExpenses) => {
        if (firestoreExpenses) {
          setExpenses(firestoreExpenses);
          setIsFirestoreConnected(true);
        }
      }).then((unsub) => { if (unsub) unsubs.push(unsub); }).catch((err) => console.warn('Aviso expenses sync:', err));

      // Incomes
      subscribeToIncomes((firestoreIncomes) => {
        if (firestoreIncomes) {
          setIncomes(firestoreIncomes);
          setIsFirestoreConnected(true);
        }
      }).then((unsub) => { if (unsub) unsubs.push(unsub); }).catch((err) => console.warn('Aviso incomes sync:', err));

      // Shifts
      subscribeToAllShifts((firestoreShifts) => {
        if (firestoreShifts && firestoreShifts.length > 0) {
          shiftsLoadedFromFirestoreRef.current = true;
          setShiftsHistory(firestoreShifts);
          setIsFirestoreConnected(true);

          const openShifts = firestoreShifts.filter((s) => s.status === 'open');
          if (openShifts.length > 0) {
            const activeMap: Record<string, Shift> = {};
            openShifts.forEach((s) => {
              activeMap[s.receptionistId] = s;
            });
            setActiveShifts(activeMap);
          } else {
            setActiveShifts({});
          }
        }
      }).then((unsub) => { if (unsub) unsubs.push(unsub); }).catch((err) => console.warn('Aviso shifts sync:', err));

      // Stays
      subscribeToAllStays((firestoreStays) => {
        if (firestoreStays && firestoreStays.length > 0) {
          setCompletedStays(firestoreStays);
          setIsFirestoreConnected(true);
        }
      }).then((unsub) => { if (unsub) unsubs.push(unsub); }).catch((err) => console.warn('Aviso stays sync:', err));

      // Staff Consumptions
      subscribeToStaffConsumptions((firestoreStaffCons) => {
        if (firestoreStaffCons) {
          setStaffConsumptions(firestoreStaffCons);
          setIsFirestoreConnected(true);
        }
      }).then((unsub) => { if (unsub) unsubs.push(unsub); }).catch((err) => console.warn('Aviso staffCons sync:', err));

      // Staff Settlements
      subscribeToStaffSettlements((firestoreStaffSettles) => {
        if (firestoreStaffSettles) {
          setStaffSettlements(firestoreStaffSettles);
          setIsFirestoreConnected(true);
        }
      }).then((unsub) => { if (unsub) unsubs.push(unsub); }).catch((err) => console.warn('Aviso staffSettles sync:', err));

      // Extra Consumptions
      subscribeToExtraConsumptions((firestoreExtraCons) => {
        if (firestoreExtraCons) {
          setExtraConsumptions(firestoreExtraCons);
          setIsFirestoreConnected(true);
        }
      }).then((unsub) => { if (unsub) unsubs.push(unsub); }).catch((err) => console.warn('Aviso extraCons sync:', err));

      // Inventory Movement Logs
      subscribeToInventoryLogs((firestoreLogs) => {
        if (firestoreLogs) {
          setInventoryLogs(firestoreLogs);
          setIsFirestoreConnected(true);
        }
      }).then((unsub) => { if (unsub) unsubs.push(unsub); }).catch((err) => console.warn('Aviso inventoryLogs sync:', err));
    };

    setupFirebaseSync();

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // 6. Ensure there is active shift for reception
  const ensureActiveShift = useCallback((user: User): Shift => {
    // 1. Buscar si ya hay un turno abierto en historial (el más reciente)
    const openInHistory = shiftsHistory.filter((s) => s.status === 'open');
    if (openInHistory.length > 0) {
      openInHistory.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      const chosen = openInHistory.find((s) => s.receptionistId === user.id) || openInHistory[0];
      setActiveShifts((prev) => ({ ...prev, [chosen.receptionistId]: chosen }));
      return chosen;
    }

    // 2. Buscar si ya hay un turno abierto en activeShifts
    const openInActive = Object.values(activeShifts).find((s) => s.status === 'open');
    if (openInActive) {
      return openInActive;
    }

    // 3. Obtener caja chica del último turno cerrado o 100 Bs por defecto
    const closedShifts = shiftsHistory.filter((s) => s.status === 'closed');
    closedShifts.sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
    const lastClosedShift = closedShifts[0];
    const initialFloat = lastClosedShift?.handoverCashFloat !== undefined ? lastClosedShift.handoverCashFloat : 100;

    const receptionistUser = user.role === 'admin' ? SYSTEM_USERS[1] : user;
    const shiftType = receptionistUser.role === 'recepcionista_noche' ? 'noche' : 'dia';
    const newShift: Shift = {
      id: `shift-${receptionistUser.id}-${getNetworkTimestamp()}`,
      receptionistId: receptionistUser.id,
      receptionistName: receptionistUser.name,
      shiftType,
      startTime: getNetworkIsoString(),
      status: 'open',
      initialCashFloat: initialFloat,
      expectedCash: 0,
      expectedQr: 0,
      totalExpensesCash: 0,
      totalExpensesQr: 0,
      expenses: [],
      salesCount: 0,
      stayIds: [],
    };

    setActiveShifts((prev) => ({ ...prev, [receptionistUser.id]: newShift }));
    syncShiftToFirestore(newShift);
    return newShift;
  }, [activeShifts, shiftsHistory]);

  // Turno base sin recalcular
  const rawTargetShift = useMemo<Shift | null>(() => {
    // 1. Buscar en historial cualquier turno abierto
    const openInHistory = shiftsHistory.filter((s) => s.status === 'open');
    if (openInHistory.length > 0) {
      openInHistory.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      const matchUser = openInHistory.find((s) => s.receptionistId === currentUser.id);
      return matchUser || openInHistory[0];
    }

    // 2. Buscar en activeShifts
    const openInActive = Object.values(activeShifts).find((s) => s.status === 'open');
    if (openInActive) return openInActive;

    // Si Firestore aún no ha terminado de cargar turnos, esperar para no crear turnos prematuros
    if (!shiftsLoadedFromFirestoreRef.current) {
      return null;
    }

    // Si el usuario es administrador y no hay turno abierto, NO crear turno
    if (currentUser.role === 'admin') {
      return null;
    }

    return ensureActiveShift(currentUser);
  }, [currentUser, activeShifts, shiftsHistory, ensureActiveShift]);

  // Función pura para reconciliar con 100% de exactitud y aislamiento de canales las ventas de un turno
  const calculateShiftMetrics = useCallback(
    (targetShift: Shift): ShiftReconciledMetrics => {
      const shiftStartTime = new Date(targetShift.startTime).getTime();
      const shiftEndTime = targetShift.endTime ? new Date(targetShift.endTime).getTime() : Infinity;

      let liveCashSales = 0;
      let liveQrVendisSales = 0;
      let liveQrUnionSales = 0;
      let liveSalesCount = 0;
      const countedSalesStayIds = new Set<string>();
      const trackedStayIds = new Set<string>(targetShift.stayIds || []);

      // 1. Unificar todas las estadías en un solo mapa por ID para garantizar que cada estadía se procese EXACTAMENTE UNA VEZ
      const allStaysMap = new Map<string, Stay>();
      (completedStays || []).forEach((s) => {
        if (s && s.id) allStaysMap.set(s.id, s);
      });
      (rooms || []).forEach((r) => {
        if (r && r.currentStay && r.currentStay.id) {
          allStaysMap.set(r.currentStay.id, r.currentStay);
        }
      });

      allStaysMap.forEach((s) => {
        if (s.status === 'cancelled') return;
        const stayStartTime = new Date(s.startTime).getTime();
        const stayEndTime = s.endTime ? new Date(s.endTime).getTime() : null;
        const matchesReceptionist = s.receptionistId === targetShift.receptionistId;

        const isEntryInThisShift = s.entryShiftId
          ? s.entryShiftId === targetShift.id
          : (!s.entryShiftId && matchesReceptionist && stayStartTime >= shiftStartTime && stayStartTime <= shiftEndTime);

        // REGLA CRÍTICA: Una estadía SOLO puede computar cobro de checkout si REALMENTE se completó
        // (status === 'completed' y endTime definido) y el checkout ocurrió dentro del rango del turno.
        // Las habitaciones en curso/ocupadas NUNCA tienen cobro de salida/checkout en este turno.
        const isStayCompleted = s.status === 'completed' && Boolean(s.endTime);
        const isCheckoutInThisShift = isStayCompleted && (s.checkoutShiftId
          ? s.checkoutShiftId === targetShift.id
          : (!s.checkoutShiftId && (s.checkoutReceptionistId === targetShift.receptionistId || matchesReceptionist) && stayEndTime !== null && stayEndTime >= shiftStartTime && stayEndTime <= shiftEndTime));

        let stayHadActivityInThisShift = false;

        // 1. Cobro de adelanto / prepago en este turno (Aislamiento estricto de canal de pago)
        if (isEntryInThisShift && s.isPrepaid) {
          trackedStayIds.add(s.id);
          stayHadActivityInThisShift = true;
          let prepCash = s.prepaidCash || 0;
          let prepVendis = s.prepaidQrVendis || 0;
          let prepUnion = s.prepaidQrUnion || 0;

          // Fallback a paymentMethod ÚNICAMENTE si ningún canal específico fue provisto
          if (prepCash === 0 && prepVendis === 0 && prepUnion === 0) {
            const pAmt = s.prepaidAmount || s.baseRoomPrice || 0;
            if (s.paymentMethod === 'efectivo') prepCash = pAmt;
            else if (s.paymentMethod === 'qr_vendis') prepVendis = pAmt;
            else if (s.paymentMethod === 'qr_union') prepUnion = pAmt;
            else if (s.paymentMethod === 'qr') prepVendis = pAmt;
          }

          liveCashSales += prepCash;
          liveQrVendisSales += prepVendis;
          liveQrUnionSales += prepUnion;
        }

        // 2. Consumos cobrados al momento en este turno
        (s.consumptions || []).forEach((c) => {
          if (c.isPaid) {
            const cTime = c.paidAt ? new Date(c.paidAt).getTime() : stayStartTime;
            const isThisShiftCons =
              c.paidShiftId === targetShift.id ||
              (!c.paidShiftId && c.paidReceptionistId === targetShift.receptionistId) ||
              (!c.paidShiftId && matchesReceptionist && cTime >= shiftStartTime && cTime <= shiftEndTime);

            if (isThisShiftCons) {
              stayHadActivityInThisShift = true;
              trackedStayIds.add(s.id);
              if (c.paymentMethod === 'efectivo') liveCashSales += c.subtotal;
              else if (c.paymentMethod === 'qr_vendis' || c.paymentMethod === 'qr') {
                liveQrVendisSales += c.subtotal;
              } else if (c.paymentMethod === 'qr_union') {
                liveQrUnionSales += c.subtotal;
              }
            }
          }
        });

        // 3. Cobro de saldo de salida / checkout en este turno (SOLO SI REALMENTE HIZO CHECKOUT EN ESTE TURNO)
        if (isCheckoutInThisShift) {
          trackedStayIds.add(s.id);
          stayHadActivityInThisShift = true;
          let finalCash = s.finalCashPaid;
          let finalVendis = s.finalQrVendisPaid;
          let finalUnion = s.finalQrUnionPaid;

          if (finalCash === undefined && finalVendis === undefined && finalUnion === undefined) {
            if (s.isPrepaid) {
              finalCash = Math.max(0, (s.cashPaid || 0) - (s.prepaidCash || 0));
              finalVendis = Math.max(0, (s.qrVendisPaid || 0) - (s.prepaidQrVendis || 0));
              finalUnion = Math.max(0, (s.qrUnionPaid || 0) - (s.prepaidQrUnion || 0));
            } else {
              finalCash = s.cashPaid || 0;
              finalVendis = s.qrVendisPaid || 0;
              finalUnion = s.qrUnionPaid || 0;
              if (finalCash === 0 && finalVendis === 0 && finalUnion === 0) {
                const tot = s.totalAmount || 0;
                if (s.paymentMethod === 'efectivo') finalCash = tot;
                else if (s.paymentMethod === 'qr_vendis') finalVendis = tot;
                else if (s.paymentMethod === 'qr_union') finalUnion = tot;
                else if (s.paymentMethod === 'qr') finalVendis = tot;
              }
            }
          }
          finalCash = finalCash || 0;
          finalVendis = finalVendis || 0;
          finalUnion = finalUnion || 0;

          if (!isEntryInThisShift || !s.isPrepaid) {
            liveCashSales += finalCash;
            liveQrVendisSales += finalVendis;
            liveQrUnionSales += finalUnion;
          } else {
            if (finalCash > 0) liveCashSales += finalCash;
            if (finalVendis > 0) liveQrVendisSales += finalVendis;
            if (finalUnion > 0) liveQrUnionSales += finalUnion;
          }
        }

        if (stayHadActivityInThisShift && !countedSalesStayIds.has(s.id)) {
          countedSalesStayIds.add(s.id);
          liveSalesCount++;
        }
      });

      // 3. Consumos extras y ventas de mostrador registradas en este turno
      extraConsumptions.forEach((ec) => {
        const ecTime = new Date(ec.date).getTime();
        const matchesReceptionist = ec.registeredById === targetShift.receptionistId;
        const isThisShiftExtra =
          ec.shiftId === targetShift.id ||
          (!ec.shiftId && matchesReceptionist && ecTime >= shiftStartTime && ecTime <= shiftEndTime);

        if (isThisShiftExtra) {
          if (ec.paymentMethod === 'efectivo') liveCashSales += ec.totalAmount;
          else if (ec.paymentMethod === 'qr_vendis' || ec.paymentMethod === 'qr') {
            liveQrVendisSales += ec.totalAmount;
          } else if (ec.paymentMethod === 'qr_union') {
            liveQrUnionSales += ec.totalAmount;
          }
          liveSalesCount++;
        }
      });

      // 4. Consumos de personal pagados en el acto en este turno
      staffConsumptions.forEach((sc) => {
        if (!sc.isPaid) return;
        const scTime = new Date(sc.date).getTime();
        const isThisShiftStaff =
          sc.shiftId === targetShift.id ||
          (!sc.shiftId && scTime >= shiftStartTime && scTime <= shiftEndTime);

        if (isThisShiftStaff) {
          if (sc.paymentMethod === 'efectivo' || !sc.paymentMethod) {
            liveCashSales += sc.totalAmount;
          } else if (sc.paymentMethod === 'qr_vendis' || sc.paymentMethod === 'qr') {
            liveQrVendisSales += sc.totalAmount;
          } else if (sc.paymentMethod === 'qr_union') {
            liveQrUnionSales += sc.totalAmount;
          }
          liveSalesCount++;
        }
      });

      // 5. Otros Ingresos a Caja (Alquiler, cambio de compras, dinero para cambio)
      const shiftIncomes = incomes.filter((inc) => {
        if (inc.shiftId) return inc.shiftId === targetShift.id;
        const incTime = new Date(inc.timestamp).getTime();
        return incTime >= shiftStartTime && incTime <= shiftEndTime;
      });

      let totalIncomesCash = 0;
      let totalIncomesQrVendis = 0;
      let totalIncomesQrUnion = 0;
      let totalIncomesQr = 0;

      shiftIncomes.forEach((inc) => {
        if (inc.paymentMethod === 'efectivo') {
          totalIncomesCash += inc.amount;
        } else if (inc.paymentMethod === 'qr_vendis') {
          totalIncomesQrVendis += inc.amount;
          totalIncomesQr += inc.amount;
        } else if (inc.paymentMethod === 'qr_union') {
          totalIncomesQrUnion += inc.amount;
          totalIncomesQr += inc.amount;
        } else {
          totalIncomesQr += inc.amount;
        }
      });

      const expectedCash = liveCashSales;
      const expectedQrVendis = liveQrVendisSales + totalIncomesQrVendis;
      const expectedQrUnion = liveQrUnionSales + totalIncomesQrUnion;
      const expectedQr = expectedQrVendis + expectedQrUnion;
      const salesCount = liveSalesCount;

      // Gastos del turno: vinculación estricta por shiftId
      const shiftExpenses = expenses.filter((e) => {
        if (e.shiftId) return e.shiftId === targetShift.id;
        const expTime = new Date(e.timestamp).getTime();
        return expTime >= shiftStartTime && expTime <= shiftEndTime;
      });

      let operationalExpensesCash = 0;
      let cashWithdrawals = 0;
      let totalExpensesCash = 0;
      let totalExpensesQrVendis = 0;
      let totalExpensesQrUnion = 0;
      let totalExpensesQr = 0;

      shiftExpenses.forEach((e) => {
        if (e.paymentMethod === 'efectivo') {
          totalExpensesCash += e.amount;
          const isRetiro =
            e.category === 'retiro_administracion' ||
            (e.description && e.description.toLowerCase().includes('retiro / entrega de efectivo a administración')) ||
            (e.description && e.description.toLowerCase().includes('retiro de ventas'));
          if (isRetiro) {
            cashWithdrawals += e.amount;
          } else {
            operationalExpensesCash += e.amount;
          }
        } else if (e.paymentMethod === 'qr_vendis') {
          totalExpensesQrVendis += e.amount;
          totalExpensesQr += e.amount;
        } else if (e.paymentMethod === 'qr_union') {
          totalExpensesQrUnion += e.amount;
          totalExpensesQr += e.amount;
        } else {
          totalExpensesQr += e.amount;
        }
      });

      const startingFloat = targetShift.initialCashFloat !== undefined ? targetShift.initialCashFloat : 100;
      const expectedCashInDrawer = Math.max(0, startingFloat + expectedCash + totalIncomesCash - operationalExpensesCash);

      return {
        expectedCash,
        expectedQrVendis,
        expectedQrUnion,
        expectedQr,
        salesCount,
        stayIds: Array.from(trackedStayIds),
        shiftExpenses,
        cashWithdrawals,
        operationalExpensesCash,
        totalExpensesCash,
        totalExpensesQrVendis,
        totalExpensesQrUnion,
        totalExpensesQr,
        shiftIncomes,
        totalIncomesCash,
        totalIncomesQrVendis,
        totalIncomesQrUnion,
        totalIncomesQr,
        totalIncomes: totalIncomesCash + totalIncomesQr,
        expectedCashInDrawer,
      };
    },
    [rooms, completedStays, extraConsumptions, staffConsumptions, expenses, incomes]
  );

  // Cálculo en vivo y exacto del total en caja del turno (Caja Chica, Ventas Efectivo, QR y Gastos)
  const currentShift = useMemo<Shift | null>(() => {
    if (!rawTargetShift) return null;

    const metrics = calculateShiftMetrics(rawTargetShift);

    return {
      ...rawTargetShift,
      expectedCash: metrics.expectedCash,
      expectedQrVendis: metrics.expectedQrVendis,
      expectedQrUnion: metrics.expectedQrUnion,
      expectedQr: metrics.expectedQr,
      salesCount: metrics.salesCount,
      stayIds: metrics.stayIds,
      expenses: metrics.shiftExpenses,
      cashWithdrawals: metrics.cashWithdrawals,
      operationalExpensesCash: metrics.operationalExpensesCash,
      totalExpensesCash: metrics.totalExpensesCash,
      totalExpensesQrVendis: metrics.totalExpensesQrVendis,
      totalExpensesQrUnion: metrics.totalExpensesQrUnion,
      totalExpensesQr: metrics.totalExpensesQr,
      incomes: metrics.shiftIncomes,
      totalIncomesCash: metrics.totalIncomesCash,
      totalIncomesQrVendis: metrics.totalIncomesQrVendis,
      totalIncomesQrUnion: metrics.totalIncomesQrUnion,
      totalIncomesQr: metrics.totalIncomesQr,
      totalIncomes: metrics.totalIncomes,
    };
  }, [rawTargetShift, calculateShiftMetrics]);

  // Toast Management
  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleSoundAlerts = () => {
    setSoundAlertsEnabled((prev) => !prev);
  };

  const setCurrentUserById = (userId: string) => {
    setCurrentUserId(userId);
  };

  // ROOM OPERATIONS
  const registerRoomEntry = (entryData: {
    roomId: string;
    chosenPlan: PlanType;
    durationMinutes?: number;
    chosenDurationMinutes?: number;
    basePrice: number;
    paymentMethod: PaymentMethod;
    isPrepaid?: boolean;
    prepaidAmount?: number;
    prepaidCash?: number;
    prepaidQrVendis?: number;
    prepaidQrUnion?: number;
    prepaidQr?: number;
    cashPaid?: number;
    qrVendisPaid?: number;
    qrUnionPaid?: number;
    qrPaid?: number;
    vehiclePlate?: string;
    notes?: string;
    isCustomPackage?: boolean;
    customPackageName?: string;
  }) => {
    const room = rooms.find((r) => r.id === entryData.roomId);
    if (!room) return;

    const stayId = `stay-${getNetworkTimestamp()}-${Math.random().toString(36).substring(2, 7)}`;
    const duration = entryData.chosenDurationMinutes || entryData.durationMinutes || 120;

    const isPrepaid = entryData.isPrepaid ?? true;
    const prepaidAmount = isPrepaid ? (entryData.prepaidAmount !== undefined ? entryData.prepaidAmount : entryData.basePrice) : 0;
    let prepaidCash = entryData.prepaidCash ?? 0;
    let prepaidQrVendis = entryData.prepaidQrVendis ?? 0;
    let prepaidQrUnion = entryData.prepaidQrUnion ?? 0;

    // Solo si ninguno de los canales específicos vino definido, recurrir a paymentMethod
    if (isPrepaid && prepaidCash === 0 && prepaidQrVendis === 0 && prepaidQrUnion === 0) {
      if (entryData.paymentMethod === 'efectivo') prepaidCash = prepaidAmount;
      else if (entryData.paymentMethod === 'qr_vendis') prepaidQrVendis = prepaidAmount;
      else if (entryData.paymentMethod === 'qr_union') prepaidQrUnion = prepaidAmount;
      else if (entryData.paymentMethod === 'qr') prepaidQrVendis = prepaidAmount;
    }
    const prepaidQr = entryData.prepaidQr !== undefined ? entryData.prepaidQr : (prepaidQrVendis + prepaidQrUnion);

    const activeShift = currentShift || (currentUser.role !== 'admin' ? ensureActiveShift(currentUser) : undefined);
    const activeShiftId = activeShift ? activeShift.id : undefined;

    const newStay: Stay = {
      id: stayId,
      roomId: room.id,
      roomName: room.name,
      roomType: room.type,
      startTime: getNetworkIsoString(),
      chosenPlan: entryData.chosenPlan,
      chosenDurationMinutes: duration,
      baseRoomPrice: entryData.basePrice,
      paymentMethod: entryData.paymentMethod,
      isPrepaid,
      prepaidAmount,
      prepaidCash,
      prepaidQrVendis,
      prepaidQrUnion,
      prepaidQr,
      cashPaid: prepaidCash,
      qrVendisPaid: prepaidQrVendis,
      qrUnionPaid: prepaidQrUnion,
      qrPaid: prepaidQr,
      entryShiftId: activeShiftId,
      vehiclePlate: entryData.vehiclePlate,
      receptionistId: currentUser.id,
      receptionistName: currentUser.name,
      consumptions: [],
      notes: entryData.notes,
      isCustomPackage: entryData.isCustomPackage || entryData.chosenPlan === 'personalizado',
      customPackageName: entryData.customPackageName,
      status: 'active',
    };

    if (currentUser.role !== 'admin') {
      setActiveShifts((prev) => {
        const active = prev[currentUser.id] || ensureActiveShift(currentUser);
        const updatedShift: Shift = {
          ...active,
          stayIds: active.stayIds.includes(stayId) ? active.stayIds : [...active.stayIds, stayId],
        };
        syncShiftToFirestore(updatedShift);
        return {
          ...prev,
          [currentUser.id]: updatedShift,
        };
      });
    }

    const updatedRoom: Room = {
      ...room,
      status: 'ocupada',
      currentStay: newStay,
      cleaningStartTime: undefined,
    };

    setRooms((prev) => prev.map((r) => (r.id === room.id ? updatedRoom : r)));
    syncRoomToFirestore(updatedRoom);
    syncStayToFirebase(newStay);

    playSuccessChime();
    showToast({
      title: isPrepaid ? '¡Habitación Registrada y Pagada!' : 'Habitación Registrada (Pago al Salir)',
      message: `${room.name} ocupada (${entryData.chosenPlan.toUpperCase()} - ${formatBs(entryData.basePrice)} ${isPrepaid ? '• Pagado' : '• Por cobrar'})`,
      type: 'success',
    });
  };

  const registerStay = registerRoomEntry;

  /**
   * Descuenta stock de forma atómica para uno o varios productos y sincroniza en Firebase
   */
  const discountStockForItems = (items: { productId: string; quantity: number }[]) => {
    if (!items || items.length === 0) return;

    setProducts((prevProducts) => {
      const updatedProductsMap = new Map(prevProducts.map((p) => [p.id, { ...p }]));
      const changedProducts: Product[] = [];

      items.forEach((item) => {
        const prod = updatedProductsMap.get(item.productId);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
          changedProducts.push(prod);
        }
      });

      // Sincronizar todos los productos modificados a Firebase en tiempo real
      changedProducts.forEach((p) => {
        syncProductToFirestore(p);
      });

      return Array.from(updatedProductsMap.values());
    });
  };

  /**
   * Repone stock de forma atómica para uno o varios productos y sincroniza en Firebase
   */
  const restoreStockForItems = (items: { productId: string; quantity: number }[]) => {
    if (!items || items.length === 0) return;

    setProducts((prevProducts) => {
      const updatedProductsMap = new Map(prevProducts.map((p) => [p.id, { ...p }]));
      const changedProducts: Product[] = [];

      items.forEach((item) => {
        const prod = updatedProductsMap.get(item.productId);
        if (prod) {
          prod.stock = prod.stock + item.quantity;
          changedProducts.push(prod);
        }
      });

      // Sincronizar todos los productos modificados a Firebase en tiempo real
      changedProducts.forEach((p) => {
        syncProductToFirestore(p);
      });

      return Array.from(updatedProductsMap.values());
    });
  };

  const addConsumptionToRoom = (
    roomId: string,
    productId: string,
    quantity = 1,
    paymentOptions?: {
      isPaid: boolean;
      paymentMethod?: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
    }
  ): boolean => {
    const room = rooms.find((r) => r.id === roomId);
    const product = products.find((p) => p.id === productId);

    if (!room || !room.currentStay || !product) {
      showToast({
        title: 'Error al agregar consumo',
        message: 'No se encontró la habitación activa o el producto.',
        type: 'error',
      });
      return false;
    }

    if (product.stock < quantity) {
      showToast({
        title: 'Stock Insuficiente',
        message: `Solo quedan ${product.stock} unidades de ${product.name}`,
        type: 'error',
      });
      return false;
    }

    // 1. Descontar inventario de forma atómica
    discountStockForItems([{ productId, quantity }]);

    // 2. Agregar a la estadía
    const consumptionId = `cons-${getNetworkTimestamp()}-${Math.random().toString(36).substring(2, 7)}`;
    const subtotal = product.price * quantity;
    const isPaid = paymentOptions?.isPaid ?? false;
    const paymentMethod = isPaid ? (paymentOptions?.paymentMethod || 'efectivo') : undefined;
    const activeShift = currentShift || (currentUser.role !== 'admin' ? ensureActiveShift(currentUser) : undefined);

    const consumptionItem: ConsumptionItem = {
      id: consumptionId,
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity,
      subtotal,
      timestamp: getNetworkIsoString(),
      isPaid,
      paymentMethod,
      paidAt: isPaid ? getNetworkIsoString() : undefined,
      paidShiftId: isPaid && activeShift ? activeShift.id : undefined,
      paidReceptionistId: isPaid ? currentUser.id : undefined,
      paidReceptionistName: isPaid ? currentUser.name : undefined,
    };

    const updatedStay: Stay = {
      ...room.currentStay,
      consumptions: [...room.currentStay.consumptions, consumptionItem],
    };

    const updatedRoom: Room = {
      ...room,
      currentStay: updatedStay,
    };

    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    syncRoomToFirestore(updatedRoom);
    syncStayToFirebase(updatedStay);
    setCompletedStays((prev) => prev.map((s) => (s.id === updatedStay.id ? updatedStay : s)));

    // No mutamos manualmente expectedCash/expectedQr para evitar drift de concurrencia;
    // calculateShiftMetrics lo deriva en tiempo real directamente de updatedStay.consumptions

    playAddConsumptionSound();
    showToast({
      title: isPaid ? '¡Consumo Cobrado y Agregado!' : '¡Consumo Cargado a la Cuenta!',
      message: isPaid
        ? `Se cobró ${formatBs(subtotal)} en ${getPaymentMethodLabel(paymentMethod || 'efectivo')} por ${quantity}x ${product.name}.`
        : `Se añadió ${quantity}x ${product.name} (+${formatBs(subtotal)}) a la cuenta de ${room.name} (Paga al desocupar).`,
      type: 'success',
      undoLabel: 'Deshacer (reponer stock)',
      undoAction: () => {
        removeConsumptionFromRoom(roomId, consumptionId, false);
      },
      durationMs: 7000,
    });

    return true;
  };

  const addCustomConsumptionToRoom = (
    roomId: string,
    customData: {
      name: string;
      unitPrice: number;
      quantity?: number;
      isPaid?: boolean;
      paymentMethod?: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
      notes?: string;
    }
  ): boolean => {
    const room = rooms.find((r) => r.id === roomId);

    if (!room || !room.currentStay) {
      showToast({
        title: 'Error al agregar consumo personalizado',
        message: 'No se encontró la habitación activa.',
        type: 'error',
      });
      return false;
    }

    const name = customData.name?.trim() || 'Consumo Personalizado';
    const quantity = Math.max(1, customData.quantity || 1);
    const unitPrice = Math.max(0, customData.unitPrice || 0);
    const subtotal = unitPrice * quantity;
    const isPaid = customData.isPaid ?? false;
    const paymentMethod = isPaid ? (customData.paymentMethod || 'efectivo') : undefined;
    const consumptionId = `cons-custom-${getNetworkTimestamp()}-${Math.random().toString(36).substring(2, 7)}`;
    const activeShift = currentShift || (currentUser.role !== 'admin' ? ensureActiveShift(currentUser) : undefined);

    const consumptionItem: ConsumptionItem = {
      id: consumptionId,
      productId: 'custom-item',
      productName: name,
      unitPrice,
      quantity,
      subtotal,
      timestamp: getNetworkIsoString(),
      isPaid,
      paymentMethod,
      paidAt: isPaid ? getNetworkIsoString() : undefined,
      paidShiftId: isPaid && activeShift ? activeShift.id : undefined,
      paidReceptionistId: isPaid ? currentUser.id : undefined,
      paidReceptionistName: isPaid ? currentUser.name : undefined,
      isCustom: true,
      customNotes: customData.notes?.trim() || undefined,
    };

    const updatedStay: Stay = {
      ...room.currentStay,
      consumptions: [...room.currentStay.consumptions, consumptionItem],
    };

    const updatedRoom: Room = {
      ...room,
      currentStay: updatedStay,
    };

    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    syncRoomToFirestore(updatedRoom);
    syncStayToFirebase(updatedStay);
    setCompletedStays((prev) => prev.map((s) => (s.id === updatedStay.id ? updatedStay : s)));

    // calculateShiftMetrics lo deriva en tiempo real directamente de updatedStay.consumptions

    playAddConsumptionSound();
    showToast({
      title: isPaid ? '¡Consumo Personalizado Cobrado!' : '¡Consumo Personalizado Cargado!',
      message: isPaid
        ? `Se cobró ${formatBs(subtotal)} en ${getPaymentMethodLabel(paymentMethod || 'efectivo')} por "${name}" (${quantity}x ${formatBs(unitPrice)}).`
        : `Se añadió "${name}" (${quantity}x ${formatBs(unitPrice)} = +${formatBs(subtotal)}) a la cuenta de ${room.name}.`,
      type: 'success',
      undoLabel: 'Deshacer consumo',
      undoAction: () => {
        removeConsumptionFromRoom(roomId, consumptionId, false);
      },
      durationMs: 7000,
    });

    return true;
  };

  const removeConsumptionFromRoom = (roomId: string, consumptionId: string, silent = false) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || !room.currentStay) return;

    const item = room.currentStay.consumptions.find((c) => c.id === consumptionId);
    if (!item) return;

    // Reponer stock de forma atómica
    restoreStockForItems([{ productId: item.productId, quantity: item.quantity }]);

    const updatedStay: Stay = {
      ...room.currentStay,
      consumptions: room.currentStay.consumptions.filter((c) => c.id !== consumptionId),
    };

    const updatedRoom: Room = {
      ...room,
      currentStay: updatedStay,
    };

    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    syncRoomToFirestore(updatedRoom);
    syncStayToFirebase(updatedStay);
    setCompletedStays((prev) => prev.map((s) => (s.id === updatedStay.id ? updatedStay : s)));

    if (!silent) {
      playUndoSound();
      showToast({
        title: 'Consumo Revertido',
        message: `Se anuló ${item.quantity}x ${item.productName} y se repuso el stock.`,
        type: 'info',
        durationMs: 4000,
      });
    }
  };

  const closeStayAndCheckout = (
    roomId: string,
    checkoutData: {
      finalPaymentMethod?: PaymentMethod;
      cashPaid?: number;
      qrVendisPaid?: number;
      qrUnionPaid?: number;
      qrPaid?: number;
      notes?: string;
      setCleaning?: boolean;
    }
  ): Stay | null => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || !room.currentStay) return null;

    const stay = room.currentStay;
    const extraRate = tariffs[room.type]?.extraHourPrice || (room.type === 'jacuzzi' || room.type === 'golden_suite' ? 40 : 30);
    const priceNight = tariffs[room.type]?.priceNight || (room.type === 'ventilador' ? 140 : room.type === 'aire' ? 150 : room.type === 'suite' ? 180 : room.type === 'jacuzzi' ? 220 : 230);
    const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes, extraRate, getNetworkTimestamp(), {
      priceNight,
      baseRoomPrice: stay.baseRoomPrice,
      chosenPlan: stay.chosenPlan,
    });
    const consumptionsTotal = stay.consumptions.reduce((sum, item) => sum + item.subtotal, 0);
    const paidConsumptionsCash = stay.consumptions
      .filter((item) => item.isPaid && item.paymentMethod === 'efectivo')
      .reduce((sum, item) => sum + item.subtotal, 0);
    const paidConsumptionsQrVendis = stay.consumptions
      .filter((item) => item.isPaid && item.paymentMethod === 'qr_vendis')
      .reduce((sum, item) => sum + item.subtotal, 0);
    const paidConsumptionsQrUnion = stay.consumptions
      .filter((item) => item.isPaid && item.paymentMethod === 'qr_union')
      .reduce((sum, item) => sum + item.subtotal, 0);
    const paidConsumptionsQr = stay.consumptions
      .filter((item) => item.isPaid && (item.paymentMethod === 'qr' || item.paymentMethod === 'qr_vendis' || item.paymentMethod === 'qr_union'))
      .reduce((sum, item) => sum + item.subtotal, 0);
    const paidConsumptionsTotal = stay.consumptions
      .filter((item) => item.isPaid)
      .reduce((sum, item) => sum + item.subtotal, 0);

    const overtimeTotal = timeCalc.overtimeCharge;
    const totalAmount = stay.baseRoomPrice + consumptionsTotal + overtimeTotal;

    const isPrepaid = stay.isPrepaid || false;
    const prepaidAmount = isPrepaid ? (stay.prepaidAmount || stay.baseRoomPrice) : 0;
    let prepaidCash = stay.prepaidCash || 0;
    let prepaidQrVendis = stay.prepaidQrVendis || 0;
    let prepaidQrUnion = stay.prepaidQrUnion || 0;

    // Solo si ninguno de los canales específicos vino provisto en la estadía, recurrir a paymentMethod
    if (isPrepaid && prepaidCash === 0 && prepaidQrVendis === 0 && prepaidQrUnion === 0) {
      if (stay.paymentMethod === 'efectivo') prepaidCash = prepaidAmount;
      else if (stay.paymentMethod === 'qr_vendis') prepaidQrVendis = prepaidAmount;
      else if (stay.paymentMethod === 'qr_union') prepaidQrUnion = prepaidAmount;
      else if (stay.paymentMethod === 'qr') prepaidQrVendis = prepaidAmount;
    }
    const prepaidQr = stay.prepaidQr !== undefined ? stay.prepaidQr : (prepaidQrVendis + prepaidQrUnion);

    // Remaining balance to be paid at exit (deducting room prepay AND on-the-spot paid consumptions)
    const totalAlreadyPaid = prepaidAmount + paidConsumptionsTotal;
    const remainingDue = Math.max(0, totalAmount - totalAlreadyPaid);

    const effectivePaymentMethod = checkoutData.finalPaymentMethod || stay.paymentMethod;
    let finalCash = 0;
    let finalQrVendis = 0;
    let finalQrUnion = 0;
    let finalQr = 0;

    if (remainingDue > 0) {
      if (effectivePaymentMethod === 'efectivo') {
        finalCash = remainingDue;
      } else if (effectivePaymentMethod === 'qr_vendis') {
        finalQrVendis = remainingDue;
        finalQr = remainingDue;
      } else if (effectivePaymentMethod === 'qr_union') {
        finalQrUnion = remainingDue;
        finalQr = remainingDue;
      } else if (effectivePaymentMethod === 'qr') {
        finalQrVendis = remainingDue;
        finalQr = remainingDue;
      } else if (effectivePaymentMethod === 'mixto') {
        finalCash = checkoutData.cashPaid !== undefined ? checkoutData.cashPaid : 0;
        finalQrVendis = checkoutData.qrVendisPaid !== undefined ? checkoutData.qrVendisPaid : 0;
        finalQrUnion = checkoutData.qrUnionPaid !== undefined ? checkoutData.qrUnionPaid : 0;
        finalQr = checkoutData.qrPaid !== undefined ? checkoutData.qrPaid : (finalQrVendis + finalQrUnion || Math.max(0, remainingDue - finalCash));
      }
    }

    const totalCashPaid = prepaidCash + paidConsumptionsCash + finalCash;
    const totalQrVendisPaid = prepaidQrVendis + paidConsumptionsQrVendis + finalQrVendis;
    const totalQrUnionPaid = prepaidQrUnion + paidConsumptionsQrUnion + finalQrUnion;
    const totalQrPaid = prepaidQr + paidConsumptionsQr + finalQr;

    const completedStay: Stay = {
      ...stay,
      status: 'completed',
      endTime: getNetworkIsoString(),
      overtimeMinutes: timeCalc.overtimeMinutes,
      overtimeCharge: overtimeTotal,
      totalAmount,
      isPrepaid,
      prepaidAmount,
      prepaidCash,
      prepaidQrVendis,
      prepaidQrUnion,
      prepaidQr,
      paymentMethod: effectivePaymentMethod,
      cashPaid: totalCashPaid,
      qrVendisPaid: totalQrVendisPaid,
      qrUnionPaid: totalQrUnionPaid,
      qrPaid: totalQrPaid,
      finalCashPaid: finalCash,
      finalQrVendisPaid: finalQrVendis,
      finalQrUnionPaid: finalQrUnion,
      finalQrPaid: finalQr,
      checkoutShiftId: (currentShift || (currentUser.role !== 'admin' ? ensureActiveShift(currentUser) : undefined))?.id,
      checkoutReceptionistId: currentUser.id,
      checkoutReceptionistName: currentUser.name,
      closedBy: currentUser.name,
      notes: checkoutData.notes || stay.notes,
    };

    setCompletedStays((prev) => [completedStay, ...prev]);
    syncCompletedStayToFirebase(completedStay);

    const shiftReceptionistId = currentUser.role === 'admin' ? stay.receptionistId : currentUser.id;
    setActiveShifts((prev) => {
      const active = prev[shiftReceptionistId] || ensureActiveShift(currentUser);
      const updatedShift: Shift = {
        ...active,
        stayIds: active.stayIds.includes(completedStay.id) ? active.stayIds : [...active.stayIds, completedStay.id],
      };
      syncShiftToFirestore(updatedShift);
      return {
        ...prev,
        [shiftReceptionistId]: updatedShift,
      };
    });

    const setCleaning = checkoutData.setCleaning !== false;
    const updatedRoom: Room = {
      ...room,
      status: setCleaning ? 'limpieza' : 'disponible',
      currentStay: undefined,
      cleaningStartTime: setCleaning ? new Date().toISOString() : undefined,
    };

    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    syncRoomToFirestore(updatedRoom);

    playSuccessChime();
    showToast({
      title: '¡Estadía Cobrada & Finalizada!',
      message: `${room.name} desocupada. Cobro final: ${formatBs(remainingDue)} (${getPaymentMethodLabel(effectivePaymentMethod)}). Total: ${formatBs(totalAmount)}.`,
      type: 'success',
    });

    return completedStay;
  };

  const changeRoomStatus = (roomId: string, newStatus: RoomStatus) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const updatedRoom: Room = {
      ...room,
      status: newStatus,
      cleaningStartTime: newStatus === 'limpieza' ? new Date().toISOString() : undefined,
      currentStay: newStatus === 'disponible' ? undefined : room.currentStay,
    };

    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    syncRoomToFirestore(updatedRoom);

    showToast({
      title: 'Estado Actualizado',
      message: `${room.name} ahora está ${newStatus.toUpperCase()}`,
      type: 'info',
    });
  };

  const changeRoom = (
    currentRoomId: string,
    targetRoomId: string,
    reason: string,
    options?: {
      oldRoomStatus?: 'limpieza' | 'disponible';
    }
  ): boolean => {
    const currentRoom = rooms.find((r) => r.id === currentRoomId);
    const targetRoom = rooms.find((r) => r.id === targetRoomId);

    if (!currentRoom || !currentRoom.currentStay) {
      showToast({
        title: 'Error de cambio',
        message: 'La habitación de origen no tiene una estancia activa.',
        type: 'error',
      });
      return false;
    }

    if (!targetRoom || targetRoom.status !== 'disponible') {
      showToast({
        title: 'Habitación no disponible',
        message: `La habitación ${targetRoom?.name || targetRoomId} no está disponible.`,
        type: 'error',
      });
      return false;
    }

    const timestamp = new Date().toISOString();
    const oldStay = currentRoom.currentStay;
    const changeLogNote = `[Cambio de Habitación: Trasladado desde ${currentRoom.name} a ${targetRoom.name} por ${currentUser.name} a las ${formatDateTime(timestamp)}. Motivo: ${reason}]`;

    const transferredStay: Stay = {
      ...oldStay,
      roomId: targetRoom.id,
      roomName: targetRoom.name,
      roomType: targetRoom.type,
      notes: oldStay.notes ? `${oldStay.notes} | ${changeLogNote}` : changeLogNote,
    };

    const oldRoomNextStatus = options?.oldRoomStatus || 'limpieza';
    const updatedOldRoom: Room = {
      ...currentRoom,
      status: oldRoomNextStatus,
      currentStay: undefined,
      cleaningStartTime: oldRoomNextStatus === 'limpieza' ? timestamp : undefined,
    };

    const updatedTargetRoom: Room = {
      ...targetRoom,
      status: 'ocupada',
      currentStay: transferredStay,
      cleaningStartTime: undefined,
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === currentRoomId) return updatedOldRoom;
        if (r.id === targetRoomId) return updatedTargetRoom;
        return r;
      })
    );

    syncRoomToFirestore(updatedOldRoom);
    syncRoomToFirestore(updatedTargetRoom);
    syncStayToFirebase(transferredStay);

    playSuccessChime();
    showToast({
      title: '¡Cambio de Habitación Exitoso!',
      message: `Huésped trasladado de ${currentRoom.name} a ${targetRoom.name}. Motivo registrado: "${reason}".`,
      type: 'success',
      durationMs: 7000,
    });

    return true;
  };

  // EXPENSES / SHIFT PAYMENTS
  const addExpenseToShift = (expenseData: {
    description: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
    receiptNumber?: string;
    notes?: string;
  }) => {
    if (!currentShift) {
      showToast({
        title: 'Sin turno activo',
        message: 'Debe haber un turno activo para registrar pagos de caja.',
        type: 'error',
      });
      return;
    }

    const expenseId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newExpense: Expense = {
      id: expenseId,
      description: expenseData.description.trim(),
      category: expenseData.category,
      amount: expenseData.amount,
      paymentMethod: expenseData.paymentMethod,
      timestamp: getNetworkIsoString(),
      shiftId: currentShift.id,
      registeredById: currentUser.id,
      registeredByName: currentUser.name,
      receiptNumber: expenseData.receiptNumber?.trim() || undefined,
      notes: expenseData.notes?.trim() || undefined,
    };

    setExpenses((prev) => [newExpense, ...prev]);
    syncExpenseToFirestore(newExpense);

    playSuccessChime();
    showToast({
      title: '¡Pago / Salida de Caja Registrado!',
      message: `Se registró salida de ${formatBs(expenseData.amount)} (${expenseData.description}) pagado en ${getPaymentMethodLabel(expenseData.paymentMethod)}.`,
      type: 'success',
    });
  };

  // INCOMES / CASH INFLOWS (Alquileres, cambio de compras, dinero para cambio)
  const addIncomeToShift = (incomeData: {
    description: string;
    category: IncomeCategory;
    amount: number;
    paymentMethod: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
    receiptNumber?: string;
    notes?: string;
  }) => {
    if (!currentShift) {
      showToast({
        title: 'Sin turno activo',
        message: 'Debe haber un turno activo para registrar ingresos a caja.',
        type: 'error',
      });
      return;
    }

    const incomeId = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newIncome: ShiftIncome = {
      id: incomeId,
      description: incomeData.description.trim(),
      category: incomeData.category,
      amount: incomeData.amount,
      paymentMethod: incomeData.paymentMethod,
      timestamp: getNetworkIsoString(),
      shiftId: currentShift.id,
      registeredById: currentUser.id,
      registeredByName: currentUser.name,
      receiptNumber: incomeData.receiptNumber?.trim() || undefined,
      notes: incomeData.notes?.trim() || undefined,
    };

    setIncomes((prev) => [newIncome, ...prev]);
    syncIncomeToFirestore(newIncome);

    playSuccessChime();
    showToast({
      title: '¡Ingreso a Caja Registrado!',
      message: `Se registró ingreso de ${formatBs(incomeData.amount)} (${incomeData.description}) en ${getPaymentMethodLabel(incomeData.paymentMethod)}.`,
      type: 'success',
    });
  };

  const removeIncomeFromShift = (id: string) => {
    const inc = incomes.find((i) => i.id === id);
    if (!inc) return;

    setIncomes((prev) => prev.filter((i) => i.id !== id));
    deleteIncomeFromFirebase(id);

    showToast({
      title: 'Ingreso Anulado',
      message: `Se anuló el ingreso (${inc.description}).`,
      type: 'info',
    });
  };

  // STAFF CONSUMPTIONS & SETTLEMENTS
  const addStaffConsumption = (consumptionData: {
    staffId: string;
    staffName: string;
    items: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[];
    totalAmount: number;
    isPaid?: boolean;
    paymentType?: 'descuento_semanal' | 'pagado_ahora';
    paymentMethod?: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
    notes?: string;
  }): StaffConsumption => {
    const id = `staff-cons-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const mappedItems: import('../types').StaffConsumptionItem[] = consumptionData.items.map((it, idx) => ({
      id: `it-${Date.now()}-${idx}`,
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      subtotal: it.subtotal,
    }));

    const isPaid = consumptionData.isPaid ?? (consumptionData.paymentType === 'pagado_ahora');
    const paymentType = isPaid ? 'pagado_ahora' : 'descuento_semanal';
    const paymentMethod = isPaid ? (consumptionData.paymentMethod || 'efectivo') : undefined;

    const newConsumption: StaffConsumption = {
      id,
      staffId: consumptionData.staffId,
      staffName: consumptionData.staffName,
      date: getNetworkIsoString(),
      items: mappedItems,
      totalAmount: consumptionData.totalAmount,
      notes: consumptionData.notes,
      shiftId: currentShift?.id,
      recordedBy: currentUser.name,
      isPaid,
      paymentType,
      paymentMethod,
      isSettled: isPaid ? true : false,
    };

    // Descontar inventario de forma atómica
    discountStockForItems(consumptionData.items);

    setStaffConsumptions((prev) => [newConsumption, ...prev]);
    syncStaffConsumptionToFirestore(newConsumption);

    playAddConsumptionSound();
    showToast({
      title: isPaid ? '¡Consumo Pagado en el Acto!' : '¡Consumo a Descontar Registrado!',
      message: isPaid
        ? `Se cobró ${formatBs(consumptionData.totalAmount)} en ${getPaymentMethodLabel(paymentMethod || 'efectivo')} a ${consumptionData.staffName}. Ingresado a caja.`
        : `Se registró ${formatBs(consumptionData.totalAmount)} para descontar del sueldo semanal de ${consumptionData.staffName}.`,
      type: 'success',
    });

    return newConsumption;
  };

  const removeStaffConsumption = (id: string, restoreInventory = true) => {
    const cons = staffConsumptions.find((c) => c.id === id);
    if (!cons) return;

    if (restoreInventory) {
      restoreStockForItems(cons.items);
    }

    setStaffConsumptions((prev) => prev.filter((c) => c.id !== id));
    deleteStaffConsumptionFromFirebase(id);

    showToast({
      title: 'Consumo Anulado',
      message: `Se anuló el consumo de ${cons.staffName} y se repuso el stock.`,
      type: 'info',
    });
  };

  // EXTRA CONSUMPTIONS & DIRECT COUNTER SALES
  const addExtraConsumption = (data: {
    description: string;
    roomNumber?: string;
    originType?: 'habitacion_cerrada' | 'mostrador_recepcion' | 'cliente_espera' | 'otro';
    items: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[];
    totalAmount: number;
    paymentMethod: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
    notes?: string;
  }): ExtraConsumption => {
    const extraId = `extra-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const effectiveDesc =
      data.description.trim() ||
      (data.roomNumber ? `Consumo Habitación ${data.roomNumber} (Cerrada / Salida)` : 'Venta Mostrador / Recepción');

    const newExtra: ExtraConsumption = {
      id: extraId,
      description: effectiveDesc,
      roomNumber: data.roomNumber?.trim() || undefined,
      originType: data.originType || (data.roomNumber ? 'habitacion_cerrada' : 'mostrador_recepcion'),
      date: getNetworkIsoString(),
      items: data.items.map((it) => ({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.subtotal,
      })),
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      shiftId: currentShift?.id,
      registeredById: currentUser.id,
      registeredByName: currentUser.name,
      notes: data.notes?.trim() || undefined,
    };

    // Descontar inventario de forma atómica
    discountStockForItems(data.items);

    setExtraConsumptions((prev) => [newExtra, ...prev]);
    syncExtraConsumptionToFirestore(newExtra);

    playAddConsumptionSound();
    showToast({
      title: '¡Consumo Extra / Venta Registrada!',
      message: `Se ingresó ${formatBs(data.totalAmount)} en ${getPaymentMethodLabel(data.paymentMethod)} a la caja del turno activo (${newExtra.description}).`,
      type: 'success',
    });

    return newExtra;
  };

  const removeExtraConsumption = (id: string, restoreInventory = true) => {
    const extra = extraConsumptions.find((e) => e.id === id);
    if (!extra) return;

    if (restoreInventory) {
      restoreStockForItems(extra.items);
    }

    setExtraConsumptions((prev) => prev.filter((e) => e.id !== id));
    deleteExtraConsumptionFromFirebase(id);

    showToast({
      title: 'Consumo Extra Anulado',
      message: `Se anuló el consumo extra (${extra.description}) y se repuso el stock.`,
      type: 'info',
    });
  };

  const recordStaffSettlement = (settlementData: {
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
    netPaidAmount: number;
    notes?: string;
    paymentMethod: 'efectivo' | 'transferencia' | 'qr';
  }): StaffSettlement => {
    const settlementId = `settle-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newSettlement: StaffSettlement = {
      ...settlementData,
      id: settlementId,
      paymentDate: new Date().toISOString(),
      paidBy: currentUser.name,
      status: 'paid',
    };

    // Marcar consumos del personal incluidos como liquidados
    const consRefIds = new Set(
      settlementData.discounts
        .filter((d) => d.type === 'staff_consumption' && d.refId)
        .map((d) => d.refId!)
    );
    if (consRefIds.size > 0) {
      setStaffConsumptions((prev) =>
        prev.map((c) =>
          consRefIds.has(c.id)
            ? { ...c, isSettled: true, settlementId, settledAt: new Date().toISOString() }
            : c
        )
      );
      staffConsumptions.forEach((c) => {
        if (consRefIds.has(c.id)) {
          syncStaffConsumptionToFirestore({
            ...c,
            isSettled: true,
            settlementId,
            settledAt: new Date().toISOString(),
          });
        }
      });
    }

    // Marcar turnos con faltante incluidos como liquidados
    const shiftRefIds = new Set(
      settlementData.discounts
        .filter((d) => d.type === 'shift_shortage' && d.refId)
        .map((d) => d.refId!)
    );
    if (shiftRefIds.size > 0) {
      setShiftsHistory((prev) =>
        prev.map((s) =>
          shiftRefIds.has(s.id) ? { ...s, isSettled: true, settlementId } : s
        )
      );
      shiftsHistory.forEach((s) => {
        if (shiftRefIds.has(s.id)) {
          syncShiftToFirestore({
            ...s,
            isSettled: true,
            settlementId,
          });
        }
      });
    }

    setStaffSettlements((prev) => [newSettlement, ...prev]);
    syncStaffSettlementToFirestore(newSettlement);

    playSuccessChime();
    showToast({
      title: '¡Pago Semanal Registrado y Marcado como Pagado!',
      message: `Se liquidó el pago de ${formatBs(newSettlement.netPaidAmount)} para ${newSettlement.staffName}.`,
      type: 'success',
      durationMs: 7000,
    });

    return newSettlement;
  };

  const saveStaffMember = (member: StaffMember) => {
    setStaffMembers((prev) => {
      const exists = prev.some((m) => m.id === member.id);
      if (exists) {
        return prev.map((m) => (m.id === member.id ? member : m));
      }
      return [...prev, member];
    });
  };

  // SHIFT & CASH CLOSING (ARQUEO CIEGO & RELEVO CONTINUO)
  const closeCurrentShift = (
    responsiblePersonName: string,
    nextReceptionistName: string,
    totalPhysicalCashInDrawer: number,
    declaredQrVendis: number,
    declaredQrUnion: number,
    handoverCashFloat: number,
    notes?: string,
    cashDeliveredAtClose?: number
  ): Shift | null => {
    const shift = currentShift;
    if (!shift) return null;

    const startingCashFloat = shift.initialCashFloat || 100;
    const floatLeftForNext = handoverCashFloat !== undefined ? handoverCashFloat : startingCashFloat;
    const deliveredAtClose = cashDeliveredAtClose && cashDeliveredAtClose > 0 ? cashDeliveredAtClose : 0;

    // Recalcular métricas frescas y autoritativas directamente de las estadías del turno
    const metrics = calculateShiftMetrics(shift);
    const expectedSalesCash = metrics.expectedCash;
    const totalIncomesCash = metrics.totalIncomesCash;
    const expectedNetQrVendis = metrics.expectedQrVendis;
    const expectedNetQrUnion = metrics.expectedQrUnion;
    const expectedNetQrTotal = metrics.expectedQr;
    const operationalExpensesCash = metrics.operationalExpensesCash;

    // Efectivo que DEBERÍA haber en la gaveta antes de separar el sobre:
    // Fondo Inicial + Ventas Efectivo + Ingresos en Efectivo - Egresos Operativos en Efectivo
    const expectedCashInDrawer = Math.max(0, startingCashFloat + expectedSalesCash + totalIncomesCash - operationalExpensesCash);

    // Diferencia en Efectivo = Lo que contó en gaveta - Lo que debía haber
    const diffCash = totalPhysicalCashInDrawer - expectedCashInDrawer;
    const declaredSalesCash = Math.max(0, expectedSalesCash + diffCash);

    const declaredQrTotal = declaredQrVendis + declaredQrUnion;
    const diffQrVendis = declaredQrVendis - expectedNetQrVendis;
    const diffQrUnion = declaredQrUnion - expectedNetQrUnion;
    const diffQr = declaredQrTotal - expectedNetQrTotal;
    const totalDiff = diffCash + (diffQrVendis !== 0 || diffQrUnion !== 0 ? (diffQrVendis + diffQrUnion) : diffQr);

    const discountAmount = totalDiff < -0.01 ? Math.abs(totalDiff) : 0;
    const surplusAmount = totalDiff > 0.01 ? totalDiff : 0;

    const handoverActiveRoomsCount = rooms.filter((r) => r.status === 'ocupada').length;

    const closedShift: Shift = {
      ...shift,
      status: 'closed',
      endTime: getNetworkIsoString(),
      receptionistName: responsiblePersonName.trim() || shift.receptionistName,
      responsiblePersonName: responsiblePersonName.trim() || shift.receptionistName,
      handedOverTo: nextReceptionistName.trim(),
      initialCashFloat: startingCashFloat,
      handoverCashFloat: floatLeftForNext,
      expectedCash: expectedSalesCash,
      expectedQrVendis: expectedNetQrVendis,
      expectedQrUnion: expectedNetQrUnion,
      expectedQr: expectedNetQrTotal,
      incomes: metrics.shiftIncomes,
      totalIncomesCash: metrics.totalIncomesCash,
      totalIncomesQrVendis: metrics.totalIncomesQrVendis,
      totalIncomesQrUnion: metrics.totalIncomesQrUnion,
      totalIncomesQr: metrics.totalIncomesQr,
      totalIncomes: metrics.totalIncomes,
      operationalExpensesCash,
      totalExpensesCash: operationalExpensesCash,
      cashWithdrawals: metrics.cashWithdrawals || 0,
      cashDeliveredAtClose: deliveredAtClose,
      envelopeStatus: deliveredAtClose > 0 ? 'pendiente' : undefined,
      totalExpensesQrVendis: metrics.totalExpensesQrVendis || 0,
      totalExpensesQrUnion: metrics.totalExpensesQrUnion || 0,
      totalExpensesQr: metrics.totalExpensesQr || 0,
      totalPhysicalCashInDrawer,
      declaredCash: declaredSalesCash,
      declaredQrVendis,
      declaredQrUnion,
      declaredQr: declaredQrTotal,
      differenceCash: diffCash,
      differenceQrVendis: diffQrVendis,
      differenceQrUnion: diffQrUnion,
      differenceQr: diffQr,
      totalDifference: totalDiff,
      discountAmount,
      surplusAmount,
      notes,
      handoverActiveRoomsCount,
      stayIds: metrics.stayIds,
      salesCount: metrics.salesCount,
      expenses: metrics.shiftExpenses,
    };

    // 1. Guardar en historial local y Firebase
    setShiftsHistory((prev) => [closedShift, ...prev.filter((s) => s.id !== closedShift.id)]);
    syncShiftToFirestore(closedShift);

    // 2. Determinar siguiente usuario según nombre entrante
    const nextUser =
      SYSTEM_USERS.find((u) => u.name.toLowerCase().includes(nextReceptionistName.toLowerCase())) ||
      (shift.receptionistId === 'user-recep-dia'
        ? SYSTEM_USERS.find((u) => u.id === 'user-recep-noche') || SYSTEM_USERS[2]
        : SYSTEM_USERS.find((u) => u.id === 'user-recep-dia') || SYSTEM_USERS[1]);

    // 3. Crear UN SOLO nuevo turno abierto para el recepcionista entrante con la caja chica dejada
    const newShiftForNext: Shift = {
      id: `shift-${nextUser.id}-${getNetworkTimestamp()}`,
      receptionistId: nextUser.id,
      receptionistName: nextReceptionistName.trim() || nextUser.name,
      shiftType: nextUser.role === 'recepcionista_noche' ? 'noche' : 'dia',
      startTime: getNetworkIsoString(),
      status: 'open',
      initialCashFloat: floatLeftForNext,
      expectedCash: 0,
      expectedQr: 0,
      totalExpensesCash: 0,
      totalExpensesQr: 0,
      expenses: [],
      salesCount: 0,
      stayIds: [],
    };

    setActiveShifts({
      [nextUser.id]: newShiftForNext,
    });

    syncShiftToFirestore(newShiftForNext);

    // 4. Conmutar usuario activo
    setCurrentUserId(nextUser.id);

    playSuccessChime();
    showToast({
      title: '¡Cambio de Turno Realizado con Éxito!',
      message: `Turno entregado por "${responsiblePersonName}" a "${nextReceptionistName || nextUser.name}". Caja Chica de ${formatBs(floatLeftForNext)}. Diferencia: ${formatBs(totalDiff)}.`,
      type: discountAmount > 0 ? 'warning' : 'success',
      durationMs: 8500,
    });

    return closedShift;
  };

  // AUDITORÍA Y AJUSTE DE TURNOS POR ADMINISTRADOR
  const updateShiftInHistory = (
    shiftId: string,
    updatedData: Partial<Shift>
  ): boolean => {
    const existing = shiftsHistory.find((s) => s.id === shiftId);
    if (!existing) return false;

    const initialCashFloat = updatedData.initialCashFloat !== undefined ? updatedData.initialCashFloat : (existing.initialCashFloat || 100);
    const handoverCashFloat = updatedData.handoverCashFloat !== undefined ? updatedData.handoverCashFloat : (existing.handoverCashFloat ?? 100);
    const totalPhysicalCashInDrawer = updatedData.totalPhysicalCashInDrawer !== undefined ? updatedData.totalPhysicalCashInDrawer : (existing.totalPhysicalCashInDrawer ?? 0);
    const cashDeliveredAtClose = updatedData.cashDeliveredAtClose !== undefined ? updatedData.cashDeliveredAtClose : (existing.cashDeliveredAtClose || 0);
    const totalExpensesCash = updatedData.totalExpensesCash !== undefined ? updatedData.totalExpensesCash : (existing.totalExpensesCash || 0);

    const expectedCash = updatedData.expectedCash !== undefined ? updatedData.expectedCash : (existing.expectedCash || 0);
    const expectedQrVendis = updatedData.expectedQrVendis !== undefined ? updatedData.expectedQrVendis : (existing.expectedQrVendis || 0);
    const expectedQrUnion = updatedData.expectedQrUnion !== undefined ? updatedData.expectedQrUnion : (existing.expectedQrUnion || 0);
    const expectedQr = updatedData.expectedQr !== undefined ? updatedData.expectedQr : (existing.expectedQr || (expectedQrVendis + expectedQrUnion));

    const declaredQrVendis = updatedData.declaredQrVendis !== undefined ? updatedData.declaredQrVendis : (existing.declaredQrVendis || 0);
    const declaredQrUnion = updatedData.declaredQrUnion !== undefined ? updatedData.declaredQrUnion : (existing.declaredQrUnion || 0);
    const declaredQr = updatedData.declaredQr !== undefined ? updatedData.declaredQr : (declaredQrVendis + declaredQrUnion);

    // Determinar egresos operativos vs retiros para evitar doble conteo
    let operationalExpensesCash = totalExpensesCash;
    if (existing.cashDeliveredAtClose && operationalExpensesCash >= existing.cashDeliveredAtClose) {
      operationalExpensesCash -= existing.cashDeliveredAtClose;
    }
    const allExpensesCash = operationalExpensesCash + cashDeliveredAtClose;

    // Efectivo esperado en gaveta = Fondo Inicial + Ventas Efectivo - Egresos Operativos
    const expectedCashInDrawer = Math.max(0, initialCashFloat + expectedCash - operationalExpensesCash);

    // Efectivo físico total contado (si totalPhysicalCashInDrawer ya incluye todo, o si se especificó caja chica + sobre):
    const effectivePhysicalCash = Math.max(
      totalPhysicalCashInDrawer,
      handoverCashFloat + cashDeliveredAtClose
    );

    const diffCash = effectivePhysicalCash - expectedCashInDrawer;
    const declaredCash = Math.max(0, expectedCash + diffCash);

    const diffQrVendis = declaredQrVendis - expectedQrVendis;
    const diffQrUnion = declaredQrUnion - expectedQrUnion;
    const diffQr = declaredQr - expectedQr;
    const totalDiff = diffCash + (diffQrVendis !== 0 || diffQrUnion !== 0 ? (diffQrVendis + diffQrUnion) : diffQr);

    const discountAmount = totalDiff < -0.01 ? Math.abs(totalDiff) : 0;
    const surplusAmount = totalDiff > 0.01 ? totalDiff : 0;

    const mergedShift: Shift = {
      ...existing,
      ...updatedData,
      initialCashFloat,
      handoverCashFloat,
      totalPhysicalCashInDrawer,
      cashDeliveredAtClose,
      envelopeStatus: cashDeliveredAtClose > 0 ? (updatedData.envelopeStatus || existing.envelopeStatus || 'pendiente') : undefined,
      operationalExpensesCash,
      totalExpensesCash: operationalExpensesCash,
      declaredCash,
      declaredQrVendis,
      declaredQrUnion,
      declaredQr,
      differenceCash: diffCash,
      differenceQrVendis: diffQrVendis,
      differenceQrUnion: diffQrUnion,
      differenceQr: diffQr,
      totalDifference: totalDiff,
      discountAmount,
      surplusAmount,
    };

    setShiftsHistory((prev) => prev.map((s) => (s.id === shiftId ? mergedShift : s)));
    syncShiftToFirestore(mergedShift);

    showToast({
      title: '¡Turno Actualizado y Cuadrado!',
      message: `Se actualizaron los datos del turno de ${mergedShift.receptionistName}. Diferencia ajustada: ${formatBs(totalDiff)}.`,
      type: 'success',
    });

    return true;
  };

  const deleteShiftFromHistory = (shiftId: string): void => {
    setShiftsHistory((prev) => prev.filter((s) => s.id !== shiftId));
    setActiveShifts((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key]?.id === shiftId) {
          delete next[key];
        }
      });
      return next;
    });
    deleteShiftFromFirebase(shiftId);
    showToast({
      title: 'Turno Eliminado',
      message: 'El registro del turno ha sido eliminado permanentemente.',
      type: 'info',
    });
  };

  const recalculateShiftSales = useCallback(
    (shift: Shift): Shift => {
      const metrics = calculateShiftMetrics(shift);
      const startingFloat = shift.initialCashFloat !== undefined ? shift.initialCashFloat : 100;
      const handoverFloat = shift.handoverCashFloat !== undefined ? shift.handoverCashFloat : startingFloat;
      const deliveredAtClose = shift.cashDeliveredAtClose || 0;
      const countedCash =
        shift.totalPhysicalCashInDrawer !== undefined
          ? shift.totalPhysicalCashInDrawer
          : handoverFloat + deliveredAtClose;

      const expectedCashInDrawer = Math.max(0, startingFloat + metrics.expectedCash - metrics.operationalExpensesCash);
      const diffCash = countedCash - expectedCashInDrawer;
      const declaredSalesCash = Math.max(0, metrics.expectedCash + diffCash);

      const declaredQrVendis = shift.declaredQrVendis !== undefined ? shift.declaredQrVendis : metrics.expectedQrVendis;
      const declaredQrUnion = shift.declaredQrUnion !== undefined ? shift.declaredQrUnion : metrics.expectedQrUnion;
      const declaredQrTotal = shift.declaredQr !== undefined ? shift.declaredQr : declaredQrVendis + declaredQrUnion;

      const diffQrVendis = declaredQrVendis - metrics.expectedQrVendis;
      const diffQrUnion = declaredQrUnion - metrics.expectedQrUnion;
      const diffQr = declaredQrTotal - metrics.expectedQr;
      const totalDiff = diffCash + diffQrVendis + diffQrUnion;

      const discountAmount = totalDiff < -0.01 ? Math.abs(totalDiff) : 0;
      const surplusAmount = totalDiff > 0.01 ? totalDiff : 0;

      const updatedShift: Shift = {
        ...shift,
        expectedCash: metrics.expectedCash,
        expectedQrVendis: metrics.expectedQrVendis,
        expectedQrUnion: metrics.expectedQrUnion,
        expectedQr: metrics.expectedQr,
        salesCount: metrics.salesCount,
        stayIds: metrics.stayIds,
        expenses: metrics.shiftExpenses,
        operationalExpensesCash: metrics.operationalExpensesCash,
        cashWithdrawals: metrics.cashWithdrawals,
        totalExpensesCash: metrics.totalExpensesCash,
        totalExpensesQrVendis: metrics.totalExpensesQrVendis,
        totalExpensesQrUnion: metrics.totalExpensesQrUnion,
        totalExpensesQr: metrics.totalExpensesQr,
        totalPhysicalCashInDrawer: countedCash,
        declaredCash: declaredSalesCash,
        declaredQrVendis,
        declaredQrUnion,
        declaredQr: declaredQrTotal,
        differenceCash: diffCash,
        differenceQrVendis: diffQrVendis,
        differenceQrUnion: diffQrUnion,
        differenceQr: diffQr,
        totalDifference: totalDiff,
        discountAmount,
        surplusAmount,
      };

      setShiftsHistory((prev) => prev.map((s) => (s.id === updatedShift.id ? updatedShift : s)));
      syncShiftToFirestore(updatedShift);
      return updatedShift;
    },
    [calculateShiftMetrics]
  );

  const recalculateAllSeptemberShifts = useCallback(async (): Promise<number> => {
    const septShifts = shiftsHistory.filter(
      (s) => (s.startTime || '') >= '2026-09-01T00:00:00Z' && s.status === 'closed'
    );
    let count = 0;
    for (const s of septShifts) {
      recalculateShiftSales(s);
      count++;
    }
    showToast({
      title: 'Auditoría Completada',
      message: `Se auditaron y reconciliaron exitosamente ${count} turnos de septiembre.`,
      type: 'success',
    });
    return count;
  }, [shiftsHistory, recalculateShiftSales, showToast]);

  const markShiftEnvelopeCollected = useCallback(
    (
      shiftId: string,
      collectedBy = 'Marco',
      notes?: string,
      status: 'pendiente' | 'recogido' = 'recogido'
    ): boolean => {
      const shift = shiftsHistory.find((s) => s.id === shiftId);
      if (!shift) return false;

      const isPending = status === 'pendiente';
      const updatedShift: Shift = {
        ...shift,
        envelopeStatus: isPending ? 'pendiente' : 'recogido',
        envelopeCollectedAt: isPending ? undefined : getNetworkIsoString(),
        envelopeCollectedBy: isPending ? undefined : collectedBy,
        envelopeNotes: isPending ? undefined : (notes || shift.envelopeNotes),
      };

      setShiftsHistory((prev) => prev.map((s) => (s.id === shiftId ? updatedShift : s)));
      syncShiftToFirestore(updatedShift);

      showToast({
        title: isPending ? 'Sobre Marcado como Pendiente' : '¡Sobre Marcado como Recogido!',
        message: isPending
          ? `El sobre de ${formatBs(shift.cashDeliveredAtClose || 0)} vuelve a figurar pendiente en recepción.`
          : `Se confirmó el recojo del sobre de ${formatBs(shift.cashDeliveredAtClose || 0)} por ${collectedBy}.`,
        type: 'success',
      });

      return true;
    },
    [shiftsHistory, showToast]
  );

  // ADMIN ACTIONS
  const cancelStay = (stayId: string, reason: string, restoreInventory = true): boolean => {
    if (currentUser.role !== 'admin') {
      showToast({
        title: 'Acción No Permitida',
        message: 'Solamente el Administrador tiene autorización para anular habitaciones.',
        type: 'error',
      });
      return false;
    }

    let targetStay: Stay | undefined;
    let targetRoom: Room | undefined;

    for (const r of rooms) {
      if (r.currentStay && r.currentStay.id === stayId) {
        targetStay = r.currentStay;
        targetRoom = r;
        break;
      }
    }

    if (!targetStay) {
      targetStay = completedStays.find((s) => s.id === stayId);
    }

    if (!targetStay) {
      showToast({
        title: 'Registro no encontrado',
        message: `No se encontró la estancia con ID ${stayId}.`,
        type: 'error',
      });
      return false;
    }

    if (restoreInventory && targetStay.consumptions && targetStay.consumptions.length > 0) {
      restoreStockForItems(targetStay.consumptions);
    }

    const cancelledStay: Stay = {
      ...targetStay,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: currentUser.name,
      cancellationReason: reason,
      restoreInventoryOnCancel: restoreInventory,
    };

    if (targetRoom && targetRoom.currentStay?.id === stayId) {
      const updatedRoom: Room = {
        ...targetRoom,
        status: 'disponible',
        currentStay: undefined,
        cleaningStartTime: undefined,
      };
      setRooms((prev) => prev.map((r) => (r.id === targetRoom!.id ? updatedRoom : r)));
      syncRoomToFirestore(updatedRoom);
    }

    setCompletedStays((prev) => [
      cancelledStay,
      ...prev.filter((s) => s.id !== cancelledStay.id),
    ]);
    syncCompletedStayToFirebase(cancelledStay);

    showToast({
      title: '¡Registro Anulado Correctamente!',
      message: `Se anuló el registro de ${targetStay.roomName}. ${restoreInventory ? 'Se repuso el inventario consumido.' : ''}`,
      type: 'warning',
      durationMs: 6000,
    });

    return true;
  };

  const updateStay = (
    updatedStay: Stay,
    options?: { previousConsumptions?: ConsumptionItem[]; restoreStockDiff?: boolean }
  ): boolean => {
    if (currentUser.role !== 'admin') {
      showToast({
        title: 'Acción No Permitida',
        message: 'Solamente el Administrador tiene autorización para editar registros de habitaciones.',
        type: 'error',
      });
      return false;
    }

    // 1. Manejar ajuste de inventario si los consumos cambiaron
    if (options?.restoreStockDiff !== false && options?.previousConsumptions) {
      const prevMap = new Map<string, number>();
      options.previousConsumptions.forEach((item) => {
        prevMap.set(item.productId, (prevMap.get(item.productId) || 0) + item.quantity);
      });

      const newMap = new Map<string, number>();
      (updatedStay.consumptions || []).forEach((item) => {
        newMap.set(item.productId, (newMap.get(item.productId) || 0) + item.quantity);
      });

      const allProductIds = new Set([...prevMap.keys(), ...newMap.keys()]);
      allProductIds.forEach((prodId) => {
        const prevQty = prevMap.get(prodId) || 0;
        const newQty = newMap.get(prodId) || 0;
        const diff = prevQty - newQty; // diff > 0 -> reponer stock (+diff). diff < 0 -> restar stock (-|diff|).
        if (diff !== 0) {
          const product = products.find((p) => p.id === prodId);
          if (product) {
            const updatedProduct = {
              ...product,
              stock: Math.max(0, product.stock + diff),
            };
            setProducts((prev) => prev.map((p) => (p.id === prodId ? updatedProduct : p)));
            syncProductToFirestore(updatedProduct);
          }
        }
      });
    }

    // 2. Si la estadía está actualmente activa en una habitación
    let isLiveInRoom = false;
    setRooms((prevRooms) =>
      prevRooms.map((r) => {
        if (r.currentStay && r.currentStay.id === updatedStay.id) {
          isLiveInRoom = true;
          const updatedRoom: Room = {
            ...r,
            currentStay: updatedStay,
          };
          syncRoomToFirestore(updatedRoom);
          return updatedRoom;
        }
        return r;
      })
    );

    // 3. Actualizar en historial de estadías completadas
    setCompletedStays((prev) => {
      const exists = prev.some((s) => s.id === updatedStay.id);
      if (exists) {
        return prev.map((s) => (s.id === updatedStay.id ? updatedStay : s));
      } else if (!isLiveInRoom) {
        return [updatedStay, ...prev];
      }
      return prev;
    });

    // 4. Sincronizar en Firebase
    syncCompletedStayToFirebase(updatedStay);

    showToast({
      title: '¡Estadía Modificada!',
      message: `Se guardaron los cambios para ${updatedStay.roomName || 'la habitación'} correctamente.`,
      type: 'success',
      durationMs: 4000,
    });

    return true;
  };

  const cleanupOrphanShifts = async (): Promise<number> => {
    const openShifts = shiftsHistory.filter((s) => s.status === 'open');
    if (openShifts.length <= 1) {
      showToast({
        title: 'Turnos ya Consolidados',
        message: 'Actualmente solo existe 1 turno abierto en recepción.',
        type: 'info',
      });
      return 0;
    }

    openShifts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    const latestOpen = openShifts[0];
    const orphanShifts = openShifts.slice(1);

    orphanShifts.forEach((orphan) => {
      const closedOrphan: Shift = {
        ...orphan,
        status: 'closed',
        endTime: orphan.endTime || new Date().toISOString(),
        notes: orphan.notes
          ? `${orphan.notes} • (Consolidado por Admin)`
          : 'Cierre y consolidación de turno huérfano',
      };
      syncShiftToFirestore(closedOrphan);
    });

    const updatedShifts = shiftsHistory.map((s) => {
      if (s.id === latestOpen.id) return latestOpen;
      if (orphanShifts.some((o) => o.id === s.id)) {
        return {
          ...s,
          status: 'closed' as const,
          endTime: s.endTime || new Date().toISOString(),
        };
      }
      return s;
    });

    setShiftsHistory(updatedShifts);
    setActiveShifts({ [latestOpen.receptionistId]: latestOpen });

    showToast({
      title: '¡Turnos Consolidados!',
      message: `Se cerraron y consolidaron ${orphanShifts.length} turnos huérfanos anteriores. Ahora hay 1 solo turno activo (${latestOpen.receptionistName}).`,
      type: 'success',
      durationMs: 5000,
    });

    return orphanShifts.length;
  };

  const addInventoryLog = useCallback(
    (logData: Omit<InventoryMovementLog, 'id' | 'timestamp' | 'date'> & { date?: string }) => {
      const activeShiftId = rawTargetShift?.id;
      const newLog: InventoryMovementLog = {
        ...logData,
        shiftId: logData.shiftId || activeShiftId,
        id: `inv-log-${getNetworkTimestamp()}-${Math.random().toString(36).substring(2, 7)}`,
        date: logData.date || getNetworkIsoString(),
        timestamp: getNetworkTimestamp(),
      };
      setInventoryLogs((prev) => [newLog, ...prev]);
      syncInventoryLogToFirestore(newLog);
    },
    [rawTargetShift]
  );

  const deleteInventoryLogById = useCallback((logId: string) => {
    setInventoryLogs((prev) => prev.filter((l) => l.id !== logId));
    deleteInventoryLogFromFirebase(logId);
  }, []);

  const saveProduct = (
    product: Product,
    options?: { logAction?: InventoryActionType; quantityAdded?: number; notes?: string }
  ) => {
    const existing = products.find((p) => p.id === product.id);

    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.map((p) => (p.id === product.id ? product : p));
      }
      return [...prev, product];
    });
    syncProductToFirestore(product);

    // Auditoría de movimientos de stock
    if (!existing) {
      addInventoryLog({
        productId: product.id,
        productName: product.name,
        category: product.category,
        action: 'create_product',
        previousStock: 0,
        newStock: product.stock,
        quantityAdded: product.stock,
        previousPrice: undefined,
        newPrice: product.price,
        responsibleId: currentUser.id,
        responsibleName: currentUser.name,
        notes: options?.notes || `Creación inicial de producto con ${product.stock} unid. a ${formatBs(product.price)}`,
      });
    } else {
      const diff = options?.quantityAdded !== undefined ? options.quantityAdded : (product.stock - existing.stock);
      const priceChanged = existing.price !== product.price;

      if (diff !== 0 || priceChanged || options?.logAction) {
        const action: InventoryActionType =
          options?.logAction || (diff > 0 ? 'restock' : diff < 0 ? 'manual_adjustment' : 'price_change');

        addInventoryLog({
          productId: product.id,
          productName: product.name,
          category: product.category,
          action,
          previousStock: existing.stock,
          newStock: product.stock,
          quantityAdded: diff,
          previousPrice: existing.price,
          newPrice: product.price,
          responsibleId: currentUser.id,
          responsibleName: currentUser.name,
          notes:
            options?.notes ||
            (diff > 0
              ? `Reabastecimiento de +${diff} unidades (de ${existing.stock} a ${product.stock} unid.)`
              : diff < 0
              ? `Ajuste manual de ${diff} unidades (de ${existing.stock} a ${product.stock} unid.)`
              : `Cambio de precio de ${formatBs(existing.price)} a ${formatBs(product.price)}`),
        });
      }
    }
  };

  const deleteProductById = (productId: string) => {
    const existing = products.find((p) => p.id === productId);
    if (existing) {
      addInventoryLog({
        productId: existing.id,
        productName: existing.name,
        category: existing.category,
        action: 'delete_product',
        previousStock: existing.stock,
        newStock: 0,
        quantityAdded: -existing.stock,
        previousPrice: existing.price,
        newPrice: undefined,
        responsibleId: currentUser.id,
        responsibleName: currentUser.name,
        notes: `Eliminación de producto (${existing.stock} unidades descartadas)`,
      });
    }
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    deleteProductFromFirestore(productId);
  };

  const updateTariffCatalog = (newTariffs: TariffCatalog) => {
    setTariffs(newTariffs);
    syncTariffsToFirestore(newTariffs);
  };

  const resetAllDataToDefaults = () => {
    setRooms(INITIAL_ROOMS);
    setTariffs(INITIAL_TARIFFS);
    setProducts(INITIAL_PRODUCTS);
    setShiftsHistory([]);
    setActiveShifts({});
    setCompletedStays([]);
    setExpenses([]);
    setStaffConsumptions([]);
    setStaffSettlements([]);
  };

  const exportDatabaseJson = () => {
    const data = {
      rooms,
      tariffs,
      products,
      shiftsHistory,
      completedStays,
      expenses,
      staffConsumptions,
      staffSettlements,
      exportedAt: new Date().toISOString(),
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `mon_amour_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importDatabaseJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.rooms) setRooms(parsed.rooms);
      if (parsed.tariffs) setTariffs(parsed.tariffs);
      if (parsed.products) setProducts(parsed.products);
      if (parsed.shiftsHistory) setShiftsHistory(parsed.shiftsHistory);
      if (parsed.completedStays) setCompletedStays(parsed.completedStays);
      if (parsed.expenses) setExpenses(parsed.expenses);
      if (parsed.staffConsumptions) setStaffConsumptions(parsed.staffConsumptions);
      if (parsed.staffSettlements) setStaffSettlements(parsed.staffSettlements);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        rooms,
        tariffs,
        products,
        currentUser,
        currentShift,
        shiftsHistory,
        completedStays,
        expenses,
        incomes,
        staffConsumptions,
        staffSettlements,
        staffMembers,
        extraConsumptions,
        inventoryLogs,
        soundAlertsEnabled,
        toasts,
        nowTimestamp,
        isFirestoreConnected,
        reloadFromFirebase,
        setCurrentUserById,
        toggleSoundAlerts,
        showToast,
        dismissToast,
        registerStay,
        registerRoomEntry,
        addConsumptionToRoom,
        addCustomConsumptionToRoom,
        removeConsumptionFromRoom,
        closeStayAndCheckout,
        changeRoomStatus,
        changeRoom,
        addExpenseToShift,
        addIncomeToShift,
        removeIncomeFromShift,
        addExtraConsumption,
        removeExtraConsumption,
        addStaffConsumption,
        removeStaffConsumption,
        recordStaffSettlement,
        saveStaffMember,
        closeCurrentShift,
        updateShiftInHistory,
        deleteShiftFromHistory,
        recalculateShiftSales,
        recalculateAllSeptemberShifts,
        markShiftEnvelopeCollected,
        cancelStay,
        updateStay,
        cleanupOrphanShifts,
        saveProduct,
        deleteProductById,
        addInventoryLog,
        deleteInventoryLogById,
        updateTariffCatalog,
        resetAllDataToDefaults,
        exportDatabaseJson,
        importDatabaseJson,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return context;
};

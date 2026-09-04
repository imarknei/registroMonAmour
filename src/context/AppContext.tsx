import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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
  PlanType,
  StaffMember,
  StaffConsumption,
  StaffSettlement,
  StaffSettlementDiscountItem,
  ExtraConsumption,
  InventoryMovementLog,
  InventoryActionType,
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
  subscribeToRooms,
  subscribeToProducts,
  subscribeToTariffs,
  subscribeToExpenses,
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
  syncStayToFirebase,
  syncCompletedStayToFirebase,
  syncExpenseToFirestore,
  getFirebaseDb,
  getStoredFirebaseConfig,
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
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);

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
      const now = Date.now();
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
      const unsubRooms = await subscribeToRooms((firestoreRooms) => {
        if (firestoreRooms && firestoreRooms.length > 0) {
          setRooms(firestoreRooms);
        }
      });
      if (unsubRooms) unsubs.push(unsubRooms);

      // Products
      const unsubProducts = await subscribeToProducts((firestoreProducts) => {
        if (firestoreProducts && firestoreProducts.length > 0) {
          setProducts(firestoreProducts);
        }
      });
      if (unsubProducts) unsubs.push(unsubProducts);

      // Tariffs
      const unsubTariffs = await subscribeToTariffs((firestoreTariffs) => {
        if (firestoreTariffs) {
          setTariffs(firestoreTariffs);
        }
      });
      if (unsubTariffs) unsubs.push(unsubTariffs);

      // Expenses
      const unsubExp = await subscribeToExpenses((firestoreExpenses) => {
        if (firestoreExpenses) {
          setExpenses(firestoreExpenses);
        }
      });
      if (unsubExp) unsubs.push(unsubExp);

      // Shifts
      const unsubShifts = await subscribeToAllShifts((firestoreShifts) => {
        if (firestoreShifts) {
          const openShifts = firestoreShifts.filter((s) => s.status === 'open');

          if (openShifts.length > 1) {
            // Sorteamos los turnos abiertos por fecha de inicio descendente (el más nuevo primero)
            openShifts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
            const latestOpen = openShifts[0];
            const orphanShifts = openShifts.slice(1);

            // Auto-cerrar turnos huérfanos anteriores en Firestore
            orphanShifts.forEach((orphan) => {
              const closedOrphan: Shift = {
                ...orphan,
                status: 'closed',
                endTime: orphan.endTime || new Date().toISOString(),
                notes: orphan.notes
                  ? `${orphan.notes} • (Cierre automático de turno huérfano)`
                  : 'Cierre automático de turno anterior huérfano',
              };
              syncShiftToFirestore(closedOrphan);
            });

            // Reconstruir lista limpia con solo 1 turno abierto
            const sanitizedShifts = firestoreShifts.map((s) => {
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

            setShiftsHistory(sanitizedShifts);
            setActiveShifts({ [latestOpen.receptionistId]: latestOpen });
          } else {
            setShiftsHistory(firestoreShifts);
            if (openShifts.length === 1) {
              const singleOpen = openShifts[0];
              setActiveShifts({ [singleOpen.receptionistId]: singleOpen });
            }
          }
        }
      });
      if (unsubShifts) unsubs.push(unsubShifts);

      // Stays
      const unsubStays = await subscribeToAllStays((firestoreStays) => {
        if (firestoreStays) {
          setCompletedStays(firestoreStays);
        }
      });
      if (unsubStays) unsubs.push(unsubStays);

      // Staff Consumptions
      const unsubStaffCons = await subscribeToStaffConsumptions((firestoreStaffCons) => {
        if (firestoreStaffCons) {
          setStaffConsumptions(firestoreStaffCons);
        }
      });
      if (unsubStaffCons) unsubs.push(unsubStaffCons);

      // Staff Settlements
      const unsubStaffSettles = await subscribeToStaffSettlements((firestoreStaffSettles) => {
        if (firestoreStaffSettles) {
          setStaffSettlements(firestoreStaffSettles);
        }
      });
      if (unsubStaffSettles) unsubs.push(unsubStaffSettles);

      // Extra Consumptions
      const unsubExtraCons = await subscribeToExtraConsumptions((firestoreExtraCons) => {
        if (firestoreExtraCons) {
          setExtraConsumptions(firestoreExtraCons);
        }
      });
      if (unsubExtraCons) unsubs.push(unsubExtraCons);

      // Inventory Movement Logs
      const unsubInventoryLogs = await subscribeToInventoryLogs((firestoreLogs) => {
        if (firestoreLogs) {
          setInventoryLogs(firestoreLogs);
        }
      });
      if (unsubInventoryLogs) unsubs.push(unsubInventoryLogs);
    };

    setupFirebaseSync();

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // 6. Ensure there is EXACTLY ONE active shift for reception
  const ensureActiveShift = useCallback((user: User): Shift => {
    // 1. Buscar si ya hay un turno abierto en activeShifts
    const openInActive = Object.values(activeShifts).find((s) => s.status === 'open');
    if (openInActive) {
      return openInActive;
    }

    // 2. Buscar si hay algún turno abierto en historial
    const openInHistory = shiftsHistory.find((s) => s.status === 'open');
    if (openInHistory) {
      setActiveShifts({ [openInHistory.receptionistId]: openInHistory });
      return openInHistory;
    }

    // 3. Obtener caja chica del último turno cerrado o 100 Bs por defecto
    const lastClosedShift = shiftsHistory.find((s) => s.status === 'closed');
    const initialFloat = lastClosedShift?.handoverCashFloat || 100;

    const receptionistUser = user.role === 'admin' ? SYSTEM_USERS[1] : user;
    const shiftType = receptionistUser.role === 'recepcionista_noche' ? 'noche' : 'dia';
    const newShift: Shift = {
      id: `shift-${receptionistUser.id}-${Date.now()}`,
      receptionistId: receptionistUser.id,
      receptionistName: receptionistUser.name,
      shiftType,
      startTime: new Date().toISOString(),
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

    setActiveShifts({ [receptionistUser.id]: newShift });
    syncShiftToFirestore(newShift);
    return newShift;
  }, [activeShifts, shiftsHistory]);

  // Turno base sin recalcular
  const rawTargetShift = useMemo<Shift | null>(() => {
    const openInActive = Object.values(activeShifts).find((s) => s.status === 'open');
    if (openInActive) return openInActive;

    const historyOpen = shiftsHistory.find((s) => s.status === 'open');
    if (historyOpen) return historyOpen;

    if (currentUser.role !== 'admin') {
      return ensureActiveShift(currentUser);
    }
    return ensureActiveShift(SYSTEM_USERS[1]);
  }, [currentUser, activeShifts, shiftsHistory, ensureActiveShift]);

  // Cálculo en vivo y exacto del total en caja del turno (Caja Chica, Ventas Efectivo, QR y Gastos)
  const currentShift = useMemo<Shift | null>(() => {
    if (!rawTargetShift) return null;

    const shiftStartTime = new Date(rawTargetShift.startTime).getTime();
    const shiftEndTime = rawTargetShift.endTime ? new Date(rawTargetShift.endTime).getTime() : Infinity;

    let liveCashSales = 0;
    let liveQrVendisSales = 0;
    let liveQrUnionSales = 0;
    let liveQrSales = 0;
    let liveSalesCount = 0;
    const countedSalesStayIds = new Set<string>();
    const trackedStayIds = new Set<string>(rawTargetShift.stayIds || []);

    // 1. Sumar cobros adelantados y consumos cobrados al momento de habitaciones actualmente ocupadas en este turno
    rooms.forEach((r) => {
      if (r.status === 'ocupada' && r.currentStay) {
        const s = r.currentStay;
        if (s.status === 'cancelled') return;
        const stayTime = new Date(s.startTime).getTime();
        const matchesReceptionist = s.receptionistId === rawTargetShift.receptionistId;
        const inTimeWindow = stayTime >= shiftStartTime && stayTime <= shiftEndTime;
        const isThisShiftEntry = s.entryShiftId === rawTargetShift.id || (!s.entryShiftId && matchesReceptionist && inTimeWindow);

        if (isThisShiftEntry && s.isPrepaid) {
          trackedStayIds.add(s.id);
          const prepCash = s.prepaidCash || (s.paymentMethod === 'efectivo' ? s.prepaidAmount || s.baseRoomPrice : 0);
          const prepVendis = s.prepaidQrVendis || (s.paymentMethod === 'qr_vendis' ? s.prepaidAmount || s.baseRoomPrice : 0);
          const prepUnion = s.prepaidQrUnion || (s.paymentMethod === 'qr_union' ? s.prepaidAmount || s.baseRoomPrice : 0);
          const prepQr = s.prepaidQr || (prepVendis + prepUnion) || (s.paymentMethod === 'qr' ? s.prepaidAmount || s.baseRoomPrice : 0);

          liveCashSales += prepCash;
          liveQrVendisSales += prepVendis;
          liveQrUnionSales += prepUnion;
          liveQrSales += prepQr;
          if (!countedSalesStayIds.has(s.id)) {
            countedSalesStayIds.add(s.id);
            liveSalesCount++;
          }
        }

        // Consumos pagados al momento en este turno
        (s.consumptions || []).forEach((c) => {
          if (c.isPaid) {
            const cTime = c.paidAt ? new Date(c.paidAt).getTime() : stayTime;
            const isThisShiftCons =
              c.paidShiftId === rawTargetShift.id ||
              (!c.paidShiftId && c.paidReceptionistId === rawTargetShift.receptionistId) ||
              (!c.paidShiftId && matchesReceptionist && cTime >= shiftStartTime && cTime <= shiftEndTime);

            if (isThisShiftCons) {
              if (c.paymentMethod === 'efectivo') liveCashSales += c.subtotal;
              else if (c.paymentMethod === 'qr_vendis') {
                liveQrVendisSales += c.subtotal;
                liveQrSales += c.subtotal;
              } else if (c.paymentMethod === 'qr_union') {
                liveQrUnionSales += c.subtotal;
                liveQrSales += c.subtotal;
              } else if (c.paymentMethod === 'qr') {
                liveQrVendisSales += c.subtotal;
                liveQrSales += c.subtotal;
              }
            }
          }
        });
      }
    });

    // 2. Sumar habitaciones cerradas y cobradas durante el turno
    completedStays.forEach((s) => {
      if (s.status === 'cancelled') return;
      const stayStartTime = new Date(s.startTime).getTime();
      const stayEndTime = s.endTime ? new Date(s.endTime).getTime() : stayStartTime;
      const matchesReceptionist = s.receptionistId === rawTargetShift.receptionistId;
      const isEntryInThisShift = s.entryShiftId === rawTargetShift.id || (!s.entryShiftId && matchesReceptionist && stayStartTime >= shiftStartTime && stayStartTime <= shiftEndTime);
      const isCheckoutInThisShift = s.checkoutShiftId === rawTargetShift.id || (s.checkoutReceptionistId === rawTargetShift.receptionistId) || (!s.checkoutShiftId && matchesReceptionist && stayEndTime >= shiftStartTime && stayEndTime <= shiftEndTime);

      // 2a. Cobro de adelanto / prepago en este turno
      if (isEntryInThisShift && s.isPrepaid) {
        trackedStayIds.add(s.id);
        const prepCash = s.prepaidCash || (s.paymentMethod === 'efectivo' ? s.prepaidAmount || s.baseRoomPrice : 0);
        const prepVendis = s.prepaidQrVendis || (s.paymentMethod === 'qr_vendis' ? s.prepaidAmount || s.baseRoomPrice : 0);
        const prepUnion = s.prepaidQrUnion || (s.paymentMethod === 'qr_union' ? s.prepaidAmount || s.baseRoomPrice : 0);
        const prepQr = s.prepaidQr || (prepVendis + prepUnion) || (s.paymentMethod === 'qr' ? s.prepaidAmount || s.baseRoomPrice : 0);

        liveCashSales += prepCash;
        liveQrVendisSales += prepVendis;
        liveQrUnionSales += prepUnion;
        liveQrSales += prepQr;
        if (!countedSalesStayIds.has(s.id)) {
          countedSalesStayIds.add(s.id);
          liveSalesCount++;
        }
      }

      // 2b. Consumos cobrados al momento en este turno
      (s.consumptions || []).forEach((c) => {
        if (c.isPaid) {
          const cTime = c.paidAt ? new Date(c.paidAt).getTime() : stayStartTime;
          const isThisShiftCons =
            c.paidShiftId === rawTargetShift.id ||
            (!c.paidShiftId && c.paidReceptionistId === rawTargetShift.receptionistId) ||
            (!c.paidShiftId && matchesReceptionist && cTime >= shiftStartTime && cTime <= shiftEndTime);

          if (isThisShiftCons) {
            if (c.paymentMethod === 'efectivo') liveCashSales += c.subtotal;
            else if (c.paymentMethod === 'qr_vendis') {
              liveQrVendisSales += c.subtotal;
              liveQrSales += c.subtotal;
            } else if (c.paymentMethod === 'qr_union') {
              liveQrUnionSales += c.subtotal;
              liveQrSales += c.subtotal;
            } else if (c.paymentMethod === 'qr') {
              liveQrVendisSales += c.subtotal;
              liveQrSales += c.subtotal;
            }
          }
        }
      });

      // 2c. Cobro de saldo de salida / checkout en este turno
      if (isCheckoutInThisShift) {
        trackedStayIds.add(s.id);
        const finalCash = s.finalCashPaid !== undefined
          ? s.finalCashPaid
          : (s.isPrepaid ? Math.max(0, (s.cashPaid || 0) - (s.prepaidCash || 0)) : (s.cashPaid || (s.paymentMethod === 'efectivo' ? s.totalAmount || 0 : 0)));
        const finalVendis = s.finalQrVendisPaid !== undefined
          ? s.finalQrVendisPaid
          : (s.isPrepaid ? Math.max(0, (s.qrVendisPaid || 0) - (s.prepaidQrVendis || 0)) : (s.qrVendisPaid || (s.paymentMethod === 'qr_vendis' ? s.totalAmount || 0 : 0)));
        const finalUnion = s.finalQrUnionPaid !== undefined
          ? s.finalQrUnionPaid
          : (s.isPrepaid ? Math.max(0, (s.qrUnionPaid || 0) - (s.prepaidQrUnion || 0)) : (s.qrUnionPaid || (s.paymentMethod === 'qr_union' ? s.totalAmount || 0 : 0)));
        const finalQr = s.finalQrPaid !== undefined
          ? s.finalQrPaid
          : (finalVendis + finalUnion || (s.isPrepaid ? Math.max(0, (s.qrPaid || 0) - (s.prepaidQr || 0)) : (s.qrPaid || (s.paymentMethod === 'qr' ? s.totalAmount || 0 : 0))));

        if (finalCash > 0 || finalQr > 0 || !s.isPrepaid) {
          liveCashSales += finalCash;
          liveQrVendisSales += finalVendis;
          liveQrUnionSales += finalUnion;
          liveQrSales += finalQr;
          if (!countedSalesStayIds.has(s.id)) {
            countedSalesStayIds.add(s.id);
            liveSalesCount++;
          }
        }
      }
    });

    // 3. Sumar consumos extras y ventas de mostrador registradas en este turno
    extraConsumptions.forEach((ec) => {
      const ecTime = new Date(ec.date).getTime();
      const matchesReceptionist = ec.registeredById === rawTargetShift.receptionistId;
      const isThisShiftExtra =
        ec.shiftId === rawTargetShift.id ||
        (!ec.shiftId && matchesReceptionist && ecTime >= shiftStartTime && ecTime <= shiftEndTime);

      if (isThisShiftExtra) {
        if (ec.paymentMethod === 'efectivo') liveCashSales += ec.totalAmount;
        else if (ec.paymentMethod === 'qr_vendis') {
          liveQrVendisSales += ec.totalAmount;
          liveQrSales += ec.totalAmount;
        } else if (ec.paymentMethod === 'qr_union') {
          liveQrUnionSales += ec.totalAmount;
          liveQrSales += ec.totalAmount;
        } else if (ec.paymentMethod === 'qr') {
          liveQrVendisSales += ec.totalAmount;
          liveQrSales += ec.totalAmount;
        }
        liveSalesCount++;
      }
    });

    const expectedCash = Math.max(rawTargetShift.expectedCash || 0, liveCashSales);
    const expectedQrVendis = Math.max(rawTargetShift.expectedQrVendis || 0, liveQrVendisSales);
    const expectedQrUnion = Math.max(rawTargetShift.expectedQrUnion || 0, liveQrUnionSales);
    const expectedQr = Math.max(rawTargetShift.expectedQr || 0, liveQrSales, expectedQrVendis + expectedQrUnion);
    const salesCount = Math.max(rawTargetShift.salesCount || 0, liveSalesCount);

    // Sumar egresos / pagos y retiros de este turno
    const shiftExpenses = expenses.filter((e) => {
      if (e.shiftId === rawTargetShift.id) return true;
      const expTime = new Date(e.timestamp).getTime();
      return expTime >= shiftStartTime && expTime <= shiftEndTime;
    });

    const cashWithdrawals = shiftExpenses
      .filter((e) => e.paymentMethod === 'efectivo' && e.category === 'retiro_administracion')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpensesCash = shiftExpenses
      .filter((e) => e.paymentMethod === 'efectivo')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpensesQrVendis = shiftExpenses
      .filter((e) => e.paymentMethod === 'qr_vendis')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpensesQrUnion = shiftExpenses
      .filter((e) => e.paymentMethod === 'qr_union')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpensesQr = shiftExpenses
      .filter((e) => e.paymentMethod === 'qr' || e.paymentMethod === 'qr_vendis' || e.paymentMethod === 'qr_union')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      ...rawTargetShift,
      expectedCash,
      expectedQrVendis,
      expectedQrUnion,
      expectedQr,
      salesCount,
      stayIds: Array.from(trackedStayIds),
      expenses: shiftExpenses,
      cashWithdrawals,
      totalExpensesCash,
      totalExpensesQrVendis,
      totalExpensesQrUnion,
      totalExpensesQr,
    };
  }, [rawTargetShift, rooms, completedStays, expenses, extraConsumptions]);

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

    const stayId = `stay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const duration = entryData.chosenDurationMinutes || entryData.durationMinutes || 120;

    const isPrepaid = entryData.isPrepaid ?? true;
    const prepaidAmount = isPrepaid ? (entryData.prepaidAmount !== undefined ? entryData.prepaidAmount : entryData.basePrice) : 0;
    const prepaidCash = isPrepaid ? (entryData.prepaidCash !== undefined ? entryData.prepaidCash : (entryData.cashPaid || (entryData.paymentMethod === 'efectivo' ? prepaidAmount : 0))) : 0;
    const prepaidQrVendis = isPrepaid ? (entryData.prepaidQrVendis !== undefined ? entryData.prepaidQrVendis : (entryData.qrVendisPaid || (entryData.paymentMethod === 'qr_vendis' ? prepaidAmount : 0))) : 0;
    const prepaidQrUnion = isPrepaid ? (entryData.prepaidQrUnion !== undefined ? entryData.prepaidQrUnion : (entryData.qrUnionPaid || (entryData.paymentMethod === 'qr_union' ? prepaidAmount : 0))) : 0;
    const prepaidQr = isPrepaid ? (entryData.prepaidQr !== undefined ? entryData.prepaidQr : (prepaidQrVendis + prepaidQrUnion || (entryData.qrPaid || (entryData.paymentMethod === 'qr' ? prepaidAmount : 0)))) : 0;

    const newStay: Stay = {
      id: stayId,
      roomId: room.id,
      roomName: room.name,
      roomType: room.type,
      startTime: new Date().toISOString(),
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
      entryShiftId: currentShift ? currentShift.id : undefined,
      vehiclePlate: entryData.vehiclePlate,
      receptionistId: currentUser.id,
      receptionistName: currentUser.name,
      consumptions: [],
      notes: entryData.notes,
      isCustomPackage: entryData.isCustomPackage || entryData.chosenPlan === 'personalizado',
      customPackageName: entryData.customPackageName,
      status: 'active',
    };

    if (isPrepaid && (prepaidCash > 0 || prepaidQr > 0) && currentUser.role !== 'admin') {
      setActiveShifts((prev) => {
        const active = prev[currentUser.id] || ensureActiveShift(currentUser);
        const updatedShift: Shift = {
          ...active,
          expectedCash: active.expectedCash + prepaidCash,
          expectedQrVendis: (active.expectedQrVendis || 0) + prepaidQrVendis,
          expectedQrUnion: (active.expectedQrUnion || 0) + prepaidQrUnion,
          expectedQr: active.expectedQr + prepaidQr,
          salesCount: active.salesCount + 1,
          stayIds: [...active.stayIds, stayId],
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
    const consumptionId = `cons-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const subtotal = product.price * quantity;
    const isPaid = paymentOptions?.isPaid ?? false;
    const paymentMethod = isPaid ? (paymentOptions?.paymentMethod || 'efectivo') : undefined;

    const consumptionItem: ConsumptionItem = {
      id: consumptionId,
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity,
      subtotal,
      timestamp: new Date().toISOString(),
      isPaid,
      paymentMethod,
      paidAt: isPaid ? new Date().toISOString() : undefined,
      paidShiftId: isPaid && currentShift ? currentShift.id : undefined,
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

    // Si se pagó al contado en el momento, sumar a la caja del turno activo inmediatamente
    if (isPaid && currentUser.role !== 'admin') {
      setActiveShifts((prev) => {
        const active = prev[currentUser.id] || ensureActiveShift(currentUser);
        const addCash = paymentMethod === 'efectivo' ? subtotal : 0;
        const addVendis = paymentMethod === 'qr_vendis' ? subtotal : 0;
        const addUnion = paymentMethod === 'qr_union' ? subtotal : 0;
        const addQr = paymentMethod === 'qr' ? subtotal : (addVendis + addUnion);
        const updatedShift: Shift = {
          ...active,
          expectedCash: active.expectedCash + addCash,
          expectedQrVendis: (active.expectedQrVendis || 0) + addVendis,
          expectedQrUnion: (active.expectedQrUnion || 0) + addUnion,
          expectedQr: active.expectedQr + addQr,
        };
        syncShiftToFirestore(updatedShift);
        return {
          ...prev,
          [currentUser.id]: updatedShift,
        };
      });
    }

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
    const consumptionId = `cons-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const consumptionItem: ConsumptionItem = {
      id: consumptionId,
      productId: 'custom-item',
      productName: name,
      unitPrice,
      quantity,
      subtotal,
      timestamp: new Date().toISOString(),
      isPaid,
      paymentMethod,
      paidAt: isPaid ? new Date().toISOString() : undefined,
      paidShiftId: isPaid && currentShift ? currentShift.id : undefined,
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

    // Si se pagó al contado en el momento, sumar a la caja del turno activo inmediatamente
    if (isPaid && currentUser.role !== 'admin') {
      setActiveShifts((prev) => {
        const active = prev[currentUser.id] || ensureActiveShift(currentUser);
        const addCash = paymentMethod === 'efectivo' ? subtotal : 0;
        const addVendis = paymentMethod === 'qr_vendis' ? subtotal : 0;
        const addUnion = paymentMethod === 'qr_union' ? subtotal : 0;
        const addQr = paymentMethod === 'qr' ? subtotal : (addVendis + addUnion);
        const updatedShift: Shift = {
          ...active,
          expectedCash: active.expectedCash + addCash,
          expectedQrVendis: (active.expectedQrVendis || 0) + addVendis,
          expectedQrUnion: (active.expectedQrUnion || 0) + addUnion,
          expectedQr: active.expectedQr + addQr,
        };
        syncShiftToFirestore(updatedShift);
        return {
          ...prev,
          [currentUser.id]: updatedShift,
        };
      });
    }

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

    if (item.isPaid && currentUser.role !== 'admin') {
      setActiveShifts((prev) => {
        const active = prev[currentUser.id] || ensureActiveShift(currentUser);
        const remCash = item.paymentMethod === 'efectivo' ? item.subtotal : 0;
        const remVendis = item.paymentMethod === 'qr_vendis' ? item.subtotal : 0;
        const remUnion = item.paymentMethod === 'qr_union' ? item.subtotal : 0;
        const remQr = item.paymentMethod === 'qr' ? item.subtotal : (remVendis + remUnion);
        const updatedShift: Shift = {
          ...active,
          expectedCash: Math.max(0, active.expectedCash - remCash),
          expectedQrVendis: Math.max(0, (active.expectedQrVendis || 0) - remVendis),
          expectedQrUnion: Math.max(0, (active.expectedQrUnion || 0) - remUnion),
          expectedQr: Math.max(0, active.expectedQr - remQr),
        };
        syncShiftToFirestore(updatedShift);
        return {
          ...prev,
          [currentUser.id]: updatedShift,
        };
      });
    }

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
    const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes, extraRate, Date.now(), {
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
    const prepaidCash = isPrepaid ? (stay.prepaidCash || (stay.paymentMethod === 'efectivo' ? prepaidAmount : 0)) : 0;
    const prepaidQrVendis = isPrepaid ? (stay.prepaidQrVendis || (stay.paymentMethod === 'qr_vendis' ? prepaidAmount : 0)) : 0;
    const prepaidQrUnion = isPrepaid ? (stay.prepaidQrUnion || (stay.paymentMethod === 'qr_union' ? prepaidAmount : 0)) : 0;
    const prepaidQr = isPrepaid ? (stay.prepaidQr || (prepaidQrVendis + prepaidQrUnion) || (stay.paymentMethod === 'qr' ? prepaidAmount : 0)) : 0;

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
      endTime: new Date().toISOString(),
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
      checkoutShiftId: currentShift ? currentShift.id : undefined,
      checkoutReceptionistId: currentUser.id,
      checkoutReceptionistName: currentUser.name,
      closedBy: currentUser.name,
      notes: checkoutData.notes || stay.notes,
    };

    setCompletedStays((prev) => [completedStay, ...prev]);
    syncCompletedStayToFirebase(completedStay);

    if (finalCash > 0 || finalQr > 0 || !isPrepaid) {
      const shiftReceptionistId = currentUser.role === 'admin' ? stay.receptionistId : currentUser.id;
      setActiveShifts((prev) => {
        const active = prev[shiftReceptionistId] || ensureActiveShift(currentUser);
        const alreadyCounted = isPrepaid;
        const updatedShift: Shift = {
          ...active,
          expectedCash: active.expectedCash + finalCash,
          expectedQrVendis: (active.expectedQrVendis || 0) + finalQrVendis,
          expectedQrUnion: (active.expectedQrUnion || 0) + finalQrUnion,
          expectedQr: active.expectedQr + finalQr,
          salesCount: alreadyCounted ? active.salesCount : active.salesCount + 1,
          stayIds: active.stayIds.includes(completedStay.id) ? active.stayIds : [...active.stayIds, completedStay.id],
        };
        syncShiftToFirestore(updatedShift);
        return {
          ...prev,
          [shiftReceptionistId]: updatedShift,
        };
      });
    }

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
      timestamp: new Date().toISOString(),
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
      date: new Date().toISOString(),
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

    if (isPaid && currentShift) {
      let addCash = 0;
      let addQrVendis = 0;
      let addQrUnion = 0;
      let addQr = 0;

      if (paymentMethod === 'efectivo') {
        addCash = consumptionData.totalAmount;
      } else if (paymentMethod === 'qr_vendis') {
        addQrVendis = consumptionData.totalAmount;
        addQr = consumptionData.totalAmount;
      } else if (paymentMethod === 'qr_union') {
        addQrUnion = consumptionData.totalAmount;
        addQr = consumptionData.totalAmount;
      } else if (paymentMethod === 'qr') {
        addQrVendis = consumptionData.totalAmount;
        addQr = consumptionData.totalAmount;
      }

      const updatedShift: Shift = {
        ...currentShift,
        expectedCash: currentShift.expectedCash + addCash,
        expectedQrVendis: (currentShift.expectedQrVendis || 0) + addQrVendis,
        expectedQrUnion: (currentShift.expectedQrUnion || 0) + addQrUnion,
        expectedQr: currentShift.expectedQr + addQr,
        salesCount: (currentShift.salesCount || 0) + 1,
      };
      setShiftsHistory((prev) =>
        prev.map((s) => (s.id === updatedShift.id ? updatedShift : s))
      );
      syncShiftToFirestore(updatedShift);
    }

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

    if (cons.isPaid && currentShift && cons.shiftId === currentShift.id) {
      let subCash = 0;
      let subQrVendis = 0;
      let subQrUnion = 0;
      let subQr = 0;

      if (cons.paymentMethod === 'efectivo') {
        subCash = cons.totalAmount;
      } else if (cons.paymentMethod === 'qr_vendis') {
        subQrVendis = cons.totalAmount;
        subQr = cons.totalAmount;
      } else if (cons.paymentMethod === 'qr_union') {
        subQrUnion = cons.totalAmount;
        subQr = cons.totalAmount;
      } else if (cons.paymentMethod === 'qr') {
        subQrVendis = cons.totalAmount;
        subQr = cons.totalAmount;
      }

      const updatedShift: Shift = {
        ...currentShift,
        expectedCash: Math.max(0, currentShift.expectedCash - subCash),
        expectedQrVendis: Math.max(0, (currentShift.expectedQrVendis || 0) - subQrVendis),
        expectedQrUnion: Math.max(0, (currentShift.expectedQrUnion || 0) - subQrUnion),
        expectedQr: Math.max(0, currentShift.expectedQr - subQr),
        salesCount: Math.max(0, (currentShift.salesCount || 1) - 1),
      };
      setShiftsHistory((prev) =>
        prev.map((s) => (s.id === updatedShift.id ? updatedShift : s))
      );
      syncShiftToFirestore(updatedShift);
    }

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
      date: new Date().toISOString(),
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

    // Actualizar caja del turno activo si existe
    if (currentShift) {
      let addCash = 0;
      let addQrVendis = 0;
      let addQrUnion = 0;
      let addQr = 0;

      if (data.paymentMethod === 'efectivo') {
        addCash = data.totalAmount;
      } else if (data.paymentMethod === 'qr_vendis') {
        addQrVendis = data.totalAmount;
        addQr = data.totalAmount;
      } else if (data.paymentMethod === 'qr_union') {
        addQrUnion = data.totalAmount;
        addQr = data.totalAmount;
      } else if (data.paymentMethod === 'qr') {
        addQrVendis = data.totalAmount;
        addQr = data.totalAmount;
      }

      const updatedShift: Shift = {
        ...currentShift,
        expectedCash: currentShift.expectedCash + addCash,
        expectedQrVendis: (currentShift.expectedQrVendis || 0) + addQrVendis,
        expectedQrUnion: (currentShift.expectedQrUnion || 0) + addQrUnion,
        expectedQr: currentShift.expectedQr + addQr,
        salesCount: (currentShift.salesCount || 0) + 1,
      };
      setShiftsHistory((prev) =>
        prev.map((s) => (s.id === updatedShift.id ? updatedShift : s))
      );
      syncShiftToFirestore(updatedShift);
    }

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

    if (currentShift && extra.shiftId === currentShift.id) {
      let subCash = 0;
      let subQrVendis = 0;
      let subQrUnion = 0;
      let subQr = 0;

      if (extra.paymentMethod === 'efectivo') {
        subCash = extra.totalAmount;
      } else if (extra.paymentMethod === 'qr_vendis') {
        subQrVendis = extra.totalAmount;
        subQr = extra.totalAmount;
      } else if (extra.paymentMethod === 'qr_union') {
        subQrUnion = extra.totalAmount;
        subQr = extra.totalAmount;
      } else if (extra.paymentMethod === 'qr') {
        subQrVendis = extra.totalAmount;
        subQr = extra.totalAmount;
      }

      const updatedShift: Shift = {
        ...currentShift,
        expectedCash: Math.max(0, currentShift.expectedCash - subCash),
        expectedQrVendis: Math.max(0, (currentShift.expectedQrVendis || 0) - subQrVendis),
        expectedQrUnion: Math.max(0, (currentShift.expectedQrUnion || 0) - subQrUnion),
        expectedQr: Math.max(0, currentShift.expectedQr - subQr),
        salesCount: Math.max(0, (currentShift.salesCount || 1) - 1),
      };
      setShiftsHistory((prev) =>
        prev.map((s) => (s.id === updatedShift.id ? updatedShift : s))
      );
      syncShiftToFirestore(updatedShift);
    }

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

    // Si se entregó/retiró efectivo al momento del cierre, registrar automáticamente el comprobante de retiro
    if (deliveredAtClose > 0) {
      const withdrawalExpense: Expense = {
        id: `exp-ret-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        description: `Retiro / Entrega de efectivo a administración al cierre de turno (Entregó: ${responsiblePersonName.trim()})`,
        category: 'retiro_administracion',
        amount: deliveredAtClose,
        paymentMethod: 'efectivo',
        timestamp: new Date().toISOString(),
        shiftId: shift.id,
        registeredById: currentUser.id,
        registeredByName: currentUser.name,
        notes: notes ? `Cierre de turno: ${notes}` : 'Retiro registrado automáticamente al cierre de turno',
      };
      setExpenses((prev) => [withdrawalExpense, ...prev]);
      syncExpenseToFirestore(withdrawalExpense);
    }

    // Total de egresos operativos en efectivo registrados antes del cierre
    const prevExpensesCash = shift.totalExpensesCash || 0;
    const allExpensesCash = prevExpensesCash + deliveredAtClose;
    const cashWithdrawalsTotal = (shift.cashWithdrawals || 0) + deliveredAtClose;

    const totalExpensesQrVendis = shift.totalExpensesQrVendis || 0;
    const totalExpensesQrUnion = shift.totalExpensesQrUnion || 0;
    const totalExpensesQr = shift.totalExpensesQr || (totalExpensesQrVendis + totalExpensesQrUnion);

    // Efectivo que DEBERÍA haber en la gaveta antes de separar el sobre:
    // Fondo Inicial + Ventas Efectivo - Egresos Operativos en Efectivo
    const expectedCashInDrawer = Math.max(0, startingCashFloat + shift.expectedCash - prevExpensesCash);

    // Diferencia en Efectivo = Lo que contó en gaveta - Lo que debía haber
    const diffCash = totalPhysicalCashInDrawer - expectedCashInDrawer;
    const declaredSalesCash = Math.max(0, shift.expectedCash + diffCash);

    const declaredQrTotal = declaredQrVendis + declaredQrUnion;
    const expectedNetQrVendis = shift.expectedQrVendis || 0;
    const expectedNetQrUnion = shift.expectedQrUnion || 0;
    const expectedNetQrTotal = shift.expectedQr;

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
      endTime: new Date().toISOString(),
      receptionistName: responsiblePersonName.trim() || shift.receptionistName,
      responsiblePersonName: responsiblePersonName.trim() || shift.receptionistName,
      handedOverTo: nextReceptionistName.trim(),
      initialCashFloat: startingCashFloat,
      handoverCashFloat: floatLeftForNext,
      totalExpensesCash: allExpensesCash,
      cashWithdrawals: cashWithdrawalsTotal,
      cashDeliveredAtClose: deliveredAtClose,
      totalExpensesQrVendis,
      totalExpensesQrUnion,
      totalExpensesQr,
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
      id: `shift-${nextUser.id}-${Date.now()}`,
      receptionistId: nextUser.id,
      receptionistName: nextReceptionistName.trim() || nextUser.name,
      shiftType: nextUser.role === 'recepcionista_noche' ? 'noche' : 'dia',
      startTime: new Date().toISOString(),
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
      cashWithdrawals: (existing.cashWithdrawals ? Math.max(0, existing.cashWithdrawals - (existing.cashDeliveredAtClose || 0)) : 0) + cashDeliveredAtClose,
      totalExpensesCash: allExpensesCash,
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

    // Si se especificó retiro a administración, asentar comprobante en expenses si no existe
    if (cashDeliveredAtClose > 0) {
      const existingWithdrawal = expenses.find(
        (e) => (e.shiftId === shiftId || e.id.includes(shiftId)) && e.category === 'retiro_administracion'
      );
      if (existingWithdrawal) {
        if (existingWithdrawal.amount !== cashDeliveredAtClose) {
          const updatedExp: Expense = {
            ...existingWithdrawal,
            amount: cashDeliveredAtClose,
          };
          setExpenses((prev) => prev.map((e) => (e.id === existingWithdrawal.id ? updatedExp : e)));
          syncExpenseToFirestore(updatedExp);
        }
      } else {
        const newWithdrawal: Expense = {
          id: `exp-ret-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          description: `Retiro de ventas a administración / dueño (${existing.receptionistName})`,
          category: 'retiro_administracion',
          amount: cashDeliveredAtClose,
          paymentMethod: 'efectivo',
          timestamp: existing.endTime || existing.startTime || new Date().toISOString(),
          shiftId: shiftId,
          registeredById: currentUser.id,
          registeredByName: currentUser.name,
          notes: `Retiro asentado por auditoría de turno`,
        };
        setExpenses((prev) => [newWithdrawal, ...prev]);
        syncExpenseToFirestore(newWithdrawal);
      }
    }

    setShiftsHistory((prev) => prev.map((s) => (s.id === shiftId ? mergedShift : s)));
    syncShiftToFirestore(mergedShift);

    showToast({
      title: '¡Turno Actualizado y Cuadrado!',
      message: `Se actualizaron los datos del turno de ${mergedShift.receptionistName}. Diferencia ajustada: ${formatBs(totalDiff)}.`,
      type: 'success',
    });

    return true;
  };

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
      const newLog: InventoryMovementLog = {
        ...logData,
        id: `inv-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        date: logData.date || new Date().toISOString(),
        timestamp: Date.now(),
      };
      setInventoryLogs((prev) => [newLog, ...prev]);
      syncInventoryLogToFirestore(newLog);
    },
    []
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
        staffConsumptions,
        staffSettlements,
        staffMembers,
        extraConsumptions,
        inventoryLogs,
        soundAlertsEnabled,
        toasts,
        nowTimestamp,
        isFirestoreConnected,
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
        addExtraConsumption,
        removeExtraConsumption,
        addStaffConsumption,
        removeStaffConsumption,
        recordStaffSettlement,
        saveStaffMember,
        closeCurrentShift,
        updateShiftInHistory,
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

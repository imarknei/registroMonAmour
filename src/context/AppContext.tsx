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
} from '../types';
import {
  INITIAL_ROOMS,
  INITIAL_TARIFFS,
  INITIAL_PRODUCTS,
  SYSTEM_USERS,
} from '../data/initialData';
import { calculateStayTime, formatDateTime } from '../utils/timeUtils';
import {
  playWarningBeep,
  playOvertimeAlert,
  playSuccessChime,
  playAddConsumptionSound,
  playUndoSound,
} from '../utils/soundUtils';
import { formatBs } from '../utils/formatUtils';
import {
  initializeFirebaseClient,
  subscribeToRooms,
  subscribeToProducts,
  subscribeToTariffs,
  subscribeToExpenses,
  subscribeToAllShifts,
  subscribeToAllStays,
  subscribeToShifts,
  subscribeToCompletedStays,
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
  soundAlertsEnabled: boolean;
  toasts: ToastMessage[];
  nowTimestamp: number;
  isFirestoreConnected: boolean;

  // Actions
  setCurrentUserById: (userId: string) => void;
  toggleSoundAlerts: () => void;
  showToast: (toast: Omit<ToastMessage, 'id'>) => string;
  dismissToast: (id: string) => void;

  // Room Operations
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
  }) => void;
  addConsumptionToRoom: (roomId: string, productId: string, quantity?: number) => boolean;
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

  // Shift & Cash Closing
  closeCurrentShift: (
    responsiblePersonName: string,
    totalPhysicalCashInDrawer: number,
    declaredQrVendis: number,
    declaredQrUnion: number,
    handoverCashFloat: number,
    notes?: string
  ) => Shift | null;

  // Admin functions
  cancelStay: (stayId: string, reason: string, restoreInventory?: boolean) => boolean;
  saveProduct: (product: Product) => void;
  deleteProductById: (productId: string) => void;
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
      return saved ? JSON.parse(saved) : INITIAL_TARIFFS;
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
      return saved ? JSON.parse(saved) : [];
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

  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Ticking clock for real-time room timers
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  // Real-time 1-second ticker so all timers, countdowns and overtime updates synchronously in live view
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Firebase connection state
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);

  // Current logged in user object
  const currentUser = SYSTEM_USERS.find((u) => u.id === currentUserId) || SYSTEM_USERS[1];

  // Keep a map of sound alerts played per stay to avoid looping sound constantly
  const [playedAlerts, setPlayedAlerts] = useState<Record<string, { warning?: boolean; overtime?: boolean }>>({});

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
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, JSON.stringify(soundAlertsEnabled));
  }, [soundAlertsEnabled]);

  // 3. Timer ticker (every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. Firebase Cloud Database REALTIME SYNC (onValue)
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const setupFirebaseSync = async () => {
      const conf = getStoredFirebaseConfig();
      if (!conf || !conf.projectId || !conf.apiKey) return;

      const initRes = await initializeFirebaseClient(conf);
      if (!initRes.success) return;

      setIsFirestoreConnected(true);

      // Subscribe to Realtime Rooms
      const unsubRooms = await subscribeToRooms((firestoreRooms) => {
        if (firestoreRooms && firestoreRooms.length > 0) {
          setRooms(firestoreRooms);
        }
      });
      if (unsubRooms) unsubs.push(unsubRooms);

      // Subscribe to Realtime Products (Minibar/Inventario)
      const unsubProd = await subscribeToProducts((firestoreProducts) => {
        if (firestoreProducts && firestoreProducts.length > 0) {
          setProducts(firestoreProducts);
        }
      });
      if (unsubProd) unsubs.push(unsubProd);

      // Subscribe to Realtime Tariffs
      const unsubTariffs = await subscribeToTariffs((firestoreTariffs) => {
        if (firestoreTariffs) {
          setTariffs(firestoreTariffs);
        }
      });
      if (unsubTariffs) unsubs.push(unsubTariffs);

      // Subscribe to Realtime Expenses
      const unsubExp = await subscribeToExpenses((firestoreExpenses) => {
        if (firestoreExpenses) {
          setExpenses(firestoreExpenses);
        }
      });
      if (unsubExp) unsubs.push(unsubExp);

      // Subscribe to Realtime Shifts History (Todos los turnos para el admin)
      const unsubShifts = await subscribeToAllShifts((firestoreShifts) => {
        if (firestoreShifts) {
          setShiftsHistory(firestoreShifts);
          // Sincronizar también turnos activos en curso
          const openMap: Record<string, Shift> = {};
          firestoreShifts.filter((s) => s.status === 'open').forEach((s) => {
            openMap[s.receptionistId] = s;
          });
          if (Object.keys(openMap).length > 0) {
            setActiveShifts((prev) => ({ ...prev, ...openMap }));
          }
        }
      });
      if (unsubShifts) unsubs.push(unsubShifts);

      // Subscribe to Realtime All Stays (Todas las habitaciones y estadías en vivo)
      const unsubStays = await subscribeToAllStays((firestoreStays) => {
        if (firestoreStays) {
          setCompletedStays(firestoreStays);
        }
      });
      if (unsubStays) unsubs.push(unsubStays);
    };

    setupFirebaseSync();

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // 5. Ensure current user has an active shift
  const ensureActiveShift = useCallback((user: User): Shift => {
    // 1. Buscar en estado local activeShifts si ya hay un turno abierto
    if (activeShifts[user.id] && activeShifts[user.id].status === 'open') {
      return activeShifts[user.id];
    }

    // 2. Buscar en historial de turnos sincronizados de Firebase
    const existingOpenShift = shiftsHistory.find(
      (s) => s.receptionistId === user.id && s.status === 'open'
    );
    if (existingOpenShift) {
      setActiveShifts((prev) => ({
        ...prev,
        [user.id]: existingOpenShift,
      }));
      return existingOpenShift;
    }

    // 3. Obtener caja chica del último turno cerrado o valor por defecto
    const lastClosedShift = shiftsHistory.find((s) => s.status === 'closed');
    const initialFloat = lastClosedShift?.handoverCashFloat || 100;

    const shiftType = user.role === 'recepcionista_noche' ? 'noche' : 'dia';
    const newShift: Shift = {
      id: `shift-${user.id}-${Date.now()}`,
      receptionistId: user.id,
      receptionistName: user.name,
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

    setActiveShifts((prev) => ({
      ...prev,
      [user.id]: newShift,
    }));

    syncShiftToFirestore(newShift);
    return newShift;
  }, [activeShifts, shiftsHistory]);

  // Turno base sin recalcular
  const rawTargetShift = useMemo<Shift | null>(() => {
    if (currentUser.role !== 'admin') {
      return ensureActiveShift(currentUser);
    }
    // Si es Administrador: obtener el turno abierto más reciente de cualquier recepcionista
    const openShifts = Object.values(activeShifts).filter((s) => s.status === 'open');
    if (openShifts.length > 0) {
      openShifts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      return openShifts[0];
    }
    const historyOpen = shiftsHistory.find((s) => s.status === 'open');
    return historyOpen || null;
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

    // 1. Sumar cobros adelantados de habitaciones actualmente ocupadas en este turno
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

      // 2b. Cobro de saldo de salida / checkout en este turno
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

    const expectedCash = Math.max(rawTargetShift.expectedCash || 0, liveCashSales);
    const expectedQrVendis = Math.max(rawTargetShift.expectedQrVendis || 0, liveQrVendisSales);
    const expectedQrUnion = Math.max(rawTargetShift.expectedQrUnion || 0, liveQrUnionSales);
    const expectedQr = Math.max(rawTargetShift.expectedQr || 0, liveQrSales, expectedQrVendis + expectedQrUnion);
    const salesCount = Math.max(rawTargetShift.salesCount || 0, liveSalesCount);

    const shiftExpenses = rawTargetShift.expenses || [];
    const totalExpensesCash = shiftExpenses
      .filter((e: Expense) => e.paymentMethod === 'efectivo')
      .reduce((sum: number, e: Expense) => sum + e.amount, 0);
    const totalExpensesQrVendis = shiftExpenses
      .filter((e: Expense) => e.paymentMethod === 'qr_vendis')
      .reduce((sum: number, e: Expense) => sum + e.amount, 0);
    const totalExpensesQrUnion = shiftExpenses
      .filter((e: Expense) => e.paymentMethod === 'qr_union')
      .reduce((sum: number, e: Expense) => sum + e.amount, 0);
    const totalExpensesQr = totalExpensesQrVendis + totalExpensesQrUnion + shiftExpenses
      .filter((e: Expense) => e.paymentMethod === 'qr')
      .reduce((sum: number, e: Expense) => sum + e.amount, 0);

    return {
      ...rawTargetShift,
      expectedCash,
      expectedQrVendis,
      expectedQrUnion,
      expectedQr,
      salesCount,
      totalExpensesCash,
      totalExpensesQrVendis,
      totalExpensesQrUnion,
      totalExpensesQr,
      stayIds: Array.from(trackedStayIds),
    };
  }, [rawTargetShift, rooms, completedStays]);

  // Toast Helpers
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const duration = toast.durationMs ?? 5500;
      const newToast: ToastMessage = { ...toast, id };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // max 5 concurrent toasts

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  // Sound alerts watchdog for occupied rooms
  useEffect(() => {
    if (!soundAlertsEnabled) return;

    rooms.forEach((room) => {
      if (room.status === 'ocupada' && room.currentStay) {
        const stay = room.currentStay;
        const extraRate = tariffs[room.type]?.extraHourPrice || (room.type === 'jacuzzi' || room.type === 'golden_suite' ? 40 : 30);
        const calc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes, extraRate);
        const stayKey = `${stay.id}`;
        const alertState = playedAlerts[stayKey] || {};

        if (calc.isWarning && !alertState.warning && !calc.isOvertime) {
          playWarningBeep();
          setPlayedAlerts((prev) => ({
            ...prev,
            [stayKey]: { ...alertState, warning: true },
          }));
          showToast({
            title: `¡Tiempo por Vencer!`,
            message: `${room.name}: Quedan menos de 10 minutos de estadía.`,
            type: 'warning',
          });
        }

        if (calc.isOvertime && !alertState.overtime) {
          playOvertimeAlert();
          setPlayedAlerts((prev) => ({
            ...prev,
            [stayKey]: { ...alertState, overtime: true },
          }));
          showToast({
            title: calc.gracePeriodActive ? `¡Tiempo Cumplido!` : `¡Hora Extra Aplicada!`,
            message: calc.gracePeriodActive
              ? `${room.name}: Llegó a 00:00. Iniciando 10 minutos de espera sin costo.`
              : `${room.name}: Excedió los 10 min de espera. Se aplicó recargo de hora extra: +${formatBs(calc.overtimeCharge)}.`,
            type: calc.gracePeriodActive ? 'warning' : 'error',
          });
        }
      }
    });
  }, [nowTimestamp, rooms, tariffs, soundAlertsEnabled, playedAlerts, showToast]);

  // Actions
  const setCurrentUserById = (userId: string) => {
    setCurrentUserId(userId);
    const selectedUser = SYSTEM_USERS.find((u) => u.id === userId);
    if (selectedUser) {
      showToast({
        title: 'Usuario Actualizado',
        message: `Sesión activa: ${selectedUser.name} (${selectedUser.shiftName})`,
        type: 'info',
        durationMs: 3000,
      });
    }
  };

  const toggleSoundAlerts = () => {
    setSoundAlertsEnabled((prev) => {
      const next = !prev;
      showToast({
        title: next ? 'Sonido Activado' : 'Sonido Silenciado',
        message: next
          ? 'Se emitirán tonos de alerta antes de vencer el tiempo y al registrar consumos.'
          : 'Alertas sonoras silenciadas.',
        type: 'info',
        durationMs: 2500,
      });
      return next;
    });
  };

  // ROOM OPERATIONS (With Prepaid Support & Instant Realtime Sync)
  const registerRoomEntry = (entryData: {
    roomId: string;
    chosenPlan: PlanType;
    chosenDurationMinutes?: number;
    durationMinutes?: number;
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
  }) => {
    const room = rooms.find((r) => r.id === entryData.roomId);
    if (!room) return;

    const duration = entryData.chosenDurationMinutes || entryData.durationMinutes || 60;
    const stayId = `stay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const isPrepaid = entryData.isPrepaid ?? true; // Default to prepaid if paid at entrance
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
      status: 'active',
    };

    // If prepaid, add collected amount to active shift expected totals immediately
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
          stayIds: [...active.stayIds, newStay.id],
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

    // Update state locally
    setRooms((prev) => prev.map((r) => (r.id === room.id ? updatedRoom : r)));

    // Sync to Cloud Firebase Realtime DB
    syncRoomToFirestore(updatedRoom);
    syncStayToFirebase(newStay);
    setCompletedStays((prev) => [newStay, ...prev.filter((s) => s.id !== newStay.id)]);

    playSuccessChime();
    showToast({
      title: isPrepaid ? '¡Habitación Registrada y Pagada!' : 'Habitación Registrada (Pago al Salir)',
      message: `${room.name} ocupada (${entryData.chosenPlan.toUpperCase()} - ${formatBs(entryData.basePrice)} ${isPrepaid ? '• Pagado' : '• Por cobrar'})`,
      type: 'success',
    });
  };

  const addConsumptionToRoom = (roomId: string, productId: string, quantity = 1): boolean => {
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

    // 1. Discount stock
    const updatedProduct = {
      ...product,
      stock: product.stock - quantity,
    };

    setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));
    syncProductToFirestore(updatedProduct);

    // 2. Add to room stay
    const consumptionId = `cons-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const consumptionItem: ConsumptionItem = {
      id: consumptionId,
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity,
      subtotal: product.price * quantity,
      timestamp: new Date().toISOString(),
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

    // 3. Play sound & emit interactive toast with UNDO action
    playAddConsumptionSound();
    showToast({
      title: '¡Consumo Agregado!',
      message: `Se añadió ${quantity}x ${product.name} (+${formatBs(product.price * quantity)}) a ${room.name}. Stock restante: ${product.stock - quantity}.`,
      type: 'success',
      undoLabel: 'Deshacer (reponer stock)',
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

    const product = products.find((p) => p.id === item.productId);
    if (product) {
      const updatedProduct = {
        ...product,
        stock: product.stock + item.quantity,
      };
      setProducts((prev) => prev.map((p) => (p.id === item.productId ? updatedProduct : p)));
      syncProductToFirestore(updatedProduct);
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
    const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes, extraRate);
    const consumptionsTotal = stay.consumptions.reduce((sum, item) => sum + item.subtotal, 0);
    const overtimeTotal = timeCalc.overtimeCharge;
    const totalAmount = stay.baseRoomPrice + consumptionsTotal + overtimeTotal;

    const isPrepaid = stay.isPrepaid || false;
    const prepaidAmount = isPrepaid ? (stay.prepaidAmount || stay.baseRoomPrice) : 0;
    const prepaidCash = isPrepaid ? (stay.prepaidCash || (stay.paymentMethod === 'efectivo' ? prepaidAmount : 0)) : 0;
    const prepaidQrVendis = isPrepaid ? (stay.prepaidQrVendis || (stay.paymentMethod === 'qr_vendis' ? prepaidAmount : 0)) : 0;
    const prepaidQrUnion = isPrepaid ? (stay.prepaidQrUnion || (stay.paymentMethod === 'qr_union' ? prepaidAmount : 0)) : 0;
    const prepaidQr = isPrepaid ? (stay.prepaidQr || (prepaidQrVendis + prepaidQrUnion) || (stay.paymentMethod === 'qr' ? prepaidAmount : 0)) : 0;

    // Remaining balance to be paid at exit
    const remainingDue = Math.max(0, totalAmount - prepaidAmount);

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

    const totalCashPaid = prepaidCash + finalCash;
    const totalQrVendisPaid = prepaidQrVendis + finalQrVendis;
    const totalQrUnionPaid = prepaidQrUnion + finalQrUnion;
    const totalQrPaid = prepaidQr + finalQr;

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

    // Update active shift if money was collected at checkout or if it wasn't prepaid
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

    const newStatus: RoomStatus = checkoutData.setCleaning ? 'limpieza' : 'disponible';
    const updatedRoom: Room = {
      ...room,
      status: newStatus,
      currentStay: undefined,
      cleaningStartTime: newStatus === 'limpieza' ? new Date().toISOString() : undefined,
    };

    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    syncRoomToFirestore(updatedRoom);

    playSuccessChime();
    showToast({
      title: 'Habitación Cerrada con Éxito',
      message: `${room.name} cobrada: Total ${formatBs(totalAmount)} (Saldo salida: ${formatBs(remainingDue)})`,
      type: 'success',
      durationMs: 5000,
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
  };

  const changeRoom = (
    currentRoomId: string,
    targetRoomId: string,
    reason: string,
    options?: {
      oldRoomStatus?: 'limpieza' | 'disponible';
    }
  ): boolean => {
    const sourceRoom = rooms.find((r) => r.id === currentRoomId);
    const targetRoom = rooms.find((r) => r.id === targetRoomId);

    if (!sourceRoom || !sourceRoom.currentStay) {
      showToast({
        title: 'Error al cambiar habitación',
        message: 'La habitación de origen no tiene una estadía activa.',
        type: 'error',
      });
      return false;
    }

    if (!targetRoom || targetRoom.status !== 'disponible') {
      showToast({
        title: 'Error al cambiar habitación',
        message: `La habitación destino (${targetRoom?.name || 'Seleccionada'}) no está disponible.`,
        type: 'error',
      });
      return false;
    }

    const currentStay = sourceRoom.currentStay;
    const oldRoomStatus = options?.oldRoomStatus || 'limpieza';
    const changeTimestamp = new Date().toISOString();
    const reasonText = reason.trim() || 'Inconveniente o error';
    const auditNote = `[Cambio ${formatDateTime(changeTimestamp)}]: Traslado de ${sourceRoom.name} a ${targetRoom.name}. Motivo: ${reasonText}`;

    const transferredStay: Stay = {
      ...currentStay,
      roomId: targetRoom.id,
      roomName: targetRoom.name,
      roomType: targetRoom.type,
      notes: currentStay.notes ? `${currentStay.notes} | ${auditNote}` : auditNote,
    };

    // 1. Updated target room (now occupied)
    const updatedTargetRoom: Room = {
      ...targetRoom,
      status: 'ocupada',
      currentStay: transferredStay,
      cleaningStartTime: undefined,
    };

    // 2. Updated source room (freed to cleaning or available)
    const updatedSourceRoom: Room = {
      ...sourceRoom,
      status: oldRoomStatus,
      currentStay: undefined,
      cleaningStartTime: oldRoomStatus === 'limpieza' ? new Date().toISOString() : undefined,
    };

    // 3. Update local state
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === targetRoom.id) return updatedTargetRoom;
        if (r.id === sourceRoom.id) return updatedSourceRoom;
        return r;
      })
    );

    // 4. Update completedStays state
    setCompletedStays((prev) =>
      prev.map((s) => (s.id === transferredStay.id ? transferredStay : s))
    );

    // 5. Sync to Firebase
    syncRoomToFirestore(updatedTargetRoom);
    syncRoomToFirestore(updatedSourceRoom);
    syncStayToFirebase(transferredStay);

    playSuccessChime();
    showToast({
      title: '¡Cambio de Habitación Realizado!',
      message: `Trasladado con éxito de ${sourceRoom.name} a ${targetRoom.name}. Motivo: "${reasonText}".`,
      type: 'success',
      durationMs: 6000,
    });

    return true;
  };

  // EXPENSES / SHIFT PAYMENTS (Hacer Pagos)
  const addExpenseToShift = (expenseData: {
    description: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: 'efectivo' | 'qr_vendis' | 'qr_union' | 'qr';
    receiptNumber?: string;
    notes?: string;
  }) => {
    const expenseId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newExpense: Expense = {
      id: expenseId,
      description: expenseData.description,
      category: expenseData.category,
      amount: expenseData.amount,
      paymentMethod: expenseData.paymentMethod,
      timestamp: new Date().toISOString(),
      shiftId: currentShift ? currentShift.id : `shift-${currentUser.id}`,
      registeredById: currentUser.id,
      registeredByName: currentUser.name,
      receiptNumber: expenseData.receiptNumber,
      notes: expenseData.notes,
    };

    // 1. Guardar en lista general de gastos
    setExpenses((prev) => [newExpense, ...prev]);

    // 2. Asociar al turno activo
    if (currentUser.role !== 'admin') {
      setActiveShifts((prev) => {
        const active = prev[currentUser.id] || ensureActiveShift(currentUser);
        const shiftExpenses = [...(active.expenses || []), newExpense];
        const totalExpensesCash = shiftExpenses
          .filter((e) => e.paymentMethod === 'efectivo')
          .reduce((sum, e) => sum + e.amount, 0);
        const totalExpensesQrVendis = shiftExpenses
          .filter((e) => e.paymentMethod === 'qr_vendis')
          .reduce((sum, e) => sum + e.amount, 0);
        const totalExpensesQrUnion = shiftExpenses
          .filter((e) => e.paymentMethod === 'qr_union')
          .reduce((sum, e) => sum + e.amount, 0);
        const totalExpensesQr = totalExpensesQrVendis + totalExpensesQrUnion + shiftExpenses
          .filter((e) => e.paymentMethod === 'qr')
          .reduce((sum, e) => sum + e.amount, 0);

        const updatedShift: Shift = {
          ...active,
          expenses: shiftExpenses,
          totalExpensesCash,
          totalExpensesQrVendis,
          totalExpensesQrUnion,
          totalExpensesQr,
        };

        syncShiftToFirestore(updatedShift);

        return {
          ...prev,
          [currentUser.id]: updatedShift,
        };
      });
    }

    // 3. Sincronizar gasto a Firebase
    syncExpenseToFirestore(newExpense);

    playSuccessChime();
    showToast({
      title: '💸 Pago / Egreso Registrado',
      message: `Se registró pago de ${formatBs(newExpense.amount)} por "${newExpense.description}" (${newExpense.paymentMethod === 'efectivo' ? 'Efectivo Gaveta' : newExpense.paymentMethod === 'qr_vendis' ? 'QR Vendis' : newExpense.paymentMethod === 'qr_union' ? 'QR Banco Unión' : 'QR'}).`,
      type: 'info',
      durationMs: 6000,
    });
  };

  // SHIFT CLOSING (Synchronized with Firebase in Realtime)
  const closeCurrentShift = (
    responsiblePersonName: string,
    totalPhysicalCashInDrawer: number,
    declaredQrVendis: number,
    declaredQrUnion: number,
    handoverCashFloat: number,
    notes?: string
  ): Shift | null => {
    const shift = currentShift;
    if (!shift) return null;

    const startingCashFloat = shift.initialCashFloat || 100;
    const floatLeftForNext =
      handoverCashFloat !== undefined && !isNaN(handoverCashFloat) ? handoverCashFloat : 100;

    // Calcular egresos/gastos del turno
    const shiftExpenses = shift.expenses || [];
    const totalExpensesCash =
      shift.totalExpensesCash !== undefined
        ? shift.totalExpensesCash
        : shiftExpenses
            .filter((e: Expense) => e.paymentMethod === 'efectivo')
            .reduce((sum: number, e: Expense) => sum + e.amount, 0);
    const totalExpensesQrVendis =
      shift.totalExpensesQrVendis !== undefined
        ? shift.totalExpensesQrVendis
        : shiftExpenses
            .filter((e: Expense) => e.paymentMethod === 'qr_vendis')
            .reduce((sum: number, e: Expense) => sum + e.amount, 0);
    const totalExpensesQrUnion =
      shift.totalExpensesQrUnion !== undefined
        ? shift.totalExpensesQrUnion
        : shiftExpenses
            .filter((e: Expense) => e.paymentMethod === 'qr_union')
            .reduce((sum: number, e: Expense) => sum + e.amount, 0);
    const totalExpensesQr = totalExpensesQrVendis + totalExpensesQrUnion + (shift.totalExpensesQr || 0);

    const declaredQrTotal = declaredQrVendis + declaredQrUnion;

    // Ventas declaradas en efectivo: Total contado - Fondo dejado + Gastos en efectivo pagados
    const declaredSalesCash = Math.max(
      0,
      totalPhysicalCashInDrawer - floatLeftForNext + totalExpensesCash
    );

    const expectedCashInDrawer = Math.max(0, startingCashFloat + shift.expectedCash - totalExpensesCash);
    const expectedNetQrVendis = Math.max(0, (shift.expectedQrVendis || 0) - totalExpensesQrVendis);
    const expectedNetQrUnion = Math.max(0, (shift.expectedQrUnion || 0) - totalExpensesQrUnion);
    const expectedNetQrTotal = Math.max(0, shift.expectedQr - totalExpensesQr);

    const diffCash = totalPhysicalCashInDrawer - expectedCashInDrawer;
    const diffQrVendis = declaredQrVendis - expectedNetQrVendis;
    const diffQrUnion = declaredQrUnion - expectedNetQrUnion;
    const diffQr = declaredQrTotal - expectedNetQrTotal;
    const totalDiff = diffCash + (diffQrVendis !== 0 || diffQrUnion !== 0 ? (diffQrVendis + diffQrUnion) : diffQr);

    const discountAmount = totalDiff < 0 ? Math.abs(totalDiff) : 0;
    const surplusAmount = totalDiff > 0 ? totalDiff : 0;

    const handoverActiveRoomsCount = rooms.filter((r) => r.status === 'ocupada').length;

    const closedShift: Shift = {
      ...shift,
      status: 'closed',
      endTime: new Date().toISOString(),
      responsiblePersonName: responsiblePersonName.trim(),
      initialCashFloat: startingCashFloat,
      handoverCashFloat: floatLeftForNext,
      totalExpensesCash,
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

    // 2. Determinar siguiente usuario
    const nextUser =
      currentUser.id === 'user-recep-dia'
        ? SYSTEM_USERS.find((u) => u.id === 'user-recep-noche') || SYSTEM_USERS[2]
        : currentUser.id === 'user-recep-noche'
        ? SYSTEM_USERS.find((u) => u.id === 'user-recep-dia') || SYSTEM_USERS[1]
        : currentUser;

    // 3. Crear nuevo turno limpio
    const newShiftForNext: Shift = {
      id: `shift-${nextUser.id}-${Date.now()}`,
      receptionistId: nextUser.id,
      receptionistName: nextUser.name,
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

    const newShiftForCurrent: Shift = {
      id: `shift-${currentUser.id}-${Date.now() + 1}`,
      receptionistId: currentUser.id,
      receptionistName: currentUser.name,
      shiftType: currentUser.role === 'recepcionista_noche' ? 'noche' : 'dia',
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

    setActiveShifts((prev) => ({
      ...prev,
      [currentUser.id]: newShiftForCurrent,
      [nextUser.id]: newShiftForNext,
    }));

    syncShiftToFirestore(newShiftForNext);

    // 4. Conmutar usuario
    setCurrentUserId(nextUser.id);

    playSuccessChime();
    showToast({
      title: '¡Cambio de Turno Realizado con Éxito!',
      message: `Turno entregado por "${responsiblePersonName}". Sesión traspasada a ${nextUser.name} con Caja Chica de ${formatBs(floatLeftForNext)} (${handoverActiveRoomsCount} habitación/es activa/s traspasadas).`,
      type: discountAmount > 0 ? 'warning' : 'success',
      durationMs: 8500,
    });

    return closedShift;
  };

  // ADMIN ACTIONS (Synchronized with Firebase in Realtime)
  const cancelStay = (stayId: string, reason: string, restoreInventory = true): boolean => {
    if (currentUser.role !== 'admin') {
      showToast({
        title: 'Acción No Permitida',
        message: 'Solamente el Administrador tiene autorización para anular habitaciones.',
        type: 'error',
      });
      return false;
    }

    // 1. Buscar la estadía en habitaciones activas o en historial
    let targetStay: Stay | undefined;
    let targetRoom: Room | undefined;

    const roomWithActiveStay = rooms.find((r) => r.currentStay?.id === stayId);
    if (roomWithActiveStay && roomWithActiveStay.currentStay) {
      targetStay = roomWithActiveStay.currentStay;
      targetRoom = roomWithActiveStay;
    } else {
      targetStay = completedStays.find((s) => s.id === stayId);
    }

    if (!targetStay) {
      showToast({
        title: 'Error al Anular',
        message: 'No se encontró el registro de la habitación.',
        type: 'error',
      });
      return false;
    }

    // 2. Si la habitación está ocupada con esta estadía, liberarla
    if (targetRoom) {
      const updatedRoom: Room = {
        ...targetRoom,
        status: 'disponible',
        currentStay: undefined,
        cleaningStartTime: undefined,
      };
      setRooms((prev) => prev.map((r) => (r.id === targetRoom!.id ? updatedRoom : r)));
      syncRoomToFirestore(updatedRoom);
    }

    // 3. Reponer stock de consumos si aplica
    if (restoreInventory && targetStay.consumptions && targetStay.consumptions.length > 0) {
      targetStay.consumptions.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const updatedProd = {
            ...prod,
            stock: prod.stock + item.quantity,
          };
          setProducts((prev) => prev.map((p) => (p.id === item.productId ? updatedProd : p)));
          syncProductToFirestore(updatedProd);
        }
      });
    }

    // 4. Marcar la estadía como anulada
    const cancelledStay: Stay = {
      ...targetStay,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: currentUser.name,
      cancellationReason: reason || 'Anulado por Administrador (Prueba o Error)',
      restoreInventoryOnCancel: restoreInventory,
    };

    // Actualizar completedStays
    setCompletedStays((prev) => {
      const exists = prev.some((s) => s.id === stayId);
      return exists
        ? prev.map((s) => (s.id === stayId ? cancelledStay : s))
        : [cancelledStay, ...prev];
    });

    syncStayToFirebase(cancelledStay);

    showToast({
      title: '🚫 Habitación Anulada con Éxito',
      message: `${cancelledStay.roomName}: Registro cancelado por ${currentUser.name}. Motivo: ${reason || 'Error / Prueba'}.`,
      type: 'warning',
      durationMs: 7000,
    });

    return true;
  };

  const saveProduct = (product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const next = exists
        ? prev.map((p) => (p.id === product.id ? product : p))
        : [...prev, product];
      return next;
    });
    syncProductToFirestore(product);
  };

  const deleteProductById = (productId: string) => {
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
    localStorage.clear();
    showToast({
      title: 'Datos Restablecidos',
      message: 'Se han reiniciado los valores oficiales de Mon Amour.',
      type: 'info',
    });
  };

  const exportDatabaseJson = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      rooms,
      tariffs,
      products,
      shiftsHistory,
      completedStays,
      expenses,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mon_amour_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importDatabaseJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.rooms && data.tariffs && data.products) {
        setRooms(data.rooms);
        setTariffs(data.tariffs);
        setProducts(data.products);
        if (data.shiftsHistory) setShiftsHistory(data.shiftsHistory);
        if (data.completedStays) setCompletedStays(data.completedStays);
        if (data.expenses) setExpenses(data.expenses);
        showToast({
          title: 'Copia de Seguridad Restaurada',
          message: 'Base de datos importada correctamente.',
          type: 'success',
        });
        return true;
      }
      return false;
    } catch {
      showToast({
        title: 'Error al Importar',
        message: 'El archivo JSON no tiene el formato válido de copia de seguridad.',
        type: 'error',
      });
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
        soundAlertsEnabled,
        toasts,
        nowTimestamp,
        isFirestoreConnected,
        setCurrentUserById,
        toggleSoundAlerts,
        showToast,
        dismissToast,
        registerStay: registerRoomEntry,
        registerRoomEntry,
        addConsumptionToRoom,
        removeConsumptionFromRoom,
        closeStayAndCheckout,
        changeRoomStatus,
        changeRoom,
        addExpenseToShift,
        closeCurrentShift,
        cancelStay,
        saveProduct,
        deleteProductById,
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

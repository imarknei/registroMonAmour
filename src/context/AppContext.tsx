import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
  PlanType,
} from '../types';
import {
  INITIAL_ROOMS,
  INITIAL_TARIFFS,
  INITIAL_PRODUCTS,
  SYSTEM_USERS,
} from '../data/initialData';
import { calculateStayTime } from '../utils/timeUtils';
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
  syncRoomToFirestore,
  syncProductToFirestore,
  deleteProductFromFirestore,
  syncTariffsToFirestore,
  syncShiftToFirestore,
  syncExpenseToFirestore,
  getFirestoreDb,
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
    chosenPlan: '1h' | '2h' | '3h' | 'noche' | 'promo3h' | any;
    durationMinutes?: number;
    chosenDurationMinutes?: number;
    basePrice: number;
    paymentMethod: PaymentMethod;
    cashPaid?: number;
    qrPaid?: number;
    vehiclePlate?: string;
    notes?: string;
  }) => void;
  registerRoomEntry: (entryData: {
    roomId: string;
    chosenPlan: '1h' | '2h' | '3h' | 'noche' | 'promo3h' | any;
    durationMinutes?: number;
    chosenDurationMinutes?: number;
    basePrice: number;
    paymentMethod: PaymentMethod;
    cashPaid?: number;
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
      qrPaid?: number;
      notes?: string;
      setCleaning?: boolean;
    }
  ) => Stay | null;
  changeRoomStatus: (roomId: string, newStatus: RoomStatus) => void;

  // Expenses / Shift Payments
  addExpenseToShift: (expenseData: {
    description: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: 'efectivo' | 'qr';
    receiptNumber?: string;
    notes?: string;
  }) => void;

  // Shift & Cash Closing
  closeCurrentShift: (
    responsiblePersonName: string,
    totalPhysicalCashInDrawer: number,
    declaredQr: number,
    handoverCashFloat: number,
    notes?: string
  ) => Shift | null;

  // Admin functions
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

  // 4. Firebase Cloud Firestore REALTIME SYNC (onSnapshot)
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
    };

    setupFirebaseSync();

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // 5. Ensure current user has an active shift
  const ensureActiveShift = useCallback((user: User): Shift => {
    if (activeShifts[user.id]) {
      return activeShifts[user.id];
    }

    const shiftType = user.role === 'recepcionista_noche' ? 'noche' : 'dia';
    const newShift: Shift = {
      id: `shift-${user.id}-${Date.now()}`,
      receptionistId: user.id,
      receptionistName: user.name,
      shiftType,
      startTime: new Date().toISOString(),
      status: 'open',
      initialCashFloat: 100,
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
  }, [activeShifts]);

  const currentShift = currentUser.role !== 'admin' ? ensureActiveShift(currentUser) : null;

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
        const calc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes);
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
            message: `${room.name}: Quedan menos de 5 minutos de estadía.`,
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
            title: `¡Tiempo Excedido!`,
            message: `${room.name}: Ha excedido el tiempo fijado. Recargo actual: ${formatBs(calc.overtimeCharge)}.`,
            type: 'error',
          });
        }
      }
    });
  }, [nowTimestamp, rooms, soundAlertsEnabled, playedAlerts, showToast]);

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

  // ROOM OPERATIONS
  const registerRoomEntry = (entryData: {
    roomId: string;
    chosenPlan: PlanType;
    chosenDurationMinutes?: number;
    durationMinutes?: number;
    basePrice: number;
    paymentMethod: PaymentMethod;
    cashPaid?: number;
    qrPaid?: number;
    vehiclePlate?: string;
    notes?: string;
  }) => {
    const room = rooms.find((r) => r.id === entryData.roomId);
    if (!room) return;

    const duration = entryData.chosenDurationMinutes || entryData.durationMinutes || 60;
    const stayId = `stay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
      cashPaid: entryData.cashPaid,
      qrPaid: entryData.qrPaid,
      vehiclePlate: entryData.vehiclePlate,
      receptionistId: currentUser.id,
      receptionistName: currentUser.name,
      consumptions: [],
      notes: entryData.notes,
      status: 'active',
    };

    const updatedRoom: Room = {
      ...room,
      status: 'ocupada',
      currentStay: newStay,
      cleaningStartTime: undefined,
    };

    // Update state locally
    setRooms((prev) => prev.map((r) => (r.id === room.id ? updatedRoom : r)));

    // Sync to Cloud Firestore in Realtime
    syncRoomToFirestore(updatedRoom);

    playSuccessChime();
    showToast({
      title: 'Habitación Registrada',
      message: `${room.name} ocupada (${entryData.chosenPlan.toUpperCase()} - ${formatBs(entryData.basePrice)})`,
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

    const updatedRoom: Room = {
      ...room,
      currentStay: {
        ...room.currentStay,
        consumptions: [...room.currentStay.consumptions, consumptionItem],
      },
    };

    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    syncRoomToFirestore(updatedRoom);

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

    const updatedRoom: Room = {
      ...room,
      currentStay: {
        ...room.currentStay,
        consumptions: room.currentStay.consumptions.filter((c) => c.id !== consumptionId),
      },
    };

    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    syncRoomToFirestore(updatedRoom);

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
      qrPaid?: number;
      notes?: string;
      setCleaning?: boolean;
    }
  ): Stay | null => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || !room.currentStay) return null;

    const stay = room.currentStay;
    const timeCalc = calculateStayTime(stay.startTime, stay.chosenDurationMinutes);
    const consumptionsTotal = stay.consumptions.reduce((sum, item) => sum + item.subtotal, 0);
    const overtimeTotal = timeCalc.overtimeCharge;
    const totalAmount = stay.baseRoomPrice + consumptionsTotal + overtimeTotal;

    const effectivePaymentMethod = checkoutData.finalPaymentMethod || stay.paymentMethod;
    let finalCash = 0;
    let finalQr = 0;

    if (effectivePaymentMethod === 'efectivo') {
      finalCash = totalAmount;
    } else if (effectivePaymentMethod === 'qr') {
      finalQr = totalAmount;
    } else if (effectivePaymentMethod === 'mixto') {
      finalCash = checkoutData.cashPaid !== undefined ? checkoutData.cashPaid : stay.cashPaid || 0;
      finalQr = checkoutData.qrPaid !== undefined ? checkoutData.qrPaid : stay.qrPaid || Math.max(0, totalAmount - finalCash);
    }

    const completedStay: Stay = {
      ...stay,
      status: 'completed',
      endTime: new Date().toISOString(),
      overtimeMinutes: timeCalc.overtimeMinutes,
      overtimeCharge: overtimeTotal,
      totalAmount,
      paymentMethod: effectivePaymentMethod,
      cashPaid: finalCash,
      qrPaid: finalQr,
      notes: checkoutData.notes || stay.notes,
    };

    setCompletedStays((prev) => [completedStay, ...prev]);

    // Update active shift
    const shiftReceptionistId = currentUser.role === 'admin' ? stay.receptionistId : currentUser.id;
    setActiveShifts((prev) => {
      const active = prev[shiftReceptionistId] || {
        id: `shift-${shiftReceptionistId}-${Date.now()}`,
        receptionistId: shiftReceptionistId,
        receptionistName: currentUser.name,
        shiftType: currentUser.role === 'recepcionista_noche' ? 'noche' : 'dia',
        startTime: new Date().toISOString(),
        status: 'open',
        initialCashFloat: 100,
        expectedCash: 0,
        expectedQr: 0,
        totalExpensesCash: 0,
        totalExpensesQr: 0,
        expenses: [],
        salesCount: 0,
        stayIds: [],
      };

      const updatedShift: Shift = {
        ...active,
        expectedCash: active.expectedCash + finalCash,
        expectedQr: active.expectedQr + finalQr,
        salesCount: active.salesCount + 1,
        stayIds: [...active.stayIds, completedStay.id],
      };

      syncShiftToFirestore(updatedShift);

      return {
        ...prev,
        [shiftReceptionistId]: updatedShift,
      };
    });

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
      message: `${room.name} cobrada: Total ${formatBs(totalAmount)} (${
        effectivePaymentMethod === 'mixto'
          ? `Efec: ${formatBs(finalCash)} + QR: ${formatBs(finalQr)}`
          : effectivePaymentMethod.toUpperCase()
      })`,
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

  // EXPENSES / SHIFT PAYMENTS (Hacer Pagos)
  const addExpenseToShift = (expenseData: {
    description: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: 'efectivo' | 'qr';
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
        const totalExpensesQr = shiftExpenses
          .filter((e) => e.paymentMethod === 'qr')
          .reduce((sum, e) => sum + e.amount, 0);

        const updatedShift: Shift = {
          ...active,
          expenses: shiftExpenses,
          totalExpensesCash,
          totalExpensesQr,
        };

        syncShiftToFirestore(updatedShift);

        return {
          ...prev,
          [currentUser.id]: updatedShift,
        };
      });
    }

    // 3. Sincronizar gasto a Firestore
    syncExpenseToFirestore(newExpense);

    playSuccessChime();
    showToast({
      title: '💸 Pago / Egreso Registrado',
      message: `Se registró pago de ${formatBs(newExpense.amount)} por "${newExpense.description}" (${newExpense.paymentMethod === 'efectivo' ? 'Efectivo Gaveta' : 'QR / Banco'}).`,
      type: 'info',
      durationMs: 6000,
    });
  };

  // SHIFT CLOSING
  const closeCurrentShift = (
    responsiblePersonName: string,
    totalPhysicalCashInDrawer: number,
    declaredQr: number,
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
            .filter((e) => e.paymentMethod === 'efectivo')
            .reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesQr =
      shift.totalExpensesQr !== undefined
        ? shift.totalExpensesQr
        : shiftExpenses
            .filter((e) => e.paymentMethod === 'qr')
            .reduce((sum, e) => sum + e.amount, 0);

    // Ventas declaradas en efectivo: Total contado - Fondo dejado + Gastos en efectivo pagados
    const declaredSalesCash = Math.max(
      0,
      totalPhysicalCashInDrawer - floatLeftForNext + totalExpensesCash
    );

    const diffCash = declaredSalesCash - shift.expectedCash;
    const diffQr = declaredQr - (shift.expectedQr - totalExpensesQr);
    const totalDiff = diffCash + diffQr;
    const discountAmount = totalDiff < 0 ? Math.abs(totalDiff) : 0;

    const handoverActiveRoomsCount = rooms.filter((r) => r.status === 'ocupada').length;

    const closedShift: Shift = {
      ...shift,
      status: 'closed',
      endTime: new Date().toISOString(),
      responsiblePersonName: responsiblePersonName.trim(),
      initialCashFloat: startingCashFloat,
      handoverCashFloat: floatLeftForNext,
      totalExpensesCash,
      totalExpensesQr,
      totalPhysicalCashInDrawer,
      declaredCash: declaredSalesCash,
      declaredQr,
      differenceCash: diffCash,
      differenceQr: diffQr,
      totalDifference: totalDiff,
      discountAmount,
      notes,
      handoverActiveRoomsCount,
    };

    // 1. Guardar en historial local y Firebase
    setShiftsHistory((prev) => [closedShift, ...prev]);
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

  // ADMIN ACTIONS (Synchronized with Firestore in Realtime)
  const saveProduct = (product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const next = exists
        ? prev.map((p) => (p.id === product.id ? product : p))
        : [...prev, product];
      return next;
    });
    // Write to Firebase Firestore in real time!
    syncProductToFirestore(product);
  };

  const deleteProductById = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    // Delete from Firestore in real time!
    deleteProductFromFirestore(productId);
  };

  const updateTariffCatalog = (newTariffs: TariffCatalog) => {
    setTariffs(newTariffs);
    // Write to Firestore in real time!
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
        addExpenseToShift,
        closeCurrentShift,
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

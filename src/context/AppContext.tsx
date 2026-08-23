import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Room,
  TariffCatalog,
  Product,
  User,
  Shift,
  Stay,
  PlanType,
  PaymentMethod,
  RoomStatus,
  ConsumptionItem,
  ToastMessage,
} from '../types';
import {
  INITIAL_ROOMS,
  INITIAL_TARIFFS,
  INITIAL_PRODUCTS,
  SYSTEM_USERS,
} from '../data/initialData';
import { calculateStayTime } from '../utils/timeUtils';
import { formatBs } from '../utils/formatUtils';
import {
  playSuccessChime,
  playOvertimeAlert,
  playWarningBeep,
  playAddConsumptionSound,
  playUndoSound,
} from '../utils/soundUtils';

interface AppContextType {
  // State
  rooms: Room[];
  tariffs: TariffCatalog;
  products: Product[];
  currentUser: User;
  currentShift: Shift | null;
  shiftsHistory: Shift[];
  completedStays: Stay[];
  nowTimestamp: number;
  soundAlertsEnabled: boolean;
  toasts: ToastMessage[];

  // Toast actions
  showToast: (toast: Omit<ToastMessage, 'id'>) => string;
  dismissToast: (id: string) => void;

  // Actions
  setCurrentUserById: (userId: string) => void;
  toggleSoundAlerts: () => void;
  registerStay: (params: {
    roomId: string;
    chosenPlan: PlanType;
    durationMinutes: number;
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
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      return saved || SYSTEM_USERS[1].id; // Default to Recepcionista Día
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

  // Active shifts dictionary keyed by receptionist ID
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
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, JSON.stringify(soundAlertsEnabled));
  }, [soundAlertsEnabled]);

  // 3. Timer ticker (every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. Ensure current user has an active shift
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
      salesCount: 0,
      stayIds: [],
    };

    setActiveShifts((prev) => ({
      ...prev,
      [user.id]: newShift,
    }));

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

  // 5. Sound alerts watchdog for occupied rooms
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
            [stayKey]: { ...prev[stayKey], warning: true },
          }));
        }

        if (calc.isOvertime && !alertState.overtime) {
          playOvertimeAlert();
          setPlayedAlerts((prev) => ({
            ...prev,
            [stayKey]: { ...prev[stayKey], overtime: true },
          }));
        }
      }
    });
  }, [nowTimestamp, rooms, soundAlertsEnabled, playedAlerts]);

  // Actions
  const setCurrentUserById = (userId: string) => {
    setCurrentUserId(userId);
  };

  const toggleSoundAlerts = () => {
    setSoundAlertsEnabled((prev) => !prev);
  };

  const registerStay = ({
    roomId,
    chosenPlan,
    durationMinutes,
    basePrice,
    paymentMethod,
    cashPaid,
    qrPaid,
    vehiclePlate,
    notes,
  }: {
    roomId: string;
    chosenPlan: PlanType;
    durationMinutes: number;
    basePrice: number;
    paymentMethod: PaymentMethod;
    cashPaid?: number;
    qrPaid?: number;
    vehiclePlate?: string;
    notes?: string;
  }) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const newStay: Stay = {
      id: `stay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      roomId,
      roomName: room.name,
      roomType: room.type,
      receptionistId: currentUser.id,
      receptionistName: currentUser.name,
      startTime: new Date().toISOString(),
      chosenDurationMinutes: durationMinutes,
      chosenPlan,
      baseRoomPrice: basePrice,
      paymentMethod,
      cashPaid,
      qrPaid,
      consumptions: [],
      vehiclePlate: vehiclePlate?.trim() || undefined,
      notes: notes?.trim() || undefined,
      status: 'active',
    };

    // Update room
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              status: 'ocupada',
              currentStay: newStay,
            }
          : r
      )
    );

    playSuccessChime();
    showToast({
      title: 'Habitación Registrada',
      message: `${room.name} ocupada por ${durationMinutes / 60}h (${formatBs(basePrice)})`,
      type: 'success',
      durationMs: 4000,
    });
  };

  const addConsumptionToRoom = (roomId: string, productId: string, quantity = 1): boolean => {
    const product = products.find((p) => p.id === productId);
    const room = rooms.find((r) => r.id === roomId);
    if (!product || !room || !room.currentStay || product.stock < quantity) {
      if (product && product.stock < quantity) {
        showToast({
          title: 'Stock insuficiente',
          message: `Solo quedan ${product.stock} unidades de ${product.name}`,
          type: 'error',
        });
      }
      return false;
    }

    // 1. Discount stock
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              stock: p.stock - quantity,
            }
          : p
      )
    );

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

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId && r.currentStay) {
          return {
            ...r,
            currentStay: {
              ...r.currentStay,
              consumptions: [...r.currentStay.consumptions, consumptionItem],
            },
          };
        }
        return r;
      })
    );

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

    // 1. Restore product stock
    setProducts((prev) =>
      prev.map((p) =>
        p.id === item.productId
          ? {
              ...p,
              stock: p.stock + item.quantity,
            }
          : p
      )
    );

    // 2. Remove from room stay
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId && r.currentStay) {
          return {
            ...r,
            currentStay: {
              ...r.currentStay,
              consumptions: r.currentStay.consumptions.filter((c) => c.id !== consumptionId),
            },
          };
        }
        return r;
      })
    );

    if (!silent) {
      playUndoSound();
      showToast({
        title: 'Consumo Revertido',
        message: `Se canceló ${item.quantity}x ${item.productName} y se repusieron ${item.quantity} unidad(es) al stock.`,
        type: 'info',
        durationMs: 4500,
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
    const consumptionsTotal = stay.consumptions.reduce((sum, c) => sum + c.subtotal, 0);
    const totalAmount = stay.baseRoomPrice + timeCalc.overtimeCharge + consumptionsTotal;
    const effectivePaymentMethod = checkoutData.finalPaymentMethod || stay.paymentMethod;

    let finalCash = 0;
    let finalQr = 0;

    if (effectivePaymentMethod === 'efectivo') {
      finalCash = totalAmount;
      finalQr = 0;
    } else if (effectivePaymentMethod === 'qr') {
      finalCash = 0;
      finalQr = totalAmount;
    } else if (effectivePaymentMethod === 'mixto') {
      finalCash = checkoutData.cashPaid !== undefined ? checkoutData.cashPaid : (stay.cashPaid || 0);
      finalQr = checkoutData.qrPaid !== undefined ? checkoutData.qrPaid : (stay.qrPaid || Math.max(0, totalAmount - finalCash));
    }

    const completedStay: Stay = {
      ...stay,
      status: 'completed',
      endTime: new Date().toISOString(),
      overtimeMinutes: timeCalc.overtimeMinutes,
      overtimeCharge: timeCalc.overtimeCharge,
      totalAmount,
      paymentMethod: effectivePaymentMethod,
      cashPaid: finalCash,
      qrPaid: finalQr,
      notes: checkoutData.notes || stay.notes,
      closedBy: currentUser.name,
    };

    // 1. Save completed stay in history
    setCompletedStays((prev) => [completedStay, ...prev]);

    // 2. Update active shift of the current user (or shift owner)
    const shiftReceptionistId = currentUser.role === 'admin' ? stay.receptionistId : currentUser.id;
    
    setActiveShifts((prev) => {
      const active = prev[shiftReceptionistId] || {
        id: `shift-${shiftReceptionistId}-${Date.now()}`,
        receptionistId: shiftReceptionistId,
        receptionistName: currentUser.name,
        shiftType: currentUser.role === 'recepcionista_noche' ? 'noche' : 'dia',
        startTime: new Date().toISOString(),
        status: 'open',
        expectedCash: 0,
        expectedQr: 0,
        salesCount: 0,
        stayIds: [],
      };

      return {
        ...prev,
        [shiftReceptionistId]: {
          ...active,
          expectedCash: active.expectedCash + finalCash,
          expectedQr: active.expectedQr + finalQr,
          salesCount: active.salesCount + 1,
          stayIds: [...active.stayIds, completedStay.id],
        },
      };
    });

    // 3. Update room status to 'limpieza' or 'disponible'
    const newStatus: RoomStatus = checkoutData.setCleaning ? 'limpieza' : 'disponible';
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              status: newStatus,
              currentStay: undefined,
              cleaningStartTime: newStatus === 'limpieza' ? new Date().toISOString() : undefined,
            }
          : r
      )
    );

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
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              status: newStatus,
              cleaningStartTime: newStatus === 'limpieza' ? new Date().toISOString() : undefined,
              currentStay: newStatus === 'disponible' ? undefined : r.currentStay,
            }
          : r
      )
    );
  };

  const closeCurrentShift = (
    responsiblePersonName: string,
    totalPhysicalCashInDrawer: number,
    declaredQr: number,
    handoverCashFloat: number,
    notes?: string
  ): Shift | null => {
    const shift = currentShift;
    if (!shift) return null;

    // Fondo inicial con el que empezó este turno
    const startingCashFloat = shift.initialCashFloat || 100;
    // Fondo de caja chica que está DEJANDO físicamente para el siguiente turno (modificable)
    const floatLeftForNext = handoverCashFloat !== undefined && !isNaN(handoverCashFloat) ? handoverCashFloat : 100;
    // Las ventas netas declaradas en efectivo son el total físico en gaveta menos lo que se deja de caja chica
    const declaredSalesCash = Math.max(0, totalPhysicalCashInDrawer - floatLeftForNext);

    const diffCash = declaredSalesCash - shift.expectedCash;
    const diffQr = declaredQr - shift.expectedQr;
    const totalDiff = diffCash + diffQr;
    // Si hay faltante en ventas, discountAmount es positivo (monto a descontar del sueldo)
    const discountAmount = totalDiff < 0 ? Math.abs(totalDiff) : 0;

    const handoverActiveRoomsCount = rooms.filter((r) => r.status === 'ocupada').length;

    const closedShift: Shift = {
      ...shift,
      status: 'closed',
      endTime: new Date().toISOString(),
      responsiblePersonName: responsiblePersonName.trim(),
      initialCashFloat: startingCashFloat,
      handoverCashFloat: floatLeftForNext,
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

    // 1. Guardar en historial de turnos
    setShiftsHistory((prev) => [closedShift, ...prev]);

    // 2. Determinar el siguiente recepcionista para traspaso automático
    const nextUser =
      currentUser.id === 'user-recep-dia'
        ? SYSTEM_USERS.find((u) => u.id === 'user-recep-noche') || SYSTEM_USERS[2]
        : currentUser.id === 'user-recep-noche'
        ? SYSTEM_USERS.find((u) => u.id === 'user-recep-dia') || SYSTEM_USERS[1]
        : currentUser;

    // 3. Crear nuevo turno limpio con el fondo exacto de caja chica que se le dejó
    const newShiftForNext: Shift = {
      id: `shift-${nextUser.id}-${Date.now()}`,
      receptionistId: nextUser.id,
      receptionistName: nextUser.name,
      shiftType: nextUser.role === 'recepcionista_noche' ? 'noche' : 'dia',
      startTime: new Date().toISOString(),
      status: 'open',
      initialCashFloat: floatLeftForNext, // Recibe exactamente el fondo dejado por el turno anterior
      expectedCash: 0,
      expectedQr: 0,
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
      salesCount: 0,
      stayIds: [],
    };

    setActiveShifts((prev) => ({
      ...prev,
      [currentUser.id]: newShiftForCurrent,
      [nextUser.id]: newShiftForNext,
    }));

    // 4. Conmutar automáticamente la sesión al siguiente recepcionista
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

  // Admin Actions
  const saveProduct = (product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.map((p) => (p.id === product.id ? product : p));
      }
      return [...prev, product];
    });
  };

  const deleteProductById = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const updateTariffCatalog = (newTariffs: TariffCatalog) => {
    setTariffs(newTariffs);
  };

  const resetAllDataToDefaults = () => {
    setRooms(INITIAL_ROOMS);
    setTariffs(INITIAL_TARIFFS);
    setProducts(INITIAL_PRODUCTS);
    setShiftsHistory([]);
    setActiveShifts({});
    setCompletedStays([]);
    localStorage.clear();
  };

  const exportDatabaseJson = () => {
    const backupData = {
      rooms,
      tariffs,
      products,
      shiftsHistory,
      activeShifts,
      completedStays,
      exportedAt: new Date().toISOString(),
      version: '1.1.0',
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mon_amour_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importDatabaseJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.rooms) setRooms(data.rooms);
      if (data.tariffs) setTariffs(data.tariffs);
      if (data.products) setProducts(data.products);
      if (data.shiftsHistory) setShiftsHistory(data.shiftsHistory);
      if (data.activeShifts) setActiveShifts(data.activeShifts);
      if (data.completedStays) setCompletedStays(data.completedStays);
      return true;
    } catch (e) {
      console.error('Error importing backup:', e);
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
        nowTimestamp,
        soundAlertsEnabled,
        toasts,
        showToast,
        dismissToast,
        setCurrentUserById,
        toggleSoundAlerts,
        registerStay,
        addConsumptionToRoom,
        removeConsumptionFromRoom,
        closeStayAndCheckout,
        changeRoomStatus,
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
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

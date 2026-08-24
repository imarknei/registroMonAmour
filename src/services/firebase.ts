/**
 * Servicio de Integración y Sincronización en Tiempo Real con Firebase
 * Motel "Mon Amour"
 * 
 * Sincronización en vivo ultra-rápida (en milisegundos) entre todos los dispositivos (Recepción, Celulares, etc.)
 */

import { Room, Product, TariffCatalog, Shift, Expense, Stay } from '../types';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL?: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const FIREBASE_STORAGE_KEY = 'mon_amour_firebase_config_v1';

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyAOH_ZjRkB_NGOfQ2gzzfqJ8APvfF6j3sM",
  authDomain: "bidmark-race.firebaseapp.com",
  databaseURL: "https://bidmark-race-default-rtdb.firebaseio.com",
  projectId: "bidmark-race",
  storageBucket: "bidmark-race.firebasestorage.app",
  messagingSenderId: "709382571048",
  appId: "1:709382571048:web:66a1f8bf1bd86da51ee11d",
};

// Helper universal para eliminar campos 'undefined' antes de enviar a Firebase
export const sanitizeForFirebase = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

// Recuperar configuración guardada en LocalStorage o variables de entorno
export const getStoredFirebaseConfig = (): FirebaseConfig => {
  try {
    const saved = localStorage.getItem(FIREBASE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId && parsed.apiKey) {
        return {
          ...DEFAULT_FIREBASE_CONFIG,
          ...parsed,
          databaseURL: parsed.databaseURL || DEFAULT_FIREBASE_CONFIG.databaseURL,
        };
      }
    }
  } catch {
    // ignore
  }

  // Fallback a variables de entorno Vite si existen
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  if (metaEnv && metaEnv.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: metaEnv.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
      databaseURL: metaEnv.VITE_FIREBASE_DATABASE_URL || DEFAULT_FIREBASE_CONFIG.databaseURL,
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId: metaEnv.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
    };
  }

  return DEFAULT_FIREBASE_CONFIG;
};

export const saveStoredFirebaseConfig = (config: FirebaseConfig): void => {
  localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(config));
};

export const clearStoredFirebaseConfig = (): void => {
  localStorage.removeItem(FIREBASE_STORAGE_KEY);
};

// Instancias globales
let realtimeDb: any = null;
let firebaseApp: any = null;

export const initializeFirebaseClient = async (config?: FirebaseConfig) => {
  const finalConfig = config || getStoredFirebaseConfig();
  if (!finalConfig || !finalConfig.projectId || !finalConfig.apiKey) {
    return { success: false, message: 'Faltan credenciales de Firebase.' };
  }

  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getDatabase } = await import('firebase/database');

    if (getApps().length === 0) {
      firebaseApp = initializeApp(finalConfig);
    } else {
      firebaseApp = getApp();
    }

    realtimeDb = getDatabase(firebaseApp, finalConfig.databaseURL || DEFAULT_FIREBASE_CONFIG.databaseURL);
    return { success: true, db: realtimeDb };
  } catch (err: any) {
    console.warn('Error inicializando Firebase Realtime DB:', err);
    return { success: false, message: err.message || 'Error al conectar con Firebase' };
  }
};

export const getFirebaseDb = () => realtimeDb;
export const getFirestoreDb = () => realtimeDb;

// ==========================================
// 🔄 LISTENERS EN TIEMPO REAL (onValue)
// ==========================================

export const subscribeToRooms = async (
  onData: (rooms: Room[]) => void,
  onError?: (err: any) => void
): Promise<(() => void) | null> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return null;

  try {
    const { ref, onValue, off } = await import('firebase/database');
    const roomsRef = ref(db, 'rooms');

    const listener = onValue(
      roomsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const rawList: Room[] = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val);

          // Normalizar estructura para asegurar compatibilidad en todos los navegadores
          const roomsList: Room[] = rawList.map((r: any) => ({
            id: r.id,
            number: r.number,
            name: r.name,
            type: r.type,
            tag: r.tag,
            status: r.status || 'disponible',
            cleaningStartTime: r.cleaningStartTime || undefined,
            currentStay: r.currentStay
              ? {
                  ...r.currentStay,
                  consumptions: r.currentStay.consumptions
                    ? Array.isArray(r.currentStay.consumptions)
                      ? r.currentStay.consumptions
                      : Object.values(r.currentStay.consumptions)
                    : [],
                }
              : undefined,
          }));

          // Ordenar por número/ID lógico (1, 2, 3...)
          roomsList.sort((a, b) => {
            const numA = parseInt(a.id.replace(/\D/g, '')) || 999;
            const numB = parseInt(b.id.replace(/\D/g, '')) || 999;
            return numA - numB;
          });

          onData(roomsList);
        }
      },
      (err) => {
        console.warn('Error en listener de rooms:', err);
        onError?.(err);
      }
    );

    return () => off(roomsRef, 'value', listener);
  } catch (err) {
    console.warn('Error suscribiendo a rooms:', err);
    return null;
  }
};

export const subscribeToProducts = async (
  onData: (products: Product[]) => void,
  onError?: (err: any) => void
): Promise<(() => void) | null> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return null;

  try {
    const { ref, onValue, off } = await import('firebase/database');
    const prodRef = ref(db, 'products');

    const listener = onValue(
      prodRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const prodList: Product[] = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val);
          onData(prodList);
        }
      },
      (err) => {
        console.warn('Error en listener de products:', err);
        onError?.(err);
      }
    );

    return () => off(prodRef, 'value', listener);
  } catch (err) {
    console.warn('Error suscribiendo a products:', err);
    return null;
  }
};

export const subscribeToTariffs = async (
  onData: (tariffs: TariffCatalog) => void,
  onError?: (err: any) => void
): Promise<(() => void) | null> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return null;

  try {
    const { ref, onValue, off } = await import('firebase/database');
    const tariffRef = ref(db, 'motel_config/tariffs');

    const listener = onValue(
      tariffRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onData(snapshot.val() as TariffCatalog);
        }
      },
      (err) => {
        console.warn('Error en listener de tariffs:', err);
        onError?.(err);
      }
    );

    return () => off(tariffRef, 'value', listener);
  } catch (err) {
    console.warn('Error suscribiendo a tariffs:', err);
    return null;
  }
};

export const subscribeToExpenses = async (
  onData: (expenses: Expense[]) => void,
  onError?: (err: any) => void
): Promise<(() => void) | null> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return null;

  try {
    const { ref, onValue, off } = await import('firebase/database');
    const expRef = ref(db, 'expenses');

    const listener = onValue(
      expRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const expList: Expense[] = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val);
          expList.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
          onData(expList);
        }
      },
      (err) => {
        console.warn('Error en listener de expenses:', err);
        onError?.(err);
      }
    );

    return () => off(expRef, 'value', listener);
  } catch (err) {
    console.warn('Error suscribiendo a expenses:', err);
    return null;
  }
};

export const subscribeToShifts = async (
  onData: (shifts: Shift[]) => void,
  onError?: (err: any) => void
): Promise<(() => void) | null> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return null;

  try {
    const { ref, onValue, off } = await import('firebase/database');
    const shiftsRef = ref(db, 'shifts');

    const listener = onValue(
      shiftsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const shiftsList: Shift[] = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val);
          // Filtrar turnos cerrados para el historial y ordenar descendente por fecha
          const closedShifts = shiftsList.filter((s: Shift) => s.status === 'closed');
          closedShifts.sort((a, b) => (b.startTime > a.startTime ? 1 : -1));
          onData(closedShifts);
        }
      },
      (err) => {
        console.warn('Error en listener de shifts:', err);
        onError?.(err);
      }
    );

    return () => off(shiftsRef, 'value', listener);
  } catch (err) {
    console.warn('Error suscribiendo a shifts:', err);
    return null;
  }
};

export const subscribeToCompletedStays = async (
  onData: (stays: Stay[]) => void,
  onError?: (err: any) => void
): Promise<(() => void) | null> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return null;

  try {
    const { ref, onValue, off } = await import('firebase/database');
    const staysRef = ref(db, 'completed_stays');

    const listener = onValue(
      staysRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const staysList: Stay[] = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val);
          // Ordenar por hora de finalización o inicio descendente
          staysList.sort((a, b) => ((b.endTime || b.startTime) > (a.endTime || a.startTime) ? 1 : -1));
          onData(staysList);
        }
      },
      (err) => {
        console.warn('Error en listener de completed_stays:', err);
        onError?.(err);
      }
    );

    return () => off(staysRef, 'value', listener);
  } catch (err) {
    console.warn('Error suscribiendo a completed_stays:', err);
    return null;
  }
};

// ==========================================
// 💾 ESCRITURAS A FIREBASE (Mutaciones en Tiempo Real)
// ==========================================

export const syncRoomToFirestore = async (room: Room): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, set } = await import('firebase/database');
    const cleanRoom = sanitizeForFirebase({ ...room, updatedAt: new Date().toISOString() });
    await set(ref(db, `rooms/${room.id}`), cleanRoom);
  } catch (err) {
    console.error(`Error guardando room ${room.id} en Firebase:`, err);
  }
};

export const syncProductToFirestore = async (product: Product): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, set } = await import('firebase/database');
    const cleanProd = sanitizeForFirebase({ ...product, updatedAt: new Date().toISOString() });
    await set(ref(db, `products/${product.id}`), cleanProd);
  } catch (err) {
    console.error(`Error guardando product ${product.id} en Firebase:`, err);
  }
};

export const deleteProductFromFirestore = async (productId: string): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, remove } = await import('firebase/database');
    await remove(ref(db, `products/${productId}`));
  } catch (err) {
    console.error(`Error eliminando product ${productId} de Firebase:`, err);
  }
};

export const syncTariffsToFirestore = async (tariffs: TariffCatalog): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, set } = await import('firebase/database');
    const cleanTariffs = sanitizeForFirebase({ ...tariffs, updatedAt: new Date().toISOString() });
    await set(ref(db, 'motel_config/tariffs'), cleanTariffs);
  } catch (err) {
    console.error('Error guardando tariffs en Firebase:', err);
  }
};

export const syncShiftToFirestore = async (shift: Shift): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, set } = await import('firebase/database');
    const cleanShift = sanitizeForFirebase(shift);
    await set(ref(db, `shifts/${shift.id}`), cleanShift);
  } catch (err) {
    console.error(`Error guardando shift ${shift.id} en Firebase:`, err);
  }
};

export const syncCompletedStayToFirebase = async (stay: Stay): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, set } = await import('firebase/database');
    const cleanStay = sanitizeForFirebase(stay);
    await set(ref(db, `completed_stays/${stay.id}`), cleanStay);
  } catch (err) {
    console.error(`Error guardando completed_stay ${stay.id} en Firebase:`, err);
  }
};

export const syncExpenseToFirestore = async (expense: Expense): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, set } = await import('firebase/database');
    const cleanExpense = sanitizeForFirebase(expense);
    await set(ref(db, `expenses/${expense.id}`), cleanExpense);
  } catch (err) {
    console.error(`Error guardando expense ${expense.id} en Firebase:`, err);
  }
};

export const uploadAllDataToFirebase = async (data: {
  rooms: Room[];
  tariffs: TariffCatalog;
  products: Product[];
  shiftsHistory?: Shift[];
  expenses?: Expense[];
}) => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return { success: false, message: 'No se pudo conectar con Firebase.' };

  try {
    const { ref, set } = await import('firebase/database');

    // 1. Habitaciones
    const roomsMap: Record<string, Room> = {};
    data.rooms.forEach((r) => {
      roomsMap[r.id] = r;
    });
    await set(ref(db, 'rooms'), sanitizeForFirebase(roomsMap));

    // 2. Productos
    const prodMap: Record<string, Product> = {};
    data.products.forEach((p) => {
      prodMap[p.id] = p;
    });
    await set(ref(db, 'products'), sanitizeForFirebase(prodMap));

    // 3. Tarifas
    await set(ref(db, 'motel_config/tariffs'), sanitizeForFirebase(data.tariffs));

    // 4. Turnos si existen
    if (data.shiftsHistory && data.shiftsHistory.length > 0) {
      const shiftsMap: Record<string, Shift> = {};
      data.shiftsHistory.forEach((s) => {
        shiftsMap[s.id] = s;
      });
      await set(ref(db, 'shifts'), sanitizeForFirebase(shiftsMap));
    }

    // 5. Gastos si existen
    if (data.expenses && data.expenses.length > 0) {
      const expMap: Record<string, Expense> = {};
      data.expenses.forEach((e) => {
        expMap[e.id] = e;
      });
      await set(ref(db, 'expenses'), sanitizeForFirebase(expMap));
    }

    return { success: true, message: 'Todos los datos se subieron a Firebase con éxito.' };
  } catch (err: any) {
    console.error('Error subiendo todo a Firebase:', err);
    return { success: false, message: err.message || 'Error al subir datos' };
  }
};

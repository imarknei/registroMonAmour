/**
 * Servicio de Integración y Sincronización en Tiempo Real con Firebase
 * Motel "Mon Amour"
 * 
 * Sincronización en vivo ultra-rápida (en milisegundos) entre todos los dispositivos (Recepción, Celulares, etc.)
 */

import { Room, Product, TariffCatalog, Shift, Expense } from '../types';

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
          const roomsList: Room[] = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val);

          // Ordenar por número/ID lógico
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

// ==========================================
// 💾 ESCRITURAS A FIREBASE (Mutaciones en Tiempo Real)
// ==========================================

export const syncRoomToFirestore = async (room: Room): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, set } = await import('firebase/database');
    await set(ref(db, `rooms/${room.id}`), { ...room, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn(`Error guardando room ${room.id} en Firebase:`, err);
  }
};

export const syncProductToFirestore = async (product: Product): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, set } = await import('firebase/database');
    await set(ref(db, `products/${product.id}`), { ...product, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn(`Error guardando product ${product.id} en Firebase:`, err);
  }
};

export const deleteProductFromFirestore = async (productId: string): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, remove } = await import('firebase/database');
    await remove(ref(db, `products/${productId}`));
  } catch (err) {
    console.warn(`Error eliminando product ${productId} de Firebase:`, err);
  }
};

export const syncTariffsToFirestore = async (tariffs: TariffCatalog): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, set } = await import('firebase/database');
    await set(ref(db, 'motel_config/tariffs'), { ...tariffs, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Error guardando tariffs en Firebase:', err);
  }
};

export const syncShiftToFirestore = async (shift: Shift): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, set } = await import('firebase/database');
    await set(ref(db, `shifts/${shift.id}`), shift);
  } catch (err) {
    console.warn(`Error guardando shift ${shift.id} en Firebase:`, err);
  }
};

export const syncExpenseToFirestore = async (expense: Expense): Promise<void> => {
  const db = realtimeDb || (await initializeFirebaseClient())?.db;
  if (!db) return;
  try {
    const { ref, set } = await import('firebase/database');
    await set(ref(db, `expenses/${expense.id}`), expense);
  } catch (err) {
    console.warn(`Error guardando expense ${expense.id} en Firebase:`, err);
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
    await set(ref(db, 'rooms'), roomsMap);

    // 2. Productos
    const prodMap: Record<string, Product> = {};
    data.products.forEach((p) => {
      prodMap[p.id] = p;
    });
    await set(ref(db, 'products'), prodMap);

    // 3. Tarifas
    await set(ref(db, 'motel_config/tariffs'), data.tariffs);

    // 4. Turnos si existen
    if (data.shiftsHistory && data.shiftsHistory.length > 0) {
      const shiftsMap: Record<string, Shift> = {};
      data.shiftsHistory.forEach((s) => {
        shiftsMap[s.id] = s;
      });
      await set(ref(db, 'shifts'), shiftsMap);
    }

    // 5. Gastos si existen
    if (data.expenses && data.expenses.length > 0) {
      const expMap: Record<string, Expense> = {};
      data.expenses.forEach((e) => {
        expMap[e.id] = e;
      });
      await set(ref(db, 'expenses'), expMap);
    }

    return { success: true, message: 'Todos los datos se subieron a Firebase con éxito.' };
  } catch (err: any) {
    console.warn('Error subiendo todo a Firebase:', err);
    return { success: false, message: err.message || 'Error al subir datos' };
  }
};

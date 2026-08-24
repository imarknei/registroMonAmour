/**
 * Servicio de Integración y Sincronización en Tiempo Real con Firebase Cloud Firestore
 * Motel "Mon Amour"
 * 
 * Permite que los cambios de inventario, habitaciones y turnos se sincronicen
 * en vivo (en milisegundos) entre todos los dispositivos conectados (Recepción, Celulares, etc.)
 */

import { Room, Product, TariffCatalog, Shift, Expense, Stay } from '../types';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const FIREBASE_STORAGE_KEY = 'mon_amour_firebase_config_v1';

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyAOH_ZjRkB_NGOfQ2gzzfqJ8APvfF6j3sM",
  authDomain: "bidmark-race.firebaseapp.com",
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
      return JSON.parse(saved);
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
let firestoreDb: any = null;
let firebaseApp: any = null;

export const initializeFirebaseClient = async (config?: FirebaseConfig) => {
  const finalConfig = config || getStoredFirebaseConfig();
  if (!finalConfig || !finalConfig.projectId || !finalConfig.apiKey) {
    return { success: false, message: 'Faltan credenciales de Firebase.' };
  }

  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getFirestore, enableIndexedDbPersistence } = await import('firebase/firestore');

    if (getApps().length === 0) {
      firebaseApp = initializeApp(finalConfig);
    } else {
      firebaseApp = getApp();
    }

    firestoreDb = getFirestore(firebaseApp);

    // Intentar habilitar persistencia local offline (si el navegador lo permite)
    try {
      await enableIndexedDbPersistence(firestoreDb);
    } catch {
      // Ignorar si ya está inicializado o en múltiples pestañas
    }

    return { success: true, db: firestoreDb };
  } catch (err: any) {
    console.warn('Error inicializando Firebase:', err);
    return { success: false, message: err.message || 'Error al conectar con Firebase' };
  }
};

export const getFirestoreDb = () => firestoreDb;

// ==========================================
// 🔄 LISTENERS EN TIEMPO REAL (onSnapshot)
// ==========================================

export const subscribeToRooms = async (
  onData: (rooms: Room[]) => void,
  onError?: (err: any) => void
): Promise<(() => void) | null> => {
  const db = firestoreDb || (await initializeFirebaseClient())?.db;
  if (!db) return null;

  try {
    const { collection, onSnapshot } = await import('firebase/firestore');
    const roomsCol = collection(db, 'rooms');

    const unsubscribe = onSnapshot(
      roomsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const roomsList: Room[] = [];
          snapshot.forEach((doc) => {
            roomsList.push(doc.data() as Room);
          });
          // Ordenar por ID para mantener orden lógico 1, 2, 3...
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

    return unsubscribe;
  } catch (err) {
    console.warn('Error suscribiendo a rooms:', err);
    return null;
  }
};

export const subscribeToProducts = async (
  onData: (products: Product[]) => void,
  onError?: (err: any) => void
): Promise<(() => void) | null> => {
  const db = firestoreDb || (await initializeFirebaseClient())?.db;
  if (!db) return null;

  try {
    const { collection, onSnapshot } = await import('firebase/firestore');
    const prodCol = collection(db, 'products');

    const unsubscribe = onSnapshot(
      prodCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const prodList: Product[] = [];
          snapshot.forEach((doc) => {
            prodList.push(doc.data() as Product);
          });
          onData(prodList);
        }
      },
      (err) => {
        console.warn('Error en listener de products:', err);
        onError?.(err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Error suscribiendo a products:', err);
    return null;
  }
};

export const subscribeToTariffs = async (
  onData: (tariffs: TariffCatalog) => void,
  onError?: (err: any) => void
): Promise<(() => void) | null> => {
  const db = firestoreDb || (await initializeFirebaseClient())?.db;
  if (!db) return null;

  try {
    const { doc, onSnapshot } = await import('firebase/firestore');
    const tariffDoc = doc(db, 'motel_config', 'tariffs');

    const unsubscribe = onSnapshot(
      tariffDoc,
      (snapshot) => {
        if (snapshot.exists()) {
          onData(snapshot.data() as TariffCatalog);
        }
      },
      (err) => {
        console.warn('Error en listener de tariffs:', err);
        onError?.(err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Error suscribiendo a tariffs:', err);
    return null;
  }
};

export const subscribeToExpenses = async (
  onData: (expenses: Expense[]) => void,
  onError?: (err: any) => void
): Promise<(() => void) | null> => {
  const db = firestoreDb || (await initializeFirebaseClient())?.db;
  if (!db) return null;

  try {
    const { collection, onSnapshot, query, orderBy, limit } = await import('firebase/firestore');
    const expCol = collection(db, 'expenses');
    const q = query(expCol, orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const expList: Expense[] = [];
        snapshot.forEach((doc) => {
          expList.push(doc.data() as Expense);
        });
        onData(expList);
      },
      (err) => {
        console.warn('Error en listener de expenses:', err);
        onError?.(err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Error suscribiendo a expenses:', err);
    return null;
  }
};

// ==========================================
// 💾 ESCRITURAS A FIRESTORE (Mutaciones)
// ==========================================

export const syncRoomToFirestore = async (room: Room): Promise<void> => {
  const db = firestoreDb;
  if (!db) return;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'rooms', room.id), { ...room, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn(`Error guardando room ${room.id} en Firestore:`, err);
  }
};

export const syncProductToFirestore = async (product: Product): Promise<void> => {
  const db = firestoreDb;
  if (!db) return;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'products', product.id), { ...product, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn(`Error guardando product ${product.id} en Firestore:`, err);
  }
};

export const deleteProductFromFirestore = async (productId: string): Promise<void> => {
  const db = firestoreDb;
  if (!db) return;
  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    console.warn(`Error eliminando product ${productId} de Firestore:`, err);
  }
};

export const syncTariffsToFirestore = async (tariffs: TariffCatalog): Promise<void> => {
  const db = firestoreDb;
  if (!db) return;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'motel_config', 'tariffs'), { ...tariffs, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Error guardando tariffs en Firestore:', err);
  }
};

export const syncShiftToFirestore = async (shift: Shift): Promise<void> => {
  const db = firestoreDb;
  if (!db) return;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'shifts', shift.id), shift);
  } catch (err) {
    console.warn(`Error guardando shift ${shift.id} en Firestore:`, err);
  }
};

export const syncExpenseToFirestore = async (expense: Expense): Promise<void> => {
  const db = firestoreDb;
  if (!db) return;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'expenses', expense.id), expense);
  } catch (err) {
    console.warn(`Error guardando expense ${expense.id} en Firestore:`, err);
  }
};

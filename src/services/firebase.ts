/**
 * Servicio de Integración con Firebase Cloud Firestore
 * Motel "Mon Amour"
 * 
 * Permite sincronización en tiempo real entre múltiples dispositivos (Recepción, Celular de Administrador, etc.)
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const FIREBASE_STORAGE_KEY = 'mon_amour_firebase_config_v1';

// Recuperar configuración guardada en LocalStorage o variables de entorno
export const getStoredFirebaseConfig = (): FirebaseConfig | null => {
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
      apiKey: metaEnv.VITE_FIREBASE_API_KEY || '',
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: metaEnv.VITE_FIREBASE_APP_ID || '',
    };
  }

  return null;
};

export const saveStoredFirebaseConfig = (config: FirebaseConfig): void => {
  localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(config));
};

export const clearStoredFirebaseConfig = (): void => {
  localStorage.removeItem(FIREBASE_STORAGE_KEY);
};

// Variable para almacenar la instancia de Firestore si está disponible
let firestoreDb: any = null;
let firebaseApp: any = null;

export const initializeFirebaseClient = async (config?: FirebaseConfig) => {
  const finalConfig = config || getStoredFirebaseConfig();
  if (!finalConfig || !finalConfig.projectId || !finalConfig.apiKey) {
    return { success: false, message: 'Faltan credenciales de Firebase.' };
  }

  try {
    // Importación dinámica para compatibilidad con o sin paquete firebase precompilado
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');

    if (getApps().length === 0) {
      firebaseApp = initializeApp(finalConfig);
    } else {
      firebaseApp = getApp();
    }

    firestoreDb = getFirestore(firebaseApp);
    return { success: true, db: firestoreDb };
  } catch (err: any) {
    console.warn('Error inicializando Firebase:', err);
    return { success: false, message: err.message || 'Error al conectar con Firebase' };
  }
};

export const getFirestoreDb = () => firestoreDb;

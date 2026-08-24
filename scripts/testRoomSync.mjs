import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAOH_ZjRkB_NGOfQ2gzzfqJ8APvfF6j3sM",
  authDomain: "bidmark-race.firebaseapp.com",
  databaseURL: "https://bidmark-race-default-rtdb.firebaseio.com",
  projectId: "bidmark-race",
  storageBucket: "bidmark-race.firebasestorage.app",
  messagingSenderId: "709382571048",
  appId: "1:709382571048:web:66a1f8bf1bd86da51ee11d",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const testRoom = {
  id: 'hab-1',
  number: '1',
  name: 'Habitación 1',
  type: 'suite',
  tag: 'Suite',
  status: 'ocupada',
  cleaningStartTime: undefined,
  currentStay: {
    id: 'stay-123',
    roomId: 'hab-1',
    roomName: 'Habitación 1',
    roomType: 'suite',
    startTime: new Date().toISOString(),
    chosenPlan: '1h',
    chosenDurationMinutes: 60,
    baseRoomPrice: 65,
    paymentMethod: 'efectivo',
    cashPaid: 65,
    qrPaid: 0,
    vehiclePlate: undefined, // Notice undefined!
    notes: undefined,        // Notice undefined!
    consumptions: [],
    status: 'active',
  }
};

// Helper to remove all undefined values
function sanitizeForFirebase(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function test() {
  console.log('Testing saving room with sanitized object...');
  try {
    const cleanRoom = sanitizeForFirebase(testRoom);
    await set(ref(db, 'rooms/hab-1'), cleanRoom);
    console.log('✅ SANITIZED ROOM SAVE SUCCESSFUL!');
  } catch (err) {
    console.error('FAILED with error:', err.message);
  }
  process.exit(0);
}

test();

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

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

const sanitize = (data) => JSON.parse(JSON.stringify(data));

async function runTest() {
  console.log('1. Registrando Habitación 3 (Jacuzzi) ocupada...');
  const occupiedRoom3 = {
    id: 'hab-3',
    number: '3',
    name: 'Habitación 3',
    type: 'jacuzzi',
    tag: 'Jacuzzi',
    status: 'ocupada',
    currentStay: {
      id: 'stay-test-789',
      roomId: 'hab-3',
      roomName: 'Habitación 3',
      roomType: 'jacuzzi',
      startTime: new Date().toISOString(),
      chosenPlan: '2h',
      chosenDurationMinutes: 120,
      baseRoomPrice: 180,
      paymentMethod: 'mixto',
      cashPaid: 100,
      qrPaid: 80,
      vehiclePlate: '4589-KLP',
      receptionistId: 'user-recep-dia',
      receptionistName: 'Recepcionista Turno Día',
      consumptions: [
        {
          id: 'cons-1',
          productId: 'p-5',
          productName: 'Cerveza Paceña Huari 330ml',
          unitPrice: 18,
          quantity: 2,
          subtotal: 36,
          timestamp: new Date().toISOString(),
        }
      ],
      notes: 'Cliente solicitó toallas extra',
      status: 'active',
    },
    updatedAt: new Date().toISOString(),
  };

  await set(ref(db, 'rooms/hab-3'), sanitize(occupiedRoom3));
  console.log('✓ Habitación 3 guardada en Firebase.');

  console.log('2. Leyendo Habitación 3 desde Firebase...');
  const snap = await get(ref(db, 'rooms/hab-3'));
  const data = snap.val();
  console.log('✓ Estado en Firebase:', data.status);
  console.log('✓ Estadía en Firebase:', data.currentStay.roomName, '| Plan:', data.currentStay.chosenPlan, '| Consumos:', data.currentStay.consumptions.length);

  console.log('3. Liberando Habitación 3 (limpieza/disponible)...');
  const availableRoom3 = {
    id: 'hab-3',
    number: '3',
    name: 'Habitación 3',
    type: 'jacuzzi',
    tag: 'Jacuzzi',
    status: 'disponible',
    updatedAt: new Date().toISOString(),
  };
  await set(ref(db, 'rooms/hab-3'), sanitize(availableRoom3));
  console.log('✓ Habitación 3 restablecida a disponible.');

  console.log('🎉 ¡PRUEBA DE CICLO COMPLETO DE HABITACIÓN EN TIEMPO REAL EXITOSA!');
  process.exit(0);
}

runTest().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});

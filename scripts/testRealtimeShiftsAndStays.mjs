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

async function testShiftsAndStays() {
  console.log('1. Guardando prueba de estadía completada con pago adelantado...');
  const testStay = {
    id: 'stay-test-completed-1',
    roomId: 'hab-2',
    roomName: 'Habitación 2',
    roomType: 'ventilador',
    receptionistId: 'user-recep-dia',
    receptionistName: 'Recepcionista Turno Día',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date().toISOString(),
    chosenPlan: '1h',
    chosenDurationMinutes: 60,
    baseRoomPrice: 45,
    paymentMethod: 'efectivo',
    isPrepaid: true,
    prepaidAmount: 45,
    prepaidCash: 45,
    prepaidQr: 0,
    cashPaid: 45,
    qrPaid: 0,
    consumptions: [],
    vehiclePlate: '1234-XYZ',
    status: 'completed',
  };

  await set(ref(db, 'completed_stays/stay-test-completed-1'), sanitize(testStay));
  console.log('✓ completed_stays guardado con éxito.');

  console.log('2. Guardando prueba de cierre de turno...');
  const testShift = {
    id: 'shift-test-closed-1',
    receptionistId: 'user-recep-dia',
    receptionistName: 'Recepcionista Turno Día',
    shiftType: 'dia',
    startTime: new Date(Date.now() - 28800000).toISOString(),
    endTime: new Date().toISOString(),
    status: 'closed',
    responsiblePersonName: 'María López',
    initialCashFloat: 100,
    handoverCashFloat: 100,
    expectedCash: 350,
    expectedQr: 120,
    declaredCash: 350,
    declaredQr: 120,
    differenceCash: 0,
    differenceQr: 0,
    totalDifference: 0,
    discountAmount: 0,
    totalExpensesCash: 30,
    totalExpensesQr: 0,
    totalPhysicalCashInDrawer: 420,
    salesCount: 4,
    stayIds: ['stay-test-completed-1'],
    handoverActiveRoomsCount: 1,
  };

  await set(ref(db, 'shifts/shift-test-closed-1'), sanitize(testShift));
  console.log('✓ shifts guardado con éxito.');

  console.log('3. Verificando lectura de completed_stays y shifts...');
  const staysSnap = await get(ref(db, 'completed_stays'));
  const shiftsSnap = await get(ref(db, 'shifts'));
  console.log('✓ Total completed_stays en Firebase:', Object.keys(staysSnap.val() || {}).length);
  console.log('✓ Total shifts en Firebase:', Object.keys(shiftsSnap.val() || {}).length);

  console.log('🎉 ¡PRUEBA DE ESTADÍAS COMPLETADAS Y TURNOS EN TIEMPO REAL 100% EXITOSA!');
  process.exit(0);
}

testShiftsAndStays().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

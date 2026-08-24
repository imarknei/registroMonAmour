import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

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

async function inspect() {
  console.log('--- INSPECCIONANDO NUBE FIREBASE BIDMARK-RACE ---');

  const roomsSnap = await get(ref(db, 'rooms'));
  const shiftsSnap = await get(ref(db, 'shifts'));
  const completedStaysSnap = await get(ref(db, 'completed_stays'));
  const staysSnap = await get(ref(db, 'stays'));
  const expensesSnap = await get(ref(db, 'expenses'));

  console.log('1. Habitaciones (rooms):', Object.keys(roomsSnap.val() || {}).length);
  const roomsVal = roomsSnap.val() || {};
  Object.values(roomsVal).forEach(r => {
    if (r.status === 'ocupada') {
      console.log(`   - ${r.name} (Ocupada): Plan=${r.currentStay?.chosenPlan}, Entrada=${r.currentStay?.startTime}, Consumos=${r.currentStay?.consumptions?.length || 0}`);
    }
  });

  console.log('2. Turnos (shifts):', Object.keys(shiftsSnap.val() || {}).length);
  const shiftsVal = shiftsSnap.val() || {};
  Object.values(shiftsVal).forEach(s => {
    console.log(`   - Turno ID: ${s.id} | Status: ${s.status} | Recep: ${s.receptionistName} | Ventas=${s.salesCount} | Efec=${s.declaredCash || s.expectedCash} | QR=${s.declaredQr || s.expectedQr}`);
  });

  console.log('3. Estadías completadas (completed_stays):', Object.keys(completedStaysSnap.val() || {}).length);
  const completedVal = completedStaysSnap.val() || {};
  Object.values(completedVal).forEach(s => {
    console.log(`   - Stay ID: ${s.id} | Room: ${s.roomName} | Plan: ${s.chosenPlan} | Total: ${s.totalAmount} | Recep: ${s.receptionistName} | Consumos: ${s.consumptions?.length || 0}`);
  });

  console.log('4. Estadías generales (stays):', Object.keys(staysSnap.val() || {}).length);
  console.log('5. Gastos (expenses):', Object.keys(expensesSnap.val() || {}).length);

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});

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

const hab1 = { id: 'hab-1', number: '1', name: 'Habitación 1', type: 'suite', tag: 'Suite', status: 'disponible' };

await set(ref(db, 'rooms/hab-1'), hab1);
console.log('Hab-1 reset to disponible');
process.exit(0);

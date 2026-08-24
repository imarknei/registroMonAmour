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

async function testRead() {
  const snapshot = await get(ref(db, 'rooms/hab-1'));
  console.log('Room hab-1 in Firebase:', JSON.stringify(snapshot.val(), null, 2));
  process.exit(0);
}

testRead();

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

async function test() {
  console.log('Testing Realtime Database write...');
  await set(ref(db, 'motel_test/ping'), { timestamp: new Date().toISOString(), ok: true });
  console.log('✅ Realtime Database write SUCCESSFUL!');
  process.exit(0);
}

test().catch(err => {
  console.error('❌ RTDB error:', err);
  process.exit(1);
});

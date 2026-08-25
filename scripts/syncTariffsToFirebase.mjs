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

const tariffs = {
  ventilador: {
    price1h: 45,
    price2h: 70,
    priceNight: 140,
    extraHourPrice: 30,
  },
  aire: {
    price1h: 55,
    price2h: 80,
    priceNight: 150,
    extraHourPrice: 30,
  },
  suite: {
    price1h: 65,
    price2h: 80,
    price2hNight: 100, // Paquete 2 Horas Suite Noche en 100 Bs
    bonflix2hPrice: 150, // Promo 2 Horas Bonflix en 150 Bs
    bonflix4hPrice: 190, // Promo 4 Horas Bonflix en 190 Bs
    priceNight: 180,
    extraHourPrice: 30,
  },
  jacuzzi: {
    price2h: 180,
    price3h: 220,
    priceNight: 220,
    extraHourPrice: 40,
  },
  golden_suite: {
    price1h: 85,
    price2h: 140,
    priceNight: 230,
    extraHourPrice: 40,
  },
  promo3hPrice: 190,
  bonflix2hPrice: 150,
  bonflix4hPrice: 190,
};

async function sync() {
  console.log('--- SINCRONIZANDO NUEVAS TARIFAS A FIREBASE (BONFLIX 2H=150BS, 4H=190BS, SUITE NOCHE 2H=100BS) ---');
  await set(ref(db, 'motel_config/tariffs'), tariffs);
  console.log('✅ Tarifas guardadas exitosamente en Firebase RTDB.');
  process.exit(0);
}

sync().catch((err) => {
  console.error('Error sincronizando tarifas:', err);
  process.exit(1);
});

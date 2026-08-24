import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAOH_ZjRkB_NGOfQ2gzzfqJ8APvfF6j3sM",
  authDomain: "bidmark-race.firebaseapp.com",
  projectId: "bidmark-race",
  storageBucket: "bidmark-race.firebasestorage.app",
  messagingSenderId: "709382571048",
  appId: "1:709382571048:web:66a1f8bf1bd86da51ee11d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INITIAL_TARIFFS = {
  ventilador: { price1h: 45, price2h: 70, priceNight: 140, extraHourPrice: 30 },
  aire: { price1h: 55, price2h: 80, priceNight: 150, extraHourPrice: 30 },
  suite: { price1h: 65, price2h: 80, priceNight: 180, extraHourPrice: 30 },
  jacuzzi: { price2h: 180, price3h: 220, priceNight: 220, extraHourPrice: 40 },
  golden_suite: { price1h: 85, price2h: 140, priceNight: 230, extraHourPrice: 40 },
  promo3hPrice: 190,
  updatedAt: new Date().toISOString(),
};

const INITIAL_ROOMS = [
  { id: 'hab-1', number: '1', name: 'Habitación 1', type: 'suite', tag: 'Suite', status: 'disponible' },
  { id: 'hab-2', number: '2', name: 'Habitación 2', type: 'ventilador', tag: 'Ventilador', status: 'disponible' },
  { id: 'hab-3', number: '3', name: 'Habitación 3', type: 'jacuzzi', tag: 'Jacuzzi', status: 'disponible' },
  { id: 'hab-4', number: '4', name: 'Habitación 4', type: 'aire', tag: 'Aire Acondicionado', status: 'disponible' },
  { id: 'hab-5', number: '5', name: 'Habitación 5', type: 'suite', tag: 'Suite', status: 'disponible' },
  { id: 'hab-6', number: '6', name: 'Habitación 6', type: 'suite', tag: 'Suite', status: 'disponible' },
  { id: 'hab-11', number: '11', name: 'Habitación 11', type: 'suite', tag: 'Suite', status: 'disponible' },
  { id: 'hab-13', number: '13', name: 'Habitación 13', type: 'suite', tag: 'Suite', status: 'disponible' },
  { id: 'hab-14', number: '14', name: 'Habitación 14', type: 'ventilador', tag: 'Ventilador', status: 'disponible' },
  { id: 'hab-15', number: '15', name: 'Habitación 15', type: 'suite', tag: 'Suite', status: 'disponible' },
  { id: 'hab-16', number: '16', name: 'Habitación 16', type: 'suite', tag: 'Suite', status: 'disponible' },
  { id: 'hab-golden', number: 'G', name: 'Golden Suite', type: 'golden_suite', tag: 'Golden Suite • Karaoke', status: 'disponible' },
];

const INITIAL_PRODUCTS = [
  { id: 'p-1', name: 'Preservativo Durex Clásico', category: 'preservativos', price: 15, stock: 24, minStockAlert: 5, description: 'Caja x 3 unidades' },
  { id: 'p-2', name: 'Preservativo Prudence Sabor Fresa', category: 'preservativos', price: 12, stock: 30, minStockAlert: 5, description: 'Caja x 3 unidades' },
  { id: 'p-3', name: 'Preservativo Duo Retardante', category: 'preservativos', price: 18, stock: 15, minStockAlert: 3, description: 'Caja x 3 unidades' },
  { id: 'p-4', name: 'Gel Lubricante KY 50g', category: 'preservativos', price: 25, stock: 10, minStockAlert: 2, description: 'Base agua' },
  { id: 'p-5', name: 'Cerveza Paceña Huari 330ml', category: 'bebidas_alcohol', price: 18, stock: 48, minStockAlert: 10, description: 'Botella personal' },
  { id: 'p-6', name: 'Cerveza Corona Extra 355ml', category: 'bebidas_alcohol', price: 20, stock: 36, minStockAlert: 8, description: 'Botella importada' },
  { id: 'p-7', name: 'Cerveza Heineken 330ml', category: 'bebidas_alcohol', price: 20, stock: 24, minStockAlert: 6, description: 'Lata' },
  { id: 'p-8', name: 'Fernet Branca 450ml', category: 'bebidas_alcohol', price: 75, stock: 6, minStockAlert: 2, description: 'Botella mediana' },
  { id: 'p-9', name: 'Whisky Johnnie Walker Red 500ml', category: 'bebidas_alcohol', price: 120, stock: 4, minStockAlert: 1, description: 'Botella' },
  { id: 'p-10', name: 'Singani Casa Real Etiqueta Negra 500ml', category: 'bebidas_alcohol', price: 65, stock: 8, minStockAlert: 2, description: 'Botella' },
  { id: 'p-11', name: 'Coca-Cola 500ml', category: 'bebidas_sin_alcohol', price: 10, stock: 40, minStockAlert: 8, description: 'Botella personal PET' },
  { id: 'p-12', name: 'Coca-Cola Zero 500ml', category: 'bebidas_sin_alcohol', price: 10, stock: 24, minStockAlert: 5, description: 'Botella personal PET' },
  { id: 'p-13', name: 'Sprite 500ml', category: 'bebidas_sin_alcohol', price: 10, stock: 20, minStockAlert: 5, description: 'Botella personal PET' },
  { id: 'p-14', name: 'Agua Vital Sin Gas 500ml', category: 'bebidas_sin_alcohol', price: 8, stock: 50, minStockAlert: 10, description: 'Botella personal' },
  { id: 'p-15', name: 'Energizante Monster Energy 473ml', category: 'bebidas_sin_alcohol', price: 22, stock: 18, minStockAlert: 4, description: 'Lata' },
  { id: 'p-16', name: 'Energizante Red Bull 250ml', category: 'bebidas_sin_alcohol', price: 22, stock: 20, minStockAlert: 4, description: 'Lata' },
  { id: 'p-17', name: 'Papas Fritas Lays Clásicas 80g', category: 'snacks', price: 12, stock: 25, minStockAlert: 5, description: 'Bolsa' },
  { id: 'p-18', name: 'Doritos Nacho Atrevido 85g', category: 'snacks', price: 12, stock: 20, minStockAlert: 5, description: 'Bolsa' },
  { id: 'p-19', name: 'Chocolates Ferrero Rocher x 3', category: 'snacks', price: 20, stock: 15, minStockAlert: 3, description: 'Estuche' },
  { id: 'p-20', name: 'Maní Salado Karinto 100g', category: 'snacks', price: 8, stock: 30, minStockAlert: 6, description: 'Bolsa' },
  { id: 'p-21', name: 'Kit Dental (Cepillo + Pasta)', category: 'higiene_otros', price: 10, stock: 40, minStockAlert: 8, description: 'Empaque sellado' },
  { id: 'p-22', name: 'Jaboncillo Premium Mon Amour', category: 'higiene_otros', price: 5, stock: 60, minStockAlert: 12, description: 'Unidad' },
  { id: 'p-23', name: 'Shampoo / Acondicionador Sachets', category: 'higiene_otros', price: 5, stock: 50, minStockAlert: 10, description: 'Doble sachet' },
  { id: 'p-24', name: 'Toallitas Húmedas Huggies x 20', category: 'higiene_otros', price: 15, stock: 20, minStockAlert: 4, description: 'Paquete de viaje' },
];

async function seed() {
  console.log('🚀 Conectando a Firebase Firestore (bidmark-race)...');

  // 1. Guardar Tarifas
  console.log('📦 Guardando tarifas oficiales...');
  await setDoc(doc(db, 'motel_config', 'tariffs'), INITIAL_TARIFFS);

  // 2. Guardar Habitaciones
  console.log('🛏️ Guardando 12 habitaciones...');
  for (const room of INITIAL_ROOMS) {
    await setDoc(doc(db, 'rooms', room.id), { ...room, updatedAt: new Date().toISOString() });
    console.log(`  ✓ ${room.name} (${room.tag}) sincronizada.`);
  }

  // 3. Guardar Productos
  console.log('🛒 Guardando inventario de productos...');
  for (const product of INITIAL_PRODUCTS) {
    await setDoc(doc(db, 'products', product.id), { ...product, updatedAt: new Date().toISOString() });
    console.log(`  ✓ ${product.name} - ${product.price} Bs (Stock: ${product.stock})`);
  }

  console.log('✅ ¡Toda la base de datos de Firebase ha sido poblada y sincronizada con éxito!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error en el proceso de seed:', err);
  process.exit(1);
});

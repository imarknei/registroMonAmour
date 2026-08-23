# 🏩 Motel Mon Amour — Sistema de Registro & Gestión de Habitaciones

Sistema web moderno, ágil y de alta disponibilidad para la administración en tiempo real de habitaciones, consumos (minibar), control de tiempo con recargos escalonados, caja chica modificable, pago mixto y arqueo de turnos para el **Motel Mon Amour**.

Desplegado para: **`monamour.imposcast.com`**

---

## 🌟 Características Principales

### 🛏️ 1. Panel de Habitaciones en Vivo (12 Habitaciones)
- **Habitaciones Configurate**:
  - **Habitación 1**: Suite
  - **Habitación 2**: Ventilador
  - **Habitación 3**: Jacuzzi
  - **Habitación 4**: Aire Acondicionado
  - **Habitación 5**: Suite
  - **Habitación 6**: Suite
  - **Habitación 11**: Suite
  - **Habitación 13**: Suite
  - **Habitación 14**: Ventilador
  - **Habitación 15**: Suite
  - **Habitación 16**: Suite
  - **Habitación Golden Suite**: Karaoke & Bar

### ⏱️ 2. Temporizadores y Regla de Recargo Escalonado
- Cuenta regresiva precisa en vivo (segundo a segundo).
- Alertas de sonido con Web Audio API antes del vencimiento.
- **Regla de Tolerancia y Excedente**:
  - **0 a 5 minutos**: Tolerancia de gracia (0 Bs).
  - **6 a 20 minutos**: +10 Bs.
  - **21 a 30 minutos**: +20 Bs.
  - **A partir de 31 min**: +10 Bs por cada 10 minutos adicionales.

### 💳 3. Métodos de Pago Flexibles
- **Efectivo**
- **QR / VENDIS** (Verificación directa para cobros QR)
- **Pago Mixto**: Desglose automático de Efectivo + QR en tiempo real con cálculo automático del saldo restante.

### 🍹 4. Minibar / Inventario Interactivo con Deshacer
- Catálogo de preservativos, cervezas, licores, gaseosas, aguas, snacks y artículos de higiene.
- Notificaciones emergentes (toasts) con sonido de confirmación al añadir consumo.
- Botón inmediato **"Deshacer (reponer stock)"** y opción de **Anular** en lista.

### 🔄 5. Control de Turnos, Caja Chica y Traspaso de Habitaciones
- **3 Cuentas**: Recepcionista Día (08:00-20:00), Recepcionista Noche (20:00-08:00) y Administrador.
- **Conmutación Automática de Sesión**: Al cerrar turno, pasa automáticamente al siguiente recepcionista.
- **Registro del Responsable**: Obliga a ingresar el nombre de la persona que entrega físicamente el turno.
- **Caja Chica Modificable**: Permite registrar con cuánto fondo de cambio se inició y cuánto se deja (100 Bs, 80 Bs, 120 Bs, etc.).
- **Traspaso de Habitaciones Ocupadas**: Los cronómetros continúan activos; el cobro ingresa al recepcionista que cierra la habitación al salir.
- **Cierre en VENDIS**: Campo específico para registrar el total verificado en la app de VENDIS.
- **Descuentos Semanales**: Si hay faltante de dinero, se registra automáticamente el descuento del día para el ajuste de sueldo semanal.

### 🔒 6. Panel Administrador Protegido (`/admin`)
- Ruta directa `/admin` protegida con contraseña: **`Imark133`**.
- Gestión de inventario (CRUD y ajustes rápidos de stock).
- Gestión de tarifas oficiales (1h, 2h, noche y promociones).
- Historial y auditoría de turnos cerrados.
- Reporte de nómina de descuentos semanales por recepcionista.
- Reportes estadísticos de ventas y copias de seguridad JSON.
- **Conexión a Firebase Cloud Firestore**: Sincronización en tiempo real en la nube.

---

## 🛠️ Tecnologías Utilizadas
- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS** (Paleta oficial blanco y rojo burdeos)
- **Lucide Icons**
- **Firebase SDK** (Cloud Firestore)
- **Web Audio API**

---

## 🚀 Instalación y Ejecución Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

---

## 🌐 Despliegue en `monamour.imposcast.com`

Sube los archivos generados en la carpeta `dist/` a tu servidor (cPanel / Apache / Nginx / Vercel):
- `dist/index.html`
- `dist/.htaccess`
- `dist/_redirects`
- `dist/assets/`

---

© 2026 Motel Mon Amour. Todos los derechos reservados.

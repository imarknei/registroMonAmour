import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatBs, getRoomTypeLabel } from '../utils/formatUtils';
import { formatDateTime, formatTimeOnly } from '../utils/timeUtils';
import {
  X,
  DollarSign,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Lock,
  LogOut,
  UserCheck,
  Coins,
  ArrowRightLeft,
  BedDouble,
  Info,
  ShieldAlert,
  Edit3,
  Receipt,
  MinusCircle,
} from 'lucide-react';
import { SYSTEM_USERS } from '../data/initialData';

interface ShiftCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftCloseModal: React.FC<ShiftCloseModalProps> = ({ isOpen, onClose }) => {
  const { currentShift, currentUser, closeCurrentShift, rooms } = useApp();

  const [responsibleName, setResponsibleName] = useState<string>('');
  const [handoverFloat, setHandoverFloat] = useState<string>('100'); // Modificable (ej. 100, 80, 120, etc.)
  const [totalPhysicalCash, setTotalPhysicalCash] = useState<string>('');
  const [declaredQr, setDeclaredQr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Initial starting float of this shift
  const startingFloat = currentShift?.initialCashFloat || 100;

  useEffect(() => {
    if (currentShift?.initialCashFloat !== undefined) {
      setHandoverFloat(currentShift.initialCashFloat.toString());
    }
  }, [currentShift]);

  if (!isOpen || !currentShift) return null;

  const expectedSalesCash = currentShift.expectedCash;
  const expectedQr = currentShift.expectedQr;

  // Expenses registered during this shift
  const shiftExpenses = currentShift.expenses || [];
  const totalExpensesCash = shiftExpenses
    .filter((e) => e.paymentMethod === 'efectivo')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalExpensesQr = shiftExpenses
    .filter((e) => e.paymentMethod === 'qr')
    .reduce((sum, e) => sum + e.amount, 0);

  const numHandoverFloat = parseFloat(handoverFloat) || 0; // Lo que se deja para el siguiente turno
  const numTotalPhysicalCash = parseFloat(totalPhysicalCash) || 0; // Total contado en gaveta
  const numDeclaredQr = parseFloat(declaredQr) || 0;

  // Expected total physical cash in drawer = Handover Float + Expected Sales - Cash Expenses
  const expectedTotalInDrawer = Math.max(0, numHandoverFloat + expectedSalesCash - totalExpensesCash);

  // Expected QR in bank = Expected QR - QR Expenses
  const expectedNetQr = Math.max(0, expectedQr - totalExpensesQr);

  // Declared sales cash is total physical minus the float left + cash expenses that were paid
  const declaredSalesCash = Math.max(0, numTotalPhysicalCash - numHandoverFloat + totalExpensesCash);

  const diffCash = declaredSalesCash - expectedSalesCash;
  const diffQr = numDeclaredQr - expectedNetQr;
  const totalDiff = diffCash + diffQr;

  const hasFaltante = totalDiff < 0;
  const faltanteAmount = hasFaltante ? Math.abs(totalDiff) : 0;

  // Active rooms currently occupied during shift handover
  const occupiedRooms = rooms.filter((r) => r.status === 'ocupada' && r.currentStay);

  // Next receptionist in line
  const nextUser =
    currentUser.id === 'user-recep-dia'
      ? SYSTEM_USERS.find((u) => u.id === 'user-recep-noche') || SYSTEM_USERS[2]
      : currentUser.id === 'user-recep-noche'
      ? SYSTEM_USERS.find((u) => u.id === 'user-recep-dia') || SYSTEM_USERS[1]
      : currentUser;

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsibleName.trim()) {
      alert('Por favor ingrese el nombre de la persona que está entregando el turno.');
      return;
    }

    closeCurrentShift(responsibleName, numTotalPhysicalCash, numDeclaredQr, numHandoverFloat, notes);
    onClose();
    setResponsibleName('');
    setTotalPhysicalCash('');
    setDeclaredQr('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-in my-6">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-brand-800 via-brand-700 to-rose-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold shadow-inner">
              <LogOut className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Cierre de Turno y Arqueo de Caja
              </h2>
              <p className="text-xs text-rose-100 font-medium">
                {currentUser.name} • {currentUser.shiftName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleCloseShift} className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {/* Shift Details & Responsible Person Input */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-brand-600" />
                  Nombre de quien entrega el turno *
                </label>
                <input
                  type="text"
                  required
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  placeholder="Ej. María Quispe / Carlos Mamani"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                />
              </div>

              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Relevo / Traspaso Automático a:
                </span>
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200">
                  <div className={`w-6 h-6 rounded-lg ${nextUser.avatarColor} text-white flex items-center justify-center font-bold text-[10px]`}>
                    <ArrowRightLeft className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-800 text-xs block">{nextUser.name}</span>
                    <span className="text-[10px] text-slate-400 block">{nextUser.shiftName}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/60">
              <span>Inicio del Turno: <strong>{formatDateTime(currentShift.startTime)}</strong></span>
              <span>Habitaciones Atendidas: <strong>{currentShift.salesCount}</strong></span>
            </div>
          </div>

          {/* 1. CAJA CHICA MODIFICABLE & EFECTIVO DESGLOSE CLARO */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs uppercase tracking-wider">
                <Coins className="w-4 h-4 text-emerald-600" />
                Control de Caja Chica y Efectivo Físico
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-bold text-[10px]">
                Fondo Inicial Recibido: {formatBs(startingFloat)}
              </span>
            </div>

            {/* Editable Handover Cash Float Input */}
            <div className="bg-white p-3 rounded-2xl border border-emerald-300 space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                  Fondo de Caja Chica que DEJAS para el siguiente turno (Bs) *
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">(Modificable si dejas más o menos de 100)</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={handoverFloat}
                  onChange={(e) => setHandoverFloat(e.target.value)}
                  placeholder="100"
                  className="w-36 px-3 py-1.5 rounded-xl border border-emerald-300 font-mono text-base font-black text-emerald-900 bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="text-xs text-slate-500 leading-tight">
                  Este dinero se quedará en gaveta como cambio para <strong>{nextUser.name}</strong>.
                </span>
              </div>
            </div>

            {/* Visual Formula Cards with Expenses Consideration */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-slate-500 block font-semibold">Caja Chica Dejada</span>
                <strong className="font-mono text-xs text-slate-800 font-bold">{formatBs(numHandoverFloat)}</strong>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-slate-500 block font-semibold">+ Ventas Efectivo</span>
                <strong className="font-mono text-xs text-emerald-700 font-bold">+{formatBs(expectedSalesCash)}</strong>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-rose-200">
                <span className="text-[10px] text-rose-600 block font-semibold">- Pagos/Gastos Turno</span>
                <strong className="font-mono text-xs text-rose-700 font-bold">-{formatBs(totalExpensesCash)}</strong>
              </div>

              <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-xs">
                <span className="text-[10px] text-emerald-100 block font-bold">= DEBE HABER EN GAVETA</span>
                <strong className="font-mono text-xs font-black">{formatBs(expectedTotalInDrawer)}</strong>
              </div>
            </div>

            {/* Input Total Contado en Gaveta */}
            <div className="pt-1">
              <label className="block text-xs font-black text-emerald-950 mb-1">
                Efectivo Físico Total Contado en Gaveta (Bs) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={totalPhysicalCash}
                onChange={(e) => setTotalPhysicalCash(e.target.value)}
                placeholder={`Ej. ${expectedTotalInDrawer}`}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-emerald-400 font-mono text-lg font-black text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <span className="text-[11px] text-emerald-800 font-medium mt-1 block">
                {numTotalPhysicalCash > 0 ? (
                  <>
                    👉 De los <strong>{formatBs(numTotalPhysicalCash)}</strong> contados + <strong>{formatBs(totalExpensesCash)}</strong> pagados en compras/servicios: se dejan <strong>{formatBs(numHandoverFloat)}</strong> de fondo de cambio y se declaran <strong>{formatBs(declaredSalesCash)}</strong> como ventas netas en efectivo.
                  </>
                ) : (
                  `Cuenta todo el dinero físico en gaveta (debe ser ${formatBs(expectedTotalInDrawer)} considerando el fondo y los pagos del turno).`
                )}
              </span>
            </div>
          </div>

          {/* LISTA DE PAGOS / GASTOS REGISTRADOS EN ESTE TURNO */}
          {shiftExpenses.length > 0 && (
            <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-950 font-extrabold text-xs uppercase tracking-wider">
                  <Receipt className="w-4 h-4 text-rose-600" />
                  Pagos / Egresos Realizados en este Turno ({shiftExpenses.length})
                </div>
                <span className="font-mono font-black text-rose-700 text-xs">
                  Total: {formatBs(totalExpensesCash + totalExpensesQr)}
                </span>
              </div>

              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {shiftExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between bg-white p-2 rounded-xl border border-rose-100 text-xs"
                  >
                    <div>
                      <strong className="text-slate-800 block">{exp.description}</strong>
                      <span className="text-[10px] text-slate-400">
                        {formatTimeOnly(exp.timestamp)} • {exp.paymentMethod === 'efectivo' ? 'Efectivo Gaveta' : 'QR / Banco'}
                        {exp.receiptNumber && ` • N° ${exp.receiptNumber}`}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-rose-700">
                      -{formatBs(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. QR / VENDIS VERIFICADO */}
          <div className="bg-sky-50/80 rounded-2xl p-4 border border-sky-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-900 font-extrabold text-xs uppercase tracking-wider">
                <QrCode className="w-4 h-4 text-sky-600" />
                Ventas QR / VENDIS
              </div>
              <span className="text-xs font-mono font-bold text-sky-800 bg-sky-100/80 px-2.5 py-0.5 rounded-full border border-sky-200">
                Esperado en VENDIS: {formatBs(expectedNetQr)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-black text-sky-950 mb-1">
                Total de Cierre de Caja en VENDIS (Bs) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={declaredQr}
                onChange={(e) => setDeclaredQr(e.target.value)}
                placeholder={`Ej. ${expectedNetQr}`}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-sky-300 font-mono text-base font-black text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
              <span className="text-[11px] text-sky-700 font-medium mt-1 block">
                Verifica en la app o plataforma de <strong>VENDIS</strong> el monto total de cobros QR recibidos durante este turno.
              </span>
            </div>
          </div>

          {/* 3. RECONCILIATION RESULT BANNER */}
          {(totalPhysicalCash !== '' || declaredQr !== '') && (
            <div
              className={`rounded-2xl p-4 border text-xs space-y-2 ${
                hasFaltante
                  ? 'bg-rose-50 border-rose-300 text-brand-900'
                  : totalDiff > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 font-black text-sm">
                {hasFaltante ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-brand-600" />
                    <span>Faltante detectado en el arqueo</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Caja Cuadrada Perfectamente</span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-slate-500 text-[11px] block font-sans">Ventas Efectivo:</span>
                  <strong className={diffCash < 0 ? 'text-brand-700' : 'text-slate-800'}>
                    Decl: {formatBs(declaredSalesCash)} (Esp: {formatBs(expectedSalesCash)})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block font-sans">Cierre en VENDIS (QR):</span>
                  <strong className={diffQr < 0 ? 'text-brand-700' : 'text-slate-800'}>
                    Decl: {formatBs(numDeclaredQr)} (Esp: {formatBs(expectedNetQr)})
                  </strong>
                </div>
              </div>

              {hasFaltante && (
                <div className="bg-white/90 p-3 rounded-xl border border-rose-200 text-brand-900 mt-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-xs">
                    <ShieldAlert className="w-4 h-4 text-brand-600" />
                    Descuento a registrar hoy: -{formatBs(faltanteAmount)}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Este monto se acumulará en el reporte de descuentos semanales del recepcionista para el ajuste de sueldo semanal.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 4. TRASPASO DE HABITACIONES OCUPADAS (EN CURSO) */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
                <BedDouble className="w-4 h-4 text-brand-600" />
                Habitaciones en Curso para Traspaso ({occupiedRooms.length})
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                Pasan a responsabilidad de {nextUser.name}
              </span>
            </div>

            {occupiedRooms.length === 0 ? (
              <div className="text-center py-3 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                No hay habitaciones ocupadas en este momento. Todas las habitaciones están libres o en limpieza.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {occupiedRooms.map((room) => {
                  const stay = room.currentStay!;
                  const consumptionsTotal = stay.consumptions.reduce((s, c) => s + c.subtotal, 0);
                  const approxTotal = stay.baseRoomPrice + consumptionsTotal;
                  return (
                    <div
                      key={room.id}
                      className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <div>
                          <strong className="text-slate-800">{room.name}</strong>
                          <span className="text-[10px] text-slate-400 block">
                            Entrada: {formatTimeOnly(stay.startTime)} • {stay.chosenPlan.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-800 block text-xs">
                          {formatBs(approxTotal)}
                        </span>
                        <span className="text-[9px] text-brand-700 font-semibold">
                          Por cobrar al salir
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-start gap-1.5 text-[11px] text-slate-500 bg-white/70 p-2 rounded-lg border border-slate-200">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Los cronómetros no se detienen. Cuando estos clientes salgan y paguen en el siguiente turno, el dinero ingresará a la caja de <strong>{nextUser.name}</strong>.
              </span>
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Observaciones / Novedades del Turno (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Se dejó 100 Bs de cambio, se pagó a Coca-Cola 150 Bs, todo en orden."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Handover confirmation alert */}
          <div className="bg-brand-50/80 border border-brand-200 text-brand-950 p-3 rounded-2xl text-xs flex items-center gap-2.5">
            <ArrowRightLeft className="w-5 h-5 text-brand-600 shrink-0" />
            <span className="leading-tight">
              Al confirmar, la sesión conmutará automáticamente a <strong>{nextUser.name}</strong> y su caja iniciará con el fondo de cambio de <strong>{formatBs(numHandoverFloat)}</strong>.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-2xl border border-slate-300 font-bold text-slate-600 text-xs hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="w-2/3 py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Confirmar y Pasar a {nextUser.name}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

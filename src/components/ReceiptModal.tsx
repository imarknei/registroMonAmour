import React from 'react';
import { Stay } from '../types';
import { formatBs, getRoomTypeLabel, getPaymentMethodLabel } from '../utils/formatUtils';
import { formatDateTime, formatTimeOnly } from '../utils/timeUtils';
import { X, Printer, Flame } from 'lucide-react';

interface ReceiptModalProps {
  stay: Stay | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ stay, onClose }) => {
  if (!stay) return null;

  const consumptionsTotal = stay.consumptions.reduce((sum, c) => sum + c.subtotal, 0);
  const totalAmount = stay.totalAmount || stay.baseRoomPrice + (stay.overtimeCharge || 0) + consumptionsTotal;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-scale-in my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-rose-400" />
            <span className="font-bold text-sm">Comprobante de Estadía</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Ticket Content */}
        <div className="p-6 bg-slate-50 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-200 font-mono text-xs text-slate-800 space-y-3"
          >
            {/* Business Logo & Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h3 className="font-extrabold text-base tracking-widest text-slate-900 uppercase">
                MON AMOUR
              </h3>
              <p className="text-[10px] text-slate-500 font-sans">MOTEL SUITES & RELAX</p>
              <p className="text-[9px] text-slate-400 font-sans mt-0.5">Comprobante de Consumo y Estadía</p>
            </div>

            {/* Stay Meta */}
            <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>Habitación:</span>
                <strong>{stay.roomName} ({getRoomTypeLabel(stay.roomType)})</strong>
              </div>
              <div className="flex justify-between">
                <span>Entrada:</span>
                <span>{formatDateTime(stay.startTime)}</span>
              </div>
              <div className="flex justify-between">
                <span>Salida:</span>
                <span>{stay.endTime ? formatDateTime(stay.endTime) : 'En curso'}</span>
              </div>
              <div className="flex justify-between">
                <span>Atendido por:</span>
                <span>{stay.receptionistName}</span>
              </div>
              {stay.vehiclePlate && (
                <div className="flex justify-between">
                  <span>Placa Vehículo:</span>
                  <strong>{stay.vehiclePlate}</strong>
                </div>
              )}
            </div>

            {/* Breakdown List */}
            <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold">
                <span>Estadía ({stay.chosenPlan.toUpperCase()}):</span>
                <span>{formatBs(stay.baseRoomPrice)}</span>
              </div>

              {stay.overtimeCharge && stay.overtimeCharge > 0 ? (
                <div className="flex justify-between text-brand-700">
                  <span>Tiempo Extra ({stay.overtimeMinutes} min):</span>
                  <span>+{formatBs(stay.overtimeCharge)}</span>
                </div>
              ) : null}

              {stay.consumptions.length > 0 && (
                <div className="pt-1.5 space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Consumos Minibar:</div>
                  {stay.consumptions.map((c) => (
                    <div key={c.id} className="flex justify-between text-[11px] pl-1">
                      <span className="truncate pr-2">
                        {c.quantity}x {c.productName}
                      </span>
                      <span className="shrink-0">{formatBs(c.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="pt-1 text-right">
              <div className="flex justify-between items-center text-sm font-black">
                <span className="uppercase">TOTAL PAGADO:</span>
                <span className="text-base text-slate-950">{formatBs(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-sans mt-0.5">
                <span>Método de pago:</span>
                <span className="uppercase font-bold text-slate-800">
                  {getPaymentMethodLabel(stay.paymentMethod)}
                  {stay.paymentMethod === 'mixto' && (
                    <span className="block text-[9px] text-slate-400">
                      (Efec: {formatBs(stay.cashPaid || 0)} | QR: {formatBs(stay.qrPaid || 0)})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Footer message */}
            <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-400 font-sans">
              <p>¡Gracias por su preferencia!</p>
              <p className="text-[9px]">Mon Amour • Siempre a su servicio</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 text-xs hover:bg-slate-100 transition-colors"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="w-1/2 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { StaffSettlement } from '../types';
import { formatBs } from '../utils/formatUtils';
import { formatDateTime, formatDateOnly } from '../utils/timeUtils';
import { X, Printer, Flame, CheckCircle2 } from 'lucide-react';

interface StaffSettlementReceiptModalProps {
  settlement: StaffSettlement | null;
  onClose: () => void;
}

export const StaffSettlementReceiptModal: React.FC<StaffSettlementReceiptModalProps> = ({
  settlement,
  onClose,
}) => {
  if (!settlement) return null;

  const handlePrint = () => {
    window.print();
  };

  const shortageDiscounts = settlement.discounts.filter((d) => d.type === 'shift_shortage');
  const consumptionDiscounts = settlement.discounts.filter((d) => d.type === 'staff_consumption');
  const customDiscounts = settlement.discounts.filter((d) => d.type === 'custom_discount');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-scale-in my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Comprobante de Pago Semanal</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Ticket Content */}
        <div className="p-6 bg-slate-50 flex justify-center">
          <div
            id="printable-payroll-receipt"
            className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-200 font-mono text-xs text-slate-800 space-y-3"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h3 className="font-extrabold text-base tracking-widest text-slate-900 uppercase">
                MON AMOUR
              </h3>
              <p className="text-[10px] text-slate-500 font-sans">MOTEL SUITES & RELAX</p>
              <p className="text-[9px] text-slate-400 font-sans mt-0.5">Liquidación de Sueldo y Pagos</p>
            </div>

            {/* Meta */}
            <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>Personal:</span>
                <strong className="text-slate-950">{settlement.staffName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Semana / Período:</span>
                <span>{settlement.weekKey}</span>
              </div>
              <div className="flex justify-between">
                <span>Rango:</span>
                <span className="text-[10px]">{formatDateOnly(settlement.periodStart)} al {formatDateOnly(settlement.periodEnd)}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha de Pago:</span>
                <span>{formatDateTime(settlement.paymentDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Autorizado por:</span>
                <span>{settlement.paidBy}</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Sueldo Base Acordado:</span>
                <span>+{formatBs(settlement.baseSalary)}</span>
              </div>

              {/* Faltantes de Caja */}
              {shortageDiscounts.length > 0 && (
                <div className="pt-1 space-y-0.5 text-rose-700">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Descuentos Faltantes Caja ({shortageDiscounts.length}):
                  </div>
                  {shortageDiscounts.map((d, i) => (
                    <div key={i} className="flex justify-between text-[10px] pl-1">
                      <span className="truncate pr-2">{d.description}</span>
                      <span className="font-bold shrink-0">-{formatBs(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Consumos de Personal */}
              {consumptionDiscounts.length > 0 && (
                <div className="pt-1 space-y-0.5 text-amber-800">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Descuentos Consumo Personal ({consumptionDiscounts.length}):
                  </div>
                  {consumptionDiscounts.map((d, i) => (
                    <div key={i} className="flex justify-between text-[10px] pl-1">
                      <span className="truncate pr-2">{d.description}</span>
                      <span className="font-bold shrink-0">-{formatBs(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Otros Descuentos */}
              {customDiscounts.length > 0 && (
                <div className="pt-1 space-y-0.5 text-slate-600">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Otros Descuentos:</div>
                  {customDiscounts.map((d, i) => (
                    <div key={i} className="flex justify-between text-[10px] pl-1">
                      <span className="truncate pr-2">{d.description}</span>
                      <span className="font-bold shrink-0">-{formatBs(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-[11px] font-bold pt-1 border-t border-slate-200">
                <span className="text-slate-500">Total Deducciones:</span>
                <span className="text-rose-700">-{formatBs(settlement.totalDiscounts)}</span>
              </div>
            </div>

            {/* Total Paid */}
            <div className="pt-1 text-right space-y-1">
              <div className="flex justify-between items-center text-sm font-black">
                <span className="uppercase">TOTAL NETO PAGADO:</span>
                <span className="text-base text-emerald-700">{formatBs(settlement.netPaidAmount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-sans">
                <span>Método:</span>
                <span className="uppercase font-bold text-slate-800">{settlement.paymentMethod}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-8 text-center text-[10px] text-slate-400 font-sans space-y-6">
              <div className="border-t border-slate-300 pt-1 w-3/4 mx-auto">
                <p className="font-bold text-slate-700">{settlement.staffName}</p>
                <p className="text-[9px]">Firma Conforme Recibido</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
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
            className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir Comprobante
          </button>
        </div>
      </div>
    </div>
  );
};

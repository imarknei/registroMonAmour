import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, X, AlertCircle, Sparkles } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ADMIN_PASSWORDS = ['amour23', 'Imark133', 'amour2023'];

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(false);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();
    if (ADMIN_PASSWORDS.includes(cleanPass) || cleanPass.toLowerCase() === 'amour23') {
      setError(false);
      onSuccess();
    } else {
      setError(true);
      inputRef.current?.select();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-brand-900 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-brand-600/30 border border-brand-500/40 text-brand-400 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-brand-950/50">
            <Lock className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            Acceso a Inventario y Administración
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Control de inventario, productos, reabastecimiento y reportes
          </p>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Ingresa la Contraseña (amour23)
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Contraseña (amour23)"
                className={`w-full pl-4 pr-11 py-3 rounded-2xl border-2 font-mono text-base font-bold transition-all focus:outline-none ${
                  error
                    ? 'border-brand-500 bg-rose-50/50 text-brand-900 focus:ring-2 focus:ring-brand-500/20'
                    : 'border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 text-slate-900 bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-brand-600 font-bold mt-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Contraseña incorrecta. Acceso restringido al Administrador.</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ruta protegida para configuración, precios y arqueo de auditoría.</span>
          </div>

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
              <Sparkles className="w-4 h-4" />
              Ingresar al Panel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

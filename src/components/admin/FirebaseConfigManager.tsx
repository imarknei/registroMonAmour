import React, { useState, useEffect } from 'react';
import {
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  clearStoredFirebaseConfig,
  initializeFirebaseClient,
  FirebaseConfig,
} from '../../services/firebase';
import { useApp } from '../../context/AppContext';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Save,
  Trash2,
  Sparkles,
  Key,
  Layers,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { formatBs } from '../../utils/formatUtils';

export const FirebaseConfigManager: React.FC = () => {
  const { rooms, tariffs, products, shiftsHistory, completedStays } = useApp();

  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });

  const [jsonInput, setJsonInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    const saved = getStoredFirebaseConfig();
    if (saved) {
      setConfig(saved);
      checkConnection(saved);
    }
  }, []);

  const checkConnection = async (conf: FirebaseConfig) => {
    if (!conf.projectId || !conf.apiKey) return;
    setIsTesting(true);
    const res = await initializeFirebaseClient(conf);
    setIsTesting(false);
    setIsConnected(res.success);
    if (res.success) {
      setTestResult({
        success: true,
        message: `¡Conexión exitosa a Firebase Cloud Firestore! (Proyecto: ${conf.projectId})`,
      });
    } else {
      setTestResult({
        success: false,
        message: res.message || 'No se pudo conectar a Firebase.',
      });
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.apiKey || !config.projectId) {
      alert('Por favor complete al menos el apiKey y projectId de Firebase.');
      return;
    }

    saveStoredFirebaseConfig(config);
    await checkConnection(config);
  };

  const handleJsonPaste = (text: string) => {
    setJsonInput(text);
    try {
      // Intenta extraer el objeto firebaseConfig de lo que el usuario copie de la consola de Firebase
      const cleaned = text.replace(/const firebaseConfig = |var firebaseConfig = |let firebaseConfig = |;/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.apiKey && parsed.projectId) {
        const newConf: FirebaseConfig = {
          apiKey: parsed.apiKey || '',
          authDomain: parsed.authDomain || '',
          projectId: parsed.projectId || '',
          storageBucket: parsed.storageBucket || '',
          messagingSenderId: parsed.messagingSenderId || '',
          appId: parsed.appId || '',
        };
        setConfig(newConf);
        saveStoredFirebaseConfig(newConf);
        checkConnection(newConf);
        setTestResult({
          success: true,
          message: '¡Configuración de Firebase importada correctamente!',
        });
      }
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    if (confirm('¿Desea desconectar y borrar la configuración de Firebase?')) {
      clearStoredFirebaseConfig();
      setConfig({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      });
      setIsConnected(false);
      setTestResult(null);
    }
  };

  const handleUploadAllToCloud = async () => {
    setIsUploading(true);
    setUploadStatus('Subiendo datos a Firebase...');

    try {
      const { uploadAllDataToFirebase } = await import('../../services/firebase');
      const res = await uploadAllDataToFirebase({
        rooms,
        tariffs,
        products,
        shiftsHistory,
      });

      if (res.success) {
        setUploadStatus('¡Todos los datos se subieron a Firebase exitosamente!');
        alert('✅ ¡Éxito! Todas las 12 habitaciones, tarifas e inventario están sincronizados en la nube.');
      } else {
        setUploadStatus(`Error al sincronizar: ${res.message}`);
        alert(`Error al sincronizar: ${res.message}`);
      }
    } catch (err: any) {
      setUploadStatus(`Error al sincronizar: ${err.message}`);
      alert(`Error al sincronizar con Firebase: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
            <Cloud className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">
                Base de Datos en la Nube (Firebase Cloud Firestore)
              </h2>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <Database className="w-3.5 h-3.5 text-amber-600" />
                  Modo Local (LocalStorage)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Conecta tu proyecto de Firebase para sincronizar habitaciones, consumos y cierres de turno en vivo entre computadoras y celulares.
            </p>
          </div>
        </div>

        {isConnected && (
          <button
            onClick={handleUploadAllToCloud}
            disabled={isUploading}
            className="px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-brand-600/20 flex items-center gap-2 transition-all shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            {isUploading ? 'Sincronizando...' : 'Subir Datos Locales a Firebase'}
          </button>
        )}
      </div>

      {/* Test / Status Alert */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-fade-in ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-brand-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-brand-600 shrink-0" />
            )}
            <span className="font-bold">{testResult.message}</span>
          </div>

          {uploadStatus && (
            <span className="text-[11px] font-mono text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
              {uploadStatus}
            </span>
          )}
        </div>
      )}

      {/* Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Credentials */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-600" />
              Credenciales del Proyecto Firebase
            </h3>
            {isConnected && (
              <button
                onClick={handleClear}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Desconectar
              </button>
            )}
          </div>

          {/* Quick JSON paste */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Opción Rápida: Pega tu objeto firebaseConfig de Firebase Console</span>
              <span className="text-[10px] text-slate-400 font-normal">Autocompleta los campos</span>
            </label>
            <textarea
              rows={2}
              value={jsonInput}
              onChange={(e) => handleJsonPaste(e.target.value)}
              placeholder={`Ej: const firebaseConfig = { apiKey: "AIza...", projectId: "mon-amour-motel", ... };`}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  apiKey *
                </label>
                <input
                  type="text"
                  required
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  projectId *
                </label>
                <input
                  type="text"
                  required
                  value={config.projectId}
                  onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                  placeholder="ej. mon-amour-motel"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  authDomain
                </label>
                <input
                  type="text"
                  value={config.authDomain}
                  onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                  placeholder="mon-amour-motel.firebaseapp.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  storageBucket
                </label>
                <input
                  type="text"
                  value={config.storageBucket}
                  onChange={(e) => setConfig({ ...config, storageBucket: e.target.value })}
                  placeholder="mon-amour-motel.appspot.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  messagingSenderId
                </label>
                <input
                  type="text"
                  value={config.messagingSenderId}
                  onChange={(e) => setConfig({ ...config, messagingSenderId: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  appId
                </label>
                <input
                  type="text"
                  value={config.appId}
                  onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                  placeholder="1:1234567890:web:abcdef"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isTesting}
                className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                {isTesting ? 'Probando Conexión...' : 'Guardar y Conectar con Firebase'}
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Instructions & Help */}
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs">
          <h3 className="font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            ¿Dónde encontrar estos datos?
          </h3>

          <ol className="list-decimal list-inside space-y-2.5 text-slate-600 leading-relaxed font-medium">
            <li>
              Entra a tu cuenta en{' '}
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 font-bold hover:underline inline-flex items-center gap-0.5"
              >
                Firebase Console <ExternalLink className="w-3 h-3" />
              </a>.
            </li>
            <li>Selecciona tu proyecto pagado (Blaze / Pay-as-you-go).</li>
            <li>Haz clic en el ícono de <strong>Configuración del Proyecto (⚙️)</strong>.</li>
            <li>En la pestaña <em>General</em>, baja hasta <strong>Tus apps</strong> y haz clic en <strong>Web (&lt;/&gt;)</strong>.</li>
            <li>Copia el bloque <code>firebaseConfig</code> y pégalo en el cuadro de la izquierda.</li>
            <li>Asegúrate de tener creada una base de datos en <strong>Cloud Firestore</strong> en modo de producción.</li>
          </ol>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
            <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Reglas de Firestore recomendadas:
            </span>
            <pre className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-[10px] overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

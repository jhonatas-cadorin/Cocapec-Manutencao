import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, ArrowLeft, Lightbulb, AlertCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function QRScannerPage() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(
      async (result) => {
        setScanResult(result);
        scanner.clear();
        await handleScan(result);
      },
      (err) => {
        // console.warn(err);
      }
    );

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, []);

  const handleScan = async (result: string) => {
    setLoading(true);
    try {
      // Assuming QR code contains the environment ID
      // If it's a URL like https://myapp.com/env/123, we extract the ID
      let envId = result;
      if (result.includes('/env/')) {
        envId = result.split('/env/')[1];
      }

      const envDoc = await getDoc(doc(db, 'environments', envId));
      if (envDoc.exists()) {
        // Redirect to environment detail page for scouting info
        navigate(`/environments/${envId}`);
      } else {
        setError('Ambiente não encontrado. Verifique o QR Code.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao processar o QR Code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Escanear QR Code</h1>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-8 text-center space-y-4">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <QrCode size={40} />
          </div>
          <p className="text-gray-600">
            Aponte a câmera para o QR Code localizado no ambiente para abrir um chamado automaticamente.
          </p>
        </div>

        <div className="p-4 bg-gray-50 border-y border-gray-100">
          <div id="reader" className="overflow-hidden rounded-2xl bg-black"></div>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
            <Lightbulb className="text-yellow-600 shrink-0 mt-1" size={20} />
            <div className="text-sm text-yellow-800">
              <p className="font-bold">Dica</p>
              <p>Certifique-se de que o QR Code está bem iluminado e centralizado no quadrado.</p>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100"
            >
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}

          {scanResult && (
            <div className="text-center p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 break-all">
              <p className="text-xs uppercase tracking-widest font-bold mb-1 opacity-60">Detectado</p>
              <p className="font-mono text-sm">{scanResult}</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-500 font-medium">Validando ambiente...</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center text-sm text-gray-400">
        Problemas com a câmera? <button onClick={() => navigate('/environments')} className="text-blue-600 font-medium hover:underline">Selecione o ambiente manualmente</button>
      </div>
    </div>
  );
}

import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Check, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel: () => void;
}

export default function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const sigPad = useRef<SignatureCanvas>(null);

  const clear = () => {
    sigPad.current?.clear();
  };

  const save = () => {
    if (sigPad.current?.isEmpty()) {
      alert('Por favor, assine antes de salvar.');
      return;
    }
    const dataUrl = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-display font-black text-white uppercase tracking-tighter">Assinatura Digital</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">O solicitante deve assinar no campo abaixo</p>
          </div>
          <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 bg-slate-50">
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden aspect-[4/3]">
            <SignatureCanvas 
              ref={sigPad}
              penColor="#0f172a"
              canvasProps={{
                className: 'w-full h-full cursor-crosshair'
              }}
            />
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-3">
             <button
               onClick={clear}
               className="flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
             >
               <RotateCcw size={14} />
               Limpar
             </button>
             <button
               onClick={save}
               className="flex items-center justify-center gap-2 py-4 bg-bento-blue-deep text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-900/10 hover:scale-[1.02] transition-all"
             >
               <Check size={14} />
               Confirmar Entrega
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

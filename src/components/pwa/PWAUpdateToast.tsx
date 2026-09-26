import React, { useState } from 'react';
import { usePWAUpdate } from '../../hooks/usePWAUpdate';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export const PWAUpdateToast: React.FC = () => {
  const { updateAvailable, applyUpdate } = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  if (!updateAvailable || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    setIsApplying(true);
    applyUpdate();
  };

  return (
    <div className="fixed top-3 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-top-4 fade-in duration-200">
      <div className="bg-[#FFFDF8] border-2 border-[#E11D48]/30 rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-3 text-[#2C2825]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#E11D48] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 fill-white/20 stroke-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#2C2825] flex items-center gap-1.5">
              <span>新しいバージョンが利用可能です</span>
            </div>
            <div className="text-[11px] text-[#7A7167] truncate">
              タップして最新のKOTOBAに更新
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isApplying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E11D48] text-white text-xs font-bold hover:bg-[#BE123C] transition active:scale-95 shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isApplying ? 'animate-spin' : ''}`} />
            <span>{isApplying ? '更新中' : '今すぐ更新'}</span>
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-[#9E9487] hover:text-[#2C2825] transition"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

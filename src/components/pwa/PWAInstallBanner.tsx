import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, X } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  // Android / Chromium
  if (isInstallable) {
    return (
      <div className="mx-4 mb-3 p-3 bg-[#FAF7F0] border border-[#E4DEC9] rounded-xl shadow-xs flex items-center justify-between text-xs text-[#524A42]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E11D48] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            言
          </div>
          <div>
            <div className="font-semibold text-[#2C2825]">ホーム画面に追加</div>
            <div className="text-[11px] text-[#7A7167]">アプリとしてオフラインでも快適に学習</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={install}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2C2825] text-white text-xs font-medium active:scale-95 transition"
          >
            <Download className="w-3.5 h-3.5" />
            追加
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-[#9E9487] hover:text-[#2C2825]"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <div className="mx-4 mb-3 p-3 bg-[#FAF7F0] border border-[#E4DEC9] rounded-xl shadow-xs flex items-center justify-between text-xs text-[#524A42]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E11D48] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              言
            </div>
            <div>
              <div className="font-semibold text-[#2C2825]">iPhoneのホーム画面に追加</div>
              <div className="text-[11px] text-[#7A7167]">全画面・オフラインで単語帳を開けます</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2C2825] text-white text-xs font-medium active:scale-95 transition"
            >
              <Share className="w-3 h-3" />
              手順
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-[#9E9487] hover:text-[#2C2825]"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] p-5 shadow-xl">
              <h3 className="text-base font-bold text-[#2C2825]">ホーム画面への追加手順</h3>
              <div className="mt-3 space-y-2.5 text-xs text-[#524A42] leading-relaxed">
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[#E11D48]">1.</span>
                  Safari下部の共有ボタン（四角から上矢印のアイコン）をタップします。
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[#E11D48]">2.</span>
                  メニューをスクロールして「ホーム画面に追加」を選択します。
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[#E11D48]">3.</span>
                  右上の「追加」をタップすると、単語帳アプリとして起動できるようになります。
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#2C2825] py-2.5 text-xs font-medium text-white hover:bg-black transition active:scale-98"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

import React, { useState, useRef } from 'react';
import { AppSettings, KotobaBackupData } from '../../types';
import { db } from '../../services/db';
import { ConfirmModal } from '../common/ConfirmModal';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  Download,
  Upload,
  FileCheck,
  Type,
  Layers,
  Palette,
  Sparkles,
  Info,
  Check,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onDataRestored: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onDataRestored,
}) => {
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');
  const [restoreConfirmData, setRestoreConfirmData] = useState<KotobaBackupData | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isInstallable, isIOS, install } = usePWAInstall();

  // Export .wordbook file
  const handleExportBackup = async () => {
    try {
      const data = await db.exportBackup();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `KOTOBA_${dateStr}.wordbook`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupSuccessMsg(`「${filename}」をダウンロードしました。`);
      setTimeout(() => setBackupSuccessMsg(''), 5000);
    } catch (e) {
      alert('バックアップの生成中にエラーが発生しました。');
    }
  };

  // Trigger file selection for restore
  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as KotobaBackupData;

        if (!parsed || parsed.appName !== 'KOTOBA') {
          setRestoreError('KOTOBAのバックアップファイルではありません。');
          return;
        }

        setRestoreError('');
        setRestoreConfirmData(parsed);
      } catch (err) {
        setRestoreError('ファイルの解析に失敗しました。正しいJSON形式の.wordbookファイルを選択してください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Perform restore with safety backup
  const executeRestore = async () => {
    if (!restoreConfirmData) return;

    try {
      // 1. Auto backup current data before restoring
      const currentBackup = await db.exportBackup();
      const currentJson = JSON.stringify(currentBackup);
      try {
        localStorage.setItem('kotoba_safety_backup_pre_restore', currentJson);
      } catch {
        // ignore localStorage quota limit
      }

      // 2. Restore data
      await db.restoreBackup(restoreConfirmData);
      setRestoreConfirmData(null);
      setBackupSuccessMsg('データを正常に復元しました。');
      onDataRestored();
      setTimeout(() => setBackupSuccessMsg(''), 5000);
    } catch (err) {
      alert('復元中にエラーが発生しました。');
    }
  };

  return (
    <div className="pb-safe-nav">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#F5F2EA]/95 backdrop-blur-md border-b border-[#E6E0CF] px-4 py-3 pt-safe">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
            <h1 className="text-lg font-bold tracking-tight text-[#2C2825]">
              KOTOBA <span className="text-xs font-normal text-[#8A8073] ml-1">設定</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Settings List */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-5">
        {backupSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center gap-2 animate-in fade-in duration-150">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{backupSuccessMsg}</span>
          </div>
        )}

        {restoreError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{restoreError}</span>
          </div>
        )}

        {/* 1. 単語帳設定 */}
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-[#524A42] flex items-center gap-1.5">
            <Type className="w-4 h-4 text-[#7A7167]" />
            単語帳表示
          </h3>

          {/* Font Size */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#2C2825]">文字サイズ</div>
              <div className="text-[11px] text-[#8C8275]">英単語の見出しフォントサイズ</div>
            </div>
            <div className="flex items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl">
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateSettings({ ...settings, fontSize: size })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    settings.fontSize === size
                      ? 'bg-white text-[#2C2825] shadow-xs'
                      : 'text-[#7A7167] hover:text-[#2C2825]'
                  }`}
                >
                  {size === 'sm' ? '小' : size === 'md' ? '中' : '大'}
                </button>
              ))}
            </div>
          </div>

          {/* Show Page Number */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F2ECE1]">
            <div>
              <div className="text-xs font-semibold text-[#2C2825]">単語位置（ページ番号）</div>
              <div className="text-[11px] text-[#8C8275]">上部に「12 / 120」を表示</div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ ...settings, showPageNumber: !settings.showPageNumber })
              }
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.showPageNumber ? 'bg-[#2C2825]' : 'bg-[#DCD4C4]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  settings.showPageNumber ? 'left-5.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Show Sticky Notes */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F2ECE1]">
            <div>
              <div className="text-xs font-semibold text-[#2C2825]">付箋の表示</div>
              <div className="text-[11px] text-[#8C8275]">カード右端の付箋タブを表示</div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ ...settings, showStickyNotes: !settings.showStickyNotes })
              }
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.showStickyNotes ? 'bg-[#2C2825]' : 'bg-[#DCD4C4]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  settings.showStickyNotes ? 'left-5.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Paper Texture */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F2ECE1]">
            <div>
              <div className="text-xs font-semibold text-[#2C2825]">紙の罫線テクスチャ</div>
              <div className="text-[11px] text-[#8C8275]">単語帳カードに薄い罫線を描画</div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ ...settings, paperTexture: !settings.paperTexture })
              }
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.paperTexture ? 'bg-[#2C2825]' : 'bg-[#DCD4C4]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  settings.paperTexture ? 'left-5.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Page Animation */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F2ECE1]">
            <div>
              <div className="text-xs font-semibold text-[#2C2825]">ページめくり演出</div>
              <div className="text-[11px] text-[#8C8275]">スワイプ時のトランジション</div>
            </div>
            <div className="flex items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl">
              {(['slide', 'fade', 'none'] as const).map((anim) => (
                <button
                  key={anim}
                  onClick={() => onUpdateSettings({ ...settings, pageAnimation: anim })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    settings.pageAnimation === anim
                      ? 'bg-white text-[#2C2825] shadow-xs'
                      : 'text-[#7A7167] hover:text-[#2C2825]'
                  }`}
                >
                  {anim === 'slide' ? 'スライド' : anim === 'fade' ? 'フェード' : 'なし'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. 外観 */}
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#524A42] flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-[#7A7167]" />
            外観モード
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onUpdateSettings({ ...settings, theme: mode })}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  settings.theme === mode
                    ? 'bg-[#2C2825] text-white border-[#2C2825]'
                    : 'bg-white border-[#E6E0CF] text-[#524A42] hover:bg-[#F9F6F0]'
                }`}
              >
                {mode === 'light' ? 'ライト' : mode === 'dark' ? 'ダーク' : 'システム'}
              </button>
            ))}
          </div>
        </div>

        {/* 3. データ（バックアップ・復元） */}
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#524A42] flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-[#7A7167]" />
            データ管理（IndexedDB）
          </h3>
          <p className="text-xs text-[#7A7167] leading-relaxed">
            データはすべてお使いのスマートフォン端末内に安全に保管されています。
            バックアップファイルをダウンロードして保存しておくと、端末変更時にも復元できます。
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            {/* Export */}
            <button
              onClick={handleExportBackup}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white border border-[#DDD6C5] hover:bg-[#FAF7F0] text-xs font-bold text-[#2C2825] transition active:scale-95 shadow-xs"
            >
              <Download className="w-4 h-4 text-[#2C2825]" />
              今すぐバックアップ
            </button>

            {/* Restore */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white border border-[#DDD6C5] hover:bg-[#FAF7F0] text-xs font-bold text-[#2C2825] transition active:scale-95 shadow-xs"
            >
              <Upload className="w-4 h-4 text-[#2C2825]" />
              ファイルから復元
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".wordbook,.json"
            onChange={handleSelectRestoreFile}
            className="hidden"
          />
        </div>

        {/* 4. アプリ情報 */}
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] p-4 shadow-xs space-y-2 text-xs text-[#7A7167]">
          <div className="flex items-center justify-between font-semibold text-[#2C2825]">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#7A7167]" />
              KOTOBA について
            </span>
            <span className="font-mono text-[11px] text-[#8C8275]">v1.0.0</span>
          </div>
          <p className="leading-relaxed">
            KOTOBAは「自分で育てる英単語帳」をコンセプトにしたスマートフォン向け英単語帳です。
            紙の単語帳のめくる感覚、赤シート、付箋をスマートフォン上に再現しています。
          </p>
        </div>
      </main>

      {/* Restore Confirmation Dialog */}
      {restoreConfirmData && (
        <ConfirmModal
          isOpen={true}
          title="バックアップから復元しますか？"
          message={`選択されたバックアップファイルの内容:\n・単語帳: ${restoreConfirmData.books?.length || 0} 冊\n・Chapter: ${restoreConfirmData.chapters?.length || 0} 個\n・単語数: ${restoreConfirmData.words?.length || 0} 語\n\n※ 復元前に現在のデータは自動バックアップされます。`}
          confirmLabel="データを復元する"
          cancelLabel="キャンセル"
          isDestructive={false}
          onConfirm={executeRestore}
          onCancel={() => setRestoreConfirmData(null)}
        />
      )}
    </div>
  );
};

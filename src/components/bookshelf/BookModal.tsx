import React, { useState, useEffect } from 'react';
import { Book } from '../../types';
import { X, Check } from 'lucide-react';

interface BookModalProps {
  isOpen: boolean;
  bookToEdit?: Book | null;
  onClose: () => void;
  onSave: (bookData: { title: string; subtitle?: string; coverColor: string }) => void;
}

const COVER_COLORS = [
  { hex: '#2D4A3E', name: '深緑 (Forest)' },
  { hex: '#5C1D24', name: '真紅 (Burgundy)' },
  { hex: '#1C3144', name: '紺青 (Navy)' },
  { hex: '#4A3B32', name: '焦茶 (Espresso)' },
  { hex: '#2F4858', name: '藍鉄 (Prussian)' },
  { hex: '#582C4D', name: '紫紺 (Plum)' },
  { hex: '#4F5D2F', name: '草木 (Olive)' },
  { hex: '#262626', name: '墨黒 (Charcoal)' },
];

export const BookModal: React.FC<BookModalProps> = ({
  isOpen,
  bookToEdit,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0].hex);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bookToEdit) {
      setTitle(bookToEdit.title);
      setSubtitle(bookToEdit.subtitle || '');
      setCoverColor(bookToEdit.coverColor || COVER_COLORS[0].hex);
    } else {
      setTitle('');
      setSubtitle('');
      setCoverColor(COVER_COLORS[0].hex);
    }
    setError('');
  }, [bookToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('単語帳のタイトルを入力してください');
      return;
    }
    onSave({
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      coverColor,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] shadow-xl overflow-hidden text-[#2C2825] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EBE4D5] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#2C2825]">
            {bookToEdit ? '本を編集' : '新しい単語帳を作成'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9E9487] hover:text-[#2C2825] rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#524A42] mb-1.5">
              本のタイトル <span className="text-[#E11D48]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="例: 大学受験 頻出英単語"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DDD6C5] text-sm text-[#2C2825] focus:outline-hidden focus:border-[#2C2825] transition"
              autoFocus
            />
            {error && <p className="text-xs text-[#E11D48] mt-1">{error}</p>}
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-xs font-semibold text-[#524A42] mb-1.5">
              サブタイトル（任意）
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="例: 目標スコア 800点 / 必修2000語"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DDD6C5] text-sm text-[#2C2825] focus:outline-hidden focus:border-[#2C2825] transition"
            />
          </div>

          {/* Cover Color */}
          <div>
            <label className="block text-xs font-semibold text-[#524A42] mb-2">
              表紙カラー
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {COVER_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setCoverColor(c.hex)}
                  className="h-10 rounded-xl relative flex items-center justify-center transition shadow-xs active:scale-95"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                  aria-label={c.name}
                >
                  {coverColor === c.hex && (
                    <Check className="w-4 h-4 text-white drop-shadow-xs" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview of Book */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-[#8C8275] mb-1.5">
              表紙プレビュー
            </div>
            <div
              className="w-full rounded-xl p-3.5 text-white flex items-center gap-3 shadow-xs"
              style={{ backgroundColor: coverColor }}
            >
              <div className="w-2.5 h-10 bg-black/20 rounded-xs" />
              <div className="overflow-hidden">
                <div className="text-xs font-bold truncate">
                  {title.trim() || '単語帳タイトル'}
                </div>
                <div className="text-[10px] text-white/70 truncate">
                  {subtitle.trim() || 'サブタイトル'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl text-[#6B6257] hover:bg-[#F2ECE1] transition active:scale-95"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-[#2C2825] text-white hover:bg-black transition active:scale-95 shadow-xs"
            >
              {bookToEdit ? '変更を保存' : '本を作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

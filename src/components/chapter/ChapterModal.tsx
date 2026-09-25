import React, { useState, useEffect } from 'react';
import { Chapter } from '../../types';
import { X } from 'lucide-react';

interface ChapterModalProps {
  isOpen: boolean;
  chapterToEdit?: Chapter | null;
  onClose: () => void;
  onSave: (data: { title: string; description?: string }) => void;
}

export const ChapterModal: React.FC<ChapterModalProps> = ({
  isOpen,
  chapterToEdit,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (chapterToEdit) {
      setTitle(chapterToEdit.title);
      setDescription(chapterToEdit.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
    setError('');
  }, [chapterToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Chapterのタイトルを入力してください');
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] shadow-xl overflow-hidden text-[#2C2825] animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-[#EBE4D5] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#2C2825]">
            {chapterToEdit ? 'Chapterを編集' : '新しいChapterを追加'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9E9487] hover:text-[#2C2825] rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#524A42] mb-1.5">
              Chapter名 <span className="text-[#E11D48]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="例: Chapter 1: 最頻出動詞"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DDD6C5] text-sm text-[#2C2825] focus:outline-hidden focus:border-[#2C2825] transition"
              autoFocus
            />
            {error && <p className="text-xs text-[#E11D48] mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#524A42] mb-1.5">
              説明（任意）
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 会話や長文読解でまず押さえておきたいコア単語"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DDD6C5] text-sm text-[#2C2825] focus:outline-hidden focus:border-[#2C2825] transition resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
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
              {chapterToEdit ? '保存' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

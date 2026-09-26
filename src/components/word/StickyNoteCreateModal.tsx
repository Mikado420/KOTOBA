import React, { useState } from 'react';
import { StickyColor } from '../../types';
import { X, Check, StickyNote as StickyIcon } from 'lucide-react';

interface StickyNoteCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (color: StickyColor) => void;
}

export const STICKY_COLOR_OPTIONS: {
  color: StickyColor;
  bg: string;
  tabBg: string;
  border: string;
  text: string;
}[] = [
  { color: 'red', bg: '#FFE4E6', tabBg: '#FB7185', border: '#FDA4AF', text: '#881337' },
  { color: 'orange', bg: '#FFEDD5', tabBg: '#FB923C', border: '#FDBA74', text: '#7C2D12' },
  { color: 'yellow', bg: '#FEF9C3', tabBg: '#FACC15', border: '#FDE047', text: '#713F12' },
  { color: 'green', bg: '#DCFCE7', tabBg: '#4ADE80', border: '#86EFAC', text: '#14532D' },
  { color: 'blue', bg: '#DBEAFE', tabBg: '#60A5FA', border: '#93C5FD', text: '#1E3A8A' },
  { color: 'purple', bg: '#F3E8FF', tabBg: '#C084FC', border: '#D8B4FE', text: '#581C87' },
];

export const StickyNoteCreateModal: React.FC<StickyNoteCreateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedColor, setSelectedColor] = useState<StickyColor>('yellow');

  if (!isOpen) return null;

  const currentOption =
    STICKY_COLOR_OPTIONS.find((c) => c.color === selectedColor) || STICKY_COLOR_OPTIONS[2];

  const handleConfirm = () => {
    onConfirm(selectedColor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xs sm:max-w-sm rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] p-5 shadow-xl text-[#211E1C] flex flex-col gap-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#EAE3D2]">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-2xs transition-colors"
              style={{ backgroundColor: currentOption.tabBg }}
            >
              <StickyIcon className="w-4 h-4 fill-white/30 stroke-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#211E1C]">付箋を貼る</h3>
              <p className="text-[11px] text-[#7A7167]">貼りたい付箋の色を選んでください</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#8C8275] hover:text-[#211E1C] hover:bg-[#F2ECE1] transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 6 Colors Selection Row (Strictly 1 horizontal row across all screen sizes, no color names) */}
        <div className="grid grid-cols-6 gap-2 w-full pt-1">
          {STICKY_COLOR_OPTIONS.map((item) => {
            const isSelected = selectedColor === item.color;
            return (
              <button
                key={item.color}
                type="button"
                onClick={() => setSelectedColor(item.color)}
                style={{
                  backgroundColor: item.tabBg,
                }}
                className={`aspect-square w-full rounded-xl border border-black/15 flex items-center justify-center transition-all duration-150 active:scale-90 shadow-2xs ${
                  isSelected
                    ? 'ring-3 ring-[#2C2825] ring-offset-2 scale-105 shadow-md'
                    : 'hover:scale-102 opacity-85 hover:opacity-100'
                }`}
                aria-label={`付箋カラー ${item.color}`}
              >
                {isSelected && (
                  <Check className="w-4 h-4 text-white stroke-[3.5] drop-shadow-xs" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tactile Preview: visual representation of the sticky note tab on the paper card edge */}
        <div className="bg-[#FAF7F0] border border-[#EAE3D2] rounded-xl p-3 flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#7A7167]">プレビュー</span>

          {/* Mini Word Card Edge Preview */}
          <div className="flex items-center">
            <div className="h-7 px-3 bg-[#FFFDF8] border-y border-l border-[#E5DEC9] rounded-l-md flex items-center">
              <span className="text-[9px] text-[#A89F91]">カード右端</span>
            </div>
            <div
              className="h-7 px-3 rounded-r-md text-[10px] font-bold text-white shadow-xs flex items-center border-y border-r border-black/15 transition-colors"
              style={{ backgroundColor: currentOption.tabBg }}
            >
              付箋
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-[#6B6257] hover:bg-[#F2ECE1] transition min-h-[40px]"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-bold rounded-xl text-white shadow-xs transition active:scale-95 min-h-[40px] flex items-center gap-1.5"
            style={{ backgroundColor: currentOption.tabBg }}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>貼る</span>
          </button>
        </div>
      </div>
    </div>
  );
};

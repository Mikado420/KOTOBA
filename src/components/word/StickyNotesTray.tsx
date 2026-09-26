import React, { useState } from 'react';
import { StickyNote, StickyColor } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { Plus, X, Trash2, Check } from 'lucide-react';

interface StickyNotesTrayProps {
  notes: StickyNote[];
  wordId: string;
  onSaveNote: (note: StickyNote) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenCreate?: () => void;
}

const COLOR_MAP: Record<StickyColor, { bg: string; border: string; tabBg: string; text: string }> = {
  red: { bg: '#FFE4E6', border: '#FDA4AF', tabBg: '#FB7185', text: '#881337' },
  orange: { bg: '#FFEDD5', border: '#FDBA74', tabBg: '#FB923C', text: '#7C2D12' },
  yellow: { bg: '#FEF9C3', border: '#FDE047', tabBg: '#FACC15', text: '#713F12' },
  green: { bg: '#DCFCE7', border: '#86EFAC', tabBg: '#4ADE80', text: '#14532D' },
  blue: { bg: '#DBEAFE', border: '#93C5FD', tabBg: '#60A5FA', text: '#1E3A8A' },
  purple: { bg: '#F3E8FF', border: '#D8B4FE', tabBg: '#C084FC', text: '#581C87' },
};

const STICKY_COLORS: StickyColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export const StickyNotesTray: React.FC<StickyNotesTrayProps> = ({
  notes,
  wordId,
  onSaveNote,
  onDeleteNote,
  onOpenCreate,
}) => {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const handleCreate = () => {
    setActiveNoteId(null);
    if (onOpenCreate) {
      onOpenCreate();
    } else {
      // Fallback create
      const newNote: StickyNote = {
        id: `sticky-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        wordId,
        color: 'yellow',
        createdAt: Date.now(),
      };
      onSaveNote(newNote);
    }
  };

  const visibleTabs = notes.slice(0, 3);
  const extraCount = notes.length - 3;

  return (
    <>
      {/* Right Edge Tabs (protruding outside the right border of the paper card) */}
      <div className="absolute right-0 top-12 z-20 flex flex-col gap-2.5 translate-x-[75%] items-start pointer-events-auto">
        {visibleTabs.map((note) => {
          const c = COLOR_MAP[note.color] || COLOR_MAP.yellow;
          const isActive = activeNoteId === note.id;

          return (
            <button
              key={note.id}
              onClick={() => {
                setActiveNoteId(isActive ? null : note.id);
              }}
              style={{ backgroundColor: c.tabBg }}
              className={`h-7 px-2.5 rounded-r-md text-[10px] font-bold text-white shadow-md transition-all active:scale-95 flex items-center gap-1 border-y border-r border-black/10 max-w-[90px] truncate ${
                isActive ? '-translate-x-1 shadow-lg ring-2 ring-[#2C2825]' : 'hover:-translate-x-0.5'
              }`}
              title={note.title || '付箋'}
            >
              <span className="truncate">{note.title || '付箋'}</span>
            </button>
          );
        })}

        {extraCount > 0 && (
          <button
            onClick={() => {
              setActiveNoteId(notes[3].id);
            }}
            className="h-6 px-2 rounded-r-md bg-[#8A8073] text-[10px] font-bold text-white shadow-xs flex items-center justify-center"
          >
            +{extraCount}
          </button>
        )}

        {/* Small + Add Sticky Tab */}
        <button
          onClick={handleCreate}
          className="h-7 w-7 rounded-r-md bg-[#2C2825] text-white text-xs font-bold shadow-md hover:bg-black active:scale-95 flex items-center justify-center border-y border-r border-black/15 transition-transform"
          title="付箋を貼る"
          aria-label="付箋を貼る"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      </div>

      {/* Expanded Sticky Note Detail (Tactile sticky card UI on the page) */}
      {activeNote && (
        <div className="relative z-30 mx-4 my-3 animate-in fade-in slide-in-from-right-4 duration-200">
          <div
            className="p-3.5 rounded-xl border shadow-md relative"
            style={{
              backgroundColor: COLOR_MAP[activeNote.color]?.bg || '#FEF9C3',
              borderColor: COLOR_MAP[activeNote.color]?.border || '#FDE047',
              color: COLOR_MAP[activeNote.color]?.text || '#713F12',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shadow-2xs"
                  style={{ backgroundColor: COLOR_MAP[activeNote.color]?.tabBg || '#FACC15' }}
                />
                <span className="text-xs font-bold">
                  {activeNote.title || '付箋'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDeletingNoteId(activeNote.id)}
                  className="p-1 rounded-md hover:bg-black/10 transition text-rose-700"
                  title="付箋を剥がす"
                  aria-label="付箋を剥がす"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveNoteId(null)}
                  className="p-1 rounded-md hover:bg-black/10 transition"
                  aria-label="閉じる"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Note body if present from imported/legacy data */}
            {activeNote.body && (
              <p className="text-xs leading-relaxed whitespace-pre-wrap mb-2 opacity-90">
                {activeNote.body}
              </p>
            )}

            {/* Color switcher: 6 swatches in 1 clean row with no text names */}
            <div className="pt-2 border-t border-black/10 flex items-center justify-between">
              <span className="text-[10px] font-bold opacity-75">色を変更:</span>
              <div className="flex items-center gap-1.5">
                {STICKY_COLORS.map((c) => {
                  const isSelected = activeNote.color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        onSaveNote({ ...activeNote, color: c });
                      }}
                      style={{ backgroundColor: COLOR_MAP[c].tabBg }}
                      className={`w-6 h-6 rounded-lg border border-black/10 flex items-center justify-center transition active:scale-90 shadow-2xs ${
                        isSelected
                          ? 'ring-2 ring-black/50 scale-110 shadow-xs'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                      aria-label={`付箋カラー ${c}`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white stroke-[3.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action: Peel off prompt */}
            <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] opacity-75">
              <span>貼付日: {new Date(activeNote.createdAt).toLocaleDateString('ja-JP')}</span>
              <button
                type="button"
                onClick={() => setDeletingNoteId(activeNote.id)}
                className="font-bold hover:underline flex items-center gap-0.5 text-rose-700"
              >
                付箋を剥がす
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation to peel off sticky note ("付箋を剥がす") */}
      <ConfirmModal
        isOpen={!!deletingNoteId}
        title="付箋を剥がしますか？"
        message="この単語から付箋を取り外します。"
        confirmLabel="付箋を剥がす"
        cancelLabel="キャンセル"
        isDestructive={true}
        onConfirm={() => {
          if (deletingNoteId) {
            onDeleteNote(deletingNoteId);
            setDeletingNoteId(null);
            setActiveNoteId(null);
          }
        }}
        onCancel={() => setDeletingNoteId(null)}
      />
    </>
  );
};

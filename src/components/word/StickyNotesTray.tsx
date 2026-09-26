import React, { useState } from 'react';
import { StickyNote, StickyColor } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { Plus, X, Trash2, Edit2, Check } from 'lucide-react';

interface StickyNotesTrayProps {
  notes: StickyNote[];
  wordId: string;
  onSaveNote: (note: StickyNote) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenCreate?: () => void;
}

const COLOR_MAP: Record<StickyColor, { bg: string; border: string; tabBg: string; text: string; name: string }> = {
  yellow: { bg: '#FEF9C3', border: '#FDE047', tabBg: '#FACC15', text: '#713F12', name: '黄色' },
  red: { bg: '#FFE4E6', border: '#FDA4AF', tabBg: '#FB7185', text: '#881337', name: '赤色' },
  orange: { bg: '#FFEDD5', border: '#FDBA74', tabBg: '#FB923C', text: '#7C2D12', name: '橙色' },
  green: { bg: '#DCFCE7', border: '#86EFAC', tabBg: '#4ADE80', text: '#14532D', name: '緑色' },
  blue: { bg: '#DBEAFE', border: '#93C5FD', tabBg: '#60A5FA', text: '#1E3A8A', name: '青色' },
  purple: { bg: '#F3E8FF', border: '#D8B4FE', tabBg: '#C084FC', text: '#581C87', name: '紫色' },
};

const STICKY_COLORS: StickyColor[] = ['yellow', 'red', 'orange', 'green', 'blue', 'purple'];

export const StickyNotesTray: React.FC<StickyNotesTrayProps> = ({
  notes,
  wordId,
  onSaveNote,
  onDeleteNote,
  onOpenCreate,
}) => {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Form states
  const [color, setColor] = useState<StickyColor>('yellow');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const startCreate = () => {
    setActiveNoteId(null);
    setEditingNote(null);
    setColor('yellow');
    setTitle('');
    setBody('');
    setIsCreating(true);
  };

  const startEdit = (note: StickyNote) => {
    setEditingNote(note);
    setColor(note.color);
    setTitle(note.title || '');
    setBody(note.body || '');
    setIsCreating(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !body.trim()) {
      setIsCreating(false);
      setEditingNote(null);
      return;
    }

    const noteToSave: StickyNote = {
      id: editingNote ? editingNote.id : `sticky-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      wordId,
      color,
      title: title.trim() || undefined,
      body: body.trim() || undefined,
      createdAt: editingNote ? editingNote.createdAt : Date.now(),
    };

    onSaveNote(noteToSave);
    setIsCreating(false);
    setEditingNote(null);
    setActiveNoteId(noteToSave.id);
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
                setIsCreating(false);
                setEditingNote(null);
                setActiveNoteId(isActive ? null : note.id);
              }}
              style={{ backgroundColor: c.tabBg }}
              className={`h-7 px-2.5 rounded-r-md text-[10px] font-bold text-white shadow-md transition-all active:scale-95 flex items-center gap-1 border-y border-r border-black/10 max-w-[90px] truncate ${
                isActive ? '-translate-x-1 shadow-lg' : 'hover:-translate-x-0.5'
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
              // Open first hidden or toggle
              setActiveNoteId(notes[3].id);
            }}
            className="h-6 px-2 rounded-r-md bg-[#8A8073] text-[10px] font-bold text-white shadow-xs flex items-center justify-center"
          >
            +{extraCount}
          </button>
        )}

        {/* Small + Add Sticky Tab */}
        <button
          onClick={() => {
            if (onOpenCreate) {
              onOpenCreate();
            } else {
              startCreate();
            }
          }}
          className="h-7 w-7 rounded-r-md bg-[#2C2825] text-white text-xs font-bold shadow-md hover:bg-black active:scale-95 flex items-center justify-center border-y border-r border-black/15 transition-transform"
          title="付箋を貼る"
          aria-label="付箋を貼る"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      </div>

      {/* Expanded Sticky Note ON THE PAGE (paper folded note aesthetic) */}
      {(activeNote || isCreating || editingNote) && (
        <div className="relative z-30 mx-4 my-3 animate-in fade-in slide-in-from-right-4 duration-200">
          {/* Note Form or Note View */}
          {isCreating || editingNote ? (
            /* Editing / Creating Sticky Note */
            <form
              onSubmit={handleSave}
              className="p-4 rounded-xl border shadow-md relative"
              style={{
                backgroundColor: COLOR_MAP[color].bg,
                borderColor: COLOR_MAP[color].border,
                color: COLOR_MAP[color].text,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wide">
                  {editingNote ? '付箋を編集' : '新しい付箋を貼る'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingNote(null);
                  }}
                  className="p-1 rounded-md hover:bg-black/10 transition"
                  aria-label="閉じる"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Color selector */}
              <div className="flex items-center gap-2 mb-3">
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border border-black/10 flex items-center justify-center transition active:scale-90 ${
                      color === c ? 'ring-2 ring-black/40 scale-105' : 'opacity-80'
                    }`}
                    style={{ backgroundColor: COLOR_MAP[c].tabBg }}
                    aria-label={COLOR_MAP[c].name}
                  >
                    {color === c && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>

              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="見出し（例: 連語、注意点）"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white/70 border border-black/10 text-xs font-semibold focus:outline-hidden focus:bg-white mb-2"
                autoFocus
              />

              {/* Body */}
              <textarea
                rows={2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="メモ内容を入力..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white/70 border border-black/10 text-xs focus:outline-hidden focus:bg-white resize-none"
              />

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingNote(null);
                  }}
                  className="px-3 py-1 text-xs font-medium rounded-lg hover:bg-black/10 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 text-xs font-bold rounded-lg text-white shadow-xs transition active:scale-95"
                  style={{ backgroundColor: COLOR_MAP[color].tabBg }}
                >
                  貼る
                </button>
              </div>
            </form>
          ) : activeNote ? (
            /* Viewing Sticky Note */
            <div
              className="p-4 rounded-xl border shadow-md relative"
              style={{
                backgroundColor: COLOR_MAP[activeNote.color].bg,
                borderColor: COLOR_MAP[activeNote.color].border,
                color: COLOR_MAP[activeNote.color].text,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLOR_MAP[activeNote.color].tabBg }}
                  />
                  {activeNote.title ? (
                    <h4 className="text-xs font-bold leading-tight">
                      {activeNote.title}
                    </h4>
                  ) : (
                    <span className="text-xs font-bold opacity-75">付箋</span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(activeNote)}
                    className="p-1 rounded-md hover:bg-black/10 transition"
                    title="編集"
                    aria-label="編集"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
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

              {/* Body */}
              {activeNote.body && (
                <p className="text-xs leading-relaxed whitespace-pre-wrap mt-1">
                  {activeNote.body}
                </p>
              )}

              {/* Color switcher */}
              <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between">
                <span className="text-[10px] font-bold opacity-75">色を変更:</span>
                <div className="flex items-center gap-1.5">
                  {STICKY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        onSaveNote({ ...activeNote, color: c });
                      }}
                      style={{ backgroundColor: COLOR_MAP[c].tabBg }}
                      className={`w-5 h-5 rounded-full border border-black/10 flex items-center justify-center transition active:scale-90 ${
                        activeNote.color === c ? 'ring-2 ring-black/40 scale-110 shadow-2xs' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={COLOR_MAP[c].name}
                      aria-label={COLOR_MAP[c].name}
                    >
                      {activeNote.color === c && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action: Peel off prompt */}
              <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] opacity-75">
                <span>貼付日: {new Date(activeNote.createdAt).toLocaleDateString('ja-JP')}</span>
                <button
                  type="button"
                  onClick={() => setDeletingNoteId(activeNote.id)}
                  className="font-medium hover:underline flex items-center gap-0.5 text-rose-700"
                >
                  付箋を剥がす
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Confirmation to peel off sticky note ("付箋を剥がす") */}
      <ConfirmModal
        isOpen={!!deletingNoteId}
        title="付箋を剥がしますか？"
        message="この単語から付箋を取り外します。剥がした付箋の内容は消去されます。"
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

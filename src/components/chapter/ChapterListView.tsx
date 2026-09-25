import React, { useState } from 'react';
import { Book, Chapter, Word } from '../../types';
import { ChapterModal } from './ChapterModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { ChevronLeft, Plus, MoreVertical, BookOpen, Layers, ArrowUpDown, ChevronRight } from 'lucide-react';

interface ChapterListViewProps {
  book: Book;
  chapters: Chapter[];
  words: Word[];
  onBack: () => void;
  onSelectChapter: (chapter: Chapter) => void;
  onSaveChapter: (chapterData: { id?: string; title: string; description?: string }) => void;
  onDeleteChapter: (chapterId: string) => void;
  onDuplicateChapter: (chapter: Chapter) => void;
  onReorderChapters: (reorderedChapters: Chapter[]) => void;
}

export const ChapterListView: React.FC<ChapterListViewProps> = ({
  book,
  chapters,
  words,
  onBack,
  onSelectChapter,
  onSaveChapter,
  onDeleteChapter,
  onDuplicateChapter,
  onReorderChapters,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  const getWordCount = (chapterId: string) => {
    return words.filter((w) => w.chapterId === chapterId).length;
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    const newChapters = [...chapters];
    const temp = newChapters[index];
    newChapters[index] = newChapters[targetIndex];
    newChapters[targetIndex] = temp;

    const updated = newChapters.map((c, idx) => ({ ...c, order: idx }));
    onReorderChapters(updated);
  };

  return (
    <div className="pb-safe-nav">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#F5F2EA]/95 backdrop-blur-md border-b border-[#E6E0CF] px-4 py-3 pt-safe">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 -ml-1 text-[#524A42] hover:text-[#2C2825] rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="本棚に戻る"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="overflow-hidden">
              <h1 className="text-base font-bold tracking-tight text-[#2C2825] truncate max-w-[190px]">
                {book.title}
              </h1>
              <div className="text-[10px] text-[#8C8275] tracking-wide">
                Chapter一覧
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {chapters.length > 1 && (
              <button
                onClick={() => setReorderMode(!reorderMode)}
                className={`p-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                  reorderMode
                    ? 'bg-[#2C2825] text-white'
                    : 'text-[#6B6257] hover:bg-[#EAE3D2]'
                }`}
                title="並び替え"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{reorderMode ? '完了' : '並び替え'}</span>
              </button>
            )}

            <button
              onClick={() => {
                setEditingChapter(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2C2825] text-white text-xs font-medium hover:bg-black transition active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Chapter追加
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-4">
        {/* Book summary banner */}
        <div
          className="rounded-2xl p-4 text-white shadow-xs mb-4 flex items-center justify-between"
          style={{ backgroundColor: book.coverColor || '#2D4A3E' }}
        >
          <div>
            <div className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">
              BOOK
            </div>
            <div className="text-lg font-bold mt-0.5 leading-snug">{book.title}</div>
            {book.subtitle && (
              <div className="text-xs text-white/80 mt-0.5 line-clamp-1">
                {book.subtitle}
              </div>
            )}
          </div>
          <div className="text-right shrink-0 pl-3">
            <div className="text-xl font-bold">{chapters.length}</div>
            <div className="text-[10px] text-white/70">Chapters</div>
          </div>
        </div>

        {/* Chapter List */}
        {chapters.length > 0 ? (
          <div className="space-y-3">
            {chapters.map((chapter, index) => {
              const wordCount = getWordCount(chapter.id);
              const chapterNum = String(index + 1).padStart(2, '0');

              return (
                <div
                  key={chapter.id}
                  className="relative rounded-2xl bg-[#FFFDF8] border border-[#E8E2D2] p-4 shadow-xs transition hover:border-[#D6CEBC]"
                >
                  <div className="flex items-center justify-between">
                    {/* Chapter Info (clickable to view words) */}
                    <div
                      onClick={() => !reorderMode && onSelectChapter(chapter)}
                      className="flex-1 cursor-pointer pr-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#E11D48] tracking-wider">
                          CH.{chapterNum}
                        </span>
                        <span className="text-[11px] text-[#8C8275]">·</span>
                        <span className="text-xs font-medium text-[#7A7167]">
                          {wordCount} 語
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#2C2825] mt-1 leading-snug">
                        {chapter.title}
                      </h3>
                      {chapter.description && (
                        <p className="text-xs text-[#7A7167] mt-1 line-clamp-2 leading-relaxed">
                          {chapter.description}
                        </p>
                      )}
                    </div>

                    {/* Right Action Affordance */}
                    <div className="flex items-center gap-1 shrink-0">
                      {reorderMode ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(index, 'up')}
                            className="p-1.5 rounded-lg border border-[#DDD6C5] disabled:opacity-30 hover:bg-[#F4EFE6] text-xs font-bold"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={index === chapters.length - 1}
                            onClick={() => handleMove(index, 'down')}
                            className="p-1.5 rounded-lg border border-[#DDD6C5] disabled:opacity-30 hover:bg-[#F4EFE6] text-xs font-bold"
                          >
                            ▼
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === chapter.id ? null : chapter.id);
                            }}
                            className="p-2 text-[#9E9487] hover:text-[#2C2825] rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                            aria-label="Chapter操作"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectChapter(chapter)}
                            className="p-2 text-[#9E9487] hover:text-[#2C2825] rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                            aria-label="単語を開く"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Context Menu */}
                  {activeMenuId === chapter.id && (
                    <div
                      className="absolute right-4 top-12 z-50 w-40 rounded-xl bg-[#FFFDF8] border border-[#E6E0CF] py-1.5 shadow-xl text-xs text-[#2C2825] animate-in fade-in zoom-in-95 duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          setEditingChapter(chapter);
                          setModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#F5EFE3] flex items-center gap-2 font-medium"
                      >
                        ✏️ 名前・説明を変更
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenuId(null);
                          onDuplicateChapter(chapter);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#F5EFE3] flex items-center gap-2 font-medium"
                      >
                        📋 Chapterを複製
                      </button>
                      <div className="border-t border-[#EAE3D2] my-1 pt-1">
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            setDeletingChapter(chapter);
                          }}
                          className="w-full px-3 py-2 text-left text-[#E11D48] hover:bg-rose-50 flex items-center gap-2 font-medium"
                        >
                          🗑️ Chapterを削除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Chapter State */
          <div className="py-12 px-6 rounded-2xl bg-[#FFFDF8] border border-[#E8E2D2] text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#F4EFE6] text-[#786F64] flex items-center justify-center mx-auto mb-3">
              <Layers className="w-7 h-7 stroke-[1.8]" />
            </div>
            <h3 className="text-base font-bold text-[#2C2825]">Chapterがありません</h3>
            <p className="text-xs text-[#7A7167] mt-1.5 leading-relaxed max-w-xs mx-auto">
              Chapterを作成して、単語を分類・整理しましょう。
            </p>
            <button
              onClick={() => {
                setEditingChapter(null);
                setModalOpen(true);
              }}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2C2825] text-white text-xs font-medium hover:bg-black transition active:scale-95 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              最初のChapterを作る
            </button>
          </div>
        )}
      </main>

      {/* Chapter Create/Edit Modal */}
      <ChapterModal
        isOpen={modalOpen}
        chapterToEdit={editingChapter}
        onClose={() => {
          setModalOpen(false);
          setEditingChapter(null);
        }}
        onSave={(data) => {
          onSaveChapter({
            id: editingChapter ? editingChapter.id : undefined,
            ...data,
          });
        }}
      />

      {/* Chapter Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingChapter}
        title="Chapterを削除しますか？"
        message={`「${deletingChapter?.title}」を削除します。\n含まれるすべての単語データも一緒に削除されます。この操作は取り消せません。`}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        isDestructive={true}
        onConfirm={() => {
          if (deletingChapter) {
            onDeleteChapter(deletingChapter.id);
            setDeletingChapter(null);
          }
        }}
        onCancel={() => setDeletingChapter(null)}
      />
    </div>
  );
};

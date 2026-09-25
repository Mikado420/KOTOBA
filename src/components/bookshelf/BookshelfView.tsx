import React, { useState } from 'react';
import { Book, Chapter, Word } from '../../types';
import { BookItem } from './BookCover';
import { BookModal } from './BookModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { PWAInstallBanner } from '../pwa/PWAInstallBanner';
import { Plus, BookOpen, Sparkles } from 'lucide-react';

interface BookshelfViewProps {
  books: Book[];
  chapters: Chapter[];
  words: Word[];
  onOpenBook: (book: Book) => void;
  onSaveBook: (bookData: { id?: string; title: string; subtitle?: string; coverColor: string }) => void;
  onDeleteBook: (bookId: string) => void;
  onDuplicateBook: (book: Book) => void;
  onExportBook: (book: Book) => void;
  onReorderBooks: (reorderedBooks: Book[]) => void;
}

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  books,
  chapters,
  words,
  onOpenBook,
  onSaveBook,
  onDeleteBook,
  onDuplicateBook,
  onExportBook,
  onReorderBooks,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);

  const getChapterCount = (bookId: string) => {
    return chapters.filter((c) => c.bookId === bookId).length;
  };

  const getWordCount = (bookId: string) => {
    const bookChapterIds = new Set(chapters.filter((c) => c.bookId === bookId).map((c) => c.id));
    return words.filter((w) => bookChapterIds.has(w.chapterId)).length;
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= books.length) return;

    const newBooks = [...books];
    const temp = newBooks[index];
    newBooks[index] = newBooks[targetIndex];
    newBooks[targetIndex] = temp;

    // re-assign orders
    const updated = newBooks.map((b, idx) => ({ ...b, order: idx }));
    onReorderBooks(updated);
  };

  return (
    <div className="pb-safe-nav">
      {/* Top App Bar with tactile brand styling */}
      <header className="sticky top-0 z-30 bg-[#F5F2EA]/95 backdrop-blur-md border-b border-[#E6E0CF] px-4 py-3 pt-safe">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
            <h1 className="text-lg font-bold tracking-tight text-[#2C2825]">
              KOTOBA <span className="text-xs font-normal text-[#8A8073] ml-1">本棚</span>
            </h1>
          </div>
          <button
            onClick={() => {
              setEditingBook(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2C2825] text-white text-xs font-medium hover:bg-black transition active:scale-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            本を追加
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-4 py-4">
        {/* PWA In-App Install prompt */}
        <PWAInstallBanner />

        {/* Bookshelf Section Header */}
        <div className="mb-4 flex items-center justify-between px-1">
          <div>
            <div className="text-xs font-medium text-[#7D7366]">登録中の単語帳</div>
            <div className="text-sm font-bold text-[#2C2825] mt-0.5">
              {books.length} 冊の単語帳
            </div>
          </div>
        </div>

        {/* Books List (1 book per row, physical book aesthetic) */}
        {books.length > 0 ? (
          <div className="space-y-4">
            {books.map((book, index) => (
              <BookItem
                key={book.id}
                book={book}
                chapterCount={getChapterCount(book.id)}
                wordCount={getWordCount(book.id)}
                onOpen={onOpenBook}
                onEdit={(b) => {
                  setEditingBook(b);
                  setModalOpen(true);
                }}
                onDuplicate={onDuplicateBook}
                onExport={onExportBook}
                onDelete={(b) => setDeletingBook(b)}
                onMoveUp={() => handleMove(index, 'up')}
                onMoveDown={() => handleMove(index, 'down')}
                isFirst={index === 0}
                isLast={index === books.length - 1}
              />
            ))}
          </div>
        ) : (
          /* Empty Bookshelf State */
          <div className="py-12 px-6 rounded-2xl bg-[#FFFDF8] border border-[#E8E2D2] text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#F4EFE6] text-[#786F64] flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-7 h-7 stroke-[1.8]" />
            </div>
            <h3 className="text-base font-bold text-[#2C2825]">本棚が空です</h3>
            <p className="text-xs text-[#7A7167] mt-1.5 leading-relaxed max-w-xs mx-auto">
              自分だけのオリジナルの単語帳を作成して、毎日の学習を始めましょう。
            </p>
            <button
              onClick={() => {
                setEditingBook(null);
                setModalOpen(true);
              }}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2C2825] text-white text-xs font-medium hover:bg-black transition active:scale-95 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              最初の単語帳を作る
            </button>
          </div>
        )}
      </main>

      {/* Book Create / Edit Modal */}
      <BookModal
        isOpen={modalOpen}
        bookToEdit={editingBook}
        onClose={() => {
          setModalOpen(false);
          setEditingBook(null);
        }}
        onSave={(data) => {
          onSaveBook({
            id: editingBook ? editingBook.id : undefined,
            ...data,
          });
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingBook}
        title="単語帳を削除しますか？"
        message={`「${deletingBook?.title}」を削除します。\n含まれるChapterとすべての単語データも完全に削除されます。この操作は取り消せません。`}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        isDestructive={true}
        onConfirm={() => {
          if (deletingBook) {
            onDeleteBook(deletingBook.id);
            setDeletingBook(null);
          }
        }}
        onCancel={() => setDeletingBook(null)}
      />
    </div>
  );
};

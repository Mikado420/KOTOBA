import React from 'react';
import { Book } from '../../types';
import { Bookmark, MoreVertical, BookOpen, Layers } from 'lucide-react';

interface BookItemProps {
  book: Book;
  chapterCount: number;
  wordCount: number;
  onOpen: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDuplicate: (book: Book) => void;
  onExport: (book: Book) => void;
  onDelete: (book: Book) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export const BookItem: React.FC<BookItemProps> = ({
  book,
  chapterCount,
  wordCount,
  onOpen,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="relative group">
      {/* Book Container - realistic book spine + cover format spanning width */}
      <div
        onClick={() => onOpen(book)}
        className="w-full relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.985] text-left shadow-md hover:shadow-lg border border-black/10 flex"
        style={{ backgroundColor: book.coverColor || '#2D4A3E' }}
      >
        {/* Book spine on left */}
        <div className="w-6 shrink-0 relative bg-black/25 flex flex-col items-center justify-between py-4 border-r border-white/10">
          {/* Spine ribs/bands */}
          <div className="w-full h-1 bg-white/20 shadow-xs" />
          <div className="w-full h-1 bg-white/20 shadow-xs" />
          <div className="w-full h-1 bg-white/20 shadow-xs" />
        </div>

        {/* Book front face */}
        <div className="flex-1 p-5 text-white flex flex-col justify-between min-h-[148px] relative">
          {/* Subtle gold/foil accent line */}
          <div className="absolute top-2 right-4 bottom-2 left-2 border border-white/15 rounded-xl pointer-events-none" />

          {/* Book Header: Subtitle & Ribbon */}
          <div className="flex items-start justify-between relative z-10">
            <div>
              {book.subtitle ? (
                <div className="text-[11px] font-medium tracking-wide text-white/75 truncate max-w-[220px]">
                  {book.subtitle}
                </div>
              ) : (
                <div className="text-[10px] font-bold tracking-widest text-white/50 uppercase">
                  KOTOBA WORDBOOK
                </div>
              )}
              <h3 className="text-xl font-bold tracking-tight text-white mt-1 leading-snug break-words">
                {book.title}
              </h3>
            </div>

            {/* Bookmark ribbon indicator */}
            <div className="text-amber-300 drop-shadow-xs -mr-1">
              <Bookmark className="w-5 h-5 fill-amber-300 stroke-amber-400" />
            </div>
          </div>

          {/* Book Footer: Metrics & Action trigger */}
          <div className="flex items-end justify-between mt-4 relative z-10 pt-2 border-t border-white/15">
            <div className="flex items-center gap-3 text-xs text-white/80 font-medium">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 opacity-80" />
                {chapterCount}章
              </span>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 opacity-80" />
                {wordCount} 語
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Menu trigger button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 flex items-center justify-center text-white transition min-h-[44px] min-w-[44px] -m-2"
                aria-label="操作メニュー"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Paper pages edge visible on right side */}
        <div className="w-2.5 shrink-0 bg-[#F4EFE6] border-l border-[#D6CBB8] flex flex-col justify-around py-2">
          <div className="w-full h-0.5 bg-[#DDD4C3]" />
          <div className="w-full h-0.5 bg-[#DDD4C3]" />
          <div className="w-full h-0.5 bg-[#DDD4C3]" />
        </div>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-4 bottom-3 z-50 w-44 rounded-xl bg-[#FFFDF8] border border-[#E6E0CF] py-1.5 shadow-xl text-xs text-[#2C2825] animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              onEdit(book);
            }}
            className="w-full px-3 py-2 text-left hover:bg-[#F5EFE3] flex items-center gap-2 font-medium"
          >
            ✏️ 本の情報を編集
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              onDuplicate(book);
            }}
            className="w-full px-3 py-2 text-left hover:bg-[#F5EFE3] flex items-center gap-2 font-medium"
          >
            📋 本を複製
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              onExport(book);
            }}
            className="w-full px-3 py-2 text-left hover:bg-[#F5EFE3] flex items-center gap-2 font-medium"
          >
            📤 この本をエクスポート
          </button>

          {(onMoveUp || onMoveDown) && (
            <div className="border-t border-[#EAE3D2] my-1 pt-1">
              {onMoveUp && !isFirst && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onMoveUp();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#F5EFE3] flex items-center gap-2"
                >
                  ⬆ 上へ移動
                </button>
              )}
              {onMoveDown && !isLast && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onMoveDown();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#F5EFE3] flex items-center gap-2"
                >
                  ⬇ 下へ移動
                </button>
              )}
            </div>
          )}

          <div className="border-t border-[#EAE3D2] my-1 pt-1">
            <button
              onClick={() => {
                setMenuOpen(false);
                onDelete(book);
              }}
              className="w-full px-3 py-2 text-left text-[#E11D48] hover:bg-rose-50 flex items-center gap-2 font-medium"
            >
              🗑️ 本を削除
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

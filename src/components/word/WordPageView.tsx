import React, { useState, useEffect, useRef } from 'react';
import { Word, Chapter, StickyNote, AppSettings, RedSheetRange } from '../../types';
import { StickyNotesTray } from './StickyNotesTray';
import { WordEditModal } from './WordEditModal';
import {
  ChevronLeft,
  Star,
  Edit3,
  StickyNote as StickyIcon,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  MoveVertical,
  Sliders,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface WordPageViewProps {
  chapter: Chapter;
  chapters: Chapter[];
  words: Word[];
  initialWordIndex?: number;
  stickyNotes: StickyNote[];
  settings: AppSettings;
  onBack: () => void;
  onSaveWord: (wordData: Partial<Word>) => void;
  onDeleteWord: (wordId: string) => void;
  onSaveStickyNote: (note: StickyNote) => void;
  onDeleteStickyNote: (noteId: string) => void;
  onToggleFavorite: (wordId: string, current: boolean) => void;
}

export const WordPageView: React.FC<WordPageViewProps> = ({
  chapter,
  chapters,
  words,
  initialWordIndex = 0,
  stickyNotes,
  settings,
  onBack,
  onSaveWord,
  onDeleteWord,
  onSaveStickyNote,
  onDeleteStickyNote,
  onToggleFavorite,
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(0, initialWordIndex), Math.max(0, words.length - 1))
  );

  // Red sheet state
  const [redSheetActive, setRedSheetActive] = useState(false);
  // Red sheet vertical offset: 0% (top, fully covered) to 90% (dragged down)
  const [redSheetOffsetPercent, setRedSheetOffsetPercent] = useState(0);
  const [isPeeking, setIsPeeking] = useState(false);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  // Edit modal
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Jump to word dialog
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpTargetInput, setJumpTargetInput] = useState('');

  // Page animation direction
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Touch handling refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const sheetDragStartRef = useRef<{ startY: number; startPercent: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentWord = words[currentIndex] || null;
  const currentWordNotes = currentWord
    ? stickyNotes.filter((n) => n.wordId === currentWord.id)
    : [];

  // Chapter number calculation (e.g. Chapter 01)
  const chapterIndex = chapters.findIndex((c) => c.id === chapter.id);
  const chapterNumLabel = chapterIndex >= 0 ? `Chapter ${String(chapterIndex + 1).padStart(2, '0')}` : 'Chapter';

  // Reset index if words change
  useEffect(() => {
    if (currentIndex >= words.length && words.length > 0) {
      setCurrentIndex(words.length - 1);
    }
  }, [words.length]);

  // Keyboard navigation for testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing || isAdding || jumpOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrev();
      } else if (e.key.toLowerCase() === 'r') {
        setRedSheetActive((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, words.length, isEditing, isAdding, jumpOpen]);

  const goToNext = () => {
    if (currentIndex < words.length - 1) {
      setSwipeDirection('left');
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setSwipeDirection(null);
      }, settings.pageAnimation === 'none' ? 0 : 150);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setSwipeDirection('right');
      setTimeout(() => {
        setCurrentIndex((i) => i - 1);
        setSwipeDirection(null);
      }, settings.pageAnimation === 'none' ? 0 : 150);
    }
  };

  // Touch Swipe on word card (DISABLED while dragging red sheet or touching inside sheet)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDraggingSheet) return;
    const target = e.target as HTMLElement;
    if (target.closest('.red-sheet-drag-area')) return;

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDraggingSheet || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Distinguish horizontal swipe from vertical scroll
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 44) {
      if (dx < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  // Jump to word
  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(jumpTargetInput, 10);
    if (!isNaN(num) && num >= 1 && num <= words.length) {
      setCurrentIndex(num - 1);
      setJumpOpen(false);
    }
  };

  // Robust Red Sheet Vertical Dragging via Pointer Events + Pointer Capture
  const handleSheetPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle primary pointer (left click or first touch finger)
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setIsDraggingSheet(true);
    sheetDragStartRef.current = {
      startY: e.clientY,
      startPercent: redSheetOffsetPercent,
    };
  };

  const handleSheetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sheetDragStartRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const deltaY = e.clientY - sheetDragStartRef.current.startY;
    const containerHeight = cardRef.current?.clientHeight || 450;
    const deltaPercent = (deltaY / containerHeight) * 100;
    const nextPercent = Math.min(Math.max(0, sheetDragStartRef.current.startPercent + deltaPercent), 90);
    setRedSheetOffsetPercent(nextPercent);
  };

  const handleSheetPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (sheetDragStartRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      sheetDragStartRef.current = null;
    }
    setIsDraggingSheet(false);
  };

  // Text masking with Red Sheet:
  // When Red Sheet is active (and not peeked), sections marked in redSheetRanges are masked
  // (rendered with red ink matching the translucent sheet so they blend in and disappear!)
  const renderMaskedText = (
    field: 'word' | 'meaning' | 'example',
    text: string,
    mIdx?: number,
    eIdx?: number,
    eField?: 'text' | 'translation'
  ) => {
    if (!currentWord) return text;

    const relevantRanges = (currentWord.redSheetRanges || []).filter(
      (r) =>
        r.field === field &&
        r.meaningIndex === mIdx &&
        r.exampleIndex === eIdx &&
        (field !== 'example' || r.exampleField === eField)
    );

    if (relevantRanges.length === 0) {
      return <span>{text}</span>;
    }

    const isHidden = redSheetActive && !isPeeking && redSheetOffsetPercent < 60;

    return (
      <span className="leading-relaxed">
        {text.split('').map((char, idx) => {
          const isCovered = relevantRanges.some((r) => idx >= r.start && idx < r.end);

          if (!isCovered) {
            return <span key={idx}>{char}</span>;
          }

          if (isHidden) {
            // When covered by Red Sheet:
            // Rendered in matching pure red on a solid red bar, so looking through the red sheet makes it disappear!
            return (
              <span
                key={idx}
                className="bg-[#E11D48] text-[#E11D48] select-none rounded-xs px-0.5 transition-colors"
                title="赤シートで隠れています"
              >
                {char}
              </span>
            );
          }

          // When Red Sheet is OFF:
          return (
            <span
              key={idx}
              className="text-[#E11D48] font-semibold border-b border-dashed border-[#E11D48]/50 px-0.5"
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  };

  // Font size multiplier
  const fontSizeClass = {
    sm: 'text-2xl sm:text-3xl',
    md: 'text-3xl sm:text-4xl',
    lg: 'text-4xl sm:text-5xl',
  }[settings.fontSize || 'md'];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F5F2EA] text-[#2C2825] select-none pb-safe">
      {/* 1. Top Bar */}
      <header className="sticky top-0 z-30 bg-[#F5F2EA]/95 backdrop-blur-md border-b border-[#E6E0CF] px-3 py-2 pt-safe">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Back button */}
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-[#524A42] hover:text-[#2C2825] rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
            aria-label="Chapter一覧に戻る"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Chapter Title & Number (Priority hierarchy) */}
          <div className="text-center overflow-hidden px-2 flex-1 min-w-0">
            <div className="text-[10px] font-bold text-[#E11D48] tracking-widest uppercase">
              {chapterNumLabel}
            </div>
            <h1 className="text-xs sm:text-sm font-bold text-[#2C2825] truncate">
              {chapter.title}
            </h1>
          </div>

          {/* Current Position (e.g. 12 / 120) - tap to jump */}
          {words.length > 0 && settings.showPageNumber && (
            <button
              onClick={() => {
                setJumpTargetInput(String(currentIndex + 1));
                setJumpOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#EAE3D2]/80 hover:bg-[#DDD4C1] text-xs font-bold text-[#2C2825] transition active:scale-95 shrink-0 min-h-[36px]"
              title="単語番号を指定してジャンプ"
              aria-label="ページジャンプ"
            >
              <span className="font-mono text-xs text-[#2C2825]">{currentIndex + 1}</span>
              <span className="text-[#9E9487] font-normal">/</span>
              <span className="font-mono text-xs text-[#7A7167]">{words.length}</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Center Word Card (Paper vocabulary sheet) */}
      <main
        className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {words.length > 0 && currentWord ? (
          <div className="relative w-full">
            {/* Real Ring Binder Left Holes (visual tactile paper wordbook) */}
            <div className="absolute -left-2 top-8 bottom-8 w-4 flex flex-col justify-around z-20 pointer-events-none">
              <div className="w-3.5 h-3.5 rounded-full bg-[#E5DEC9] border border-[#CFC3A7] shadow-inner" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#E5DEC9] border border-[#CFC3A7] shadow-inner" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#E5DEC9] border border-[#CFC3A7] shadow-inner" />
            </div>

            {/* Paper Card Main Container */}
            <div
              ref={cardRef}
              className={`w-full min-h-[440px] max-h-[70vh] rounded-3xl bg-[#FFFDF8] border border-[#E5DEC9] p-6 shadow-md flex flex-col justify-between relative transition-transform duration-150 ${
                isDraggingSheet ? 'overflow-hidden touch-none' : 'overflow-y-auto'
              } ${
                swipeDirection === 'left'
                  ? '-translate-x-4 opacity-70'
                  : swipeDirection === 'right'
                  ? 'translate-x-4 opacity-70'
                  : 'translate-x-0 opacity-100'
              } ${settings.paperTexture ? 'paper-card-ruled' : ''}`}
            >
              {/* Card Content Top to Bottom */}
              <div>
                {/* 1. Metadata Header: Part of speech + Pronunciation + Favorite */}
                <div className="flex items-center justify-between text-xs pb-3 border-b border-[#EFE8D8]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentWord.partOfSpeech && (
                      <span className="text-[11px] font-semibold text-[#6B6257] bg-[#F2ECE1] px-2 py-0.5 rounded-md">
                        {currentWord.partOfSpeech}
                      </span>
                    )}
                    {currentWord.pronunciation && (
                      <span className="font-mono text-xs text-[#8C8275] tracking-wide">
                        {currentWord.pronunciation}
                      </span>
                    )}
                  </div>

                  {currentWord.favorite && (
                    <span className="text-amber-500 flex items-center gap-0.5 text-xs font-bold shrink-0">
                      <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                    </span>
                  )}
                </div>

                {/* 2. English Word (Dominant Focal Point) */}
                <div className="py-5 my-1">
                  <h2
                    className={`${fontSizeClass} font-black tracking-tight text-[#1F1C1A] font-serif leading-tight break-words`}
                  >
                    {renderMaskedText('word', currentWord.word)}
                  </h2>
                </div>

                {/* 3. Meanings (Clear Numerical Hierarchy) */}
                {currentWord.meanings && currentWord.meanings.length > 0 && (
                  <div className="space-y-2 py-1">
                    {currentWord.meanings.map((meaning, idx) => (
                      <div
                        key={idx}
                        className="text-[15px] sm:text-base text-[#2C2825] font-bold leading-relaxed flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-md bg-[#F2EDE2] text-[#7A7167] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          {renderMaskedText('meaning', meaning, idx)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Examples (Subordinate Visual Tier) */}
                {currentWord.examples && currentWord.examples.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-[#EFE8D8]">
                    <div className="text-[10px] font-bold text-[#9E9487] tracking-wider uppercase mb-2.5">
                      例文
                    </div>
                    <div className="space-y-3">
                      {currentWord.examples.map((ex, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="text-xs sm:text-[13px] text-[#2C2825] font-medium leading-relaxed">
                            {renderMaskedText('example', ex.text, undefined, idx, 'text')}
                          </div>
                          {ex.translation && (
                            <div className="text-[11px] sm:text-xs text-[#7A7167] leading-relaxed pl-2.5 border-l-2 border-[#E5DEC9]">
                              {renderMaskedText(
                                'example',
                                ex.translation,
                                undefined,
                                idx,
                                'translation'
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Memo (Personal Handwritten Annotation Feel) */}
                {currentWord.memo && (
                  <div className="mt-4 pt-3 border-t border-[#EFE8D8]">
                    <div className="bg-[#FAF5EC] border border-[#EBE3D3] rounded-xl p-3 text-xs text-[#524A42] leading-relaxed">
                      <div className="text-[10px] font-bold text-[#8C8275] tracking-wide mb-1 flex items-center gap-1">
                        <span>✏️ メモ</span>
                      </div>
                      <div>{currentWord.memo}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Subtle Swipe Hint */}
              <div className="pt-4 flex items-center justify-between text-[11px] text-[#A69C8E]">
                <span>{currentIndex > 0 ? '← 右スワイプで前へ' : ''}</span>
                <span>{currentIndex < words.length - 1 ? '左スワイプで次へ →' : ''}</span>
              </div>
            </div>

            {/* Sticky Notes Tray attached to right edge */}
            {settings.showStickyNotes && (
              <StickyNotesTray
                notes={currentWordNotes}
                wordId={currentWord.id}
                onSaveNote={onSaveStickyNote}
                onDeleteNote={onDeleteStickyNote}
              />
            )}

            {/* Red Sheet Draggable Translucent Plastic Overlay */}
            {redSheetActive && (
              <div
                className="red-sheet-drag-area absolute inset-0 z-30 rounded-3xl overflow-hidden pointer-events-auto transition-transform duration-75 flex flex-col touch-none select-none"
                style={{
                  transform: `translateY(${redSheetOffsetPercent}%)`,
                  backgroundColor: 'rgba(225, 29, 72, 0.82)',
                  boxShadow: '0 8px 30px rgba(190, 18, 60, 0.35)',
                  touchAction: 'none',
                }}
              >
                {/* Red sheet top drag bar / handle */}
                <div
                  className="bg-[#BE123C] text-white px-4 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-white/20 select-none shadow-xs touch-none"
                  style={{ touchAction: 'none' }}
                  onPointerDown={handleSheetPointerDown}
                  onPointerMove={handleSheetPointerMove}
                  onPointerUp={handleSheetPointerUp}
                  onPointerCancel={handleSheetPointerUp}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-white/90" />
                    <span className="text-xs font-bold tracking-wide text-white">
                      赤シート
                    </span>
                  </div>

                  {/* Tactile Grab Indicator Bar in Center */}
                  <div className="flex items-center gap-1 px-3 py-1">
                    <div className="w-10 h-1.5 rounded-full bg-white/60" />
                    {isDraggingSheet && (
                      <span className="text-[10px] text-white/90 font-medium ml-1 animate-pulse">
                        ↕ 移動中
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Minimal Peek Button */}
                    <button
                      type="button"
                      onMouseDown={() => setIsPeeking(true)}
                      onMouseUp={() => setIsPeeking(false)}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setIsPeeking(true);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        setIsPeeking(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white transition active:scale-95 min-h-[32px] flex items-center"
                    >
                      {isPeeking ? '透かし中' : '透かす'}
                    </button>

                    {/* Quick pull down / reset */}
                    <button
                      type="button"
                      onClick={() =>
                        setRedSheetOffsetPercent(redSheetOffsetPercent > 30 ? 0 : 75)
                      }
                      className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white transition active:scale-95 min-h-[32px]"
                      title={redSheetOffsetPercent > 30 ? '戻す' : '下げる'}
                    >
                      {redSheetOffsetPercent > 30 ? '全戻し' : '下げる'}
                    </button>
                  </div>
                </div>

                {/* Translucent body (Clean, no distracting center watermark) */}
                <div
                  className="flex-1 touch-none"
                  style={{ touchAction: 'none' }}
                  onPointerDown={handleSheetPointerDown}
                  onPointerMove={handleSheetPointerMove}
                  onPointerUp={handleSheetPointerUp}
                  onPointerCancel={handleSheetPointerUp}
                />
              </div>
            )}
          </div>
        ) : (
          /* Empty Chapter Words State */
          <div className="w-full min-h-[380px] rounded-3xl bg-[#FFFDF8] border border-[#E5DEC9] p-8 shadow-md flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F0E6] text-[#7A7167] flex items-center justify-center mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#2C2825]">
              このChapterにはまだ単語がありません
            </h3>
            <p className="text-xs text-[#7A7167] mt-1.5 leading-relaxed max-w-xs">
              下の「+ 単語を追加」から、最初の単語を登録してみましょう。
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2C2825] text-white text-xs font-bold hover:bg-black transition active:scale-95 shadow-xs"
            >
              + 単語を追加
            </button>
          </div>
        )}
      </main>

      {/* 3. Bottom Toolbar (Refined, quiet, perfectly proportioned for mobile) */}
      <footer className="sticky bottom-0 z-30 bg-[#FAF7F0]/95 backdrop-blur-md border-t border-[#E8E2D2] px-4 py-2 pb-safe">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center gap-1">
          {/* 🟥 赤シート */}
          <button
            onClick={() => {
              setRedSheetActive(!redSheetActive);
              setRedSheetOffsetPercent(0);
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition min-h-[48px] active:scale-95 ${
              redSheetActive
                ? 'text-[#E11D48] font-bold'
                : 'text-[#6B6257] hover:bg-[#F2ECE1]/60'
            }`}
            aria-label="赤シート切替"
          >
            <div
              className={`w-6 h-5 rounded-md flex items-center justify-center text-[10px] font-bold border transition ${
                redSheetActive
                  ? 'bg-[#E11D48] text-white border-[#BE123C] shadow-xs'
                  : 'bg-rose-50 text-[#E11D48] border-rose-200'
              }`}
            >
              赤
            </div>
            <span className="text-[10px] tracking-tight mt-1 font-medium">
              {redSheetActive ? '赤シート中' : '赤シート'}
            </span>
          </button>

          {/* 🟨 付箋 */}
          <button
            onClick={() => {
              if (currentWord) {
                const sampleNewNote: StickyNote = {
                  id: `sticky-${Date.now()}`,
                  wordId: currentWord.id,
                  color: 'yellow',
                  title: '',
                  body: '',
                  createdAt: Date.now(),
                };
                onSaveStickyNote(sampleNewNote);
              }
            }}
            disabled={!currentWord}
            className="flex flex-col items-center justify-center py-1 rounded-xl text-[#6B6257] hover:bg-[#F2ECE1]/60 transition min-h-[48px] disabled:opacity-30 active:scale-95"
            aria-label="付箋を貼る"
          >
            <div className="relative">
              <StickyIcon className="w-5 h-5 text-amber-500 fill-amber-100 stroke-[1.8]" />
              {currentWordNotes.length > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {currentWordNotes.length}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-1 font-medium">
              付箋
            </span>
          </button>

          {/* ☆ / ★ お気に入り */}
          <button
            onClick={() => {
              if (currentWord) {
                onToggleFavorite(currentWord.id, !currentWord.favorite);
              }
            }}
            disabled={!currentWord}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition min-h-[48px] disabled:opacity-30 active:scale-95 ${
              currentWord?.favorite
                ? 'text-amber-500 font-bold'
                : 'text-[#6B6257] hover:bg-[#F2ECE1]/60'
            }`}
            aria-label="お気に入り切替"
          >
            <Star
              className={`w-5 h-5 ${
                currentWord?.favorite ? 'fill-amber-400 stroke-amber-500' : 'text-[#7A7167] stroke-[1.8]'
              }`}
            />
            <span className="text-[10px] tracking-tight mt-1 font-medium">
              お気に入り
            </span>
          </button>

          {/* ✏️ 編集 */}
          <button
            onClick={() => {
              if (currentWord) {
                setIsEditing(true);
              } else {
                setIsAdding(true);
              }
            }}
            className="flex flex-col items-center justify-center py-1 rounded-xl text-[#6B6257] hover:bg-[#F2ECE1]/60 transition min-h-[48px] active:scale-95"
            aria-label="単語を編集"
          >
            <Edit3 className="w-5 h-5 text-[#7A7167] stroke-[1.8]" />
            <span className="text-[10px] tracking-tight mt-1 font-medium">
              {currentWord ? '編集' : '単語追加'}
            </span>
          </button>
        </div>
      </footer>

      {/* Jump to Word Modal */}
      {jumpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] p-5 shadow-xl text-[#2C2825]">
            <h3 className="text-sm font-bold text-[#2C2825] mb-2">単語番号へジャンプ</h3>
            <p className="text-xs text-[#7A7167] mb-3">
              1 〜 {words.length} の番号を入力してください
            </p>
            <form onSubmit={handleJumpSubmit} className="space-y-3">
              <input
                type="number"
                min={1}
                max={words.length}
                value={jumpTargetInput}
                onChange={(e) => setJumpTargetInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD6C5] text-center font-bold text-lg focus:outline-hidden"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setJumpOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[#6B6257]"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#2C2825] text-white active:scale-95"
                >
                  移動
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Word Edit / Add Modal */}
      <WordEditModal
        isOpen={isEditing || isAdding}
        wordToEdit={isEditing ? currentWord : null}
        chapters={chapters}
        currentChapterId={chapter.id}
        onClose={() => {
          setIsEditing(false);
          setIsAdding(false);
        }}
        onSave={(data) => {
          onSaveWord(data);
          setIsEditing(false);
          setIsAdding(false);
        }}
        onDelete={(wordId) => {
          onDeleteWord(wordId);
          setIsEditing(false);
        }}
      />
    </div>
  );
};

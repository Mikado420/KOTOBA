import React, { useState, useEffect, useRef } from 'react';
import { Word, Chapter, StickyNote, AppSettings, RedSheetRange } from '../../types';
import { StickyNotesTray } from './StickyNotesTray';
import { WordEditModal } from './WordEditModal';
import {
  ChevronLeft,
  Star,
  Edit3,
  StickyNote as StickyIcon,
  Sliders,
  ChevronRight,
  MoveVertical,
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

  // Touch Swipe on word card (DISABLED while dragging red sheet or touching inside sheet or text selection)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDraggingSheet) return;
    const target = e.target as HTMLElement;
    if (target.closest('.red-sheet-drag-area') || target.closest('.sticky-note-area')) return;

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
  // User-configured redSheetRanges:
  // - In normal view: pink〜red text color (text-[#E11D48]), subtle soft pink background (bg-rose-50 px-1 rounded-sm), bold font.
  // - In Red Sheet active & covering mode: masked with pure matching red (bg-[#E11D48] text-[#E11D48]), completely disappearing under the red filter!
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
            // When covered by Red Sheet: pure matching red bar so it disappears under the red sheet!
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

          // When Red Sheet is OFF or revealed:
          // Subtle pink〜red color with soft pink tint and bold, natural indication of study target
          return (
            <span
              key={idx}
              className="text-[#E11D48] bg-rose-50 font-bold px-0.5 rounded-xs"
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F4EE] text-[#211E1C] select-none pb-safe">
      {/* 1. Top Navigation: Fixed/following top bar with back, chapter, position, and menu */}
      <header className="sticky top-0 z-30 bg-[#F7F4EE]/95 backdrop-blur-md border-b border-[#E6E0CF] px-3 py-2 pt-safe">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Back button (hit area >= 44x44px) */}
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-[#524A42] hover:text-[#211E1C] rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
            aria-label="Chapter一覧に戻る"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2]" />
          </button>

          {/* Center: Chapter name and current position */}
          <div className="flex items-center gap-2 text-center min-w-0 px-2 flex-1 justify-center">
            <span className="text-xs sm:text-sm font-bold text-[#211E1C] truncate max-w-[130px] sm:max-w-[190px]">
              {chapterNumLabel} {chapter.title ? `· ${chapter.title}` : ''}
            </span>

            {/* Current Position (e.g. 12 / 120) - tap to jump */}
            {words.length > 0 && settings.showPageNumber && (
              <button
                onClick={() => {
                  setJumpTargetInput(String(currentIndex + 1));
                  setJumpOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#EAE3D2]/80 hover:bg-[#DDD4C1] text-xs font-mono font-bold text-[#211E1C] transition active:scale-95 shrink-0 flex items-center gap-1 min-h-[36px]"
                title="単語番号を指定してジャンプ"
                aria-label="ページジャンプ"
              >
                <span>{currentIndex + 1}</span>
                <span className="text-[#8C8275] font-normal">/</span>
                <span className="text-[#7A7167]">{words.length}</span>
              </button>
            )}
          </div>

          {/* Right: Menu / Jump button (hit area >= 44x44px) */}
          <button
            onClick={() => {
              setJumpTargetInput(String(currentIndex + 1));
              setJumpOpen(true);
            }}
            className="p-1 -mr-1 text-[#524A42] hover:text-[#211E1C] rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
            aria-label="ページジャンプ"
          >
            <Sliders className="w-4 h-4 text-[#6B6257]" />
          </button>
        </div>
      </header>

      {/* 2. Main Page Surface: Treated as a single continuous sheet of paper */}
      <main
        className="flex-1 max-w-md w-full mx-auto px-4 py-3 flex flex-col justify-start relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {words.length > 0 && currentWord ? (
          <div className="relative w-full">
            {/* Paper Sheet Container - Clean single vertical sheet of paper without excessive cards/shadows */}
            <div
              ref={cardRef}
              className={`w-full min-h-[calc(100vh-140px)] rounded-2xl bg-[#FFFDF8] border border-[#E8E2D2] p-5 sm:p-6 shadow-2xs flex flex-col justify-between relative transition-transform duration-150 ${
                isDraggingSheet ? 'overflow-hidden touch-none' : 'overflow-y-auto'
              } ${
                swipeDirection === 'left'
                  ? '-translate-x-4 opacity-70'
                  : swipeDirection === 'right'
                  ? 'translate-x-4 opacity-70'
                  : 'translate-x-0 opacity-100'
              } ${settings.paperTexture ? 'paper-card-ruled' : ''}`}
            >
              {/* Vertical flow of word information */}
              <div>
                {/* 1. Word Header: English word, Pronunciation, Part of Speech */}
                <div className="pb-4 border-b border-[#EAE3D2]">
                  {/* English Word: prominent, 36〜42px base, left-aligned, natural line wrap */}
                  <h2 className="text-[34px] sm:text-[38px] leading-[1.18] font-bold text-[#1F1C1A] tracking-tight font-serif break-words">
                    {renderMaskedText('word', currentWord.word)}
                  </h2>

                  {/* Pronunciation & Part of Speech directly underneath */}
                  <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                    {currentWord.pronunciation && (
                      <span className="font-mono text-sm sm:text-[15px] font-semibold text-[#1D5E9E] tracking-wide">
                        {currentWord.pronunciation}
                      </span>
                    )}
                    {currentWord.partOfSpeech && (
                      <span className="text-xs font-semibold text-[#1E427B] bg-[#E8F0FA] px-2 py-0.5 rounded-md">
                        {currentWord.partOfSpeech}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Meanings: directly below word header, vertical list with blue-ish numeral labels */}
                {currentWord.meanings && currentWord.meanings.length > 0 && (
                  <div className="py-4 space-y-2.5 border-b border-[#EAE3D2]">
                    {currentWord.meanings.map((meaning, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 leading-relaxed"
                      >
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#E8F0FA] text-[#1E427B] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-mono">
                          {idx + 1}
                        </span>
                        <div className="text-[17px] sm:text-[19px] font-bold text-[#1F1C1A] flex-1 leading-snug">
                          {renderMaskedText('meaning', meaning, idx)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Examples (用例): unified section with EN and JA clearly paired */}
                {currentWord.examples && currentWord.examples.length > 0 && (
                  <div className="py-4 border-b border-[#EAE3D2] space-y-3">
                    <div className="text-[11px] font-bold text-[#8C8275] tracking-wider uppercase flex items-center gap-1.5">
                      <span>用例</span>
                    </div>

                    <div className="space-y-3">
                      {currentWord.examples.map((ex, idx) => (
                        <div key={idx} className="space-y-1">
                          {/* English sentence: 17〜19px, dark ink */}
                          <div className="text-[16px] sm:text-[18px] text-[#1F1C1A] font-medium leading-relaxed flex items-start gap-2">
                            <span className="text-xs font-bold text-[#8C8275] mt-1 shrink-0 font-mono">
                              {idx + 1}.
                            </span>
                            <div className="flex-1">
                              {renderMaskedText('example', ex.text, undefined, idx, 'text')}
                            </div>
                          </div>

                          {/* Japanese translation: 15〜17px, slightly muted, indented */}
                          {ex.translation && (
                            <div className="text-[14px] sm:text-[15px] text-[#5C544B] leading-relaxed pl-6">
                              {renderMaskedText('example', ex.translation, undefined, idx, 'translation')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Memo (メモ): personal notes, pale yellow paper annotation style */}
                {currentWord.memo && (
                  <div className="pt-4">
                    <div className="bg-[#FEFCE8] border border-[#FDE047]/50 rounded-xl p-3.5 text-xs sm:text-sm text-[#4A3E2C] leading-relaxed shadow-2xs">
                      <div className="text-[10px] font-bold text-[#8A7432] tracking-wider uppercase mb-1.5 flex items-center gap-1">
                        <span>✏️ メモ</span>
                      </div>
                      <div className="whitespace-pre-line leading-relaxed font-sans">
                        {currentWord.memo}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Subtle Swipe Hint */}
              <div className="pt-6 flex items-center justify-between text-[11px] text-[#A69C8E]">
                <span>{currentIndex > 0 ? '← 右スワイプで前へ' : ''}</span>
                <span>{currentIndex < words.length - 1 ? '左スワイプで次へ →' : ''}</span>
              </div>
            </div>

            {/* Sticky Notes Tray attached to right edge */}
            {settings.showStickyNotes && (
              <div className="sticky-note-area">
                <StickyNotesTray
                  notes={currentWordNotes}
                  wordId={currentWord.id}
                  onSaveNote={onSaveStickyNote}
                  onDeleteNote={onDeleteStickyNote}
                />
              </div>
            )}

            {/* Red Sheet Draggable Translucent Plastic Overlay */}
            {redSheetActive && (
              <div
                className="red-sheet-drag-area absolute inset-0 z-30 rounded-2xl overflow-hidden pointer-events-auto transition-transform duration-75 flex flex-col touch-none select-none"
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
          <div className="w-full min-h-[380px] rounded-2xl bg-[#FFFDF8] border border-[#E5DEC9] p-8 shadow-2xs flex flex-col items-center justify-center text-center my-auto">
            <h3 className="text-base font-bold text-[#211E1C]">
              このChapterにはまだ単語がありません
            </h3>
            <p className="text-xs text-[#7A7167] mt-1.5 leading-relaxed max-w-xs">
              下の「+ 単語を追加」から、最初の単語を登録してみましょう。
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#211E1C] text-white text-xs font-bold hover:bg-black transition active:scale-95 shadow-xs"
            >
              + 単語を追加
            </button>
          </div>
        )}
      </main>

      {/* 3. Bottom Toolbar: Fixed at bottom, 4 items evenly distributed, tap area >= 44px */}
      <footer className="sticky bottom-0 z-30 bg-[#FAF7F0]/95 backdrop-blur-md border-t border-[#E8E2D2] px-3 py-2 pb-safe">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center gap-1">
          {/* 1. 🟥 赤シート */}
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

          {/* 2. 🟨 付箋 */}
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

          {/* 3. ☆ / ★ お気に入り */}
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

          {/* 4. ✏️ 編集 */}
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
          <div className="w-full max-w-xs rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] p-5 shadow-xl text-[#211E1C]">
            <h3 className="text-sm font-bold text-[#211E1C] mb-2">単語番号へジャンプ</h3>
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
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#211E1C] text-white active:scale-95"
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

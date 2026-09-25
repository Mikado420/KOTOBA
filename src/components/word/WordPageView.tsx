import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  // Red sheet state:
  // Starts at 100% (covering the card from top down to bottom).
  // Pulling the handle at the bottom edge UP reduces the covered height.
  // Pulling DOWN increases the covered height.
  const [redSheetActive, setRedSheetActive] = useState(false);
  const [sheetCoverPercent, setSheetCoverPercent] = useState(100);
  const [isPeeking, setIsPeeking] = useState(false);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  // Tick state to re-trigger real-time DOM position evaluations during dragging and scrolling
  const [positionTick, setPositionTick] = useState(0);

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

  // DOM Refs for physical position checking
  const cardRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const wordHeaderRef = useRef<HTMLDivElement>(null);
  const meaningItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const exampleItemRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // When Red Sheet is activated, default to 100% coverage
  useEffect(() => {
    if (redSheetActive) {
      setSheetCoverPercent(100);
      setPositionTick((t) => t + 1);
    }
  }, [redSheetActive]);

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

  // Red Sheet Dragging:
  // Grabbing the bottom edge handle adjusts sheetCoverPercent between 0% and 100%.
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
      startPercent: sheetCoverPercent,
    };
  };

  const handleSheetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sheetDragStartRef.current || !cardRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const deltaY = e.clientY - sheetDragStartRef.current.startY;
    const containerHeight = cardRef.current.clientHeight || 450;
    const deltaPercent = (deltaY / containerHeight) * 100;
    const nextPercent = Math.min(Math.max(0, sheetDragStartRef.current.startPercent + deltaPercent), 100);

    setSheetCoverPercent(nextPercent);
    setPositionTick((t) => t + 1);
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
    setPositionTick((t) => t + 1);
  };

  // Card onScroll: update position check so scrolling long cards recalculates coverage
  const handleCardScroll = () => {
    setPositionTick((t) => t + 1);
  };

  // Real physical coverage detection:
  // Compares the DOM element's viewport top with the red sheet's viewport bottom.
  // If element is above the red sheet's bottom edge (and within card), it is physically covered!
  const isElementCoveredBySheet = useCallback(
    (el: HTMLElement | null) => {
      if (!redSheetActive || isPeeking || !el || !sheetRef.current) {
        return false;
      }
      const sheetRect = sheetRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      // If the sheet height is basically 0, nothing is covered
      if (sheetRect.height < 5) return false;

      // The element is covered if its top enters inside the red sheet area (above sheet's bottom edge)
      // and its bottom is below the sheet's top edge
      return elRect.top + 4 < sheetRect.bottom && elRect.bottom > sheetRect.top;
    },
    [redSheetActive, isPeeking, positionTick]
  );

  // Range-based slice chunk rendering (Issue 1 & Issue 2):
  // 1. Slices text into contiguous intervals instead of splitting by character.
  // 2. Uses ZERO horizontal padding and ZERO margin so character kerning/spacing is 100% identical.
  // 3. When covered by red sheet: rendered in a single solid red block (bg-[#E11D48] text-[#E11D48])
  // 4. When uncovered: rendered in pink/red bold text without any layout shift.
  const renderMaskedChunk = (
    text: string,
    ranges: RedSheetRange[],
    isCovered: boolean
  ) => {
    if (!text) return null;
    if (!ranges || ranges.length === 0) {
      return text;
    }

    const validRanges = ranges
      .filter((r) => r.start >= 0 && r.end > r.start && r.start < text.length)
      .sort((a, b) => a.start - b.start);

    if (validRanges.length === 0) {
      return text;
    }

    // Merge overlapping ranges
    const merged: { start: number; end: number }[] = [];
    for (const r of validRanges) {
      const start = Math.max(0, r.start);
      const end = Math.min(text.length, r.end);
      if (merged.length === 0) {
        merged.push({ start, end });
      } else {
        const prev = merged[merged.length - 1];
        if (start <= prev.end) {
          prev.end = Math.max(prev.end, end);
        } else {
          merged.push({ start, end });
        }
      }
    }

    // Build contiguous slices
    const slices: { text: string; isTarget: boolean }[] = [];
    let cursor = 0;
    for (const m of merged) {
      if (m.start > cursor) {
        slices.push({ text: text.slice(cursor, m.start), isTarget: false });
      }
      slices.push({ text: text.slice(m.start, m.end), isTarget: true });
      cursor = m.end;
    }
    if (cursor < text.length) {
      slices.push({ text: text.slice(cursor), isTarget: false });
    }

    // Render slices with zero margin and zero padding to preserve character metrics exactly
    return slices.map((slice, i) => {
      if (!slice.isTarget) {
        return <React.Fragment key={i}>{slice.text}</React.Fragment>;
      }

      if (isCovered) {
        return (
          <span
            key={i}
            className="bg-[#E11D48] text-[#E11D48] select-none rounded-xs inline"
            style={{ padding: 0, margin: 0, letterSpacing: 'inherit' }}
            title="赤シートで隠れています"
          >
            {slice.text}
          </span>
        );
      }

      return (
        <span
          key={i}
          className="text-[#E11D48] font-bold inline"
          style={{ padding: 0, margin: 0, letterSpacing: 'inherit' }}
        >
          {slice.text}
        </span>
      );
    });
  };

  // Helper to extract relevant ranges for a field
  const getRangesFor = (
    field: 'word' | 'meaning' | 'example',
    mIdx?: number,
    eIdx?: number,
    eField?: 'text' | 'translation'
  ): RedSheetRange[] => {
    if (!currentWord || !currentWord.redSheetRanges) return [];
    return currentWord.redSheetRanges.filter(
      (r) =>
        r.field === field &&
        r.meaningIndex === mIdx &&
        r.exampleIndex === eIdx &&
        (field !== 'example' || r.exampleField === eField)
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F4EE] text-[#211E1C] select-none pb-safe">
      {/* 1. Top Navigation */}
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

      {/* 2. Main Page Surface */}
      <main
        className="flex-1 max-w-md w-full mx-auto px-4 py-3 flex flex-col justify-start relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {words.length > 0 && currentWord ? (
          <div className="relative w-full">
            {/* Paper Sheet Container */}
            <div
              ref={cardRef}
              onScroll={handleCardScroll}
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
                <div
                  ref={wordHeaderRef}
                  className="pb-4 border-b border-[#EAE3D2]"
                >
                  {/* English Word */}
                  <h2 className="text-[34px] sm:text-[38px] leading-[1.18] font-bold text-[#1F1C1A] tracking-tight font-serif break-words">
                    {renderMaskedChunk(
                      currentWord.word,
                      getRangesFor('word'),
                      isElementCoveredBySheet(wordHeaderRef.current)
                    )}
                  </h2>

                  {/* Pronunciation & Part of Speech */}
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

                {/* 2. Meanings: directly below word header */}
                {currentWord.meanings && currentWord.meanings.length > 0 && (
                  <div className="py-4 space-y-2.5 border-b border-[#EAE3D2]">
                    {currentWord.meanings.map((meaning, idx) => (
                      <div
                        key={idx}
                        ref={(el) => {
                          meaningItemRefs.current[idx] = el;
                        }}
                        className="flex items-start gap-2.5 leading-relaxed"
                      >
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#E8F0FA] text-[#1E427B] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-mono">
                          {idx + 1}
                        </span>
                        <div className="text-[17px] sm:text-[19px] font-bold text-[#1F1C1A] flex-1 leading-snug">
                          {renderMaskedChunk(
                            meaning,
                            getRangesFor('meaning', idx),
                            isElementCoveredBySheet(meaningItemRefs.current[idx])
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Examples: unified section with EN and JA clearly paired */}
                {currentWord.examples && currentWord.examples.length > 0 && (
                  <div className="py-4 border-b border-[#EAE3D2] space-y-3">
                    <div className="text-[11px] font-bold text-[#8C8275] tracking-wider uppercase flex items-center gap-1.5">
                      <span>用例</span>
                    </div>

                    <div className="space-y-3">
                      {currentWord.examples.map((ex, idx) => (
                        <div
                          key={idx}
                          ref={(el) => {
                            exampleItemRefs.current[idx] = el;
                          }}
                          className="space-y-1"
                        >
                          {/* English sentence */}
                          <div className="text-[16px] sm:text-[18px] text-[#1F1C1A] font-medium leading-relaxed flex items-start gap-2">
                            <span className="text-xs font-bold text-[#8C8275] mt-1 shrink-0 font-mono">
                              {idx + 1}.
                            </span>
                            <div className="flex-1">
                              {renderMaskedChunk(
                                ex.text,
                                getRangesFor('example', undefined, idx, 'text'),
                                isElementCoveredBySheet(exampleItemRefs.current[idx])
                              )}
                            </div>
                          </div>

                          {/* Japanese translation */}
                          {ex.translation && (
                            <div className="text-[14px] sm:text-[15px] text-[#5C544B] leading-relaxed pl-6">
                              {renderMaskedChunk(
                                ex.translation,
                                getRangesFor('example', undefined, idx, 'translation'),
                                isElementCoveredBySheet(exampleItemRefs.current[idx])
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Memo */}
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

            {/* Red Sheet Draggable Translucent Plastic Overlay:
                Anchored at top: 0, height matches sheetCoverPercent%.
                The bottom handle bar (────────) is pulled up/down to adjust coverage.
                Anything physically above the bottom handle is covered; anything below is uncovered! */}
            {redSheetActive && (
              <div
                ref={sheetRef}
                className="red-sheet-drag-area absolute top-0 left-0 right-0 z-30 rounded-2xl overflow-hidden pointer-events-auto transition-[height] duration-75 flex flex-col touch-none select-none"
                style={{
                  height: `${sheetCoverPercent}%`,
                  minHeight: sheetCoverPercent > 0 ? '44px' : '0px',
                  backgroundColor: 'rgba(225, 29, 72, 0.82)',
                  boxShadow: '0 8px 30px rgba(190, 18, 60, 0.35)',
                  touchAction: 'none',
                }}
              >
                {/* Translucent body */}
                <div
                  className="flex-1 touch-none cursor-grab active:cursor-grabbing"
                  style={{ touchAction: 'none' }}
                  onPointerDown={handleSheetPointerDown}
                  onPointerMove={handleSheetPointerMove}
                  onPointerUp={handleSheetPointerUp}
                  onPointerCancel={handleSheetPointerUp}
                />

                {/* Red sheet bottom edge drag handle (────────) */}
                <div
                  className="h-10 bg-[#BE123C] text-white px-4 flex items-center justify-between cursor-grab active:cursor-grabbing border-t border-white/20 select-none shadow-md touch-none shrink-0"
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
                    <div className="w-12 h-1.5 rounded-full bg-white/70" />
                    {isDraggingSheet && (
                      <span className="text-[10px] text-white/90 font-medium ml-1.5 animate-pulse">
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

                    {/* Quick Toggle: 100% full cover or 0% reveal */}
                    <button
                      type="button"
                      onClick={() => {
                        setSheetCoverPercent((prev) => (prev > 30 ? 0 : 100));
                        setPositionTick((t) => t + 1);
                      }}
                      className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white transition active:scale-95 min-h-[32px]"
                      title={sheetCoverPercent > 30 ? '全開（めくる）' : '全閉（覆う）'}
                    >
                      {sheetCoverPercent > 30 ? '全開' : '覆う'}
                    </button>
                  </div>
                </div>
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

      {/* 3. Bottom Toolbar */}
      <footer className="sticky bottom-0 z-30 bg-[#FAF7F0]/95 backdrop-blur-md border-t border-[#E8E2D2] px-3 py-2 pb-safe">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center gap-1">
          {/* 1. 🟥 赤シート */}
          <button
            onClick={() => {
              setRedSheetActive(!redSheetActive);
              if (!redSheetActive) {
                setSheetCoverPercent(100);
              }
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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Word, Chapter, StickyNote, AppSettings, RedSheetRange } from '../../types';
import { StickyNotesTray } from './StickyNotesTray';
import { StickyNoteCreateModal } from './StickyNoteCreateModal';
import { WordEditModal } from './WordEditModal';
import {
  ChevronLeft,
  Star,
  Edit3,
  StickyNote as StickyIcon,
  Sliders,
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
  const [isPeeking, setIsPeeking] = useState(false);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [isSheetAtTop, setIsSheetAtTop] = useState(true);
  const [sheetHeight, setSheetHeight] = useState<number>(270);

  // Edit modal
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Sticky note create modal (color picker)
  const [stickyCreateModalOpen, setStickyCreateModalOpen] = useState(false);

  // Jump to word dialog
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpTargetInput, setJumpTargetInput] = useState('');

  // Page animation direction
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Touch handling refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // DOM Refs for physical coordinate-based decoupled red sheet
  const viewportRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Y coordinate relative to viewportRef (0 = top flush with card, maxY = bottom flush above toolbar)
  const sheetYRef = useRef<number>(0);
  const grabOffsetYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const rAFRef = useRef<number | null>(null);
  const cachedChunksRef = useRef<{ el: HTMLElement; screenTop: number; screenBottom: number }[]>([]);

  const currentWord = words[currentIndex] || null;
  const currentWordNotes = currentWord
    ? stickyNotes.filter((n) => n.wordId === currentWord.id)
    : [];

  // Chapter number calculation (e.g. Chapter 01)
  const chapterIndex = chapters.findIndex((c) => c.id === chapter.id);
  const chapterNumLabel = chapterIndex >= 0 ? `Chapter ${String(chapterIndex + 1).padStart(2, '0')}` : 'Chapter';

  // Responsive sheet height calculation: ~50-54% of visible card viewport (220px to 340px)
  const calculateSheetHeight = (vpH: number) => {
    return Math.min(Math.max(Math.round(vpH * 0.52), 220), 340);
  };

  // Update sheet dimensions dynamically on mount and window resize
  useEffect(() => {
    const updateDims = () => {
      if (viewportRef.current) {
        const vpH = viewportRef.current.clientHeight;
        if (vpH > 0) {
          const calculatedH = calculateSheetHeight(vpH);
          setSheetHeight(calculatedH);
        }
      }
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

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

  // Touch Swipe on word card (DISABLED while dragging red sheet or touching inside sheet or sticky notes)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDraggingRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('.red-sheet-element') || target.closest('.sticky-note-area')) return;

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDraggingRef.current || !touchStartRef.current) return;
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

  // High-performance decoupled text masking update:
  // Direct class toggle (.is-covered / .is-uncovered) on chunk elements.
  // ZERO React re-render, ZERO forced layout thrashing during drag!
  const updateMasking = useCallback((y: number) => {
    if (!viewportRef.current || !sheetRef.current) return;

    const vpRect = viewportRef.current.getBoundingClientRect();
    const sheetH = sheetRef.current.clientHeight || calculateSheetHeight(vpRect.height);
    const sheetScreenTop = vpRect.top + y;
    const sheetScreenBottom = sheetScreenTop + sheetH;

    // Fast path during active dragging: compare against cached screen coordinates
    if (isDraggingRef.current && cachedChunksRef.current.length > 0) {
      const chunks = cachedChunksRef.current;
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const isCovered = c.screenTop + 2 < sheetScreenBottom && c.screenBottom - 2 > sheetScreenTop;
        if (isCovered) {
          if (!c.el.classList.contains('is-covered')) {
            c.el.classList.add('is-covered');
            c.el.classList.remove('is-uncovered');
          }
        } else {
          if (!c.el.classList.contains('is-uncovered')) {
            c.el.classList.add('is-uncovered');
            c.el.classList.remove('is-covered');
          }
        }
      }
      return;
    }

    // Normal path (mount, word switch, or scroll): read live screen bounding coordinates
    const chunkEls = viewportRef.current.querySelectorAll<HTMLElement>('.kotoba-rs-chunk');
    chunkEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      const isCovered = r.top + 2 < sheetScreenBottom && r.bottom - 2 > sheetScreenTop;
      if (isCovered) {
        el.classList.add('is-covered');
        el.classList.remove('is-uncovered');
      } else {
        el.classList.add('is-uncovered');
        el.classList.remove('is-covered');
      }
    });
  }, []);

  // Physical Red Sheet Dragging:
  // Uses relative coordinates inside viewportRef:
  // sheetY = relative Y from viewportRef top (0 = top of card, maxY = bottom of viewport above toolbar)
  const handleSheetPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons inside the handle
    if (target.closest('button')) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    if (!viewportRef.current || !sheetRef.current) return;
    const vpRect = viewportRef.current.getBoundingClientRect();
    const pointerYInVp = e.clientY - vpRect.top;

    // Distance inside sheet from top of sheet to touch point: eliminates touch-start jumping
    grabOffsetYRef.current = pointerYInVp - sheetYRef.current;
    isDraggingRef.current = true;
    setIsDraggingSheet(true);

    // Cache chunk screen positions once upon drag start (avoids layout thrashing during move!)
    const chunkEls = Array.from(viewportRef.current.querySelectorAll<HTMLElement>('.kotoba-rs-chunk'));
    cachedChunksRef.current = chunkEls.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        el,
        screenTop: r.top,
        screenBottom: r.bottom,
      };
    });
  };

  const handleSheetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !viewportRef.current || !sheetRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const vpRect = viewportRef.current.getBoundingClientRect();
    const vpH = vpRect.height;
    const sheetH = sheetRef.current.clientHeight || calculateSheetHeight(vpH);

    // Strict bounds:
    // minY = 0 (sheet top is flush with card top)
    // maxY = vpH - sheetH (sheet bottom is flush with bottom of viewport, strictly above Bottom Toolbar)
    const minY = 0;
    const maxY = Math.max(0, vpH - sheetH);

    const pointerYInVp = e.clientY - vpRect.top;
    const targetY = pointerYInVp - grabOffsetYRef.current;
    const nextY = Math.min(Math.max(minY, targetY), maxY);

    sheetYRef.current = nextY;

    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
    }

    rAFRef.current = requestAnimationFrame(() => {
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translate3d(0, ${nextY}px, 0)`;
      }
      updateMasking(nextY);
    });
  };

  const handleSheetPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      isDraggingRef.current = false;
      setIsDraggingSheet(false);
      setIsSheetAtTop(sheetYRef.current <= 30);
      cachedChunksRef.current = [];
    }
  };

  // Peek underneath sheet without moving it
  const startPeeking = () => {
    setIsPeeking(true);
    if (viewportRef.current) {
      viewportRef.current.classList.add('card-peeking');
    }
    if (sheetRef.current) {
      sheetRef.current.style.opacity = '0.15';
    }
  };

  const stopPeeking = () => {
    setIsPeeking(false);
    if (viewportRef.current) {
      viewportRef.current.classList.remove('card-peeking');
    }
    if (sheetRef.current) {
      sheetRef.current.style.opacity = '1';
    }
  };

  // Quick slide preset: toggle smoothly between top (0) and bottom (maxY)
  const quickSlideToggle = () => {
    if (!sheetRef.current || !viewportRef.current) return;
    const vpH = viewportRef.current.clientHeight || 500;
    const sheetH = sheetRef.current.clientHeight || calculateSheetHeight(vpH);
    const maxY = Math.max(0, vpH - sheetH);

    // If near top, slide to bottom (maxY); if near bottom, slide to top (0)
    const targetY = sheetYRef.current <= 30 ? maxY : 0;

    sheetRef.current.style.transition = 'transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    sheetYRef.current = targetY;
    sheetRef.current.style.transform = `translate3d(0, ${targetY}px, 0)`;
    setIsSheetAtTop(targetY <= 30);
    updateMasking(targetY);

    setTimeout(() => {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'none';
      }
    }, 250);
  };

  // Card onScroll: update position check so scrolling long cards recalculates coverage
  const handleCardScroll = () => {
    if (redSheetActive) {
      updateMasking(sheetYRef.current);
    }
  };

  // Always reset to top (0) when switching words
  useEffect(() => {
    sheetYRef.current = 0;
    setIsSheetAtTop(true);
    if (redSheetActive) {
      requestAnimationFrame(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = 'translate3d(0, 0, 0)';
          updateMasking(0);
        }
      });
    }
  }, [currentIndex]);

  // Sync masking on active toggle
  useEffect(() => {
    if (redSheetActive) {
      sheetYRef.current = 0;
      setIsSheetAtTop(true);
      requestAnimationFrame(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = 'translate3d(0, 0, 0)';
          updateMasking(0);
        }
      });
    } else {
      if (viewportRef.current) {
        viewportRef.current.classList.remove('card-peeking');
        const chunkEls = viewportRef.current.querySelectorAll<HTMLElement>('.kotoba-rs-chunk');
        chunkEls.forEach((el) => {
          el.classList.remove('is-covered');
          el.classList.add('is-uncovered');
        });
      }
    }
  }, [redSheetActive, updateMasking]);

  // Range-based slice chunk rendering:
  // 1. Slices text into contiguous intervals (zero character splitting).
  // 2. Uses ZERO horizontal padding and ZERO margin so character kerning/spacing is 100% identical.
  // 3. When red sheet is active and covering: .is-covered provides seamless optical red masking.
  // 4. When uncovered: .is-uncovered displays natural bold red ink text without layout shift.
  const renderMaskedChunk = (
    text: string,
    ranges: RedSheetRange[]
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

      return (
        <span
          key={i}
          className={`kotoba-rs-chunk ${redSheetActive ? 'is-covered' : 'is-uncovered'}`}
          title={redSheetActive ? '赤シート対象文字' : undefined}
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
    <div className="h-dvh flex flex-col justify-between bg-[#F7F4EE] text-[#211E1C] select-none overflow-hidden">
      {/* 1. Top Navigation */}
      <header className="shrink-0 sticky top-0 z-30 bg-[#F7F4EE]/95 backdrop-blur-md border-b border-[#E6E0CF] px-3 py-2 pt-safe">
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

      {/* 2. Main Page Surface (Occupies exactly the space between Header and Bottom Toolbar) */}
      <main
        className="flex-1 min-h-0 max-w-md w-full mx-auto px-3 sm:px-4 py-2 sm:py-3 flex flex-col relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {words.length > 0 && currentWord ? (
          /* Viewport container strictly bounded between Header and Bottom Toolbar */
          <div
            ref={viewportRef}
            className="relative w-full h-full min-h-0 flex flex-col overflow-hidden rounded-2xl"
          >
            {/* Scrollable Paper Sheet Card */}
            <div
              ref={cardRef}
              onScroll={handleCardScroll}
              className={`w-full h-full overflow-y-auto rounded-2xl bg-[#FFFDF8] border border-[#E8E2D2] p-5 sm:p-6 shadow-2xs flex flex-col justify-between relative transition-transform duration-150 ${
                isDraggingSheet ? 'touch-none' : ''
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
                  {/* English Word */}
                  <h2 className="text-[34px] sm:text-[38px] leading-[1.18] font-bold text-[#1F1C1A] tracking-tight font-serif break-words">
                    {renderMaskedChunk(
                      currentWord.word,
                      getRangesFor('word')
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
                        className="flex items-start gap-2.5 leading-relaxed"
                      >
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#E8F0FA] text-[#1E427B] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-mono">
                          {idx + 1}
                        </span>
                        <div className="text-[17px] sm:text-[19px] font-bold text-[#1F1C1A] flex-1 leading-snug">
                          {renderMaskedChunk(
                            meaning,
                            getRangesFor('meaning', idx)
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
                                getRangesFor('example', undefined, idx, 'text')
                              )}
                            </div>
                          </div>

                          {/* Japanese translation */}
                          {ex.translation && (
                            <div className="text-[14px] sm:text-[15px] text-[#5C544B] leading-relaxed pl-6">
                              {renderMaskedChunk(
                                ex.translation,
                                getRangesFor('example', undefined, idx, 'translation')
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
              <div className="sticky-note-area z-25">
                <StickyNotesTray
                  notes={currentWordNotes}
                  wordId={currentWord.id}
                  onSaveNote={onSaveStickyNote}
                  onDeleteNote={onDeleteStickyNote}
                  onOpenCreate={() => {
                    if (currentWord) {
                      setStickyCreateModalOpen(true);
                    }
                  }}
                />
              </div>
            )}

            {/* Physical Red Sheet Overlay:
                Positioned inside viewportRef (strictly above Bottom Toolbar).
                Moving range: 0 (top flush) to maxY (bottom flush above Bottom Toolbar).
                Can never get buried under the Bottom Toolbar!
                Both handles and entire sheet body are 100% accessible at all times! */}
            {redSheetActive && (
              <div
                ref={sheetRef}
                className="red-sheet-element absolute left-1.5 right-1.5 z-20 select-none touch-none rounded-2xl flex flex-col will-change-transform shadow-xl pointer-events-auto"
                style={{
                  height: `${sheetHeight}px`,
                  transform: `translate3d(0, ${sheetYRef.current}px, 0)`,
                  backgroundColor: 'rgba(225, 29, 72, 0.84)',
                  boxShadow:
                    '0 12px 32px -4px rgba(190, 18, 60, 0.42), 0 4px 12px rgba(0, 0, 0, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.35)',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(0.5px)',
                  touchAction: 'none',
                }}
                onPointerDown={handleSheetPointerDown}
                onPointerMove={handleSheetPointerMove}
                onPointerUp={handleSheetPointerUp}
                onPointerCancel={handleSheetPointerUp}
              >
                {/* 1. Top Edge Handle Bar */}
                <div
                  className="h-7 bg-[#BE123C]/90 text-white/95 px-3 flex items-center justify-between border-b border-white/20 select-none cursor-grab active:cursor-grabbing rounded-t-2xl shrink-0"
                  style={{ touchAction: 'none' }}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/90">
                    <span className="w-2 h-2 rounded-xs bg-white/80" />
                    <span>赤シート</span>
                  </div>
                  {/* Tactile Grab Indicator Bar */}
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1 rounded-full bg-white/75" />
                  </div>
                  <div className="text-[10px] text-white/75 font-mono">↕ スライド</div>
                </div>

                {/* 2. Translucent Sheet Body (Grabbing anywhere moves the sheet) */}
                <div
                  className="flex-1 cursor-grab active:cursor-grabbing relative overflow-hidden flex items-center justify-center"
                  style={{ touchAction: 'none' }}
                >
                  {/* Subtle glossy sheen reflection diagonal across sheet */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%, rgba(255,255,255,0.1) 100%)',
                    }}
                  />
                  {isDraggingSheet && (
                    <span className="text-[11px] text-white/90 font-bold bg-black/25 backdrop-blur-xs px-2.5 py-1 rounded-full pointer-events-none shadow-xs">
                      ↕ 移動中
                    </span>
                  )}
                </div>

                {/* 3. Bottom Edge Handle Bar */}
                <div
                  className="h-9 bg-[#BE123C]/95 text-white px-3 flex items-center justify-between border-t border-white/20 select-none cursor-grab active:cursor-grabbing rounded-b-2xl shrink-0"
                  style={{ touchAction: 'none' }}
                >
                  {/* Left: Peek Button (Press & hold to peek) */}
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      startPeeking();
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      stopPeeking();
                    }}
                    onPointerCancel={(e) => {
                      e.stopPropagation();
                      stopPeeking();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white transition active:scale-95 flex items-center gap-1 select-none min-h-[28px]"
                    title="長押しで一時的に透かす"
                  >
                    <span>👁️</span>
                    <span>{isPeeking ? '透かし中' : '透かす'}</span>
                  </button>

                  {/* Center: Tactile Grip Handle */}
                  <div className="flex items-center gap-1 px-2">
                    <div className="w-14 h-1.5 rounded-full bg-white/85" />
                  </div>

                  {/* Right: Quick Slide Preset Toggle (Top <-> Bottom) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      quickSlideToggle();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white transition active:scale-95 text-center min-h-[28px]"
                    title={isSheetAtTop ? '下へずらして上部を表示' : '上へ戻して上部を覆う'}
                  >
                    {isSheetAtTop ? '下へずらす' : '上へ戻す'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty Chapter Words State */
          <div className="w-full h-full rounded-2xl bg-[#FFFDF8] border border-[#E5DEC9] p-8 shadow-2xs flex flex-col items-center justify-center text-center my-auto">
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

      {/* 3. Bottom Toolbar (Fixed at bottom of screen, shrink-0, z-30) */}
      <footer className="shrink-0 z-30 bg-[#FAF7F0]/95 backdrop-blur-md border-t border-[#E8E2D2] px-3 py-2 pb-safe">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center gap-1">
          {/* 1. 🟥 赤シート */}
          <button
            onClick={() => {
              setRedSheetActive(!redSheetActive);
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
                setStickyCreateModalOpen(true);
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

      {/* Sticky Note Create / Color Selection Modal */}
      <StickyNoteCreateModal
        isOpen={stickyCreateModalOpen}
        onClose={() => setStickyCreateModalOpen(false)}
        onConfirm={(color) => {
          if (currentWord) {
            const newNote: StickyNote = {
              id: `sticky-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              wordId: currentWord.id,
              color,
              createdAt: Date.now(),
            };
            onSaveStickyNote(newNote);
          }
        }}
      />

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

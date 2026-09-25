import React, { useState } from 'react';
import { RedSheetRange, ExampleSentence } from '../../types';
import { X, Check, EyeOff, Trash2, HelpCircle } from 'lucide-react';

interface RedSheetRangeSelectorProps {
  isOpen: boolean;
  word: string;
  meanings: string[];
  examples: ExampleSentence[];
  initialRanges: RedSheetRange[];
  onClose: () => void;
  onSave: (ranges: RedSheetRange[]) => void;
}

export const RedSheetRangeSelector: React.FC<RedSheetRangeSelectorProps> = ({
  isOpen,
  word,
  meanings,
  examples,
  initialRanges,
  onClose,
  onSave,
}) => {
  const [ranges, setRanges] = useState<RedSheetRange[]>(initialRanges);
  const [selectionInfo, setSelectionInfo] = useState<{
    field: 'word' | 'meaning' | 'example';
    meaningIndex?: number;
    exampleIndex?: number;
    exampleField?: 'text' | 'translation';
    start: number;
    end: number;
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  // Helper to check if a range is already covered
  const isRangeCovered = (
    field: string,
    start: number,
    end: number,
    mIdx?: number,
    eIdx?: number,
    eField?: string
  ) => {
    return ranges.some(
      (r) =>
        r.field === field &&
        r.meaningIndex === mIdx &&
        r.exampleIndex === eIdx &&
        r.exampleField === eField &&
        Math.max(r.start, start) < Math.min(r.end, end)
    );
  };

  // Add current selection as hidden range
  const handleAddSelection = () => {
    if (!selectionInfo || selectionInfo.start >= selectionInfo.end) return;

    const newRange: RedSheetRange = {
      id: `rs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      field: selectionInfo.field,
      meaningIndex: selectionInfo.meaningIndex,
      exampleIndex: selectionInfo.exampleIndex,
      exampleField: selectionInfo.exampleField,
      start: selectionInfo.start,
      end: selectionInfo.end,
      text: selectionInfo.text,
    };

    setRanges((prev) => [...prev, newRange]);
    setSelectionInfo(null);
  };

  // Remove range
  const handleRemoveRange = (rangeId: string) => {
    setRanges((prev) => prev.filter((r) => r.id !== rangeId));
  };

  // Handle native text selection on mouseup/touchend
  const handleTextSelection = (
    field: 'word' | 'meaning' | 'example',
    fullText: string,
    mIdx?: number,
    eIdx?: number,
    eField?: 'text' | 'translation'
  ) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

    const selectedText = sel.toString().trim();
    if (!selectedText) return;

    const startIndex = fullText.indexOf(selectedText);
    if (startIndex !== -1) {
      setSelectionInfo({
        field,
        meaningIndex: mIdx,
        exampleIndex: eIdx,
        exampleField: eField,
        start: startIndex,
        end: startIndex + selectedText.length,
        text: selectedText,
      });
    }
  };

  // Quick helper to hide entire word
  const toggleHideEntireWord = () => {
    const existing = ranges.find((r) => r.field === 'word');
    if (existing) {
      setRanges(ranges.filter((r) => r.id !== existing.id));
    } else {
      setRanges([
        ...ranges,
        {
          id: `rs-word-${Date.now()}`,
          field: 'word',
          start: 0,
          end: word.length,
          text: word,
        },
      ]);
    }
  };

  // Render text with existing hidden ranges highlighted in red
  const renderInteractiveText = (
    field: 'word' | 'meaning' | 'example',
    text: string,
    mIdx?: number,
    eIdx?: number,
    eField?: 'text' | 'translation'
  ) => {
    const relevantRanges = ranges.filter(
      (r) =>
        r.field === field &&
        r.meaningIndex === mIdx &&
        r.exampleIndex === eIdx &&
        (field !== 'example' || r.exampleField === eField)
    );

    if (relevantRanges.length === 0) {
      return (
        <span
          className="select-text cursor-text"
          onMouseUp={() => handleTextSelection(field, text, mIdx, eIdx, eField)}
          onTouchEnd={() => handleTextSelection(field, text, mIdx, eIdx, eField)}
        >
          {text}
        </span>
      );
    }

    const validRanges = relevantRanges
      .filter((r) => r.start >= 0 && r.end > r.start && r.start < text.length)
      .sort((a, b) => a.start - b.start);

    if (validRanges.length === 0) {
      return (
        <span
          className="select-text cursor-text"
          onMouseUp={() => handleTextSelection(field, text, mIdx, eIdx, eField)}
          onTouchEnd={() => handleTextSelection(field, text, mIdx, eIdx, eField)}
        >
          {text}
        </span>
      );
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
    const slices: { text: string; isCovered: boolean }[] = [];
    let cursor = 0;
    for (const m of merged) {
      if (m.start > cursor) {
        slices.push({ text: text.slice(cursor, m.start), isCovered: false });
      }
      slices.push({ text: text.slice(m.start, m.end), isCovered: true });
      cursor = m.end;
    }
    if (cursor < text.length) {
      slices.push({ text: text.slice(cursor), isCovered: false });
    }

    return (
      <span
        className="select-text cursor-text leading-relaxed"
        onMouseUp={() => handleTextSelection(field, text, mIdx, eIdx, eField)}
        onTouchEnd={() => handleTextSelection(field, text, mIdx, eIdx, eField)}
      >
        {slices.map((slice, idx) => {
          if (!slice.isCovered) {
            return <React.Fragment key={idx}>{slice.text}</React.Fragment>;
          }
          return (
            <span
              key={idx}
              className="bg-rose-100 text-[#E11D48] font-bold border-b-2 border-[#E11D48] inline"
              style={{ padding: 0, margin: 0, letterSpacing: 'inherit' }}
            >
              {slice.text}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md max-h-[90vh] rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] shadow-2xl flex flex-col text-[#2C2825] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#E8E2D2] flex items-center justify-between bg-[#FAF7F0]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#E11D48]" />
            <h3 className="text-base font-bold text-[#2C2825]">赤シート隠し設定</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#9E9487] hover:text-[#2C2825] rounded-lg transition"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-200/50 flex items-center gap-2 text-xs text-amber-900">
          <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>隠したいテキストを指でなぞって選択し、下の「隠す」を押してください。</span>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* 1. English Word */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#7A7167]">英単語</span>
              <button
                type="button"
                onClick={toggleHideEntireWord}
                className="text-xs text-[#E11D48] font-semibold hover:underline"
              >
                {ranges.some((r) => r.field === 'word') ? '単語の隠しを解除' : '単語全体を隠す'}
              </button>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#DDD6C5] font-serif text-lg font-bold">
              {renderInteractiveText('word', word)}
            </div>
          </div>

          {/* 2. Meanings */}
          {meanings.length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#7A7167] mb-1.5">意味・訳語</div>
              <div className="space-y-2">
                {meanings.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-[#DDD6C5] text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-xs font-bold text-[#9E9487] mr-1.5">
                          {idx + 1}.
                        </span>
                        {renderInteractiveText('meaning', m, idx)}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const existing = ranges.find(
                            (r) => r.field === 'meaning' && r.meaningIndex === idx
                          );
                          if (existing) {
                            setRanges(ranges.filter((r) => r.id !== existing.id));
                          } else {
                            setRanges([
                              ...ranges,
                              {
                                id: `rs-m-${idx}-${Date.now()}`,
                                field: 'meaning',
                                meaningIndex: idx,
                                start: 0,
                                end: m.length,
                                text: m,
                              },
                            ]);
                          }
                        }}
                        className="text-[11px] text-[#7A7167] hover:text-[#E11D48] shrink-0 font-medium"
                      >
                        {ranges.some((r) => r.field === 'meaning' && r.meaningIndex === idx)
                          ? '解除'
                          : '全体を隠す'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Examples */}
          {examples.length > 0 && (
            <div>
              <div className="text-xs font-bold text-[#7A7167] mb-1.5">例文</div>
              <div className="space-y-3">
                {examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-[#DDD6C5] space-y-2 text-xs"
                  >
                    <div className="text-[#2C2825] font-medium leading-relaxed">
                      {renderInteractiveText('example', ex.text, undefined, idx, 'text')}
                    </div>
                    {ex.translation && (
                      <div className="text-[#6B6257] leading-relaxed pt-1.5 border-t border-[#F2ECE1]">
                        {renderInteractiveText('example', ex.translation, undefined, idx, 'translation')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Selection Floating Action */}
          {selectionInfo && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="overflow-hidden">
                <span className="text-[11px] text-rose-600 font-bold block">選択中:</span>
                <span className="font-semibold text-rose-950 truncate block">
                  「{selectionInfo.text}」
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectionInfo(null)}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-300 text-rose-700 font-medium"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleAddSelection}
                  className="px-3.5 py-1.5 rounded-lg bg-[#E11D48] text-white font-bold shadow-xs active:scale-95"
                >
                  <EyeOff className="w-3.5 h-3.5 inline mr-1" />
                  隠す
                </button>
              </div>
            </div>
          )}

          {/* Hidden Ranges Summary List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#7A7167]">
                現在隠している箇所 ({ranges.length})
              </span>
              {ranges.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRanges([])}
                  className="text-xs text-[#E11D48] hover:underline"
                >
                  すべて解除
                </button>
              )}
            </div>

            {ranges.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {ranges.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-200 text-xs font-medium"
                  >
                    <span>「{r.text}」</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRange(r.id)}
                      className="text-rose-500 hover:text-rose-900"
                      aria-label="削除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#9E9487] italic p-2 bg-[#F7F4EE] rounded-lg text-center">
                赤シート設定なし（隠す箇所はありません）
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E8E2D2] bg-[#FAF7F0] flex items-center justify-between">
          <span className="text-xs text-[#7A7167]">
            {ranges.length > 0 ? `${ranges.length} 箇所を隠す` : '設定なし'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-[#6B6257] hover:bg-[#EBE4D5] transition"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(ranges);
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#2C2825] text-white hover:bg-black transition active:scale-95 shadow-xs"
            >
              設定を反映
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

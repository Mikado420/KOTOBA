import React, { useState, useEffect } from 'react';
import { Word, Chapter, RedSheetRange, ExampleSentence } from '../../types';
import { RedSheetRangeSelector } from './RedSheetRangeSelector';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  FileText,
  BookOpen,
  MessageSquare,
  HelpCircle,
  EyeOff,
} from 'lucide-react';

interface WordEditModalProps {
  isOpen: boolean;
  wordToEdit?: Word | null;
  chapters: Chapter[];
  currentChapterId: string;
  onClose: () => void;
  onSave: (wordData: Partial<Word>) => void;
  onDelete?: (wordId: string) => void;
}

export const WordEditModal: React.FC<WordEditModalProps> = ({
  isOpen,
  wordToEdit,
  chapters,
  currentChapterId,
  onClose,
  onSave,
  onDelete,
}) => {
  const [chapterId, setChapterId] = useState(currentChapterId);
  const [word, setWord] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [meanings, setMeanings] = useState<string[]>(['']);
  const [examples, setExamples] = useState<ExampleSentence[]>([{ text: '', translation: '' }]);
  const [memo, setMemo] = useState('');
  const [redSheetRanges, setRedSheetRanges] = useState<RedSheetRange[]>([]);
  const [redSheetSelectorOpen, setRedSheetSelectorOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (wordToEdit) {
      setChapterId(wordToEdit.chapterId || currentChapterId);
      setWord(wordToEdit.word || '');
      setPronunciation(wordToEdit.pronunciation || '');
      setPartOfSpeech(wordToEdit.partOfSpeech || '');
      setMeanings(wordToEdit.meanings?.length ? [...wordToEdit.meanings] : ['']);
      setExamples(
        wordToEdit.examples?.length
          ? wordToEdit.examples.map((ex) => ({ ...ex }))
          : [{ text: '', translation: '' }]
      );
      setMemo(wordToEdit.memo || '');
      setRedSheetRanges(wordToEdit.redSheetRanges ? [...wordToEdit.redSheetRanges] : []);
    } else {
      setChapterId(currentChapterId);
      setWord('');
      setPronunciation('');
      setPartOfSpeech('');
      setMeanings(['']);
      setExamples([{ text: '', translation: '' }]);
      setMemo('');
      setRedSheetRanges([]);
    }
    setError('');
  }, [wordToEdit, currentChapterId, isOpen]);

  if (!isOpen) return null;

  // Meaning management
  const handleAddMeaning = () => setMeanings([...meanings, '']);
  const handleRemoveMeaning = (index: number) => {
    if (meanings.length <= 1) {
      setMeanings(['']);
      return;
    }
    setMeanings(meanings.filter((_, i) => i !== index));
  };
  const handleMeaningChange = (index: number, val: string) => {
    const updated = [...meanings];
    updated[index] = val;
    setMeanings(updated);
  };
  const handleMoveMeaning = (index: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= meanings.length) return;
    const updated = [...meanings];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setMeanings(updated);
  };

  // Example management
  const handleAddExample = () => setExamples([...examples, { text: '', translation: '' }]);
  const handleRemoveExample = (index: number) => {
    if (examples.length <= 1) {
      setExamples([{ text: '', translation: '' }]);
      return;
    }
    setExamples(examples.filter((_, i) => i !== index));
  };
  const handleExampleChange = (index: number, field: 'text' | 'translation', val: string) => {
    const updated = [...examples];
    updated[index] = { ...updated[index], [field]: val };
    setExamples(updated);
  };
  const handleMoveExample = (index: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= examples.length) return;
    const updated = [...examples];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setExamples(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) {
      setError('英単語を入力してください');
      return;
    }

    const cleanMeanings = meanings.map((m) => m.trim()).filter(Boolean);
    const cleanExamples = examples.filter((ex) => ex.text.trim() || ex.translation.trim());

    onSave({
      id: wordToEdit ? wordToEdit.id : undefined,
      chapterId,
      word: word.trim(),
      pronunciation: pronunciation.trim() || undefined,
      partOfSpeech: partOfSpeech.trim() || undefined,
      meanings: cleanMeanings.length > 0 ? cleanMeanings : [''],
      examples: cleanExamples,
      memo: memo.trim() || undefined,
      redSheetRanges,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
        <div className="w-full max-w-lg max-h-[92vh] rounded-3xl bg-[#FAF7F0] border border-[#E6E0CF] shadow-2xl flex flex-col text-[#2C2825] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[#E8E2D2] flex items-center justify-between bg-[#F5F2EA]/90">
            <div>
              <h2 className="text-base font-bold text-[#2C2825]">
                {wordToEdit ? '単語を編集' : '新しい単語を登録'}
              </h2>
              <div className="text-[10px] text-[#8C8275]">
                {wordToEdit ? `「${wordToEdit.word}」の登録内容を変更` : '単語帳に追加する単語の情報を入力'}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8C8275] hover:text-[#2C2825] rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form with Visually Distinct Sections */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {/* Section 1: 基本情報 */}
            <div className="bg-[#FFFDF8] border border-[#E8E2D2] rounded-2xl p-4 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#524A42] pb-2 border-b border-[#F2ECE1]">
                <FileText className="w-4 h-4 text-[#8C8275]" />
                <span>基本情報</span>
              </div>

              {/* Target Chapter selection (if multiple chapters) */}
              {chapters.length > 1 && (
                <div>
                  <label className="block font-semibold text-[#6B6257] mb-1">
                    登録先の章
                  </label>
                  <select
                    value={chapterId}
                    onChange={(e) => setChapterId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD6C5] text-xs font-medium focus:outline-hidden"
                  >
                    {chapters.map((ch, idx) => (
                      <option key={ch.id} value={ch.id}>
                        第{idx + 1}章: {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Word (Required) */}
              <div>
                <label className="block font-semibold text-[#524A42] mb-1">
                  英単語 <span className="text-[#E11D48]">*</span>
                </label>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => {
                    setWord(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="例: cherish"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DDD6C5] text-base font-bold text-[#1F1C1A] font-serif focus:outline-hidden focus:border-[#2C2825]"
                  autoFocus={!wordToEdit}
                />
                {error && <p className="text-xs text-[#E11D48] mt-1 font-medium">{error}</p>}
              </div>

              {/* Pronunciation & Part of Speech */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#6B6257] mb-1">
                    発音記号（任意）
                  </label>
                  <input
                    type="text"
                    value={pronunciation}
                    onChange={(e) => setPronunciation(e.target.value)}
                    placeholder="例: /ˈtʃer.ɪʃ/"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD6C5] font-mono text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#6B6257] mb-1">
                    品詞（任意）
                  </label>
                  <input
                    type="text"
                    value={partOfSpeech}
                    onChange={(e) => setPartOfSpeech(e.target.value)}
                    placeholder="例: 他動詞, 名詞, 形容詞"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD6C5] text-xs focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: 意味・訳語 */}
            <div className="bg-[#FFFDF8] border border-[#E8E2D2] rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F2ECE1]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#524A42]">
                  <BookOpen className="w-4 h-4 text-[#8C8275]" />
                  <span>意味・訳語 ({meanings.filter(Boolean).length})</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddMeaning}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#2C2825] hover:underline"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  意味を追加
                </button>
              </div>

              <div className="space-y-2">
                {meanings.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#F2EDE2] text-[#7A7167] text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={m}
                      onChange={(e) => handleMeaningChange(idx, e.target.value)}
                      placeholder="例: 大切にする、心に抱く"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#DDD6C5] text-xs font-medium focus:outline-hidden"
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                      {meanings.length > 1 && (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveMeaning(idx, 'up')}
                            className="p-1 rounded-md text-[#9E9487] disabled:opacity-20 hover:bg-[#F2ECE1]"
                            title="上へ移動"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === meanings.length - 1}
                            onClick={() => handleMoveMeaning(idx, 'down')}
                            className="p-1 rounded-md text-[#9E9487] disabled:opacity-20 hover:bg-[#F2ECE1]"
                            title="下へ移動"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMeaning(idx)}
                            className="p-1 rounded-md text-rose-500 hover:bg-rose-50"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: 例文・例文訳 */}
            <div className="bg-[#FFFDF8] border border-[#E8E2D2] rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F2ECE1]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#524A42]">
                  <MessageSquare className="w-4 h-4 text-[#8C8275]" />
                  <span>例文 ({examples.filter((e) => e.text || e.translation).length})</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddExample}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#2C2825] hover:underline"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  例文を追加
                </button>
              </div>

              <div className="space-y-3">
                {examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-[#DDD6C5] space-y-2 relative"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#8C8275]">
                      <span className="font-semibold text-[#524A42]">例文 #{idx + 1}</span>
                      <div className="flex items-center gap-0.5">
                        {examples.length > 1 && (
                          <>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveExample(idx, 'up')}
                              className="p-1 rounded-md text-[#9E9487] disabled:opacity-20 hover:bg-[#F2ECE1]"
                              title="上へ移動"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === examples.length - 1}
                              onClick={() => handleMoveExample(idx, 'down')}
                              className="p-1 rounded-md text-[#9E9487] disabled:opacity-20 hover:bg-[#F2ECE1]"
                              title="下へ移動"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveExample(idx)}
                              className="p-1 rounded-md text-rose-500 hover:bg-rose-50"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C8275] block mb-0.5 font-medium">英文:</span>
                      <input
                        type="text"
                        value={ex.text}
                        onChange={(e) => handleExampleChange(idx, 'text', e.target.value)}
                        placeholder="例: I cherish our friendship."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0CF] text-xs focus:outline-hidden focus:bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C8275] block mb-0.5 font-medium">日本語訳:</span>
                      <input
                        type="text"
                        value={ex.translation}
                        onChange={(e) => handleExampleChange(idx, 'translation', e.target.value)}
                        placeholder="例: 私たちの友情を大切にしています。"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0CF] text-xs focus:outline-hidden focus:bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: メモ・語源 */}
            <div className="bg-[#FFFDF8] border border-[#E8E2D2] rounded-2xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#524A42] pb-1.5 border-b border-[#F2ECE1]">
                <span>✏️ メモ・語源・関連語（任意）</span>
              </div>
              <textarea
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="例: dear（親愛な）と語源が近い。類義語: value, treasure"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD6C5] text-xs focus:outline-hidden resize-none leading-relaxed"
              />
            </div>

            {/* Section 5: 赤シート設定 (Distinct Standalone Highlighted Section) */}
            <div className="bg-[#FFF6F6] border-2 border-[#FECDD3] rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                <div className="flex items-center gap-2 font-bold text-[#E11D48] text-xs">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#E11D48]" />
                  <span>🟥 赤シート設定（暗記用マスキング）</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                  {redSheetRanges.length > 0 ? `${redSheetRanges.length}箇所設定中` : '設定なし'}
                </span>
              </div>

              <p className="text-[11px] text-[#7A5055] leading-relaxed">
                英単語や意味、例文の一部を赤シートで隠して覚えるための設定です。
                範囲を指定しておくと、単語ページで赤シートを被せた際に該当部分が隠れます。
              </p>

              {redSheetRanges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {redSheetRanges.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100/90 text-rose-900 border border-rose-200 text-[10px] font-medium"
                    >
                      <EyeOff className="w-3 h-3 text-rose-600" />
                      <span>「{r.text}」</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!word.trim()) {
                      setError('赤シートを設定する前に英単語を入力してください');
                      return;
                    }
                    setRedSheetSelectorOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-xs shadow-xs active:scale-[0.985] transition flex items-center justify-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>赤シートで隠す範囲を設定・確認する</span>
                </button>
              </div>
            </div>

            {/* Delete button if editing */}
            {wordToEdit && onDelete && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 text-xs font-bold text-[#E11D48] hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>この単語を削除する</span>
                </button>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#EAE3D2] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl text-[#6B6257] hover:bg-[#F2ECE1] transition active:scale-95"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold rounded-xl bg-[#2C2825] text-white hover:bg-black transition active:scale-95 shadow-xs"
              >
                {wordToEdit ? '変更を保存' : '単語を登録'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Red Sheet Range Selector Modal */}
      <RedSheetRangeSelector
        isOpen={redSheetSelectorOpen}
        word={word}
        meanings={meanings.filter(Boolean)}
        examples={examples.filter((e) => e.text.trim() || e.translation.trim())}
        initialRanges={redSheetRanges}
        onClose={() => setRedSheetSelectorOpen(false)}
        onSave={(updatedRanges) => {
          setRedSheetRanges(updatedRanges);
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="単語を削除しますか？"
        message={`「${wordToEdit?.word}」を単語帳から削除します。付箋も一緒に削除されます。`}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        isDestructive={true}
        onConfirm={() => {
          if (wordToEdit && onDelete) {
            onDelete(wordToEdit.id);
            setShowDeleteConfirm(false);
            onClose();
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

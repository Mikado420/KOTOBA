import React, { useState, useEffect } from 'react';
import { Word, Chapter, RedSheetRange, ExampleSentence } from '../../types';
import { RedSheetRangeSelector } from './RedSheetRangeSelector';
import { ConfirmModal } from '../common/ConfirmModal';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Eye, HelpCircle } from 'lucide-react';

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
        <div className="w-full max-w-lg max-h-[92vh] rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] shadow-2xl flex flex-col text-[#2C2825] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[#E8E2D2] flex items-center justify-between bg-[#FAF7F0]">
            <h2 className="text-base font-bold text-[#2C2825]">
              {wordToEdit ? '単語を編集' : '新しい単語を登録'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-[#9E9487] hover:text-[#2C2825] rounded-lg transition"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {/* Target Chapter selection */}
            {chapters.length > 1 && (
              <div>
                <label className="block font-semibold text-[#524A42] mb-1">
                  登録先Chapter
                </label>
                <select
                  value={chapterId}
                  onChange={(e) => setChapterId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD6C5] text-xs font-medium focus:outline-hidden"
                >
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#DDD6C5] text-base font-bold text-[#2C2825] focus:outline-hidden focus:border-[#2C2825]"
                autoFocus={!wordToEdit}
              />
              {error && <p className="text-xs text-[#E11D48] mt-1">{error}</p>}
            </div>

            {/* Pronunciation & Part of Speech */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#524A42] mb-1">
                  発音記号（任意）
                </label>
                <input
                  type="text"
                  value={pronunciation}
                  onChange={(e) => setPronunciation(e.target.value)}
                  placeholder="例: /ˈtʃer.ɪʃ/"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD6C5] text-xs focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#524A42] mb-1">
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

            {/* Meanings list */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-[#524A42]">
                  意味（複数登録可能）
                </label>
                <button
                  type="button"
                  onClick={handleAddMeaning}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#2C2825] hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  意味を追加
                </button>
              </div>
              <div className="space-y-2">
                {meanings.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[#9E9487] font-bold text-xs w-4">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={m}
                      onChange={(e) => handleMeaningChange(idx, e.target.value)}
                      placeholder="例: 大切にする、心に抱く"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#DDD6C5] text-xs focus:outline-hidden"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      {meanings.length > 1 && (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveMeaning(idx, 'up')}
                            className="p-1 rounded-md text-[#9E9487] disabled:opacity-30 hover:bg-[#F2ECE1]"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === meanings.length - 1}
                            onClick={() => handleMoveMeaning(idx, 'down')}
                            className="p-1 rounded-md text-[#9E9487] disabled:opacity-30 hover:bg-[#F2ECE1]"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMeaning(idx)}
                            className="p-1 rounded-md text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Examples list */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-[#524A42]">
                  例文・例文訳（複数登録可能）
                </label>
                <button
                  type="button"
                  onClick={handleAddExample}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#2C2825] hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  例文を追加
                </button>
              </div>
              <div className="space-y-3">
                {examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-[#DDD6C5] space-y-2 relative group"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#8C8275]">
                      <span>例文 #{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        {examples.length > 1 && (
                          <>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveExample(idx, 'up')}
                              className="p-1 rounded-md text-[#9E9487] disabled:opacity-30 hover:bg-[#F2ECE1]"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === examples.length - 1}
                              onClick={() => handleMoveExample(idx, 'down')}
                              className="p-1 rounded-md text-[#9E9487] disabled:opacity-30 hover:bg-[#F2ECE1]"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveExample(idx)}
                              className="p-1 rounded-md text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={ex.text}
                      onChange={(e) => handleExampleChange(idx, 'text', e.target.value)}
                      placeholder="英語例文 (例: I cherish our friendship.)"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0CF] text-xs focus:outline-hidden focus:bg-white"
                    />
                    <input
                      type="text"
                      value={ex.translation}
                      onChange={(e) => handleExampleChange(idx, 'translation', e.target.value)}
                      placeholder="日本語訳 (例: 私たちの友情を大切にしています。)"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0CF] text-xs focus:outline-hidden focus:bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Memo */}
            <div>
              <label className="block font-semibold text-[#524A42] mb-1">
                メモ・語源・類義語など（任意）
              </label>
              <textarea
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="例: dear（親愛な）と語源が近い。類義語: value, treasure"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD6C5] text-xs focus:outline-hidden resize-none"
              />
            </div>

            {/* Red Sheet Status Banner */}
            <div className="p-3.5 rounded-xl bg-[#FFF6F6] border border-[#FECDD3] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-[#E11D48]">
                  <span>🟥 赤シート設定</span>
                </div>
                <div className="text-[11px] text-[#881337] mt-0.5">
                  {redSheetRanges.length > 0
                    ? `${redSheetRanges.length}箇所を隠す設定済み`
                    : '設定なし（すべて表示）'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!word.trim()) {
                    setError('赤シートを設定する前に英単語を入力してください');
                    return;
                  }
                  setRedSheetSelectorOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#E11D48] text-white font-bold text-xs shadow-xs active:scale-95 transition"
              >
                範囲を設定
              </button>
            </div>

            {/* Delete button if editing */}
            {wordToEdit && onDelete && (
              <div className="pt-2 border-t border-[#EAE3D2]">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 text-xs font-bold text-[#E11D48] hover:bg-rose-50 rounded-xl transition flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  この単語を削除
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
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#2C2825] text-white hover:bg-black transition active:scale-95 shadow-xs"
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

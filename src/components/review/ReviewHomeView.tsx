import React, { useState } from 'react';
import { Book, Chapter, Word, StickyNote, ReviewSessionHistory } from '../../types';
import { Brain, Bookmark, Star, Layers, Calendar, CheckCircle2 } from 'lucide-react';

export type ReviewTargetType = 'today' | 'all' | 'chapter' | 'sticky' | 'favorite';

interface ReviewHomeViewProps {
  books: Book[];
  chapters: Chapter[];
  words: Word[];
  stickyNotes: StickyNote[];
  reviewHistory: ReviewSessionHistory[];
  onStartReview: (wordsToReview: Word[]) => void;
}

export const ReviewHomeView: React.FC<ReviewHomeViewProps> = ({
  books,
  chapters,
  words,
  stickyNotes,
  reviewHistory,
  onStartReview,
}) => {
  const [targetType, setTargetType] = useState<ReviewTargetType>('today');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    chapters[0]?.id || ''
  );

  const now = Date.now();

  // Filter calculations
  const stickyWordIds = new Set(stickyNotes.map((n) => n.wordId));

  const todayDueWords = words.filter((w) => {
    // Due if nextReviewAt <= now, or if review status is 'new' or never reviewed
    if (!w.review || !w.review.nextReviewAt) return true;
    return w.review.nextReviewAt <= now;
  });

  const getTargetWords = (): Word[] => {
    switch (targetType) {
      case 'today':
        return todayDueWords;
      case 'all':
        return words;
      case 'chapter':
        return words.filter((w) => w.chapterId === selectedChapterId);
      case 'sticky':
        return words.filter((w) => stickyWordIds.has(w.id));
      case 'favorite':
        return words.filter((w) => w.favorite);
      default:
        return todayDueWords;
    }
  };

  const targetWords = getTargetWords();

  return (
    <div className="pb-safe-nav">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#F5F2EA]/95 backdrop-blur-md border-b border-[#E6E0CF] px-4 py-3 pt-safe">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
            <h1 className="text-lg font-bold tracking-tight text-[#2C2825]">
              KOTOBA <span className="text-xs font-normal text-[#8A8073] ml-1">復習</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Today's Review Hero Banner */}
        <div className="rounded-3xl bg-[#FFFDF8] border border-[#E6E0CF] p-6 shadow-sm text-center relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center mx-auto mb-3">
            <Brain className="w-6 h-6 stroke-[2]" />
          </div>

          <div className="text-xs font-bold text-[#8C8275] tracking-wide">
            本日の復習対象
          </div>

          <div className="text-4xl font-extrabold text-[#2C2825] mt-1 font-mono tracking-tight">
            {todayDueWords.length}
            <span className="text-sm font-normal text-[#7A7167] ml-1.5 font-sans">
              語
            </span>
          </div>

          <p className="text-xs text-[#7A7167] mt-2 leading-relaxed">
            「もう一度単語帳をめくる」間隔学習で記憶を定着させます。
          </p>
        </div>

        {/* Review Target Selection */}
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] p-4 shadow-xs">
          <div className="text-xs font-bold text-[#524A42] mb-3">
            復習の対象を選択
          </div>

          <div className="space-y-2">
            {/* 1. 今日の復習 */}
            <label
              onClick={() => setTargetType('today')}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                targetType === 'today'
                  ? 'bg-rose-50/60 border-rose-300 text-[#2C2825]'
                  : 'bg-white border-[#EAE3D2] text-[#524A42] hover:bg-[#FBF9F4]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#E11D48]" />
                <span className="text-xs font-bold">今日の復習</span>
              </div>
              <span className="text-xs font-bold text-[#7A7167]">
                {todayDueWords.length} 語
              </span>
            </label>

            {/* 2. お気に入り */}
            <label
              onClick={() => setTargetType('favorite')}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                targetType === 'favorite'
                  ? 'bg-amber-50/60 border-amber-300 text-[#2C2825]'
                  : 'bg-white border-[#EAE3D2] text-[#524A42] hover:bg-[#FBF9F4]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span className="text-xs font-bold">お気に入り単語</span>
              </div>
              <span className="text-xs font-bold text-[#7A7167]">
                {words.filter((w) => w.favorite).length} 語
              </span>
            </label>

            {/* 3. 付箋が付いている単語 */}
            <label
              onClick={() => setTargetType('sticky')}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                targetType === 'sticky'
                  ? 'bg-amber-50/60 border-amber-300 text-[#2C2825]'
                  : 'bg-white border-[#EAE3D2] text-[#524A42] hover:bg-[#FBF9F4]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bookmark className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold">付箋が付いている単語</span>
              </div>
              <span className="text-xs font-bold text-[#7A7167]">
                {words.filter((w) => stickyWordIds.has(w.id)).length} 語
              </span>
            </label>

            {/* 4. 特定Chapter */}
            <label
              onClick={() => setTargetType('chapter')}
              className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                targetType === 'chapter'
                  ? 'bg-emerald-50/60 border-emerald-300 text-[#2C2825]'
                  : 'bg-white border-[#EAE3D2] text-[#524A42] hover:bg-[#FBF9F4]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold">特定のChapter</span>
                </div>
              </div>

              {chapters.length > 0 ? (
                <select
                  value={selectedChapterId}
                  onChange={(e) => {
                    setSelectedChapterId(e.target.value);
                    setTargetType('chapter');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDD6C5] text-xs font-medium text-[#2C2825] focus:outline-hidden"
                >
                  {chapters.map((ch) => {
                    const chCount = words.filter((w) => w.chapterId === ch.id).length;
                    return (
                      <option key={ch.id} value={ch.id}>
                        {ch.title} ({chCount}語)
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="text-[11px] text-[#9E9487]">Chapterがありません</div>
              )}
            </label>

            {/* 5. すべての単語 */}
            <label
              onClick={() => setTargetType('all')}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                targetType === 'all'
                  ? 'bg-slate-100 border-slate-300 text-[#2C2825]'
                  : 'bg-white border-[#EAE3D2] text-[#524A42] hover:bg-[#FBF9F4]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Brain className="w-4 h-4 text-[#524A42]" />
                <span className="text-xs font-bold">すべての単語（総復習）</span>
              </div>
              <span className="text-xs font-bold text-[#7A7167]">
                {words.length} 語
              </span>
            </label>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => {
            if (targetWords.length > 0) {
              onStartReview(targetWords);
            }
          }}
          disabled={targetWords.length === 0}
          className="w-full py-3.5 rounded-2xl bg-[#2C2825] text-white text-sm font-bold shadow-md hover:bg-black transition active:scale-[0.985] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Brain className="w-4 h-4" />
          <span>復習を開始する ({targetWords.length}語)</span>
        </button>

        {/* Recent Review Logs (Calm paper record) */}
        {reviewHistory.length > 0 && (
          <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6E0CF] p-4 shadow-xs">
            <div className="text-xs font-bold text-[#524A42] mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>前回の復習記録</span>
            </div>
            <div className="space-y-2 text-xs text-[#7A7167]">
              {reviewHistory.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1.5 border-b border-[#F4EFE6] last:border-0"
                >
                  <span className="font-mono text-[11px]">
                    {new Date(item.timestamp).toLocaleDateString('ja-JP')}
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-700 font-medium">
                      🙂 {item.masteredCount}
                    </span>
                    <span className="text-amber-700 font-medium">
                      😐 {item.vagueCount}
                    </span>
                    <span className="text-rose-700 font-medium">
                      😵 {item.forgottenCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

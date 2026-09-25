import React, { useState } from 'react';
import { Word, WordReview, ReviewSessionHistory } from '../../types';
import { ChevronLeft, Check, RotateCcw, Calendar, CheckCircle2 } from 'lucide-react';

interface ReviewSessionViewProps {
  words: Word[];
  onFinishSession: (
    updatedWords: Word[],
    summary: { forgotten: number; vague: number; mastered: number }
  ) => void;
  onExit: () => void;
}

export const ReviewSessionView: React.FC<ReviewSessionViewProps> = ({
  words,
  onFinishSession,
  onExit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<{
    word: Word;
    rating: 'forgotten' | 'vague' | 'mastered';
    newReview: WordReview;
  }[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentWord = words[currentIndex] || null;

  // Rating handlers
  const handleRate = (rating: 'forgotten' | 'vague' | 'mastered') => {
    if (!currentWord) return;

    const now = Date.now();
    const oneDay = 86400000;
    const currentReview = currentWord.review || {
      status: 'new',
      nextReviewAt: now,
      interval: 0,
      correctCount: 0,
      forgottenCount: 0,
    };

    let nextInterval = 0;
    let nextStatus: WordReview['status'] = 'learning';
    let correctCount = currentReview.correctCount;
    let forgottenCount = currentReview.forgottenCount;

    if (rating === 'forgotten') {
      nextInterval = 0; // due today/immediately
      nextStatus = 'learning';
      forgottenCount += 1;
    } else if (rating === 'vague') {
      nextInterval = 1; // 1 day
      nextStatus = 'learning';
    } else if (rating === 'mastered') {
      correctCount += 1;
      // Exponential progression: 0 -> 3 -> 7 -> 14 -> 30
      if (currentReview.interval < 3) {
        nextInterval = 3;
        nextStatus = 'review';
      } else if (currentReview.interval < 7) {
        nextInterval = 7;
        nextStatus = 'review';
      } else if (currentReview.interval < 14) {
        nextInterval = 14;
        nextStatus = 'review';
      } else {
        nextInterval = 30;
        nextStatus = 'mastered';
      }
    }

    const nextReviewAt = now + nextInterval * oneDay;

    const newReview: WordReview = {
      status: nextStatus,
      nextReviewAt,
      interval: nextInterval,
      correctCount,
      forgottenCount,
      lastReviewedAt: now,
    };

    const updatedResults = [
      ...results,
      {
        word: currentWord,
        rating,
        newReview,
      },
    ];
    setResults(updatedResults);

    // Proceed or complete
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setRevealed(false);
    } else {
      setIsCompleted(true);
      // Construct updated words
      const updatedWords = updatedResults.map((r) => ({
        ...r.word,
        review: r.newReview,
        updatedAt: now,
      }));
      const forgottenCountTotal = updatedResults.filter((r) => r.rating === 'forgotten').length;
      const vagueCountTotal = updatedResults.filter((r) => r.rating === 'vague').length;
      const masteredCountTotal = updatedResults.filter((r) => r.rating === 'mastered').length;

      onFinishSession(updatedWords, {
        forgotten: forgottenCountTotal,
        vague: vagueCountTotal,
        mastered: masteredCountTotal,
      });
    }
  };

  // If completed, show calm paper completion screen
  if (isCompleted) {
    const forgottenCount = results.filter((r) => r.rating === 'forgotten').length;
    const vagueCount = results.filter((r) => r.rating === 'vague').length;
    const masteredCount = results.filter((r) => r.rating === 'mastered').length;

    // Earliest next review date
    const minNextReviewAt = Math.min(...results.map((r) => r.newReview.nextReviewAt));
    const nextDate = new Date(minNextReviewAt).toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });

    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F5F2EA] text-[#2C2825] p-4 pb-safe">
        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="rounded-3xl bg-[#FFFDF8] border border-[#E6E0CF] p-6 shadow-md text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#DCFCE7] text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>

            <h2 className="text-xl font-bold text-[#2C2825]">復習が完了しました</h2>
            <p className="text-xs text-[#7A7167] mt-1">
              今回の {results.length} 語の復習結果が保存されました。
            </p>

            {/* Results breakdown */}
            <div className="grid grid-cols-3 gap-3 my-6 pt-4 border-t border-[#EFE8D8]">
              <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200">
                <div className="text-base">😵</div>
                <div className="text-[11px] font-bold text-rose-800 mt-1">忘れた</div>
                <div className="text-xl font-extrabold text-rose-900 mt-0.5 font-mono">
                  {forgottenCount}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
                <div className="text-base">😐</div>
                <div className="text-[11px] font-bold text-amber-800 mt-1">あいまい</div>
                <div className="text-xl font-extrabold text-amber-900 mt-0.5 font-mono">
                  {vagueCount}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <div className="text-base">🙂</div>
                <div className="text-[11px] font-bold text-emerald-800 mt-1">覚えた</div>
                <div className="text-xl font-extrabold text-emerald-900 mt-0.5 font-mono">
                  {masteredCount}
                </div>
              </div>
            </div>

            {/* Next Review Date */}
            <div className="p-3.5 rounded-xl bg-[#FAF6EE] border border-[#EAE3D2] flex items-center justify-between text-xs text-[#524A42]">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4 text-[#7A7167]" />
                次回復習予定
              </span>
              <span className="font-bold text-[#2C2825]">{nextDate}</span>
            </div>

            <button
              onClick={onExit}
              className="mt-6 w-full py-3.5 rounded-2xl bg-[#2C2825] text-white text-sm font-bold hover:bg-black transition active:scale-95 shadow-md"
            >
              復習を終了する
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F5F2EA] text-[#2C2825] select-none pb-safe">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#F5F2EA]/95 backdrop-blur-md border-b border-[#E6E0CF] px-3 py-2.5 pt-safe">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={onExit}
            className="p-1 -ml-1 text-[#524A42] hover:text-[#2C2825] rounded-xl transition min-w-[40px] min-h-[40px] flex items-center justify-center active:scale-95"
            aria-label="中断する"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-xs font-bold text-[#7A7167]">
            復習中 ({currentIndex + 1} / {words.length})
          </div>

          <div className="w-8" />
        </div>
      </header>

      {/* Main Flashcard Body */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center">
        {currentWord && (
          <div
            onClick={() => !revealed && setRevealed(true)}
            className={`w-full min-h-[380px] max-h-[70vh] rounded-3xl bg-[#FFFDF8] border border-[#E5DEC9] p-6 shadow-md flex flex-col justify-between overflow-y-auto cursor-pointer transition paper-card-ruled`}
          >
            {/* Front side / English word */}
            <div>
              <div className="text-xs font-semibold text-[#8C8275] pb-2 border-b border-[#EFE8D8] flex items-center justify-between">
                <span>{currentWord.partOfSpeech ? `[${currentWord.partOfSpeech}]` : '英単語'}</span>
                <span>{revealed ? '答え' : 'タップで答えを表示'}</span>
              </div>

              {/* Main Word */}
              <div className="py-6 text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#2C2825] font-serif">
                  {currentWord.word}
                </h2>
                {revealed && currentWord.pronunciation && (
                  <div className="text-xs font-mono text-[#786F66] mt-1.5">
                    {currentWord.pronunciation}
                  </div>
                )}
              </div>

              {/* Back side revealed content */}
              {revealed ? (
                <div className="space-y-4 pt-3 border-t border-[#EFE8D8] animate-in fade-in duration-200">
                  {/* Meanings */}
                  <div className="space-y-1">
                    {currentWord.meanings?.map((m, idx) => (
                      <div key={idx} className="text-base font-bold text-[#2C2825]">
                        {currentWord.meanings.length > 1 && (
                          <span className="text-xs text-[#8C8275] mr-1.5">
                            {idx + 1}.
                          </span>
                        )}
                        {m}
                      </div>
                    ))}
                  </div>

                  {/* Examples */}
                  {currentWord.examples && currentWord.examples.length > 0 && (
                    <div className="pt-2 text-xs space-y-1.5 text-[#524A42]">
                      <div className="italic font-medium">{currentWord.examples[0].text}</div>
                      {currentWord.examples[0].translation && (
                        <div className="text-[#7A7167]">
                          {currentWord.examples[0].translation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Memo */}
                  {currentWord.memo && (
                    <div className="text-[11px] text-[#7A7167] bg-[#FAF6EE] p-2 rounded-lg">
                      {currentWord.memo}
                    </div>
                  )}
                </div>
              ) : (
                /* Hint overlay prompting tap */
                <div className="my-auto py-8 text-center text-xs text-[#9E9487]">
                  タップして意味を確認
                </div>
              )}
            </div>

            <div className="pt-2 text-center text-[10px] text-[#A69C8E]">
              {revealed ? '下のボタンで自己評価してください' : 'タップでめくる'}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Rating Bar (3 tiers: 😵 忘れた, 😐 あいまい, 🙂 覚えた) */}
      <footer className="sticky bottom-0 z-30 bg-[#FAF7F0]/95 backdrop-blur-md border-t border-[#E8E2D2] px-4 py-3 pb-safe">
        {revealed ? (
          <div className="max-w-md mx-auto grid grid-cols-3 gap-2.5">
            {/* 😵 忘れた */}
            <button
              onClick={() => handleRate('forgotten')}
              className="py-3 px-2 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-900 flex flex-col items-center justify-center transition active:scale-95 shadow-xs"
            >
              <span className="text-xl">😵</span>
              <span className="text-xs font-bold mt-1">忘れた</span>
              <span className="text-[10px] text-rose-600/80">今日もう一度</span>
            </button>

            {/* 😐 あいまい */}
            <button
              onClick={() => handleRate('vague')}
              className="py-3 px-2 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 flex flex-col items-center justify-center transition active:scale-95 shadow-xs"
            >
              <span className="text-xl">😐</span>
              <span className="text-xs font-bold mt-1">あいまい</span>
              <span className="text-[10px] text-amber-600/80">1日後</span>
            </button>

            {/* 🙂 覚えた */}
            <button
              onClick={() => handleRate('mastered')}
              className="py-3 px-2 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-900 flex flex-col items-center justify-center transition active:scale-95 shadow-xs"
            >
              <span className="text-xl">🙂</span>
              <span className="text-xs font-bold mt-1">覚えた</span>
              <span className="text-[10px] text-emerald-600/80">間隔を延長</span>
            </button>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-3.5 rounded-2xl bg-[#2C2825] text-white text-xs font-bold hover:bg-black transition active:scale-98 shadow-sm"
            >
              答えを見る
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};

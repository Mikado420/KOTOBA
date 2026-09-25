/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Book,
  Chapter,
  Word,
  StickyNote,
  ReviewSessionHistory,
  AppSettings,
  KotobaBackupData,
} from './types';
import { db, DEFAULT_SETTINGS } from './services/db';
import { BottomNav, NavTab } from './components/common/BottomNav';
import { BookshelfView } from './components/bookshelf/BookshelfView';
import { ChapterListView } from './components/chapter/ChapterListView';
import { WordPageView } from './components/word/WordPageView';
import { ReviewHomeView } from './components/review/ReviewHomeView';
import { ReviewSessionView } from './components/review/ReviewSessionView';
import { SettingsView } from './components/settings/SettingsView';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('bookshelf');

  // Navigation hierarchy: Bookshelf -> Book -> Chapter -> Word Page
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number>(0);

  // Active Review Session
  const [activeReviewWords, setActiveReviewWords] = useState<Word[] | null>(null);

  // Database State
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [reviewHistory, setReviewHistory] = useState<ReviewSessionHistory[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Reload all data from IndexedDB
  const reloadData = useCallback(async () => {
    try {
      const [
        loadedBooks,
        loadedChapters,
        loadedWords,
        loadedSticky,
        loadedHistory,
        loadedSettings,
      ] = await Promise.all([
        db.getBooks(),
        db.getAllChapters(),
        db.getAllWords(),
        db.getAllStickyNotes(),
        db.getReviewHistory(),
        db.getSettings(),
      ]);

      setBooks(loadedBooks);
      setChapters(loadedChapters);
      setWords(loadedWords);
      setStickyNotes(loadedSticky);
      setReviewHistory(loadedHistory);
      setSettings(loadedSettings);
    } catch (err) {
      console.error('Failed to load data from IndexedDB:', err);
    }
  }, []);

  // Initial Seed & Load
  useEffect(() => {
    const init = async () => {
      try {
        await db.seedIfEmpty();
        await reloadData();
      } catch (err) {
        console.error('Database initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [reloadData]);

  // Sync theme
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // --- Book Operations ---
  const handleSaveBook = async (bookData: {
    id?: string;
    title: string;
    subtitle?: string;
    coverColor: string;
  }) => {
    const now = Date.now();
    const isNew = !bookData.id;
    const bookToSave: Book = {
      id: bookData.id || `book-${now}-${Math.random().toString(36).substring(2, 6)}`,
      title: bookData.title,
      subtitle: bookData.subtitle,
      coverColor: bookData.coverColor,
      order: isNew ? books.length : books.find((b) => b.id === bookData.id)?.order ?? 0,
      createdAt: isNew ? now : books.find((b) => b.id === bookData.id)?.createdAt ?? now,
      updatedAt: now,
    };

    await db.saveBook(bookToSave);
    await reloadData();

    if (selectedBook && selectedBook.id === bookToSave.id) {
      setSelectedBook(bookToSave);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    await db.deleteBook(bookId);
    if (selectedBook?.id === bookId) {
      setSelectedBook(null);
      setSelectedChapter(null);
    }
    await reloadData();
  };

  const handleDuplicateBook = async (book: Book) => {
    const now = Date.now();
    const newBookId = `book-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicatedBook: Book = {
      ...book,
      id: newBookId,
      title: `${book.title} (コピー)`,
      order: books.length,
      createdAt: now,
      updatedAt: now,
    };
    await db.saveBook(duplicatedBook);

    // Also duplicate chapters and words belonging to this book
    const bookChapters = chapters.filter((c) => c.bookId === book.id);
    for (const ch of bookChapters) {
      const newChapterId = `chap-${now}-${Math.random().toString(36).substring(2, 6)}`;
      const duplicatedChapter: Chapter = {
        ...ch,
        id: newChapterId,
        bookId: newBookId,
        createdAt: now,
        updatedAt: now,
      };
      await db.saveChapter(duplicatedChapter);

      const chWords = words.filter((w) => w.chapterId === ch.id);
      for (const w of chWords) {
        const newWordId = `word-${now}-${Math.random().toString(36).substring(2, 6)}`;
        const duplicatedWord: Word = {
          ...w,
          id: newWordId,
          chapterId: newChapterId,
          createdAt: now,
          updatedAt: now,
        };
        await db.saveWord(duplicatedWord);
      }
    }

    await reloadData();
  };

  const handleExportBook = async (book: Book) => {
    const bookChapters = chapters.filter((c) => c.bookId === book.id);
    const chapterIds = new Set(bookChapters.map((c) => c.id));
    const bookWords = words.filter((w) => chapterIds.has(w.chapterId));
    const wordIds = new Set(bookWords.map((w) => w.id));
    const bookNotes = stickyNotes.filter((n) => wordIds.has(n.wordId));

    const exportData: KotobaBackupData = {
      formatVersion: 1,
      appName: 'KOTOBA',
      exportedAt: Date.now(),
      books: [book],
      chapters: bookChapters,
      words: bookWords,
      stickyNotes: bookNotes,
      reviewHistory: [],
      settings,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeTitle = book.title.replace(/[/\\?%*:|"<>]/g, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}_KOTOBA.wordbook`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReorderBooks = async (reordered: Book[]) => {
    setBooks(reordered);
    for (const b of reordered) {
      await db.saveBook(b);
    }
  };

  // --- Chapter Operations ---
  const handleSaveChapter = async (data: {
    id?: string;
    title: string;
    description?: string;
  }) => {
    if (!selectedBook) return;
    const now = Date.now();
    const isNew = !data.id;
    const bookChapters = chapters.filter((c) => c.bookId === selectedBook.id);

    const chapterToSave: Chapter = {
      id: data.id || `chap-${now}-${Math.random().toString(36).substring(2, 6)}`,
      bookId: selectedBook.id,
      title: data.title,
      description: data.description,
      order: isNew ? bookChapters.length : bookChapters.find((c) => c.id === data.id)?.order ?? 0,
      createdAt: isNew ? now : bookChapters.find((c) => c.id === data.id)?.createdAt ?? now,
      updatedAt: now,
    };

    await db.saveChapter(chapterToSave);
    await reloadData();

    if (selectedChapter && selectedChapter.id === chapterToSave.id) {
      setSelectedChapter(chapterToSave);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    await db.deleteChapter(chapterId);
    if (selectedChapter?.id === chapterId) {
      setSelectedChapter(null);
    }
    await reloadData();
  };

  const handleDuplicateChapter = async (chapter: Chapter) => {
    if (!selectedBook) return;
    const now = Date.now();
    const newChapterId = `chap-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const bookChapters = chapters.filter((c) => c.bookId === selectedBook.id);

    const duplicatedChapter: Chapter = {
      ...chapter,
      id: newChapterId,
      title: `${chapter.title} (コピー)`,
      order: bookChapters.length,
      createdAt: now,
      updatedAt: now,
    };
    await db.saveChapter(duplicatedChapter);

    const chWords = words.filter((w) => w.chapterId === chapter.id);
    for (const w of chWords) {
      const newWordId = `word-${now}-${Math.random().toString(36).substring(2, 6)}`;
      const duplicatedWord: Word = {
        ...w,
        id: newWordId,
        chapterId: newChapterId,
        createdAt: now,
        updatedAt: now,
      };
      await db.saveWord(duplicatedWord);
    }

    await reloadData();
  };

  const handleReorderChapters = async (reordered: Chapter[]) => {
    setChapters(reordered);
    for (const c of reordered) {
      await db.saveChapter(c);
    }
  };

  // --- Word Operations ---
  const handleSaveWord = async (wordData: Partial<Word>) => {
    const now = Date.now();
    const isNew = !wordData.id;
    const targetChapterId = wordData.chapterId || selectedChapter?.id || '';
    const chapterWords = words.filter((w) => w.chapterId === targetChapterId);

    const wordToSave: Word = {
      id: wordData.id || `word-${now}-${Math.random().toString(36).substring(2, 6)}`,
      chapterId: targetChapterId,
      word: wordData.word || '',
      pronunciation: wordData.pronunciation,
      partOfSpeech: wordData.partOfSpeech,
      meanings: wordData.meanings || [],
      examples: wordData.examples || [],
      memo: wordData.memo,
      favorite: wordData.favorite ?? false,
      redSheetRanges: wordData.redSheetRanges || [],
      review: wordData.review || {
        status: 'new',
        nextReviewAt: now,
        interval: 0,
        correctCount: 0,
        forgottenCount: 0,
      },
      order: isNew ? chapterWords.length : chapterWords.find((w) => w.id === wordData.id)?.order ?? 0,
      createdAt: isNew ? now : chapterWords.find((w) => w.id === wordData.id)?.createdAt ?? now,
      updatedAt: now,
    };

    await db.saveWord(wordToSave);
    await reloadData();
  };

  const handleDeleteWord = async (wordId: string) => {
    await db.deleteWord(wordId);
    await reloadData();
  };

  const handleToggleFavorite = async (wordId: string, current: boolean) => {
    const word = words.find((w) => w.id === wordId);
    if (!word) return;
    const updated: Word = {
      ...word,
      favorite: current,
      updatedAt: Date.now(),
    };
    await db.saveWord(updated);
    await reloadData();
  };

  // --- Sticky Note Operations ---
  const handleSaveStickyNote = async (note: StickyNote) => {
    await db.saveStickyNote(note);
    await reloadData();
  };

  const handleDeleteStickyNote = async (noteId: string) => {
    await db.deleteStickyNote(noteId);
    await reloadData();
  };

  // --- Review Operations ---
  const handleFinishReviewSession = async (
    updatedWords: Word[],
    summary: { forgotten: number; vague: number; mastered: number }
  ) => {
    for (const w of updatedWords) {
      await db.saveWord(w);
    }

    const sessionHistory: ReviewSessionHistory = {
      id: `rev-${Date.now()}`,
      timestamp: Date.now(),
      forgottenCount: summary.forgotten,
      vagueCount: summary.vague,
      masteredCount: summary.mastered,
      totalReviewed: updatedWords.length,
    };
    await db.saveReviewHistory(sessionHistory);

    await reloadData();
  };

  // --- Settings Operations ---
  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await db.saveSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2EA] text-[#2C2825]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E11D48] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            言
          </div>
          <div className="text-xs font-bold tracking-widest text-[#7A7167]">
            KOTOBA
          </div>
        </div>
      </div>
    );
  }

  // Calculate due words count for bottom navigation badge
  const now = Date.now();
  const dueReviewCount = words.filter((w) => {
    if (!w.review || !w.review.nextReviewAt) return true;
    return w.review.nextReviewAt <= now;
  }).length;

  // Active Review Flow
  if (activeReviewWords) {
    return (
      <ReviewSessionView
        words={activeReviewWords}
        onFinishSession={handleFinishReviewSession}
        onExit={() => setActiveReviewWords(null)}
      />
    );
  }

  // Word Page Flow (Full Screen, hides standard bottom navigation)
  if (selectedChapter) {
    const chapterWords = words.filter((w) => w.chapterId === selectedChapter.id);
    const bookChapters = selectedBook
      ? chapters.filter((c) => c.bookId === selectedBook.id)
      : chapters;

    return (
      <WordPageView
        chapter={selectedChapter}
        chapters={bookChapters}
        words={chapterWords}
        initialWordIndex={selectedWordIndex}
        stickyNotes={stickyNotes}
        settings={settings}
        onBack={() => setSelectedChapter(null)}
        onSaveWord={handleSaveWord}
        onDeleteWord={handleDeleteWord}
        onSaveStickyNote={handleSaveStickyNote}
        onDeleteStickyNote={handleDeleteStickyNote}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  }

  // Chapter List Flow (When inside a Book)
  if (selectedBook) {
    const bookChapters = chapters.filter((c) => c.bookId === selectedBook.id);
    return (
      <div className="min-h-screen bg-[#F5F2EA]">
        <ChapterListView
          book={selectedBook}
          chapters={bookChapters}
          words={words}
          onBack={() => setSelectedBook(null)}
          onSelectChapter={(ch) => {
            setSelectedChapter(ch);
            setSelectedWordIndex(0);
          }}
          onSaveChapter={handleSaveChapter}
          onDeleteChapter={handleDeleteChapter}
          onDuplicateChapter={handleDuplicateChapter}
          onReorderChapters={handleReorderChapters}
        />
        <BottomNav
          currentTab={activeTab}
          onTabChange={(tab) => {
            setSelectedBook(null);
            setSelectedChapter(null);
            setActiveTab(tab);
          }}
          reviewCount={dueReviewCount}
        />
      </div>
    );
  }

  // Main Tabs: Bookshelf, Review, Settings
  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#2C2825]">
      {activeTab === 'bookshelf' && (
        <BookshelfView
          books={books}
          chapters={chapters}
          words={words}
          onOpenBook={(book) => setSelectedBook(book)}
          onSaveBook={handleSaveBook}
          onDeleteBook={handleDeleteBook}
          onDuplicateBook={handleDuplicateBook}
          onExportBook={handleExportBook}
          onReorderBooks={handleReorderBooks}
        />
      )}

      {activeTab === 'review' && (
        <ReviewHomeView
          books={books}
          chapters={chapters}
          words={words}
          stickyNotes={stickyNotes}
          reviewHistory={reviewHistory}
          onStartReview={(targetWords) => setActiveReviewWords(targetWords)}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsView
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onDataRestored={reloadData}
        />
      )}

      <BottomNav
        currentTab={activeTab}
        onTabChange={(tab) => {
          setSelectedBook(null);
          setSelectedChapter(null);
          setActiveTab(tab);
        }}
        reviewCount={dueReviewCount}
      />
    </div>
  );
}

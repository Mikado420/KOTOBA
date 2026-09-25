import {
  Book,
  Chapter,
  Word,
  StickyNote,
  ReviewSessionHistory,
  AppSettings,
  KotobaBackupData,
} from '../types';

const DB_NAME = 'kotoba_db';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 'md',
  showPageNumber: true,
  showStickyNotes: true,
  paperTexture: true,
  pageAnimation: 'slide',
  theme: 'light',
};

class KotobaDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported on this platform'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Books store
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'id' });
          bookStore.createIndex('order', 'order', { unique: false });
        }

        // Chapters store
        if (!db.objectStoreNames.contains('chapters')) {
          const chapterStore = db.createObjectStore('chapters', { keyPath: 'id' });
          chapterStore.createIndex('bookId', 'bookId', { unique: false });
          chapterStore.createIndex('order', 'order', { unique: false });
        }

        // Words store
        if (!db.objectStoreNames.contains('words')) {
          const wordStore = db.createObjectStore('words', { keyPath: 'id' });
          wordStore.createIndex('chapterId', 'chapterId', { unique: false });
          wordStore.createIndex('order', 'order', { unique: false });
          wordStore.createIndex('favorite', 'favorite', { unique: false });
        }

        // Sticky notes store
        if (!db.objectStoreNames.contains('stickyNotes')) {
          const stickyStore = db.createObjectStore('stickyNotes', { keyPath: 'id' });
          stickyStore.createIndex('wordId', 'wordId', { unique: false });
        }

        // Review history store
        if (!db.objectStoreNames.contains('reviewHistory')) {
          db.createObjectStore('reviewHistory', { keyPath: 'id' });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  // --- Books ---
  async getBooks(): Promise<Book[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const request = store.getAll();
      request.onsuccess = () => {
        const books = (request.result as Book[]) || [];
        books.sort((a, b) => a.order - b.order);
        resolve(books);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveBook(book: Book): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      const request = store.put(book);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBook(bookId: string): Promise<void> {
    const db = await this.getDB();
    // Also cascade delete chapters and words
    const chapters = await this.getChaptersByBook(bookId);
    for (const ch of chapters) {
      await this.deleteChapter(ch.id);
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      const request = store.delete(bookId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Chapters ---
  async getChaptersByBook(bookId: string): Promise<Chapter[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chapters', 'readonly');
      const store = tx.objectStore('chapters');
      const index = store.index('bookId');
      const request = index.getAll(bookId);
      request.onsuccess = () => {
        const chapters = (request.result as Chapter[]) || [];
        chapters.sort((a, b) => a.order - b.order);
        resolve(chapters);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllChapters(): Promise<Chapter[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chapters', 'readonly');
      const store = tx.objectStore('chapters');
      const request = store.getAll();
      request.onsuccess = () => {
        const chapters = (request.result as Chapter[]) || [];
        chapters.sort((a, b) => a.order - b.order);
        resolve(chapters);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveChapter(chapter: Chapter): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chapters', 'readwrite');
      const store = tx.objectStore('chapters');
      const request = store.put(chapter);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteChapter(chapterId: string): Promise<void> {
    const db = await this.getDB();
    const words = await this.getWordsByChapter(chapterId);
    for (const w of words) {
      await this.deleteWord(w.id);
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('chapters', 'readwrite');
      const store = tx.objectStore('chapters');
      const request = store.delete(chapterId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Words ---
  async getWordsByChapter(chapterId: string): Promise<Word[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('words', 'readonly');
      const store = tx.objectStore('words');
      const index = store.index('chapterId');
      const request = index.getAll(chapterId);
      request.onsuccess = () => {
        const words = (request.result as Word[]) || [];
        words.sort((a, b) => a.order - b.order);
        resolve(words);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllWords(): Promise<Word[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('words', 'readonly');
      const store = tx.objectStore('words');
      const request = store.getAll();
      request.onsuccess = () => {
        const words = (request.result as Word[]) || [];
        resolve(words);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getWordById(wordId: string): Promise<Word | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('words', 'readonly');
      const store = tx.objectStore('words');
      const request = store.get(wordId);
      request.onsuccess = () => resolve((request.result as Word) || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveWord(word: Word): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('words', 'readwrite');
      const store = tx.objectStore('words');
      const request = store.put(word);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteWord(wordId: string): Promise<void> {
    const db = await this.getDB();
    const notes = await this.getStickyNotesByWord(wordId);
    for (const n of notes) {
      await this.deleteStickyNote(n.id);
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('words', 'readwrite');
      const store = tx.objectStore('words');
      const request = store.delete(wordId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Sticky Notes ---
  async getStickyNotesByWord(wordId: string): Promise<StickyNote[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('stickyNotes', 'readonly');
      const store = tx.objectStore('stickyNotes');
      const index = store.index('wordId');
      const request = index.getAll(wordId);
      request.onsuccess = () => {
        const notes = (request.result as StickyNote[]) || [];
        notes.sort((a, b) => a.createdAt - b.createdAt);
        resolve(notes);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllStickyNotes(): Promise<StickyNote[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('stickyNotes', 'readonly');
      const store = tx.objectStore('stickyNotes');
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as StickyNote[]) || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveStickyNote(note: StickyNote): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('stickyNotes', 'readwrite');
      const store = tx.objectStore('stickyNotes');
      const request = store.put(note);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteStickyNote(noteId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('stickyNotes', 'readwrite');
      const store = tx.objectStore('stickyNotes');
      const request = store.delete(noteId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Review History ---
  async getReviewHistory(): Promise<ReviewSessionHistory[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reviewHistory', 'readonly');
      const store = tx.objectStore('reviewHistory');
      const request = store.getAll();
      request.onsuccess = () => {
        const history = (request.result as ReviewSessionHistory[]) || [];
        history.sort((a, b) => b.timestamp - a.timestamp);
        resolve(history);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveReviewHistory(historyItem: ReviewSessionHistory): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reviewHistory', 'readwrite');
      const store = tx.objectStore('reviewHistory');
      const request = store.put(historyItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Settings ---
  async getSettings(): Promise<AppSettings> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const request = store.get('app_settings');
        request.onsuccess = () => {
          if (request.result && request.result.settings) {
            resolve({ ...DEFAULT_SETTINGS, ...request.result.settings });
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        };
        request.onerror = () => resolve(DEFAULT_SETTINGS);
      });
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put({ id: 'app_settings', settings });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Full Backup & Restore ---
  async exportBackup(): Promise<KotobaBackupData> {
    const [books, chapters, words, stickyNotes, reviewHistory, settings] = await Promise.all([
      this.getBooks(),
      this.getAllChapters(),
      this.getAllWords(),
      this.getAllStickyNotes(),
      this.getReviewHistory(),
      this.getSettings(),
    ]);

    return {
      formatVersion: 1,
      appName: 'KOTOBA',
      exportedAt: Date.now(),
      books,
      chapters,
      words,
      stickyNotes,
      reviewHistory,
      settings,
    };
  }

  async restoreBackup(data: KotobaBackupData): Promise<void> {
    if (!data || data.appName !== 'KOTOBA') {
      throw new Error('無効なKOTOBAバックアップファイルです。');
    }

    const db = await this.getDB();

    // Clear all stores
    const stores = ['books', 'chapters', 'words', 'stickyNotes', 'reviewHistory', 'settings'];
    const tx = db.transaction(stores, 'readwrite');

    for (const storeName of stores) {
      tx.objectStore(storeName).clear();
    }

    // Populate
    const bookStore = tx.objectStore('books');
    for (const b of data.books || []) bookStore.put(b);

    const chapterStore = tx.objectStore('chapters');
    for (const c of data.chapters || []) chapterStore.put(c);

    const wordStore = tx.objectStore('words');
    for (const w of data.words || []) wordStore.put(w);

    const stickyStore = tx.objectStore('stickyNotes');
    for (const s of data.stickyNotes || []) stickyStore.put(s);

    const historyStore = tx.objectStore('reviewHistory');
    for (const h of data.reviewHistory || []) historyStore.put(h);

    const settingsStore = tx.objectStore('settings');
    if (data.settings) {
      settingsStore.put({ id: 'app_settings', settings: data.settings });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Initial seeding for first launch (creates a sample book with demo red sheet & sticky note)
  async seedIfEmpty(): Promise<boolean> {
    const books = await this.getBooks();
    if (books.length > 0) return false;

    const now = Date.now();

    const sampleBook: Book = {
      id: 'book-sample-1',
      title: '英単語ターゲット・エッセンシャル',
      subtitle: '高校基礎から大学入試までの必修語彙',
      coverColor: '#2D4A3E', // Forest green
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const chapter1: Chapter = {
      id: 'chap-sample-1',
      bookId: sampleBook.id,
      title: '最頻出動詞 10選',
      description: '日常会話から論述まで頻出するコア動詞',
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    const chapter2: Chapter = {
      id: 'chap-sample-2',
      bookId: sampleBook.id,
      title: '感情・状態を表す形容詞',
      description: '心情や客観的評価を表す重要語',
      order: 1,
      createdAt: now,
      updatedAt: now,
    };

    const sampleWords: Word[] = [
      {
        id: 'word-1',
        chapterId: chapter1.id,
        word: 'cherish',
        pronunciation: '/ˈtʃer.ɪʃ/',
        partOfSpeech: '他動詞',
        meanings: ['大切にする', '（心に）抱く', 'かわいがる'],
        examples: [
          {
            text: 'I will always cherish the memories we made together.',
            translation: '私たちは一緒に過ごした思い出をずっと大切にします。',
          },
          {
            text: 'She cherishes the hope of seeing him again.',
            translation: '彼女は彼と再会する希望を心に抱いている。',
          },
        ],
        memo: 'フランス語 chérir（愛する）と同源。dear（親愛な）と関連。',
        favorite: true,
        redSheetRanges: [
          {
            id: 'rs-1-1',
            field: 'meaning',
            meaningIndex: 0,
            start: 0,
            end: 5,
            text: '大切にする',
          },
          {
            id: 'rs-1-2',
            field: 'example',
            exampleIndex: 0,
            exampleField: 'text',
            start: 19,
            end: 26,
            text: 'cherish',
          },
        ],
        review: {
          status: 'learning',
          nextReviewAt: now - 3600000, // Due for review
          interval: 1,
          correctCount: 2,
          forgottenCount: 0,
          lastReviewedAt: now - 86400000,
        },
        order: 0,
        createdAt: now - 100000,
        updatedAt: now,
      },
      {
        id: 'word-2',
        chapterId: chapter1.id,
        word: 'abandon',
        pronunciation: '/əˈbæn.dən/',
        partOfSpeech: '他動詞',
        meanings: ['捨てる', '（計画などを）断念する', '見捨てる'],
        examples: [
          {
            text: 'He had to abandon his dream of studying abroad.',
            translation: '彼は留学の夢を断念せざるを得なかった。',
          },
        ],
        memo: '類義語: give up, desert',
        favorite: false,
        redSheetRanges: [
          {
            id: 'rs-2-1',
            field: 'meaning',
            meaningIndex: 1,
            start: 0,
            end: 14,
            text: '（計画などを）断念する',
          },
        ],
        review: {
          status: 'new',
          nextReviewAt: now,
          interval: 0,
          correctCount: 0,
          forgottenCount: 0,
        },
        order: 1,
        createdAt: now - 90000,
        updatedAt: now,
      },
      {
        id: 'word-3',
        chapterId: chapter1.id,
        word: 'acquire',
        pronunciation: '/əˈkwaɪ.ər/',
        partOfSpeech: '他動詞',
        meanings: ['習得する', '獲得する', '買い取る'],
        examples: [
          {
            text: 'Children easily acquire language skills through play.',
            translation: '子どもたちは遊びを通じて言語能力を容易に習得する。',
          },
        ],
        memo: '名詞形は acquisition（獲得、習得）',
        favorite: true,
        redSheetRanges: [
          {
            id: 'rs-3-1',
            field: 'meaning',
            meaningIndex: 0,
            start: 0,
            end: 4,
            text: '習得する',
          },
        ],
        review: {
          status: 'new',
          nextReviewAt: now,
          interval: 0,
          correctCount: 0,
          forgottenCount: 0,
        },
        order: 2,
        createdAt: now - 80000,
        updatedAt: now,
      },
      {
        id: 'word-4',
        chapterId: chapter2.id,
        word: 'meticulous',
        pronunciation: '/məˈtɪk.jə.ləs/',
        partOfSpeech: '形容詞',
        meanings: ['細部まで几帳面な', '極めて慎重な'],
        examples: [
          {
            text: 'He is meticulous about keeping his notebook organized.',
            translation: '彼はノートを几帳面に整理することに余念がない。',
          },
        ],
        memo: 'ネガティブにもポジティブにも使われる。careful より細かいニュアンス。',
        favorite: false,
        redSheetRanges: [
          {
            id: 'rs-4-1',
            field: 'word',
            start: 0,
            end: 10,
            text: 'meticulous',
          },
          {
            id: 'rs-4-2',
            field: 'meaning',
            meaningIndex: 0,
            start: 0,
            end: 8,
            text: '細部まで几帳面な',
          },
        ],
        review: {
          status: 'review',
          nextReviewAt: now + 86400000 * 2,
          interval: 3,
          correctCount: 3,
          forgottenCount: 1,
          lastReviewedAt: now - 86400000,
        },
        order: 0,
        createdAt: now - 70000,
        updatedAt: now,
      },
    ];

    const sampleSticky: StickyNote = {
      id: 'sticky-1',
      wordId: 'word-1',
      color: 'yellow',
      title: '英作文で頻出',
      body: 'cherish + 目的語（思い出、希望、友情）。日常会話でも温かいニュアンスで使える。',
      createdAt: now,
    };

    const sampleSticky2: StickyNote = {
      id: 'sticky-2',
      wordId: 'word-1',
      color: 'red',
      title: '発音注意',
      body: 'アクセントは第1音節（チェリッシュ）。',
      createdAt: now + 1,
    };

    await this.saveBook(sampleBook);
    await this.saveChapter(chapter1);
    await this.saveChapter(chapter2);
    for (const w of sampleWords) {
      await this.saveWord(w);
    }
    await this.saveStickyNote(sampleSticky);
    await this.saveStickyNote(sampleSticky2);

    return true;
  }
}

export const db = new KotobaDB();

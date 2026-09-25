export type StickyColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export interface RedSheetRange {
  id: string;
  field: 'word' | 'meaning' | 'example' | 'memo';
  meaningIndex?: number;
  exampleIndex?: number;
  exampleField?: 'text' | 'translation';
  start: number;
  end: number;
  text: string;
}

export interface WordReview {
  status: 'new' | 'learning' | 'review' | 'mastered';
  nextReviewAt: number; // timestamp
  interval: number; // in days (0, 1, 3, 7, 14, 30)
  correctCount: number;
  forgottenCount: number;
  lastReviewedAt?: number;
}

export interface ExampleSentence {
  text: string;
  translation: string;
}

export interface Word {
  id: string;
  chapterId: string;
  word: string;
  pronunciation?: string;
  partOfSpeech?: string; // 品詞 (動詞, 名詞, 形容詞, etc.)
  meanings: string[];
  examples: ExampleSentence[];
  memo?: string;
  favorite: boolean;
  redSheetRanges: RedSheetRange[];
  review: WordReview;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface StickyNote {
  id: string;
  wordId: string;
  color: StickyColor;
  title?: string;
  body?: string;
  createdAt: number;
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  description?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  coverColor: string; // e.g. '#2F4858', '#9B2226', '#005F73', '#6B705C'
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface ReviewSessionHistory {
  id: string;
  timestamp: number;
  forgottenCount: number;
  vagueCount: number;
  masteredCount: number;
  totalReviewed: number;
}

export interface AppSettings {
  fontSize: 'sm' | 'md' | 'lg';
  showPageNumber: boolean;
  showStickyNotes: boolean;
  paperTexture: boolean;
  pageAnimation: 'slide' | 'fade' | 'none';
  theme: 'light' | 'dark' | 'system';
}

export interface KotobaBackupData {
  formatVersion: number;
  appName: 'KOTOBA';
  exportedAt: number;
  books: Book[];
  chapters: Chapter[];
  words: Word[];
  stickyNotes: StickyNote[];
  reviewHistory: ReviewSessionHistory[];
  settings: AppSettings;
}

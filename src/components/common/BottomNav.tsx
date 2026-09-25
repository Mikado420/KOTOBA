import React from 'react';
import { BookOpen, Brain, Settings } from 'lucide-react';

export type NavTab = 'bookshelf' | 'review' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  reviewCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  reviewCount = 0,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F0]/95 backdrop-blur-md border-t border-[#E8E2D2] pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-3 h-16 items-center px-4">
        {/* Bookshelf */}
        <button
          onClick={() => onTabChange('bookshelf')}
          className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
            currentTab === 'bookshelf'
              ? 'text-[#2C2825] font-semibold'
              : 'text-[#9E9487] hover:text-[#524A42]'
          }`}
          aria-label="本棚"
        >
          <BookOpen className={`w-5 h-5 ${currentTab === 'bookshelf' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] tracking-tight mt-1">本棚</span>
        </button>

        {/* Review */}
        <button
          onClick={() => onTabChange('review')}
          className={`relative flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
            currentTab === 'review'
              ? 'text-[#E11D48] font-semibold'
              : 'text-[#9E9487] hover:text-[#524A42]'
          }`}
          aria-label="復習"
        >
          <div className="relative">
            <Brain className={`w-5 h-5 ${currentTab === 'review' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
            {reviewCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#E11D48] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {reviewCount > 99 ? '99+' : reviewCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight mt-1">復習</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
            currentTab === 'settings'
              ? 'text-[#2C2825] font-semibold'
              : 'text-[#9E9487] hover:text-[#524A42]'
          }`}
          aria-label="設定"
        >
          <Settings className={`w-5 h-5 ${currentTab === 'settings' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] tracking-tight mt-1">設定</span>
        </button>
      </div>
    </nav>
  );
};

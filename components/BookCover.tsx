
import React from 'react';

interface BookCoverProps {
  onOpen: () => void;
  isOpen: boolean;
}

const BookCover: React.FC<BookCoverProps> = ({ onOpen, isOpen }) => {
  return (
    <div 
      onClick={onOpen}
      className={`absolute inset-0 z-[100] cursor-pointer transition-all duration-1000 origin-left preserve-3d shadow-2xl
        ${isOpen ? 'rotate-y-[-140deg] opacity-0 pointer-events-none' : 'rotate-y-0 opacity-100'}
      `}
      style={{ 
        transformStyle: 'preserve-3d',
        backgroundColor: '#5d534a',
        borderRadius: '5px 20px 20px 5px',
        border: '1px solid rgba(0,0,0,0.2)'
      }}
    >
      {/* Cover Front */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-white backface-hidden">
        <div className="w-full h-full border-4 border-amber-100/20 rounded-xl flex flex-col items-center justify-center relative">
          <div className="text-6xl mb-6 filter drop-shadow-lg">📔</div>
          <h1 className="text-3xl font-bold tracking-[0.2em] mb-2 text-amber-50">牟牟的食譜帳</h1>
          <div className="w-24 h-px bg-amber-100/30 my-4"></div>
          <p className="text-[10px] uppercase tracking-[0.5em] text-amber-100/60 font-bold">MOU CHEF'S COOKBOOK</p>
          
          <div className="absolute bottom-8 text-[10px] text-amber-100/40 italic">
            Since 2025 - Handcrafted with Love
          </div>
          
          {/* Decorative Corner */}
          <div className="absolute top-4 right-4 text-2xl opacity-20">🌿</div>
          <div className="absolute bottom-4 left-4 text-2xl opacity-20">🍳</div>
        </div>
      </div>
      
      {/* Cover Back (The inside of the cover) */}
      <div className="absolute inset-0 bg-[#4e463e] rotate-y-180 backface-hidden rounded-[5px_20px_20px_5px]"></div>
    </div>
  );
};

export default BookCover;

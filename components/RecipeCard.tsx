
import React from 'react';
import { Recipe } from '../types';
import { CATEGORY_ICONS } from '../constants';

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  onClick: (recipe: Recipe) => void;
  onToggleFavorite: (id: number) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, index, onClick, onToggleFavorite }) => {
  const isDataUrl = recipe.image?.startsWith('data:image');
  const icon = recipe.image || CATEGORY_ICONS[recipe.category] || '📖';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(recipe.id);
  };

  return (
    <div 
      onClick={() => onClick(recipe)}
      className="modern-card p-6 cursor-pointer relative group animate-slide-up h-full flex flex-col"
    >
      <div className="flex justify-between items-start mb-6 relative">
        <div className="w-20 h-20 flex items-center justify-center text-6xl drop-shadow-xl group-hover:scale-110 transition-transform duration-500">
          {isDataUrl ? (
            <img src={recipe.image} className="w-full h-full object-cover rounded-2xl shadow-sm" alt={recipe.title} />
          ) : (
            icon
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <button 
             onClick={handleToggle}
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border bg-white active:scale-125 ${recipe.isFavorite ? 'text-red-500 border-red-100' : 'text-gray-300 border-gray-100 hover:text-red-200'}`}
           >
             <span className="text-xl">{recipe.isFavorite ? '❤️' : '🤍'}</span>
           </button>
           <span className="px-3 py-1 text-[10px] rounded-full bg-gray-50 text-gray-400 font-black tracking-widest uppercase border border-gray-100">
             {recipe.category}
           </span>
        </div>
      </div>
      <h3 className="text-xl font-bold mb-4 text-gray-800 leading-snug group-hover:text-amber-800 transition-colors flex-grow">
        {recipe.title}
      </h3>
    </div>
  );
};

export default RecipeCard;

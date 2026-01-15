
import React, { useState, useEffect } from 'react';
import { Recipe, FridgeItem } from '../types';
import { CATEGORY_ICONS } from '../constants';

interface RecipeDetailProps {
  recipe: Recipe;
  allRecipes: Recipe[];
  fridgeItems: FridgeItem[];
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ 
  recipe, fridgeItems, onClose, onEdit, onDelete, onToggleFavorite, onUpdateNotes
}) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState(recipe?.notes || '');

  useEffect(() => {
    if (recipe) setTempNotes(recipe.notes || '');
  }, [recipe?.id, recipe?.notes]);

  if (!recipe) return null;

  const toggleCheck = (id: string) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setCheckedItems(newSet);
  };

  const handleNotesBlur = () => {
    setIsEditingNotes(false);
    onUpdateNotes(recipe.id, tempNotes);
  };

  const isDataUrl = recipe.image?.startsWith('data:image');

  const isInFridge = (itemText: string) => {
    if (!itemText || !Array.isArray(fridgeItems)) return false;
    return fridgeItems.some(item => 
      item && item.name && itemText.toLowerCase().includes(item.name.toLowerCase())
    );
  };

  const safeIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const safeSeasonings = Array.isArray(recipe.seasonings) ? recipe.seasonings : [];
  const safeSteps = Array.isArray(recipe.steps) ? recipe.steps : [];

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-[#fcfaf2] w-full max-w-lg h-[90vh] rounded-[3rem] overflow-y-auto p-8 sm:p-10 border-4 border-amber-900/5 relative shadow-2xl scrollbar-hide">
        <div className="flex justify-between items-center mb-6 relative z-10">
          <button 
            onClick={onClose}
            className="text-[10px] font-black tracking-widest uppercase text-amber-800 bg-amber-100/80 px-5 py-2.5 rounded-2xl hover:bg-amber-200 transition-colors"
          >
            ← Back
          </button>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => onToggleFavorite(recipe.id)}
              className={`text-xl transition-all active:scale-125 ${recipe.isFavorite ? 'text-red-500' : 'text-gray-300 hover:text-red-300'}`}
            >
              {recipe.isFavorite ? '❤️' : '🤍'}
            </button>
            <button onClick={() => onEdit(recipe)} className="text-[10px] text-amber-600 font-black uppercase tracking-widest underline">Edit</button>
            <button onClick={() => onDelete(recipe.id)} className="text-[10px] text-red-400 font-black uppercase tracking-widest opacity-50 hover:opacity-100">Delete</button>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 flex items-center justify-center text-7xl filter drop-shadow-2xl">
              {isDataUrl ? (
                <img src={recipe.image} className="w-full h-full object-cover rounded-[2rem] shadow-xl border-4 border-white" alt={recipe.title} />
              ) : (
                recipe.image || CATEGORY_ICONS[recipe.category]
              )}
            </div>
          </div>
          <h2 className="text-2xl font-black text-amber-900 relative inline-block px-4">
            {recipe.title}
            <div className="absolute -bottom-1 left-0 w-full h-3 bg-amber-200/30 -z-10 rotate-1 rounded-full"></div>
          </h2>
          
          {recipe.sourceUrl && (
            <div className="mt-3 flex justify-center">
              <a 
                href={recipe.sourceUrl.startsWith('http') ? recipe.sourceUrl : `https://${recipe.sourceUrl}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] font-black text-amber-800/40 hover:text-amber-800 flex items-center gap-1.5 px-3 py-1 bg-white/40 rounded-full transition-all border border-transparent hover:border-amber-100 uppercase tracking-widest"
              >
                <span>🔗</span> 食譜來源
              </a>
            </div>
          )}
        </div>
        
        <div className="mb-6 bg-white/60 p-6 rounded-[2rem] shadow-sm border border-white">
          <h4 className="font-black text-amber-800 mb-4 flex items-center gap-2 text-md uppercase tracking-tight">
             <span className="text-lg">🥕</span>
             主要食材
          </h4>
          <div className="grid grid-cols-1 gap-2.5">
            {safeIngredients.map((ing, idx) => {
              const checkId = `ing-${idx}`;
              const available = isInFridge(ing);
              return (
                <div 
                  key={idx}
                  onClick={() => toggleCheck(checkId)}
                  className={`flex items-center gap-3 cursor-pointer transition-all duration-300 ${checkedItems.has(checkId) ? 'opacity-30 line-through translate-x-2' : ''}`}
                >
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shadow-sm"></span>
                  <span className="text-gray-700 font-bold text-sm">{ing}</span>
                  {available && (
                    <span className="ml-auto flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">
                      ✅ 已有
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {safeSeasonings.length > 0 && (
          <div className="mb-6 bg-amber-50/30 p-6 rounded-[2rem] shadow-sm border border-amber-100/50">
            <h4 className="font-black text-amber-800 mb-4 flex items-center gap-2 text-md uppercase tracking-tight">
               <span className="text-lg">🧂</span>
               調味配方
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              {safeSeasonings.map((sea, idx) => {
                const checkId = `sea-${idx}`;
                const available = isInFridge(sea);
                return (
                  <div 
                    key={idx}
                    onClick={() => toggleCheck(checkId)}
                    className={`flex items-center gap-3 cursor-pointer transition-all duration-300 ${checkedItems.has(checkId) ? 'opacity-30 line-through translate-x-2' : ''}`}
                  >
                    <span className="w-1.5 h-1.5 bg-amber-200 rounded-full"></span>
                    <span className="text-gray-600 font-bold italic text-sm">{sea}</span>
                    {available && (
                      <span className="ml-auto flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">
                        ✅ 已有
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h4 className="font-black text-amber-800 mb-5 flex items-center gap-2 text-md uppercase tracking-tight">
             <span className="text-lg">👩‍🍳</span>
             烹飪步驟
          </h4>
          <div className="space-y-4">
            {safeSteps.map((step, idx) => {
              const checkId = `step-${idx}`;
              return (
                <div 
                  key={idx} 
                  onClick={() => toggleCheck(checkId)}
                  className={`flex gap-4 cursor-pointer transition-all duration-300 ${checkedItems.has(checkId) ? 'opacity-30 line-through grayscale translate-x-1' : ''}`}
                >
                  <span className="flex-shrink-0 w-6 h-6 bg-[#5d534a] text-white text-[9px] flex items-center justify-center rounded-xl font-black shadow-md border border-white">
                    {idx + 1}
                  </span>
                  <p className="text-gray-700 font-medium text-sm leading-snug">{step}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 p-6 bg-amber-50/50 rounded-[2rem] border border-amber-100 shadow-inner group transition-all">
          <h4 className="text-[9px] font-black text-amber-800 uppercase tracking-widest opacity-40 mb-2">Chef's Notes 📝</h4>
          {isEditingNotes ? (
            <textarea
              autoFocus
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              onBlur={handleNotesBlur}
              className="w-full bg-transparent border-none outline-none text-gray-600 font-medium italic text-sm leading-snug whitespace-pre-line min-h-[80px] resize-none focus:ring-0 p-0"
            />
          ) : (
            <p onClick={() => setIsEditingNotes(true)} className="text-gray-600 font-medium italic text-sm leading-snug whitespace-pre-line cursor-pointer min-h-[20px]">
              {recipe.notes || "記下你的美味筆記..."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;

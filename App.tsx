
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Gun from 'gun';
import { Recipe, Page, CategoryType, FridgeItem, FridgeCategory } from './types.ts';
import { CATEGORY_ICONS, DEFAULT_RECIPE, CATEGORY_COLORS } from './constants.tsx';
import RecipeCard from './components/RecipeCard.tsx';
import RecipeDetail from './components/RecipeDetail.tsx';
import { parseRecipeWithAI, parseRecipeFromImage } from './services/geminiService.ts';

// 初始化 Gun.js，使用更多穩定的公用節點
const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://relay.pear.social/gun',
    'https://gun-server.herokuapp.com/gun',
    'https://gundb-relay.onrender.com/gun',
    'https://gun-ams1.marda.no/gun'
  ],
  localStorage: false // 禁用 Gun 自帶的 localStorage，由我們手動控制以獲得更好的效能
});

const ITEMS_PER_PAGE = 10;
const FRIDGE_CATEGORIES: FridgeCategory[] = ['食材', '調味料', '常溫區'];

const CloudSyncIcon = ({ className, active, syncing }: { className?: string, active?: boolean, syncing?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} ${active ? 'text-blue-500' : 'text-gray-300'} ${syncing ? 'animate-spin' : ''}`}>
    <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.8-4.2-4.1-4.5C17.4 6.7 14.5 4 11 4 8.2 4 5.8 5.6 4.6 8 2.3 8.8 1 11.2 1 13.5 1 16.5 3.5 19 6.5 19h11z" />
    {active && !syncing && <path d="M9 13l2 2 4-4" stroke="currentColor" strokeWidth="2" />}
  </svg>
);

const FridgeIconLineArt = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 3h14c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z" />
    <path d="M3 10h18" />
    <path d="M9 5v2" />
    <path d="M9 13v4" />
  </svg>
);

const DoraemonChefIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 125" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="72" r="38" fill="#00A1E9" stroke="#333" strokeWidth="1.5" />
    <circle cx="50" cy="78" r="30" fill="white" stroke="#333" strokeWidth="1.2" />
    <ellipse cx="43" cy="58" rx="7.5" ry="10" fill="white" stroke="#333" strokeWidth="1.5" />
    <ellipse cx="57" cy="58" rx="7.5" ry="10" fill="white" stroke="#333" strokeWidth="1.5" />
    <circle cx="45" cy="61" r="1.8" fill="black" />
    <circle cx="55" cy="61" r="1.8" fill="black" />
    <circle cx="50" cy="68" r="4.5" fill="#E4002B" stroke="#333" strokeWidth="1" />
    <circle cx="48.5" cy="66.5" r="1.2" fill="white" />
    <path d="M50 72.5V85" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M35 84C40 92 60 92 65 84" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <line x1="22" y1="70" x2="36" y2="74" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="20" y1="80" x2="36" y2="80" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="22" y1="90" x2="36" y2="86" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="78" y1="70" x2="64" y2="74" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="80" y1="80" x2="64" y2="80" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="78" y1="90" x2="64" y2="86" stroke="#333" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M25 102C35 110 65 110 75 102" stroke="#E4002B" strokeWidth="4" strokeLinecap="round" />
    <circle cx="50" cy="110" r="7" fill="#FFD700" stroke="#333" strokeWidth="1" />
    <line x1="43" y1="108" x2="57" y2="108" stroke="#333" strokeWidth="1" />
    <circle cx="50" cy="112" r="1.5" fill="#333" />
    <path d="M42 104L35 112L42 116Z" fill="#E4002B" stroke="#333" strokeWidth="0.8" />
    <path d="M58 104L65 112L58 116Z" fill="#E4002B" stroke="#333" strokeWidth="0.8" />
    <g transform="translate(0, -6)">
      <path d="M35 38C35 25 40 16 50 16C60 16 65 25 65 38H35Z" fill="white" stroke="#333" strokeWidth="1.5" />
      <path d="M40 18C38 12 42 4 50 4C58 4 62 12 60 18" stroke="#333" strokeWidth="1.5" fill="white" />
      <rect x="34" y="32" width="32" height="8" rx="2" fill="white" stroke="#333" strokeWidth="1.5" />
    </g>
  </svg>
);

const ImageCropper = ({ src, onCancel, onConfirm }: { src: string, onCancel: () => void, onConfirm: (croppedBase64: string) => void }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgStyle, setImgStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerAR = containerRect.width / containerRect.height;
    const imgAR = img.naturalWidth / img.naturalHeight;
    let initialStyle: React.CSSProperties = { opacity: 1 };
    let initialX = 0; let initialY = 0;
    if (imgAR > containerAR) {
      initialStyle.height = '100%'; initialStyle.width = 'auto';
      const renderedWidth = containerRect.height * imgAR;
      initialX = (containerRect.width - renderedWidth) / 2;
    } else {
      initialStyle.width = '100%'; initialStyle.height = 'auto';
      const renderedHeight = containerRect.width / imgAR;
      initialY = (containerRect.height - renderedHeight) / 2;
    }
    setImgStyle(initialStyle);
    setPosition({ x: initialX, y: initialY });
    setZoom(1);
  };

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };
  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };
  const handleEnd = () => setIsDragging(false);
  const handleCrop = () => {
    if (!containerRef.current || !imgRef.current) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 800;
    canvas.width = size; canvas.height = size;
    const rect = containerRef.current.getBoundingClientRect();
    const imgRect = imgRef.current.getBoundingClientRect();
    const scale = imgRef.current.naturalWidth / imgRect.width;
    const sourceX = (rect.left - imgRect.left) * scale;
    const sourceY = (rect.top - imgRect.top) * scale;
    const sourceWidth = rect.width * scale;
    const sourceHeight = rect.height * scale;
    ctx.drawImage(imgRef.current, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);
    onConfirm(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[300] flex flex-col items-center justify-center p-6 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-[3rem] p-8 flex flex-col gap-6 shadow-2xl">
        <h3 className="text-xl font-black text-center text-gray-800">🖼️ 調整照片範圍</h3>
        <div 
          ref={containerRef}
          className="w-full aspect-square bg-gray-100 rounded-3xl overflow-hidden relative cursor-move touch-none border-2 border-gray-100"
          onMouseDown={e => handleStart(e.clientX, e.clientY)}
          onMouseMove={e => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handleEnd}
        >
          <img 
            ref={imgRef}
            src={src} 
            alt="cropper" 
            onLoad={handleImageLoad}
            className="absolute max-w-none transition-transform duration-75 select-none pointer-events-none"
            style={{ 
              ...imgStyle,
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transformOrigin: 'center'
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span>縮放比例</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input type="range" min="0.5" max="3" step="0.01" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-full accent-[#5d534a]" />
        </div>
        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold active-push">取消</button>
          <button onClick={handleCrop} className="flex-1 py-4 bg-[#5d534a] text-white rounded-2xl font-bold shadow-lg active-push">確認裁切</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('mou_recipes');
    return saved ? JSON.parse(saved) : [DEFAULT_RECIPE];
  });
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>(() => {
    const saved = localStorage.getItem('mou_fridge');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentPage, setCurrentPage] = useState<Page>(Page.Home);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('目錄');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageIndex, setPageIndex] = useState(0); 
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Multi-device sync state
  const [kitchenId, setKitchenId] = useState<string>(() => localStorage.getItem('mou_kitchen_id') || '');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [isGunConnected, setIsGunConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const kitchenNode = useRef<any>(null);

  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [croppingTarget, setCroppingTarget] = useState<'ai' | 'cover' | null>(null);
  const [croppingMimeType, setCroppingMimeType] = useState('image/jpeg');
  const [editingFridgeId, setEditingFridgeId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const aiImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // 偵測 Gun.js 節點連線狀態
    const interval = setInterval(() => {
       // Gun 不提供直接的連線狀態 API，但我們可以檢查內部連線
       // 簡單假設：如果有網路且 kitchenId 已設定，通常會嘗試連線
       setIsGunConnected(navigator.onLine && !!kitchenId);
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [kitchenId]);

  // Initialize Gun listeners if kitchenId exists
  useEffect(() => {
    if (kitchenId) {
      connectToKitchen(kitchenId);
    }
  }, []);

  const connectToKitchen = (id: string) => {
    const cleanId = id.trim().toUpperCase();
    if (!cleanId) return;
    
    setIsSyncing(true);
    setKitchenId(cleanId);
    localStorage.setItem('mou_kitchen_id', cleanId);
    
    // 建立廚房節點
    kitchenNode.current = gun.get('mou_cookbook_v2').get(cleanId);

    // 監聽食譜同步 (使用 map().on 以監聽集合變動)
    kitchenNode.current.get('recipes').map().on((data: any, key: string) => {
      if (data === null) {
        setRecipes(prev => prev.filter(r => r.id.toString() !== key));
        return;
      }
      try {
        const remoteRecipe: Recipe = typeof data === 'string' ? JSON.parse(data) : data;
        setRecipes(prev => {
          const exists = prev.find(r => r.id.toString() === key);
          if (exists) {
            // 只在有差異時更新，避免無窮迴圈
            if (JSON.stringify(exists) !== JSON.stringify(remoteRecipe)) {
              return prev.map(r => r.id.toString() === key ? remoteRecipe : r);
            }
            return prev;
          }
          // 若不存在，新增至列表
          return [...prev, remoteRecipe];
        });
        setIsSyncing(false);
      } catch (e) {
        console.error("Sync parse error", e);
      }
    });

    // 監聽冰箱同步
    kitchenNode.current.get('fridge').map().on((data: any, key: string) => {
      if (data === null) {
        setFridgeItems(prev => prev.filter(i => i.id.toString() !== key));
        return;
      }
      try {
        const remoteItem: FridgeItem = typeof data === 'string' ? JSON.parse(data) : data;
        setFridgeItems(prev => {
          const exists = prev.find(i => i.id.toString() === key);
          if (exists) {
            if (JSON.stringify(exists) !== JSON.stringify(remoteItem)) {
              return prev.map(i => i.id.toString() === key ? remoteItem : i);
            }
            return prev;
          }
          return [...prev, remoteItem];
        });
      } catch (e) {
        console.error("Fridge sync error", e);
      }
    });
    
    // 設定短暫延遲後關閉同步中動畫
    setTimeout(() => setIsSyncing(false), 2000);
  };

  useEffect(() => {
    setPageIndex(0);
  }, [selectedCategory, searchTerm, currentPage]);

  useEffect(() => {
    localStorage.setItem('mou_recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('mou_fridge', JSON.stringify(fridgeItems));
  }, [fridgeItems]);

  const allFilteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const isFavPage = currentPage === Page.Favorites;
      const matchFav = isFavPage ? r.isFavorite : true;
      const matchCat = (selectedCategory === '目錄' || r.category === selectedCategory);
      const matchSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchFav && matchCat && matchSearch;
    });
  }, [recipes, selectedCategory, searchTerm, currentPage]);

  const paginatedRecipes = useMemo(() => {
    const start = pageIndex * ITEMS_PER_PAGE;
    return allFilteredRecipes.slice(start, start + ITEMS_PER_PAGE);
  }, [allFilteredRecipes, pageIndex]);

  const totalPages = Math.ceil(allFilteredRecipes.length / ITEMS_PER_PAGE);

  const toggleFavorite = (id: number) => {
    const updated = recipes.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r);
    setRecipes(updated);
    const item = updated.find(r => r.id === id);
    if (item && kitchenId && kitchenNode.current) {
      kitchenNode.current.get('recipes').get(id.toString()).put(JSON.stringify(item));
    }
    if (selectedRecipe && selectedRecipe.id === id) {
      setSelectedRecipe(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const handleUpdateNotes = (id: number, notes: string) => {
    const updated = recipes.map(r => r.id === id ? { ...r, notes } : r);
    setRecipes(updated);
    const item = updated.find(r => r.id === id);
    if (item && kitchenId && kitchenNode.current) {
      kitchenNode.current.get('recipes').get(id.toString()).put(JSON.stringify(item));
    }
    if (selectedRecipe && selectedRecipe.id === id) {
      setSelectedRecipe(prev => prev ? { ...prev, notes } : null);
    }
  };

  const handleSave = () => {
    if (!formData.title) return alert('請輸入食譜名稱');
    const processArray = (input: any): string[] => {
      if (Array.isArray(input)) return input.filter(item => typeof item === 'string' && item.trim() !== '');
      if (typeof input === 'string') return input.split('\n').map(s => s.trim()).filter(Boolean);
      return [];
    };
    const newRecipe: Recipe = {
      id: formData.id || Date.now(),
      title: formData.title || '未命名食譜',
      category: (formData.category as any) || '東式',
      image: formData.image || CATEGORY_ICONS[formData.category || '東式'] || '📖',
      ingredients: processArray(formData.ingredients),
      seasonings: processArray(formData.seasonings),
      steps: processArray(formData.steps),
      notes: formData.notes || '',
      sourceUrl: formData.sourceUrl || '',
      isFavorite: formData.isFavorite || false
    };

    if (formData.id) {
      setRecipes(prev => prev.map(r => r.id === newRecipe.id ? newRecipe : r));
    } else {
      setRecipes(prev => [...prev, newRecipe]);
    }

    // 同步到 Gun.js
    if (kitchenId && kitchenNode.current) {
      kitchenNode.current.get('recipes').get(newRecipe.id.toString()).put(JSON.stringify(newRecipe));
    }

    setCurrentPage(Page.Home);
  };

  const handleDeleteRecipe = (id: number) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    if (kitchenId && kitchenNode.current) {
      kitchenNode.current.get('recipes').get(id.toString()).put(null);
    }
    setShowDeleteConfirm(null);
    setSelectedRecipe(null);
  };

  const handleAddFridgeItem = () => {
    if (!newFridgeName.trim()) return;
    const newItem: FridgeItem = { id: Date.now(), name: newFridgeName, category: newFridgeCat, quantity: 1 };
    setFridgeItems(prev => [...prev, newItem]);
    
    if (kitchenId && kitchenNode.current) {
      kitchenNode.current.get('fridge').get(newItem.id.toString()).put(JSON.stringify(newItem));
    }
    
    setNewFridgeName('');
    setIsFridgeAddOpen(false);
  };

  const handleUpdateFridgeItem = (id: number) => {
    if (editingValue.trim()) {
      const updated = fridgeItems.map(item => item.id === id ? { ...item, name: editingValue } : item);
      setFridgeItems(updated);
      const item = updated.find(i => i.id === id);
      if (item && kitchenId && kitchenNode.current) {
        kitchenNode.current.get('fridge').get(id.toString()).put(JSON.stringify(item));
      }
    }
    setEditingFridgeId(null);
  };

  const handleDeleteFridgeItem = (id: number) => {
    setFridgeItems(prev => prev.filter(i => i.id !== id));
    if (kitchenId && kitchenNode.current) {
      kitchenNode.current.get('fridge').get(id.toString()).put(null);
    }
  };

  const startEdit = (recipe: Recipe) => {
    setFormData(recipe);
    setCurrentPage(Page.Edit);
    setSelectedRecipe(null);
  };

  const handleAIParse = async () => {
    if (!isOnline) return;
    if (!aiInput.trim()) return;
    setIsParsing(true);
    try {
      const parsed = await parseRecipeWithAI(aiInput);
      const newRecipe = { ...parsed, id: Date.now(), isFavorite: false };
      setRecipes(prev => [...prev, newRecipe]);
      
      if (kitchenId && kitchenNode.current) {
        kitchenNode.current.get('recipes').get(newRecipe.id.toString()).put(JSON.stringify(newRecipe));
      }
      
      setIsAIModalOpen(false);
      setAiInput('');
      setSelectedRecipe(newRecipe);
    } catch (e) { alert('解析失敗'); } finally { setIsParsing(false); }
  };

  const onImageSelected = (e: React.ChangeEvent<HTMLInputElement>, target: 'ai' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCroppingImage(event.target?.result as string);
      setCroppingTarget(target);
      setCroppingMimeType(file.type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropperConfirm = async (croppedBase64: string) => {
    const target = croppingTarget;
    setCroppingImage(null);
    setCroppingTarget(null);
    if (target === 'ai') {
      setIsParsing(true);
      try {
        const base64Data = croppedBase64.split(',')[1];
        const parsed = await parseRecipeFromImage(base64Data, croppingMimeType);
        const newRecipe = { ...parsed, id: Date.now(), isFavorite: false, image: croppedBase64 };
        setRecipes(prev => [...prev, newRecipe]);
        
        if (kitchenId && kitchenNode.current) {
          kitchenNode.current.get('recipes').get(newRecipe.id.toString()).put(JSON.stringify(newRecipe));
        }

        setIsAIModalOpen(false);
        setSelectedRecipe(newRecipe);
      } catch (err) { alert('照片辨識失敗，請換一張試試看！'); } finally { setIsParsing(false); }
    } else if (target === 'cover') {
      setFormData({ ...formData, image: croppedBase64 });
    }
  };

  const [formData, setFormData] = useState<Partial<Recipe>>({
    title: '', category: '東式', image: '🍱', ingredients: [], seasonings: [], steps: [], notes: '', sourceUrl: ''
  });
  const [isFridgeAddOpen, setIsFridgeAddOpen] = useState(false);
  const [newFridgeName, setNewFridgeName] = useState('');
  const [newFridgeCat, setNewFridgeCat] = useState<FridgeCategory>('食材');
  const isDataUrl = formData.image?.startsWith('data:image');

  return (
    <div className="journal-container min-h-screen pb-20 overflow-hidden flex flex-col relative">
      {/* 離線指示 Banner */}
      <div className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 overflow-hidden ${!isOnline ? 'h-8' : 'h-0'}`}>
        <div className="bg-amber-800/90 backdrop-blur-md text-white text-[10px] py-2 text-center font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
          <span className="animate-pulse">●</span> Offline Mode 離線模式
        </div>
      </div>

      <nav className={`sticky top-0 bg-white/70 backdrop-blur-xl z-50 p-4 px-6 flex justify-between items-center border-b border-gray-100/50 transition-all ${!isOnline ? 'mt-8' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-blue-50/50 shadow-inner flex items-center justify-center cursor-pointer active-push overflow-hidden p-1.5 border-2 border-blue-100 relative"
               onClick={() => { setCurrentPage(Page.Home); setSelectedCategory('目錄'); setSelectedRecipe(null); }}>
            <DoraemonChefIcon className="w-full h-full" />
            <div className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          </div>
          {kitchenId && (
            <div className="hidden sm:block">
              <span className="text-[8px] font-black text-blue-500/50 uppercase tracking-widest">Linked Kitchen</span>
              <p className="text-[10px] font-bold text-blue-900/60 leading-none">{kitchenId}</p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center text-center cursor-pointer" onClick={() => { setCurrentPage(Page.Home); setSelectedCategory('目錄'); setSelectedRecipe(null); }}>
          <h1 className="text-lg font-black text-[#5d534a] tracking-[0.2em] leading-tight">牟牟的食譜帳</h1>
          <span className="text-[8px] font-bold text-amber-600/60 tracking-widest uppercase text-center">MOU CHEF'S COOKBOOK</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSyncModalOpen(true)} className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-gray-50 active-push transition-all">
            <CloudSyncIcon className="w-6 h-6" active={!!kitchenId} syncing={isSyncing} />
          </button>
          <button onClick={() => { setCurrentPage(Page.Fridge); setSelectedRecipe(null); }} className={`w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-gray-50 active-push transition-all ${currentPage === Page.Fridge ? 'text-amber-600 ring-2 ring-amber-500' : 'text-[#5d534a]'}`}><FridgeIconLineArt className="w-6 h-6" /></button>
          <button onClick={() => { setCurrentPage(Page.Favorites); setSelectedRecipe(null); }} className={`w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-gray-50 active-push transition-all ${currentPage === Page.Favorites ? 'ring-2 ring-red-500' : ''}`}><span className="text-xl">{currentPage === Page.Favorites ? '❤️' : '🤍'}</span></button>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-6">
        {(currentPage === Page.Home || currentPage === Page.Favorites) && (
          <div className="animate-slide-up">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 px-2">
                 <h2 className="text-lg font-black text-gray-800">{currentPage === Page.Favorites ? '❤️ 我的收藏' : ''}</h2>
                 {currentPage === Page.Favorites && recipes.filter(r => r.isFavorite).length === 0 && (
                   <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">(尚未收藏)</span>
                 )}
              </div>
              <div className="relative mb-6">
                <input type="text" placeholder="搜尋食譜..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-5 pl-14 bg-white border border-gray-100 rounded-[2.2rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/5 transition-all font-medium text-gray-700" />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl opacity-30">🔍</span>
              </div>
              {currentPage === Page.Home && (
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsAIModalOpen(true)} 
                    className={`flex-1 py-5 bg-[#5d534a] text-white rounded-[1.8rem] shadow-lg font-bold active-push transition-all relative overflow-hidden group ${!isOnline ? 'opacity-70 bg-gray-500' : ''}`}
                  >
                    {!isOnline && <span className="absolute top-2 right-4 text-[8px] font-black opacity-50">OFFLINE</span>}
                    ✨ AI 解析
                  </button>
                  <button onClick={() => { setFormData({title: '', category: '東式', image: '🍱', ingredients: [], seasonings: [], steps: [], sourceUrl: '', notes: ''}); setCurrentPage(Page.Add); }} className="flex-1 py-5 bg-white border border-gray-100 text-[#5d534a] rounded-[1.8rem] shadow-sm font-bold active-push">+ 手動新增</button>
                </div>
              )}
            </div>
            {selectedCategory === '目錄' ? (
              <div className="space-y-1 pb-4">
                {paginatedRecipes.map((r, idx) => {
                  const globalIdx = (pageIndex * ITEMS_PER_PAGE) + idx + 1;
                  return (
                    <div key={r.id} onClick={() => setSelectedRecipe(r)} className="flex items-center gap-4 py-4 px-4 hover:bg-white/50 rounded-2xl transition-all cursor-pointer group border-b border-gray-100/50 active-push">
                      <span className="text-xs font-black text-amber-800/40 w-8 flex-shrink-0">{String(globalIdx).padStart(2, '0')}.</span>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <h3 className="font-bold text-gray-700 truncate group-hover:text-amber-800 transition-colors">{r.title}</h3>
                        {r.isFavorite && <span className="text-[10px] animate-pulse">❤️</span>}
                      </div>
                      <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 rounded-md flex-shrink-0">{r.category}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-10 pb-4">
                {paginatedRecipes.map((r, idx) => (
                  <RecipeCard key={r.id} recipe={r} index={idx} onClick={() => setSelectedRecipe(r)} onToggleFavorite={toggleFavorite} />
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 py-8 mb-10 animate-slide-up">
                <button disabled={pageIndex === 0} onClick={() => setPageIndex(p => p - 1)} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-sm ${pageIndex === 0 ? 'text-gray-200 bg-gray-50' : 'text-amber-800 bg-white border border-amber-100 active-push'}`}>‹</button>
                <div className="flex items-center gap-1"><span className="text-xs font-black text-amber-800/30 uppercase tracking-widest">Page</span><span className="text-sm font-black text-amber-900">{pageIndex + 1}</span><span className="text-xs font-black text-amber-800/30 uppercase tracking-widest">of {totalPages}</span></div>
                <button disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(p => p + 1)} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-sm ${pageIndex >= totalPages - 1 ? 'text-gray-200 bg-gray-50' : 'text-amber-800 bg-white border border-amber-100 active-push'}`}>›</button>
              </div>
            )}
            {allFilteredRecipes.length === 0 && (
              <div className="text-center py-20 opacity-30"><div className="text-6xl mb-4">📖</div><p className="text-sm font-bold tracking-widest uppercase">目前沒有符合的食譜</p></div>
            )}
          </div>
        )}
        {currentPage === Page.Fridge && (
           <div className="animate-slide-up pb-10 px-1 sm:px-4">
             <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex flex-col"><h2 className="text-xl font-black text-gray-800 tracking-tight">冰箱物資</h2><span className="text-[9px] font-bold text-amber-800/30 uppercase tracking-[0.2em]">Inventory List</span></div>
                <button onClick={() => setIsFridgeAddOpen(true)} className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center text-2xl shadow-sm active-push">+</button>
             </div>
             <div className="space-y-6">
               {FRIDGE_CATEGORIES.map(cat => {
                 const items = fridgeItems.filter(i => i.category === cat);
                 return (
                   <div key={cat} className="animate-slide-up">
                     <div className="flex items-center gap-2 mb-2 px-2"><span className="text-[9px] font-black text-gray-300 tracking-[0.2em] uppercase">{cat}</span><div className="flex-1 h-[1px] bg-gray-100/50"></div></div>
                     <div className="bg-white/30 rounded-2xl overflow-hidden border border-gray-100/30 divide-y divide-gray-50/50">
                       {items.map(item => (
                         <div key={item.id} className="flex justify-between items-center p-2 px-4 hover:bg-white/60 transition-all group">
                           <div className="flex items-center gap-3 flex-1">
                             <div className={`w-1 h-1 rounded-full ${cat === '食材' ? 'bg-amber-400' : cat === '調味料' ? 'bg-red-300' : 'bg-green-300'}`}></div>
                             {editingFridgeId === item.id ? (
                               <input autoFocus value={editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={() => handleUpdateFridgeItem(item.id)} onKeyDown={e => e.key === 'Enter' && handleUpdateFridgeItem(item.id)} className="text-[13px] font-bold text-gray-700 bg-amber-50/50 outline-none px-2 py-0.5 rounded border border-amber-100 w-full max-w-[200px]" />
                             ) : (
                               <span onClick={() => { setEditingFridgeId(item.id); setEditingValue(item.name); }} className="text-[13px] font-bold text-gray-600 cursor-text hover:text-amber-800 transition-colors flex-1">{item.name}</span>
                             )}
                           </div>
                           <button onClick={() => handleDeleteFridgeItem(item.id)} className="text-gray-200 hover:text-red-400 transition-colors active-push text-[10px] p-1 ml-2">✕</button>
                         </div>
                       ))}
                       {items.length === 0 && <div className="p-3 text-center"><p className="text-gray-200 text-[8px] font-bold tracking-widest italic uppercase">Empty</p></div>}
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        )}
        {(currentPage === Page.Add || currentPage === Page.Edit) && (
          <div className="animate-slide-up pb-20">
            <div className="bg-white p-10 rounded-[3.5rem] shadow-sm mb-12 border border-gray-50">
              <h2 className="text-2xl font-black text-gray-800 mb-10">{currentPage === Page.Edit ? '✏️ 編輯食譜' : '✍️ 新增食譜'}</h2>
              <div className="space-y-8">
                <div className="flex flex-col items-center gap-4 mb-6">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">Recipe Cover 封面</label>
                  <div className="relative group">
                    <div className="w-32 h-32 bg-gray-50 rounded-[2rem] flex items-center justify-center text-6xl shadow-inner border-2 border-gray-100 overflow-hidden">
                      {isDataUrl ? <img src={formData.image} className="w-full h-full object-cover" alt="preview" /> : formData.image || '📖'}
                    </div>
                    <button onClick={() => editImageInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#5d534a] text-white rounded-full flex items-center justify-center shadow-lg active-push">📷</button>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={isDataUrl ? '' : (formData.image || '')} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="Emoji..." className="w-24 text-center bg-gray-50 p-2 rounded-xl outline-none font-bold text-lg border border-gray-100" />
                  </div>
                  <input type="file" accept="image/*" ref={editImageInputRef} className="hidden" onChange={e => onImageSelected(e, 'cover')} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-3">Category 分類</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as any, image: !isDataUrl ? CATEGORY_ICONS[e.target.value as any] : formData.image })} className="w-full bg-gray-50 p-5 rounded-[1.5rem] outline-none font-bold border-2 border-transparent focus:border-amber-500/20 focus:bg-white transition-all">
                    <option value="東式">🍱 東式料理</option><option value="西式">🍝 西式料理</option><option value="湯品">🥣 溫暖湯品</option><option value="烘焙">🍰 職人烘焙</option><option value="其他">🍴 其他種類</option>
                  </select>
                </div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-3">Recipe Name 名稱</label><input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="輸入食譜名稱..." className="w-full bg-gray-50 p-5 rounded-[1.5rem] outline-none font-bold text-xl border-2 border-transparent focus:border-amber-500/20 focus:bg-white transition-all" /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-3">Source URL 來源網址</label><input type="text" value={formData.sourceUrl || ''} onChange={e => setFormData({ ...formData, sourceUrl: e.target.value })} placeholder="貼上網址或來源..." className="w-full bg-gray-50 p-5 rounded-[1.5rem] outline-none font-medium text-amber-900/60 border-2 border-transparent focus:border-amber-500/20 focus:bg-white transition-all" /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-3">Ingredients 主要食材</label><textarea value={Array.isArray(formData.ingredients) ? formData.ingredients.join('\n') : formData.ingredients} onChange={e => setFormData({ ...formData, ingredients: e.target.value.split('\n') })} className="w-full bg-gray-50 p-5 rounded-[1.5rem] h-32 outline-none font-medium border-2 border-transparent focus:border-amber-500/20 focus:bg-white transition-all resize-none" placeholder="每行一個食材..." /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-3">Seasonings 調味配方</label><textarea value={Array.isArray(formData.seasonings) ? formData.seasonings.join('\n') : formData.seasonings} onChange={e => setFormData({ ...formData, seasonings: e.target.value.split('\n') })} className="w-full bg-gray-50 p-5 rounded-[1.5rem] h-32 outline-none font-medium border-2 border-transparent focus:border-amber-500/20 focus:bg-white transition-all resize-none" placeholder="每行一個調味品..." /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-3">Steps 烹飪步驟</label><textarea value={Array.isArray(formData.steps) ? formData.steps.join('\n') : formData.steps} onChange={e => setFormData({ ...formData, steps: e.target.value.split('\n') })} className="w-full bg-gray-50 p-5 rounded-[1.5rem] h-48 outline-none font-medium border-2 border-transparent focus:border-amber-500/20 focus:bg-white transition-all resize-none" placeholder="1. 先熱鍋..." /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-3">Notes 筆記</label><textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full bg-gray-50 p-5 rounded-[1.5rem] h-24 outline-none font-medium border-2 border-transparent focus:border-amber-500/20 focus:bg-white transition-all resize-none" placeholder="記下你的美味筆記..." /></div>
                <div className="flex gap-4 pt-4"><button onClick={handleSave} className="flex-2 py-5 px-8 bg-[#5d534a] text-white rounded-[1.5rem] font-bold shadow-xl active-push">保存食譜</button><button onClick={() => setCurrentPage(Page.Home)} className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[1.5rem] font-bold active-push">取消</button></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed right-0 sm:right-[calc(50%-340px)] top-[160px] flex flex-col gap-2 sm:gap-3 z-[60]">
        {(['目錄', '西式', '東式', '湯品', '烘焙', '其他'] as CategoryType[]).map(cat => {
          const isActive = selectedCategory === cat;
          const themeClass = CATEGORY_COLORS[cat];
          return (
            <div key={cat} onClick={() => setSelectedCategory(cat)} className={`writing-mode-vertical text-[10px] sm:text-[12px] font-bold py-4 sm:py-5 px-1.5 sm:px-2 rounded-l-2xl sm:rounded-r-3xl cursor-pointer shadow-lg transition-all active-push ${themeClass} ${isActive ? 'scale-105 sm:scale-110 translate-x-0 sm:translate-x-1 text-white ring-2 ring-white/50 z-10' : 'opacity-50 sm:opacity-40 text-white hover:opacity-100'}`} style={{ writingMode: 'vertical-rl' }}>{cat}</div>
          );
        })}
      </div>

      {selectedRecipe && <RecipeDetail recipe={selectedRecipe} allRecipes={recipes} fridgeItems={fridgeItems} onClose={() => setSelectedRecipe(null)} onEdit={startEdit} onDelete={(id) => setShowDeleteConfirm(id)} onSelectRecipe={setSelectedRecipe} onToggleFavorite={toggleFavorite} onUpdateNotes={handleUpdateNotes} />}

      {/* Sync Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-[#fcfaf2] w-full max-w-sm rounded-[3rem] p-10 relative animate-slide-up shadow-2xl border-4 border-white">
            <button onClick={() => setIsSyncModalOpen(false)} className="absolute right-8 top-8 text-2xl text-gray-300">×</button>
            <div className="text-center mb-8">
              <div className="text-5xl mb-4 relative">
                🏠
                <div className={`absolute -right-2 -top-2 w-4 h-4 rounded-full border-2 border-white animate-pulse ${isGunConnected ? 'bg-green-500' : 'bg-red-400'}`}></div>
              </div>
              <h2 className="text-xl font-black text-gray-800">連結共同廚房</h2>
              <p className="text-[10px] text-gray-400 mt-2 font-bold tracking-widest uppercase">
                {isGunConnected ? '✅ 同步節點已連接' : '⚠️ 正在嘗試連接同步網路...'}
              </p>
            </div>
            
            {!kitchenId ? (
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={syncInput} 
                  onChange={e => setSyncInput(e.target.value.toUpperCase())} 
                  className="w-full p-4 bg-white rounded-2xl border-2 border-amber-100 text-center font-black tracking-widest outline-none text-lg focus:border-blue-400 transition-colors" 
                  placeholder="輸入廚房代碼"
                />
                <button 
                  onClick={() => { connectToKitchen(syncInput); setIsSyncModalOpen(false); }}
                  disabled={!syncInput.trim()}
                  className="w-full py-4 bg-[#5d534a] text-white rounded-2xl font-bold shadow-lg active-push disabled:opacity-50"
                >
                  開始同步
                </button>
                <p className="text-[10px] text-center text-gray-400 leading-relaxed italic px-4">
                  在其他裝置輸入相同代碼，即可同步所有食譜與冰箱！建議代碼由字母與數字組成。
                </p>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <div className="p-5 bg-white rounded-[2rem] border-2 border-dashed border-blue-100 relative overflow-hidden group">
                   {isSyncing && <div className="absolute inset-0 bg-blue-50/80 flex items-center justify-center text-[10px] font-black text-blue-600 animate-pulse uppercase tracking-[0.2em]">Syncing...</div>}
                   <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">Active Kitchen ID</span>
                   <p className="text-xl font-black text-blue-900 tracking-widest">{kitchenId}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => { setIsSyncModalOpen(false); connectToKitchen(kitchenId); }}
                    className="text-xs font-black text-blue-500 py-2 bg-blue-50 rounded-xl active-push"
                  >
                    強制重新整理同步 🔄
                  </button>
                  <button 
                    onClick={() => { 
                      setKitchenId(''); 
                      localStorage.removeItem('mou_kitchen_id'); 
                      window.location.reload(); 
                    }}
                    className="text-xs font-bold text-red-400 underline decoration-red-200 decoration-2 underline-offset-4 active-push"
                  >
                    中斷連結 (切換回本機模式)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isFridgeAddOpen && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative animate-slide-up shadow-2xl">
            <button onClick={() => setIsFridgeAddOpen(false)} className="absolute right-8 top-8 text-2xl text-gray-300">×</button>
            <h2 className="text-xl font-black mb-6">📦 補購物資</h2>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">物資名稱</label><input type="text" value={newFridgeName} onChange={e => setNewFridgeName(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold" placeholder="例如：雞蛋、洋蔥..." autoFocus /></div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">所屬分類</label><div className="grid grid-cols-3 gap-2">{FRIDGE_CATEGORIES.map(cat => (<button key={cat} onClick={() => setNewFridgeCat(cat)} className={`py-3 rounded-xl font-bold text-[10px] transition-all ${newFridgeCat === cat ? 'bg-[#5d534a] text-white' : 'bg-gray-50 text-gray-400'}`}>{cat}</button>))}</div></div>
              <button onClick={handleAddFridgeItem} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg active-push">加入冰箱</button>
            </div>
          </div>
        </div>
      )}

      {isAIModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 relative animate-slide-up">
            <button onClick={() => setIsAIModalOpen(false)} className="absolute right-8 top-8 text-2xl text-gray-300">×</button>
            <h2 className="text-xl font-black mb-6">✨ AI 智慧解析</h2>
            {!isOnline && (
              <div className="mb-4 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-[1.5rem] border border-red-100 flex items-center gap-3">
                <span className="text-lg">📵</span>
                <span>目前處於離線狀態，無法使用 AI 功能。請連上網路後再試。</span>
              </div>
            )}
            <input type="file" accept="image/*" ref={aiImageInputRef} className="hidden" onChange={e => onImageSelected(e, 'ai')} />
            <div className="space-y-4">
              <textarea 
                value={aiInput} 
                onChange={e => setAiInput(e.target.value)} 
                disabled={!isOnline}
                className={`w-full h-40 p-4 bg-gray-50 rounded-2xl outline-none text-sm font-medium transition-all ${!isOnline ? 'opacity-30' : 'focus:bg-white'}`} 
                placeholder={isOnline ? "貼上食譜網址、文字，或點擊下方按鈕上傳照片..." : "離線中... 只能手動新增食譜"} 
              />
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleAIParse} 
                  disabled={!aiInput.trim() || isParsing || !isOnline} 
                  className={`w-full py-4 bg-[#5d534a] text-white rounded-2xl font-bold transition-all active-push ${(!aiInput.trim() || isParsing || !isOnline) ? 'opacity-50' : ''}`}
                >
                  {isParsing && aiInput.trim() ? '解析中...' : '開始文字/網址解析'}
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-100"></div><span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">or</span><div className="flex-1 h-px bg-gray-100"></div>
                </div>
                <button 
                  onClick={() => aiImageInputRef.current?.click()} 
                  disabled={isParsing || !isOnline} 
                  className={`w-full py-4 bg-white border-2 border-[#5d534a] text-[#5d534a] rounded-2xl font-bold flex items-center justify-center gap-2 active-push transition-all ${(!isOnline) ? 'opacity-30 border-gray-300 text-gray-300' : ''}`}
                >
                  {isParsing && !aiInput.trim() ? <span className="animate-pulse">圖片辨識中...</span> : <><span>📷</span> 選擇照片辨識食譜</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {croppingImage && <ImageCropper src={croppingImage} onCancel={() => { setCroppingImage(null); setCroppingTarget(null); }} onConfirm={handleCropperConfirm} />}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-10 text-center max-w-xs shadow-2xl animate-slide-up">
            <h3 className="text-lg font-bold mb-8 text-gray-800">確定要刪除這道食譜嗎？</h3>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-3 bg-gray-100 rounded-2xl font-bold">取消</button>
              <button onClick={() => handleDeleteRecipe(showDeleteConfirm)} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold active-push">刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

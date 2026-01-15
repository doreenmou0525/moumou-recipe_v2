
export type CategoryType = '西式' | '東式' | '湯品' | '烘焙' | '其他' | '目錄';

export type FridgeCategory = '食材' | '調味料' | '常溫區';

export interface FridgeItem {
  id: string; // 統一使用字串 ID
  name: string;
  category: FridgeCategory;
  quantity: number;
}

export interface Recipe {
  id: string; // 統一使用字串 ID
  title: string;
  category: Exclude<CategoryType, '目錄'>;
  sourceUrl?: string;
  ingredients: string[];
  seasonings: string[];
  steps: string[];
  notes?: string;
  image?: string;
  isFavorite?: boolean;
}

export enum Page {
  Home = 'home',
  Add = 'add',
  Edit = 'edit',
  Fridge = 'fridge',
  Favorites = 'favorites'
}

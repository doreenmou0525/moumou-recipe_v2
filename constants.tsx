
import { Recipe } from './types';

export const CATEGORY_COLORS: Record<string, string> = {
  '西式': 'tab-west',
  '東式': 'tab-east',
  '湯品': 'tab-soup',
  '烘焙': 'tab-sweet',
  '其他': 'tab-other',
  '目錄': 'tab-all',
};

export const CATEGORY_ICONS: Record<string, string> = {
  '東式': '🍱',
  '西式': '🍝',
  '湯品': '🥣',
  '烘焙': '🍰',
  '其他': '🍴',
};

export const DEFAULT_RECIPE: Recipe = {
  id: 1,
  title: "經典拿坡里義大利麵",
  category: "西式",
  sourceUrl: "https://example.com",
  ingredients: ["義大利麵 100g", "洋蔥 1/4顆", "青椒 1/2個", "培根 2片"],
  seasonings: ["番茄醬 3大匙", "黑胡椒 少許", "鹽 少許"],
  steps: ["將麵煮熟備用", "炒香培根與蔬菜", "加入麵條與番茄醬翻炒均勻"],
  notes: "多加一點黑胡椒味道更好！",
  image: "🍝"
};


import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_PROMPT = `你是一個專業的日系食譜整理師。
請將輸入的內容（文字、網址或圖片）轉換為結構化食譜 JSON。
category 只能是以下之一：'西式', '東式', '湯品', '烘焙', '其他'。
image 請選擇一個最合適的單一表情符號 (Emoji) 作為封面圖示。
如果是照片辨識：
1. 請掃描照片中的所有文字。
2. 提取食譜標題、食材（含份量）、調味配方與步驟。
3. 如果照片中沒有明確標題，請根據內容為其命名（例如：家常炒青菜）。
4. 必須確保輸出的 JSON 格式完整，且 title 欄位絕對不可為空。`;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "食譜名稱" },
    category: { type: Type.STRING, description: "分類" },
    sourceUrl: { type: Type.STRING, description: "參考來源" },
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "主要食材清單" },
    seasonings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "調味料清單" },
    steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "烹飪步驟" },
    image: { type: Type.STRING, description: "表情符號圖示" },
    notes: { type: Type.STRING, description: "心得或筆記" },
  },
  required: ["title", "category", "ingredients", "steps"],
};

const cleanResponse = (text: string) => {
  if (!text) return '{}';
  // 移除可能存在的 Markdown 標籤
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const parseRecipeWithAI = async (input: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    // 使用 gemini-3-flash-preview 提供更穩定的 JSON 輸出
    model: 'gemini-3-flash-preview',
    contents: `請分析此食譜內容或網址：${input}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  });
  
  const rawText = response.text || '{}';
  try {
    return JSON.parse(rawText);
  } catch (e) {
    return JSON.parse(cleanResponse(rawText));
  }
};

export const parseRecipeFromImage = async (base64Data: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 確保 MIME 類型是 Gemini 支援的格式，否則 fallback
  const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
  const finalMimeType = supportedMimeTypes.includes(mimeType) ? mimeType : 'image/jpeg';

  const response = await ai.models.generateContent({
    // Multimodal 任務在 Flash 模型上通常表現更穩定
    model: 'gemini-3-flash-preview',
    contents: { 
      parts: [
        { inlineData: { data: base64Data, mimeType: finalMimeType } },
        { text: "請精準辨識這張照片中的食譜內容並轉換為 JSON 格式。" }
      ] 
    },
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  });

  const rawText = response.text || '{}';
  try {
    return JSON.parse(rawText);
  } catch (e) {
    console.warn("JSON Parse Retry with Cleaning");
    return JSON.parse(cleanResponse(rawText));
  }
};

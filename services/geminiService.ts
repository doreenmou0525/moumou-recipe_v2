
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_PROMPT = `你是一個專業的日系食譜整理師。
請將輸入的內容（文字、網址或圖片）轉換為結構化食譜 JSON。
category 只能是以下之一：'西式', '東式', '湯品', '烘焙', '其他'。
image 請選擇一個最合適的單一表情符號 (Emoji)。
如果是照片，請辨識照片中的所有文字，並精確提取食譜標題、食材清單（包含份量）、調味配方與詳細步驟。
請務必確保輸出的 JSON 格式完整，且 title 不可為空。`;

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

export const parseRecipeWithAI = async (input: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{ parts: [{ text: `請分析此食譜內容或網址：${input}` }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  });
  return JSON.parse(response.text || '{}');
};

export const parseRecipeFromImage = async (base64Data: string, mimeType: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{ 
      parts: [
        { inlineData: { data: base64Data, mimeType: mimeType } },
        { text: "請精準辨識這張照片中的食譜內容。" }
      ] 
    }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  });
  return JSON.parse(response.text || '{}');
};

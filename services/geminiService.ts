
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_PROMPT = `你是一個專業的日系食譜整理師。
請將輸入的內容（文字、網址或圖片）轉換為結構化食譜 JSON。
category 只能是以下之一：'西式', '東式', '湯品', '烘焙', '其他'。
image 請選擇一個最合適的單一表情符號 (Emoji)。
如果輸入是圖片，請仔計辨識其中的食材、份量與步驟。`;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    category: { type: Type.STRING },
    sourceUrl: { type: Type.STRING },
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    seasonings: { type: Type.ARRAY, items: { type: Type.STRING } },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    image: { type: Type.STRING },
    notes: { type: Type.STRING },
  },
  required: ["title", "category", "ingredients", "steps"],
};

export const parseRecipeWithAI = async (input: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `請分析此食譜內容或網址：${input}`,
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
    model: 'gemini-3-flash-preview',
    contents: { 
      parts: [
        { inlineData: { data: base64Data, mimeType: mimeType } },
        { text: "請辨識這張照片中的食譜內容。" }
      ] 
    },
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  });
  return JSON.parse(response.text || '{}');
};

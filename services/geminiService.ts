import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const summarizeThesis = async (thesisText: string, ticker: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI Summary unavailable (Missing API Key).";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a financial analyst. Summarize the following investment thesis for ${ticker} into a concise, professional paragraph (max 50 words). Focus on the core catalysts and risks. Thesis: ${thesisText}`,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating summary. Please try again.";
  }
};

export const extractTickerAndSentiment = async (text: string): Promise<{ ticker: string, sentiment: string, companyName: string } | null> => {
    const ai = getAiClient();
    if (!ai) return null;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Extract the primary stock ticker symbol (e.g., AAPL), the company name, and the sentiment (Bullish/Bearish) from this text. Return JSON only. Text: ${text}`,
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const json = JSON.parse(response.text);
        return {
            ticker: json.ticker || "",
            companyName: json.companyName || "",
            sentiment: json.sentiment || "Neutral"
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

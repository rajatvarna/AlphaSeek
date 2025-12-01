// This service has been deprecated and all reliance on Gemini API has been removed.
export const summarizeThesis = async (thesisText: string, ticker: string): Promise<string> => {
  return "";
};

export const extractTickerAndSentiment = async (text: string): Promise<{ ticker: string, sentiment: string, companyName: string } | null> => {
    return null;
}
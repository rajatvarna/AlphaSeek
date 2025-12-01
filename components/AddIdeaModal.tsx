import React, { useState, useEffect } from 'react';
import { StockIdea, SourceType } from '../types';
import { X, Loader2 } from 'lucide-react';
import { getCurrentPrice, getCompanyProfile } from '../services/stockService';

interface AddIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (idea: Omit<StockIdea, 'id' | 'currentPrice'>) => Promise<void>;
}

const AddIdeaModal: React.FC<AddIdeaModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [source, setSource] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('X');
  const [originalLink, setOriginalLink] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);
  const [thesis, setThesis] = useState('');
  const [summary, setSummary] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [conviction, setConviction] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);

  useEffect(() => {
    if (ticker) {
        const fetchDetails = async () => {
             setPriceLoading(true);
             setFetchedPrice(null);
             try {
                 const profile = await getCompanyProfile(ticker);
                 setCompanyName(profile.name);
                 
                 const price = await getCurrentPrice(ticker);
                 setFetchedPrice(price);
                 
                 // Pre-fill entry price only if it's currently empty
                 setEntryPrice(prev => {
                     if (!prev) return price.toFixed(2);
                     return prev;
                 });
             } finally {
                 setPriceLoading(false);
             }
        };
        const timeout = setTimeout(fetchDetails, 800);
        return () => clearTimeout(timeout);
    } else {
        setCompanyName('');
        setFetchedPrice(null);
    }
  }, [ticker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      await onAdd({
        ticker: ticker.toUpperCase(),
        companyName,
        source,
        sourceType,
        originalLink,
        entryDate,
        entryPrice: parseFloat(entryPrice),
        thesis,
        summary,
        conviction,
        tags
      });
      onClose();
      // Reset form
      setTicker('');
      setThesis('');
      setSummary('');
      setFetchedPrice(null);
      setEntryPrice('');
      setCompanyName('');
      setTagsInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
              <h2 className="text-2xl font-bold text-gray-900">New Stock Idea</h2>
              <p className="text-sm text-gray-500">Track a new investment thesis</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Ticker & Price Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ticker</label>
                    <div className="relative">
                        <input
                            type="text"
                            required
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase font-semibold"
                            placeholder="e.g. AAPL"
                        />
                        {priceLoading && (
                            <div className="absolute right-3 top-3">
                                <Loader2 size={16} className="animate-spin text-blue-500" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col mt-1">
                        {companyName && <span className="text-xs text-gray-500">{companyName}</span>}
                        {fetchedPrice !== null && (
                            <span className="text-xs text-emerald-600 font-medium">
                                Current Market Price: ${fetchedPrice.toFixed(2)}
                            </span>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entry Price ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        required
                        value={entryPrice}
                        onChange={(e) => setEntryPrice(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="0.00"
                    />
                </div>
            </div>

            {/* Metadata Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Identified</label>
                    <input
                        type="date"
                        required
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                    <select
                        value={sourceType}
                        onChange={(e) => setSourceType(e.target.value as SourceType)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                        <option value="X">X (Twitter)</option>
                        <option value="Reddit">Reddit</option>
                        <option value="Hedge Fund">Hedge Fund Letter</option>
                        <option value="Blog">Investment Blog</option>
                        <option value="News">News</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Conviction</label>
                     <div className="flex bg-gray-100 rounded-lg p-1">
                        {(['Low', 'Medium', 'High'] as const).map((level) => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setConviction(level)}
                                className={`flex-1 text-sm py-1.5 rounded-md transition-all ${conviction === level ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {level}
                            </button>
                        ))}
                     </div>
                </div>
            </div>

            {/* Source Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source Name/Author</label>
                    <input
                        type="text"
                        required
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="e.g. @Burry or ValueInvestorsClub"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link (Optional)</label>
                    <input
                        type="url"
                        value={originalLink}
                        onChange={(e) => setOriginalLink(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="https://..."
                    />
                </div>
            </div>

             {/* Tags */}
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Tech, Value, Spin-off (comma separated)"
                />
            </div>

            {/* Thesis */}
            <div>
                <div className="flex justify-between items-center mb-1">
                     <label className="block text-sm font-medium text-gray-700">Investment Thesis / Notes</label>
                </div>
                <textarea
                    required
                    value={thesis}
                    onChange={(e) => setThesis(e.target.value)}
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    placeholder="Paste the full text, tweet, or your own analysis here..."
                ></textarea>
            </div>

            {/* Summary */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Summary 
                </label>
                <div className="relative">
                    <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                        placeholder="Brief summary of the idea..."
                    ></textarea>
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Add Idea'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AddIdeaModal;
import React, { useState } from 'react';
import { X, TrendingDown, TrendingUp, Target } from 'lucide-react';
import { ideasAPI } from '../services/apiClient';
import { StockIdea } from '../types';

interface ExitStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: StockIdea;
  onUpdate: (updated: StockIdea) => void;
}

export default function ExitStrategyModal({ isOpen, onClose, idea, onUpdate }: ExitStrategyModalProps) {
  const [stopLossPrice, setStopLossPrice] = useState(idea.stopLossPrice?.toString() || '');
  const [profitTargetPrice, setProfitTargetPrice] = useState(idea.profitTargetPrice?.toString() || '');
  const [trailingStopPct, setTrailingStopPct] = useState(idea.trailingStopPct?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const calculateStopLossPct = () => {
    if (!stopLossPrice || !idea.currentPrice) return null;
    return (((parseFloat(stopLossPrice) - idea.currentPrice) / idea.currentPrice) * 100).toFixed(2);
  };

  const calculateProfitTargetPct = () => {
    if (!profitTargetPrice || !idea.currentPrice) return null;
    return (((parseFloat(profitTargetPrice) - idea.currentPrice) / idea.currentPrice) * 100).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const result = await ideasAPI.updateExitStrategy(
        idea.id,
        stopLossPrice ? parseFloat(stopLossPrice) : undefined,
        profitTargetPrice ? parseFloat(profitTargetPrice) : undefined,
        trailingStopPct ? parseFloat(trailingStopPct) : undefined
      );

      onUpdate({
        ...idea,
        stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
        profitTargetPrice: profitTargetPrice ? parseFloat(profitTargetPrice) : undefined,
        trailingStopPct: trailingStopPct ? parseFloat(trailingStopPct) : undefined
      });

      onClose();
    } catch (error) {
      console.error('Failed to update exit strategy:', error);
      alert('Failed to update exit strategy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setStopLossPrice('');
    setProfitTargetPrice('');
    setTrailingStopPct('');
  };

  if (!isOpen) return null;

  const stopLossPct = calculateStopLossPct();
  const profitTargetPct = calculateProfitTargetPct();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Exit Strategy - {idea.ticker}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Set stop loss and profit targets
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Price Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-900 dark:text-blue-300">
              <span className="font-medium">Current Price:</span> ${idea.currentPrice.toFixed(2)}
            </div>
            <div className="text-sm text-blue-900 dark:text-blue-300 mt-1">
              <span className="font-medium">Entry Price:</span> ${idea.entryPrice.toFixed(2)}
            </div>
          </div>

          {/* Stop Loss */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <TrendingDown size={16} className="text-red-600" />
              Stop Loss Price
            </label>
            <div className="space-y-2">
              <input
                type="number"
                step="0.01"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., 145.00"
              />
              {stopLossPct && (
                <p className={`text-sm ${parseFloat(stopLossPct) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stopLossPct}% from current price
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Exit position if price drops to this level
              </p>
            </div>
          </div>

          {/* Profit Target */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <TrendingUp size={16} className="text-green-600" />
              Profit Target Price
            </label>
            <div className="space-y-2">
              <input
                type="number"
                step="0.01"
                value={profitTargetPrice}
                onChange={(e) => setProfitTargetPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., 200.00"
              />
              {profitTargetPct && (
                <p className={`text-sm ${parseFloat(profitTargetPct) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  +{profitTargetPct}% from current price
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Consider selling if price reaches this level
              </p>
            </div>
          </div>

          {/* Trailing Stop */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Target size={16} className="text-orange-600" />
              Trailing Stop %
            </label>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={trailingStopPct}
                  onChange={(e) => setTrailingStopPct(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 15"
                />
                <span className="absolute right-4 top-2.5 text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Exit if price drops this % from peak price
              </p>
            </div>
          </div>

          {/* Risk/Reward Summary */}
          {(stopLossPct || profitTargetPct) && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Risk/Reward Ratio</h4>
              <div className="space-y-1 text-sm">
                {stopLossPct && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Potential Loss:</span>
                    <span className="text-red-600 font-medium">{Math.abs(parseFloat(stopLossPct))}%</span>
                  </div>
                )}
                {profitTargetPct && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Potential Gain:</span>
                    <span className="text-green-600 font-medium">{profitTargetPct}%</span>
                  </div>
                )}
                {stopLossPct && profitTargetPct && (
                  <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-white font-medium">Ratio:</span>
                    <span className="text-blue-600 font-bold">
                      1:{(Math.abs(parseFloat(profitTargetPct)) / Math.abs(parseFloat(stopLossPct))).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { ideasAPI } from '../services/apiClient';

interface StarRatingProps {
  ideaId: string;
  currentRating?: number;
  currentNotes?: string;
  onRatingUpdate?: (rating: number, notes?: string) => void;
  readOnly?: boolean;
}

export default function StarRating({ ideaId, currentRating, currentNotes, onRatingUpdate, readOnly = false }: StarRatingProps) {
  const [rating, setRating] = useState(currentRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(currentNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleRatingClick = async (value: number) => {
    if (readOnly) return;

    if (value === rating) {
      // Click same star to edit notes
      setIsEditing(true);
    } else {
      // Quick rate without notes
      setRating(value);
      await saveRating(value, notes);
    }
  };

  const saveRating = async (ratingValue: number, ratingNotes: string) => {
    setIsSaving(true);
    try {
      await ideasAPI.updateRating(ideaId, ratingValue, ratingNotes);
      setRating(ratingValue);
      setNotes(ratingNotes);
      if (onRatingUpdate) {
        onRatingUpdate(ratingValue, ratingNotes);
      }
    } catch (error) {
      console.error('Failed to save rating:', error);
      alert('Failed to save rating');
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleSubmitNotes = (e: React.FormEvent) => {
    e.preventDefault();
    saveRating(rating, notes);
  };

  return (
    <div className="space-y-2">
      {/* Stars */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            disabled={readOnly || isSaving}
            onClick={() => handleRatingClick(value)}
            onMouseEnter={() => !readOnly && setHoverRating(value)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
            className={`transition-all ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} disabled:opacity-50`}
            title={readOnly ? undefined : `Rate ${value} star${value > 1 ? 's' : ''}`}
          >
            <Star
              size={18}
              className={`${
                value <= (hoverRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-none text-gray-300'
              } transition-colors`}
            />
          </button>
        ))}
        <span className="text-xs text-gray-500 ml-2">
          {rating > 0 ? `${rating}/5` : readOnly ? 'No rating' : 'Rate this idea'}
        </span>
      </div>

      {/* Notes Display */}
      {notes && !isEditing && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
          <span className="font-medium">Note:</span> {notes}
          {!readOnly && (
            <button
              onClick={() => setIsEditing(true)}
              className="ml-2 text-blue-600 hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      )}

      {/* Edit Notes Form */}
      {isEditing && !readOnly && (
        <form onSubmit={handleSubmitNotes} className="space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this rating (optional)..."
            className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving || rating === 0}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Rating'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setNotes(currentNotes || '');
              }}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

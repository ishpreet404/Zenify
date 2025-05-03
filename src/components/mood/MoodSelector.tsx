import React from 'react';
import { motion } from 'framer-motion';
import { Mood } from '../../types';

interface MoodSelectorProps {
  selectedMood: Mood;
  onSelectMood: (mood: Mood) => void;
  size?: 'sm' | 'md' | 'lg';
}

const moods: { value: Mood; emoji: string; label: string }[] = [
  { value: 'awful', emoji: '😞', label: 'Awful' },
  { value: 'bad', emoji: '🙁', label: 'Bad' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'great', emoji: '😁', label: 'Great' },
];

const MoodSelector: React.FC<MoodSelectorProps> = ({
  selectedMood,
  onSelectMood,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: {
      container: 'gap-1',
      button: 'w-8 h-8 text-sm',
      emoji: 'text-base',
    },
    md: {
      container: 'gap-2',
      button: 'w-12 h-12 text-sm',
      emoji: 'text-xl',
    },
    lg: {
      container: 'gap-3',
      button: 'w-16 h-16 text-base',
      emoji: 'text-2xl',
    },
  };

  return (
    <div className={`flex justify-between ${sizeClasses[size].container}`}>
      {moods.map((mood) => (
        <motion.button
          key={mood.value}
          type="button"
          className={`
            flex flex-col items-center justify-center rounded-full 
            ${sizeClasses[size].button}
            ${selectedMood === mood.value 
              ? 'bg-black text-white ring-2 ring-gray-400' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }
            transition-all duration-200
          `}
          onClick={() => onSelectMood(mood.value)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <span className={sizeClasses[size].emoji}>{mood.emoji}</span>
          {size !== 'sm' && <span className="text-xs mt-1">{mood.label}</span>}
        </motion.button>
      ))}
    </div>
  );
};

export default MoodSelector;
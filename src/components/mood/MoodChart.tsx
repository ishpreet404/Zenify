import React from 'react';
import { motion } from 'framer-motion';
import { MoodEntry, Mood } from '../../types';
import { format, subDays, isAfter, isSameDay, startOfDay } from 'date-fns';

interface MoodChartProps {
  moodEntries: MoodEntry[];
  days?: number;
}

const moodValues: Record<Mood, number> = {
  awful: 0,
  bad: 1,
  neutral: 2,
  good: 3,
  great: 4,
};

const MoodChart: React.FC<MoodChartProps> = ({ moodEntries, days = 7 }) => {
  // Group entries by day and get the latest mood for each day
  const getMoodByDay = () => {
    const today = new Date();
    const result: { date: Date; mood: Mood | null }[] = [];
    
    // Initialize array with empty data for the requested number of days
    for (let i = days - 1; i >= 0; i--) {
      result.push({
        date: subDays(today, i),
        mood: null,
      });
    }
    
    // Fill with actual mood data where available
    const startDate = startOfDay(subDays(today, days - 1));
    
    // Only consider entries after the start date
    const relevantEntries = moodEntries.filter(entry => 
      isAfter(new Date(entry.date), startDate)
    );
    
    // Group entries by day and find the latest entry for each day
    const entriesByDay = new Map<string, MoodEntry>();
    
    for (const entry of relevantEntries) {
      const date = new Date(entry.date);
      const dateString = format(date, 'yyyy-MM-dd');
      
      const existingEntry = entriesByDay.get(dateString);
      if (!existingEntry || entry.date > existingEntry.date) {
        entriesByDay.set(dateString, entry);
      }
    }
    
    // Update the result array with the mood data
    for (let i = 0; i < result.length; i++) {
      const dateString = format(result[i].date, 'yyyy-MM-dd');
      const entry = entriesByDay.get(dateString);
      
      if (entry) {
        result[i].mood = entry.mood;
      }
    }
    
    return result;
  };

  const moodData = getMoodByDay();
  
  const maxValue = 4; // 'great' has value 4
  const chartHeight = 150;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Mood Trend</h3>
      
      <div className="flex items-end h-[200px] justify-between">
        {moodData.map((day, index) => {
          const value = day.mood !== null ? moodValues[day.mood] : null;
          const height = value !== null ? (value / maxValue) * chartHeight : 0;
          
          const isToday = isSameDay(day.date, new Date());
          
          const barColor = !day.mood ? 'bg-gray-200' : (
            day.mood === 'great' ? 'bg-gray-900' :
            day.mood === 'good' ? 'bg-gray-700' :
            day.mood === 'neutral' ? 'bg-gray-500' :
            day.mood === 'bad' ? 'bg-gray-400' : 'bg-gray-300'
          );
          
          const moodEmojis: Record<Mood, string> = {
            great: '😁',
            good: '🙂',
            neutral: '😐',
            bad: '🙁',
            awful: '😞',
          };

          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="relative w-full flex justify-center">
                {value !== null && (
                  <motion.div 
                    className={`w-6 rounded-t-md ${barColor}`}
                    initial={{ height: 0 }}
                    animate={{ height }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    {day.mood && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        {moodEmojis[day.mood]}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
              
              <div className={`text-xs mt-2 ${isToday ? 'font-bold' : ''}`}>
                {format(day.date, 'EEE')}
              </div>
              
              <div className="text-xs text-gray-500">
                {format(day.date, 'd')}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 border-t pt-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Past {days} days</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
};

export default MoodChart;
import React from 'react';
import { motion } from 'framer-motion';
import { MoodEntry, Mood } from '../types';
import storage from '../utils/storage';
import MoodSelector from '../components/mood/MoodSelector';
import MoodChart from '../components/mood/MoodChart';
import { format } from 'date-fns';

const MoodPage: React.FC = () => {
  const [moodEntries, setMoodEntries] = React.useState<MoodEntry[]>([]);
  const [currentMood, setCurrentMood] = React.useState<Mood>('neutral');
  const [moodNote, setMoodNote] = React.useState('');
  const [timeframe, setTimeframe] = React.useState<7 | 14 | 30>(7);

  // Load mood entries
  React.useEffect(() => {
    const loadedEntries = storage.getMoodEntries();
    const validEntries = loadedEntries.filter(entry => {
      const isValid = entry.date && !isNaN(new Date(entry.date).getTime());
      if (!isValid) {
        console.error('Invalid date found:', entry.date);
      }
      return isValid;
    });
    setMoodEntries(validEntries);
  }, []);

  const handleTrackMood = () => {
    const newEntry = storage.addMoodEntry(currentMood, moodNote);
    setMoodEntries([...moodEntries, newEntry]);
    setMoodNote('');
  };

  const hasTrackedMoodToday = React.useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    return moodEntries.some(entry => {
      const entryDate = new Date(entry.date).setHours(0, 0, 0, 0);
      return entryDate === today;
    });
  }, [moodEntries]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Mood Tracker</h1>
        <p className="text-gray-600">Track your mood daily to see patterns over time</p>
      </div>

      {/* Today's mood section */}
      <motion.div
        className="mb-8 bg-white p-6 rounded-lg shadow-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-xl font-semibold mb-4">
          {hasTrackedMoodToday ? "Today's Mood" : "How are you feeling today?"}
        </h2>

        <div className="mb-4">
          <MoodSelector
            selectedMood={currentMood}
            onSelectMood={setCurrentMood}
            size="lg"
          />
        </div>

        {!hasTrackedMoodToday && (
          <>
            <div className="mb-4">
              <textarea
                value={moodNote}
                onChange={(e) => setMoodNote(e.target.value)}
                placeholder="Any specific thoughts about your mood today? (optional)"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
                rows={2}
              />
            </div>

            <button
              onClick={handleTrackMood}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Track Today's Mood
            </button>
          </>
        )}
        
        {hasTrackedMoodToday && moodNote && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md italic text-gray-700">
            "{moodNote}"
          </div>
        )}
      </motion.div>

      {/* Mood chart section */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Mood Trends</h2>
          
          <div className="flex space-x-2">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTimeframe(days as 7 | 14 | 30)}
                className={`
                  px-3 py-1 text-sm rounded
                  ${timeframe === days 
                    ? 'bg-black text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                  transition-colors
                `}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>
        
        <MoodChart
          moodEntries={moodEntries.filter(entry => entry.date && !isNaN(new Date(entry.date).getTime()))}
          days={timeframe}
        />
      </motion.div>

      {/* Mood history section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold mb-4">Mood History</h2>

        {moodEntries.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">No mood entries yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Start tracking your mood daily to see your history here
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Mood</th>
                    <th className="py-3 px-4 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[...moodEntries]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((entry, index) => (
                      <motion.tr
                        key={entry.id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.03 }}
                      >
                        <td className="py-3 px-4 border-t border-gray-100">
                          {entry.date && !isNaN(new Date(entry.date).getTime())
                            ? format(new Date(entry.date), 'MMM d, yyyy')
                            : 'Invalid date'}
                        </td>
                        <td className="py-3 px-4 border-t border-gray-100">
                          <div className="flex items-center">
                            <span className="mr-2">
                              {entry.mood === 'great' ? '😁' :
                                entry.mood === 'good' ? '🙂' :
                                  entry.mood === 'neutral' ? '😐' :
                                    entry.mood === 'bad' ? '🙁' : '😞'}
                            </span>
                            <span className="capitalize">{entry.mood}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 border-t border-gray-100 italic">
                          {entry.note || '-'}
                        </td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MoodPage;
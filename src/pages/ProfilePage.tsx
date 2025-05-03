import React from 'react';
import { motion } from 'framer-motion';
import storage from '../utils/storage';
import { JournalEntry, MoodEntry } from '../types';
import MoodChart from '../components/mood/MoodChart';
import { Brain, Book, BarChart, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = React.useState(storage.getUserProfile());
  const [journals, setJournals] = React.useState<JournalEntry[]>([]);
  const [moodEntries, setMoodEntries] = React.useState<MoodEntry[]>([]);
  
  React.useEffect(() => {
    const loadedJournals = storage.getJournalEntries();
    const loadedMoodEntries = storage.getMoodEntries();
    setJournals(loadedJournals);
    setMoodEntries(loadedMoodEntries);
  }, []);

  // Stats calculations
  const stats = React.useMemo(() => {
    return {
      journalCount: journals.length,
      chatCount: profile.conversations.length,
      moodCount: moodEntries.length,
      streakCount: calculateStreak(moodEntries),
      averageMood: calculateAverageMood(moodEntries),
    };
  }, [journals, profile.conversations, moodEntries]);

  // Helper functions for stats
  function calculateStreak(entries: MoodEntry[]): number {
    if (entries.length === 0) return 0;
    
    // Sort entries by date (newest first)
    const sortedEntries = [...entries].sort((a, b) => b.date - a.date);
    
    let streak = 1;
    let currentDate = new Date(sortedEntries[0].date);
    currentDate.setHours(0, 0, 0, 0);
    
    // Check if the most recent entry is from today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    if (currentDate.getTime() !== today.getTime() && 
        currentDate.getTime() !== yesterday.getTime()) {
      return 0; // Streak broken
    }
    
    // Calculate streak
    for (let i = 1; i < sortedEntries.length; i++) {
      const entryDate = new Date(sortedEntries[i].date);
      entryDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
      
      if (entryDate.getTime() === expectedDate.getTime()) {
        streak++;
        currentDate = entryDate;
      } else {
        break; // Streak broken
      }
    }
    
    return streak;
  }
  
  function calculateAverageMood(entries: MoodEntry[]): string {
    if (entries.length === 0) return 'N/A';
    
    // Only consider the last 14 days
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const recentEntries = entries.filter(entry => 
      new Date(entry.date) >= twoWeeksAgo
    );
    
    if (recentEntries.length === 0) return 'N/A';
    
    const moodValues = {
      'awful': 1,
      'bad': 2,
      'neutral': 3,
      'good': 4,
      'great': 5,
    };
    
    const sum = recentEntries.reduce((acc, entry) => 
      acc + moodValues[entry.mood], 0
    );
    
    const average = sum / recentEntries.length;
    
    if (average >= 4.5) return 'Great';
    if (average >= 3.5) return 'Good';
    if (average >= 2.5) return 'Neutral';
    if (average >= 1.5) return 'Bad';
    return 'Awful';
  }

  return (
    <div>
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-center mb-4">
          <motion.div
            className="h-24 w-24 bg-black rounded-full flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <Brain size={40} className="text-white" />
          </motion.div>
        </div>
        
        <h1 className="text-2xl font-semibold mb-2">
          {profile.name ? `${profile.name}'s Profile` : 'Your Profile'}
        </h1>
        
        <p className="text-gray-600">
          Your mental wellness journey with Zenify
        </p>
      </motion.div>
      
      {/* Stats section */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StatCard 
          title="Journal Entries" 
          value={stats.journalCount.toString()} 
          icon={<Book size={20} />} 
        />
        
        <StatCard 
          title="Mood Entries" 
          value={stats.moodCount.toString()} 
          icon={<BarChart size={20} />} 
        />
        
        <StatCard 
          title="Current Streak" 
          value={stats.streakCount.toString()} 
          icon={<div className="text-lg">🔥</div>} 
        />
        
        <StatCard 
          title="Average Mood" 
          value={stats.averageMood} 
          icon={<div className="text-lg">
            {stats.averageMood === 'Great' ? '😁' : 
             stats.averageMood === 'Good' ? '🙂' : 
             stats.averageMood === 'Neutral' ? '😐' : 
             stats.averageMood === 'Bad' ? '🙁' : 
             stats.averageMood === 'Awful' ? '😞' : '❓'}
          </div>} 
        />
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mood chart */}
        <motion.div
          className="bg-white rounded-lg shadow-md p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold mb-4">Recent Mood</h2>
          
          {moodEntries.length > 0 ? (
            <MoodChart moodEntries={moodEntries} days={7} />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart size={32} className="mx-auto mb-2 text-gray-400" />
              <p>No mood data yet</p>
              <p className="text-sm mt-2">Track your mood daily to see trends</p>
            </div>
          )}
        </motion.div>
        
        {/* Recent activity */}
        <motion.div
          className="bg-white rounded-lg shadow-md p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          
          {journals.length === 0 && moodEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Book size={32} className="mx-auto mb-2 text-gray-400" />
              <p>No activity yet</p>
              <p className="text-sm mt-2">Your recent journals and mood entries will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Combine and sort recent activity by date */}
              {[...journals.map(j => ({ 
                type: 'journal' as const, 
                item: j,
                date: j.createdAt
              })), ...moodEntries.map(m => ({
                type: 'mood' as const,
                item: m,
                date: m.date
              }))]
                .sort((a, b) => b.date - a.date)
                .slice(0, 5)
                .map((activity, index) => (
                  <motion.div
                    key={activity.type + activity.date}
                    className="flex items-start p-3 border-b border-gray-100 last:border-b-0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + (index * 0.1) }}
                  >
                    <div className={`
                      flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
                      ${activity.type === 'journal' ? 'bg-gray-200' : 'bg-gray-800 text-white'}
                    `}>
                      {activity.type === 'journal' ? 
                        <Book size={16} /> : 
                        <BarChart size={16} />
                      }
                    </div>
                    
                    <div className="ml-3">
                      <p className="font-medium">
                        {activity.type === 'journal' 
                          ? `Journal: ${(activity.item as JournalEntry).title}`
                          : `Mood: ${(activity.item as MoodEntry).mood.charAt(0).toUpperCase() + (activity.item as MoodEntry).mood.slice(1)}`
                        }
                      </p>
                      
                      <p className="text-sm text-gray-500">
                        {format(new Date(activity.date), 'MMM d, yyyy - h:mm a')}
                      </p>
                    </div>
                  </motion.div>
                ))
              }
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm p-4"
      whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </motion.div>
  );
};

export default ProfilePage;
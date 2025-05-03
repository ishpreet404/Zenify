import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle, Book, BarChart, Brain } from 'lucide-react';
import Button from '../components/ui/Button';
import { getRandomQuote } from '../utils/quotes';
import storage from '../utils/storage';
import MoodSelector from '../components/mood/MoodSelector';
import { Mood } from '../types';

const HomePage: React.FC = () => {
  const [quote, setQuote] = React.useState(getRandomQuote());
  const [currentMood, setCurrentMood] = React.useState<Mood>('neutral');
  const [moodNote, setMoodNote] = React.useState('');
  const [hasTrackedMood, setHasTrackedMood] = React.useState(false);
  
  // Check if user already tracked mood today
  React.useEffect(() => {
    const entries = storage.getMoodEntries();
    const today = new Date().setHours(0, 0, 0, 0);
    
    const trackedToday = entries.some(entry => {
      const entryDate = new Date(entry.date).setHours(0, 0, 0, 0);
      return entryDate === today;
    });
    
    setHasTrackedMood(trackedToday);
    
    if (trackedToday) {
      // Get today's mood
      const todayEntry = entries.find(entry => {
        const entryDate = new Date(entry.date).setHours(0, 0, 0, 0);
        return entryDate === today;
      });
      
      if (todayEntry) {
        setCurrentMood(todayEntry.mood);
        setMoodNote(todayEntry.note || '');
      }
    }
  }, []);
  
  const trackMood = () => {
    storage.addMoodEntry(currentMood, moodNote);
    setHasTrackedMood(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-12 px-4">
      <motion.div
        className="text-center max-w-4xl mx-auto mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="mb-8 relative"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="absolute -inset-4 bg-black rounded-full blur-lg opacity-10"></div>
          <div className="relative flex justify-center">
            <motion.div
              className="h-24 w-24 bg-black rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <Brain size={48} className="text-white" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h1 
          className="text-6xl md:text-7xl font-semibold mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Welcome to Zenify
        </motion.h1>
        
        <motion.p 
          className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Your personal AI companion for mental wellness and self-reflection
        </motion.p>

        <motion.div
          className="flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Link to="/chat">
            <Button size="lg" className="text-lg px-8">
              Start Chatting
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {[
          {
            icon: <MessageCircle size={32} />,
            title: "AI Therapy Chat",
            description: "Have meaningful conversations with our AI therapist in a safe, judgment-free space."
          },
          {
            icon: <Book size={32} />,
            title: "Digital Journal",
            description: "Document your thoughts and feelings with our intuitive journaling system."
          },
          {
            icon: <BarChart size={32} />,
            title: "Mood Tracking",
            description: "Track your emotional well-being and discover patterns over time."
          }
        ].map((feature, index) => (
          <motion.div
            key={feature.title}
            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
            whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
          >
            <div className="h-16 w-16 bg-black bg-opacity-5 rounded-xl flex items-center justify-center mb-6">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="mt-16 text-center max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
      >
        <h2 className="text-2xl font-semibold mb-4">Thought of the Day</h2>
        <blockquote className="text-xl italic text-gray-700">"{quote.text}"</blockquote>
        <p className="mt-4 text-gray-500">— {quote.author}</p>
      </motion.div>
    </div>
  );
};

export default HomePage;
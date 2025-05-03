import React from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { MessageCircle, Book, BarChart, Settings, Brain, Shield } from 'lucide-react';
import { getRandomQuote } from '../../utils/quotes';
import storage from '../../utils/storage';

interface SidebarProps {
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ closeSidebar }) => {
  const [quote, setQuote] = React.useState(getRandomQuote());
  const [isAdmin, setIsAdmin] = React.useState(false);
  
  React.useEffect(() => {
    const profile = storage.getUserProfile();
    setIsAdmin(profile.isAdmin || false);
  }, []);
  
  React.useEffect(() => {
    // Change quote every 2 minutes
    const interval = setInterval(() => {
      setQuote(getRandomQuote());
    }, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'Home', icon: <Brain size={20} /> },
    { to: '/chat', label: 'Chat', icon: <MessageCircle size={20} /> },
    { to: '/journal', label: 'Journal', icon: <Book size={20} /> },
    { to: '/mood', label: 'Mood Tracker', icon: <BarChart size={20} /> },
    { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: <Shield size={20} /> }] : []),
  ];

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  return (
    <aside className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Zenify</h2>
        <p className="text-sm text-gray-600">Your AI mental health companion</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item, index) => (
          <motion.div 
            key={item.to}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <NavLink
              to={item.to}
              className={({ isActive }) => `
                flex items-center px-4 py-2 rounded-md text-gray-700
                ${isActive 
                  ? 'bg-gray-100 text-black font-medium' 
                  : 'hover:bg-gray-50 hover:text-black'
                }
                transition-colors duration-200
              `}
              onClick={handleNavClick}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </NavLink>
          </motion.div>
        ))}
      </nav>
      
      <motion.div 
        className="p-4 border-t mt-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div 
          className="text-xs text-gray-600 italic"
          key={quote.text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <p>"{quote.text}"</p>
          <p className="mt-1 text-gray-500">— {quote.author}</p>
        </motion.div>
      </motion.div>
    </aside>
  );
};

export default Sidebar;
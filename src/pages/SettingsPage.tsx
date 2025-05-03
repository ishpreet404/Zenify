import React from 'react';
import { motion } from 'framer-motion';
import storage from '../utils/storage';
import Button from '../components/ui/Button';
import { Check, X, Download, Upload, Info } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [name, setName] = React.useState('');
  const [darkMode, setDarkMode] = React.useState(false);
  const [fontSize, setFontSize] = React.useState<'small' | 'medium' | 'large'>('medium');
  const [notifications, setNotifications] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Load settings
  React.useEffect(() => {
    const profile = storage.getUserProfile();
    setName(profile.name || '');
    setDarkMode(profile.settings.theme === 'dark');
    setFontSize(profile.settings.fontSize);
    setNotifications(profile.settings.notifications);
  }, []);
  
  const handleSave = () => {
    try {
      storage.updateUserProfile({
        name,
        settings: {
          theme: darkMode ? 'dark' : 'light',
          fontSize,
          notifications,
        },
      });
      
      setSaved(true);
      setError(null);
      
      // Reset saved indicator after 3 seconds
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      setError('Failed to save settings. Please try again.');
      setSaved(false);
    }
  };
  
  const exportData = () => {
    try {
      const profile = storage.getUserProfile();
      const dataStr = JSON.stringify(profile, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `zenify-data-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      setError('Failed to export data. Please try again.');
    }
  };
  
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate data structure
        if (!data.settings || !data.mood || !data.journals) {
          throw new Error('Invalid data format');
        }
        
        // Import data
        storage.updateUserProfile(data);
        
        // Update UI
        setName(data.name || '');
        setDarkMode(data.settings.theme === 'dark');
        setFontSize(data.settings.fontSize || 'medium');
        setNotifications(data.settings.notifications || false);
        
        setSaved(true);
        setError(null);
        
        // Reset saved indicator after 3 seconds
        setTimeout(() => {
          setSaved(false);
        }, 3000);
      } catch (err) {
        setError('Failed to import data. File may be corrupted or in the wrong format.');
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read the file. Please try again.');
    };
    
    reader.readAsText(file);
  };
  
  return (
    <div>
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-gray-600">Customize your Zenify experience</p>
      </motion.div>
      
      <motion.div
        className="bg-white rounded-lg shadow-md p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold mb-4">Profile</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
            placeholder="Your name"
          />
        </div>
      </motion.div>
      
      <motion.div
        className="bg-white rounded-lg shadow-md p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold mb-4">Appearance</h2>
        
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Dark Mode
            </label>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`
                relative inline-flex items-center h-6 rounded-full w-11
                ${darkMode ? 'bg-black' : 'bg-gray-200'}
                transition-colors duration-200
              `}
            >
              <span
                className={`
                  inline-block w-4 h-4 transform rounded-full bg-white
                  ${darkMode ? 'translate-x-6' : 'translate-x-1'}
                  transition-transform duration-200
                `}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Coming soon: Toggle between light and dark themes
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Size
          </label>
          <div className="flex gap-2">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`
                  px-4 py-2 rounded-md
                  ${fontSize === size 
                    ? 'bg-black text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                  transition-colors
                `}
              >
                <span className={size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : ''}>
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
      
      <motion.div
        className="bg-white rounded-lg shadow-md p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>
        
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Daily Reminders
            </label>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`
                relative inline-flex items-center h-6 rounded-full w-11
                ${notifications ? 'bg-black' : 'bg-gray-200'}
                transition-colors duration-200
              `}
            >
              <span
                className={`
                  inline-block w-4 h-4 transform rounded-full bg-white
                  ${notifications ? 'translate-x-6' : 'translate-x-1'}
                  transition-transform duration-200
                `}
              />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Coming soon: Get reminded to track your mood daily
          </p>
        </div>
      </motion.div>
      
      <motion.div
        className="bg-white rounded-lg shadow-md p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-xl font-semibold mb-4">Data Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={exportData}
            icon={<Download size={16} />}
          >
            Export Data
          </Button>
          
          <div>
            <label className="block w-full">
              <Button
                variant="outline"
                className="w-full"
                icon={<Upload size={16} />}
                onClick={() => document.getElementById('import-file')?.click()}
              >
                Import Data
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                className="hidden"
                onChange={importData}
              />
            </label>
          </div>
        </div>
        
        <div className="mt-4 flex items-start">
          <Info size={16} className="text-gray-500 mt-1 mr-2 flex-shrink-0" />
          <p className="text-xs text-gray-500">
            Export your data regularly to avoid losing your journal entries and conversation history.
            Note that we store all your data locally in your browser. Clearing your browser data will
            remove all your Zenify information.
          </p>
        </div>
      </motion.div>
      
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button onClick={handleSave}>Save Settings</Button>
        
        {saved && (
          <motion.div
            className="flex items-center text-green-600"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            <Check size={18} className="mr-1" />
            <span>Settings saved</span>
          </motion.div>
        )}
        
        {error && (
          <motion.div
            className="flex items-center text-red-600"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            <X size={18} className="mr-1" />
            <span>{error}</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default SettingsPage;
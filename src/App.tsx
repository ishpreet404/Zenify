import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import Layout from './components/layout/Layout';

// Pages
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import JournalPage from './pages/JournalPage';
import MoodPage from './pages/MoodPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';

// Services
import storage from './utils/storage';
import { getApiBaseUrl } from './utils/api';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Theme Context
export const ThemeContext = React.createContext({
  isDarkMode: false,
  toggleDarkMode: () => {},
});

function AppContent() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const keepAliveEnabled = (import.meta.env.VITE_ENABLE_KEEPALIVE || 'true').toLowerCase() === 'true';
  const keepAliveIntervalMs = Number(import.meta.env.VITE_KEEPALIVE_INTERVAL_MS || 180000);

  // Initialize storage and theme
  React.useEffect(() => {
    storage.initializeStorage();
    const savedTheme = localStorage.getItem('theme');
    setIsDarkMode(savedTheme === 'dark');
  }, []);

  // Update theme
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Keep backend warm while users are active in the app
  React.useEffect(() => {
    if (!isAuthenticated || !keepAliveEnabled) {
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      return;
    }

    const ping = () => {
      fetch(`${apiBaseUrl}/health`, {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => {
        // ignore ping errors; this is best-effort keepalive
      });
    };

    ping();
    const intervalId = window.setInterval(ping, Math.max(60000, keepAliveIntervalMs));
    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, keepAliveEnabled, keepAliveIntervalMs]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-600">Loading...</div>;
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Layout />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          >
            <Route index element={<HomePage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="mood" element={<MoodPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="about" element={<AboutPage />} />
            {isAdmin && <Route path="admin" element={<AdminPage />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </ThemeContext.Provider>
  );
}

export default function App() {
  return <AppContent />;
}
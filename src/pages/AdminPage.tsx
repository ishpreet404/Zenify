import React from 'react';
import { motion } from 'framer-motion';
import { FlaggedContent } from '../types';
import storage from '../utils/storage';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, MessageCircle, Book } from 'lucide-react';
import Button from '../components/ui/Button';

const AdminPage: React.FC = () => {
  const [flaggedContent, setFlaggedContent] = React.useState<FlaggedContent[]>([]);
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'reviewed'>('all');
  
  React.useEffect(() => {
    const content = storage.getFlaggedContent();
    setFlaggedContent(content);
  }, []);
  
  const handleMarkReviewed = (id: string) => {
    const profile = storage.getUserProfile();
    const updated = storage.updateFlaggedContent(id, {
      reviewed: true,
      reviewedAt: Date.now(),
      reviewedBy: profile.name || 'Admin',
    });
    
    if (updated) {
      setFlaggedContent(prev => 
        prev.map(item => item.id === id ? updated : item)
      );
    }
  };
  
  const filteredContent = React.useMemo(() => {
    return flaggedContent
      .filter(item => {
        if (filter === 'pending') return !item.reviewed;
        if (filter === 'reviewed') return item.reviewed;
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [flaggedContent, filter]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-gray-600">Monitor and review flagged content</p>
      </div>
      
      {/* Filter buttons */}
      <div className="mb-6 flex gap-2">
        {(['all', 'pending', 'reviewed'] as const).map((option) => (
          <Button
            key={option}
            variant={filter === option ? 'primary' : 'outline'}
            onClick={() => setFilter(option)}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </Button>
        ))}
      </div>
      
      {/* Content list */}
      <div className="space-y-4">
        {filteredContent.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <AlertTriangle size={32} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No flagged content found</p>
          </div>
        ) : (
          filteredContent.map((item) => (
            <motion.div
              key={item.id}
              className="bg-white rounded-lg shadow-sm p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {item.type === 'chat' ? (
                    <MessageCircle size={20} className="text-gray-500" />
                  ) : (
                    <Book size={20} className="text-gray-500" />
                  )}
                  <span className="text-sm font-medium capitalize">{item.type}</span>
                </div>
                
                {item.reviewed ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle size={16} className="mr-1" />
                    <span className="text-sm">Reviewed</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleMarkReviewed(item.id)}
                  >
                    Mark as Reviewed
                  </Button>
                )}
              </div>
              
              <div className="mt-4">
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                  <p className="text-red-700 text-sm font-medium">
                    Reason for flagging:
                  </p>
                  <p className="text-red-600">{item.reason}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-500 flex items-center justify-between">
                <span>
                  Flagged on {format(item.timestamp, 'MMM d, yyyy - h:mm a')}
                </span>
                
                {item.reviewed && (
                  <span>
                    Reviewed by {item.reviewedBy} on{' '}
                    {format(item.reviewedAt!, 'MMM d, yyyy - h:mm a')}
                  </span>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPage;
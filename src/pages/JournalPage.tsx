import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JournalEntry } from '../types';
import storage from '../utils/storage';
import JournalCard from '../components/journal/JournalCard';
import JournalForm from '../components/journal/JournalForm';
import Button from '../components/ui/Button';
import { Plus, Search, Filter } from 'lucide-react';

const JournalPage: React.FC = () => {
  const [journals, setJournals] = React.useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [editingJournal, setEditingJournal] = React.useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTag, setActiveTag] = React.useState<string | null>(null);
  
  // Load journals
  React.useEffect(() => {
    const loadedJournals = storage.getJournalEntries();
    setJournals(loadedJournals);
  }, []);
  
  const handleCreateJournal = () => {
    setEditingJournal(null);
    setShowForm(true);
  };
  
  const handleEditJournal = (journal: JournalEntry) => {
    setEditingJournal(journal);
    setShowForm(true);
  };
  
  const handleDeleteJournal = (id: string) => {
    if (window.confirm('Are you sure you want to delete this journal entry?')) {
      const success = storage.deleteJournalEntry(id);
      if (success) {
        setJournals(journals.filter(journal => journal.id !== id));
      }
    }
  };
  
  const handleSubmitJournal = (journalData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingJournal) {
      const updatedJournal = storage.updateJournalEntry(editingJournal.id, journalData);
      if (updatedJournal) {
        setJournals(journals.map(journal => 
          journal.id === updatedJournal.id ? updatedJournal : journal
        ));
      }
    } else {
      const newJournal = storage.addJournalEntry(journalData);
      setJournals([...journals, newJournal]);
    }
    
    setShowForm(false);
    setEditingJournal(null);
  };
  
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingJournal(null);
  };
  
  // Get all unique tags
  const allTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    journals.forEach(journal => {
      journal.tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [journals]);
  
  // Filter journals based on search and tags
  const filteredJournals = React.useMemo(() => {
    return journals
      .filter(journal => {
        // Search filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery || 
          journal.title.toLowerCase().includes(searchLower) ||
          journal.content.toLowerCase().includes(searchLower);
        
        // Tag filter
        const matchesTag = !activeTag || journal.tags.includes(activeTag);
        
        return matchesSearch && matchesTag;
      })
      .sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first
  }, [journals, searchQuery, activeTag]);

  return (
    <div>
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <JournalForm
              onSubmit={handleSubmitJournal}
              onCancel={handleCancelForm}
              initialValues={editingJournal || undefined}
              isEditing={!!editingJournal}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold">Journal</h1>
              <Button
                onClick={handleCreateJournal}
                icon={<Plus size={18} />}
              >
                New Entry
              </Button>
            </div>
            
            {/* Search and filter */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search journals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>
              
              {allTags.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <Filter size={18} className="text-gray-400 flex-shrink-0" />
                  
                  <button
                    onClick={() => setActiveTag(null)}
                    className={`
                      px-2 py-1 rounded-full text-sm whitespace-nowrap
                      ${!activeTag 
                        ? 'bg-black text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    All
                  </button>
                  
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                      className={`
                        px-2 py-1 rounded-full text-sm whitespace-nowrap
                        ${activeTag === tag 
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Journal list */}
            {filteredJournals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No journal entries found</p>
                <Button
                  variant="outline"
                  onClick={handleCreateJournal}
                  icon={<Plus size={18} />}
                >
                  Create your first entry
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence>
                  {filteredJournals.map(journal => (
                    <JournalCard
                      key={journal.id}
                      journal={journal}
                      onEdit={handleEditJournal}
                      onDelete={handleDeleteJournal}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JournalPage;
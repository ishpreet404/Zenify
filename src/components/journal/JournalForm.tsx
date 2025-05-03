import React from 'react';
import { motion } from 'framer-motion';
import { JournalEntry, Mood } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import MoodSelector from '../mood/MoodSelector';
import { X } from 'lucide-react';

interface JournalFormProps {
  onSubmit: (journal: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  initialValues?: Partial<JournalEntry>;
  isEditing?: boolean;
}

const JournalForm: React.FC<JournalFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  isEditing = false,
}) => {
  const [title, setTitle] = React.useState(initialValues?.title || '');
  const [content, setContent] = React.useState(initialValues?.content || '');
  const [mood, setMood] = React.useState<Mood>(initialValues?.mood || 'neutral');
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>(initialValues?.tags || []);
  
  const handleTagAdd = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  const handleTagRemove = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTagAdd();
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      mood,
      tags,
    });
  };

  return (
    <motion.div
      className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <form onSubmit={handleSubmit}>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}
        </h2>
        
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your entry a title"
          required
        />
        
        <TextArea
          label="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your thoughts here..."
          rows={6}
          required
          className="mb-4"
        />
        
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            How are you feeling?
          </label>
          <MoodSelector selectedMood={mood} onSelectMood={setMood} />
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Tags
          </label>
          
          <div className="flex items-center">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add tags (press Enter)"
              className="flex-1"
            />
            <Button
              type="button"
              className="ml-2"
              onClick={handleTagAdd}
              disabled={!tagInput.trim()}
            >
              Add
            </Button>
          </div>
          
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map(tag => (
                <div
                  key={tag}
                  className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full flex items-center text-sm"
                >
                  #{tag}
                  <button
                    type="button"
                    className="ml-1 focus:outline-none"
                    onClick={() => handleTagRemove(tag)}
                  >
                    <X size={14} className="text-gray-500 hover:text-gray-700" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
          >
            {isEditing ? 'Update' : 'Save'} Journal
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

export default JournalForm;
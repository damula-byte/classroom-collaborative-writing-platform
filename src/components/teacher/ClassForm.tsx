import { useState } from 'react';
import { Button, Input, Modal } from '@/components/common';
import { generateClassCode } from '@/utils';

interface ClassFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    topic: string;
    code: string;
    allowStudentGroupSelection: boolean;
  }) => Promise<void>;
}

export function ClassForm({ open, onClose, onSubmit }: ClassFormProps) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [code, setCode] = useState(generateClassCode());
  const [allowGroupSelection, setAllowGroupSelection] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ title, topic, code, allowStudentGroupSelection: allowGroupSelection });
      setTitle('');
      setTopic('');
      setCode(generateClassCode());
      setAllowGroupSelection(false);
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setCode(generateClassCode());
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Class" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Class Title"
          placeholder="e.g. IELTS Writing Task 2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Writing Topic
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Some people believe technology..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Class Code
          </label>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={handleRegenerate}>
              Regenerate
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Students use this code to join your class
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowGroupSelection}
            onChange={(e) => setAllowGroupSelection(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-700">Allow students to select their own group</span>
        </label>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Create Class
          </Button>
        </div>
      </form>
    </Modal>
  );
}
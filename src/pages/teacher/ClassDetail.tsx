import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, StatusBadge, Modal, Input, Toast } from '@/components/common';
import { useGroups } from '@/hooks/useGroup';
import { createGroup } from '@/services';

interface GroupFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

function GroupForm({ open, onClose, onSubmit }: GroupFormProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(name);
      setName('');
      onClose();
    } catch (err) {
      // handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Group" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Group Name"
          placeholder="e.g. Group 1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const { groups, loading } = useGroups(classId || null);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleAddGroup = async (name: string) => {
    try {
      await createGroup(classId!, name);
      setToast({ message: 'Group created!', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to create group', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/teacher/dashboard" className="text-slate-600 hover:text-slate-900">
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-slate-900">Class Detail</h1>
            </div>
            <Button onClick={() => setShowAddGroup(true)}>+ Add Group</Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Groups</h2>
          <p className="text-slate-600 mt-1">Manage groups and monitor their writing progress</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">No groups yet</div>
            <Button onClick={() => setShowAddGroup(true)}>+ Add Your First Group</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div key={group.id} className="bg-white rounded-xl shadow p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
                  <StatusBadge status={group.status} />
                </div>
                <div className="text-sm text-slate-600 mb-4">
                  {group.members.length} member(s)
                </div>
                <div className="flex gap-2">
                  <Link to={`/teacher/classes/${classId}/monitor`} className="flex-1">
                    <Button size="sm" variant="secondary" className="w-full">
                      Monitor
                    </Button>
                  </Link>
                  <Link to={`/teacher/classes/${classId}/groups/${group.id}/review`} className="flex-1">
                    <Button size="sm" className="w-full">
                      Review
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <GroupForm
        open={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onSubmit={handleAddGroup}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
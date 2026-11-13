import { Link, useParams } from 'react-router-dom';
import { Button, StatusBadge } from '@/components/common';
import { cn } from '@/utils';
import { useGroups } from '@/hooks/useGroup';
import { useGroupPresence } from '@/hooks/usePresence';
import { useDocuments } from '@/hooks/useDocuments';

export function LiveMonitoring() {
  const { classId } = useParams<{ classId: string }>();
  const { groups } = useGroups(classId || null);
  const groupIds = groups.map((g) => g.id);
  const { documents } = useDocuments(groupIds);

  const getDocumentForGroup = (groupId: string) =>
    documents.find((d) => d.groupId === groupId);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to={`/teacher/classes/${classId}`} className="text-slate-600 hover:text-slate-900">
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-slate-900">Live Monitoring</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-slate-600">Live</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Live Group Grid</h2>
          <p className="text-slate-600 mt-1">Watch all groups write in real time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              classId={classId || null}
              group={group}
              document={getDocumentForGroup(group.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function GroupCard({
  classId,
  group,
  document,
}: {
  classId: string | null;
  group: any;
  document: any;
}) {
  const peers = useGroupPresence(classId, group.id);
  const onlineCount = Object.values(peers).filter((p: any) => p.online).length;

  const previewText = document?.textContent
    ? document.textContent.slice(0, 120) + (document.textContent.length > 120 ? '...' : '')
    : '';

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
        <StatusBadge status={group.status} />
      </div>

      <div className="h-48 bg-slate-50 rounded-lg p-4 mb-4 overflow-y-auto">
        {previewText ? (
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {previewText}
          </p>
        ) : (
          <p className="text-slate-400 text-sm italic">No content yet</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              onlineCount > 0 ? 'bg-green-500' : 'bg-slate-300'
            )}
          />
          <span className="text-slate-600">
            {onlineCount} / {group.members.length} online
          </span>
        </div>
        <Link to={`/teacher/classes/${classId}/groups/${group.id}/review`}>
          <Button size="sm">Open Review</Button>
        </Link>
      </div>

      {onlineCount > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap gap-1">
            {Object.entries(peers)
              .filter(([, p]: any) => p.online)
              .map(([uid, p]: any) => (
                <span
                  key={uid}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs"
                >
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {p.name}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
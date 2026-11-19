import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button, StatusBadge } from '@/components/common';
import { AppHeader, Avatar, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useClass } from '@/hooks/useClass';
import { useGroups } from '@/hooks/useGroup';
import { useGroupPresence } from '@/hooks/usePresence';
import { useDocuments } from '@/hooks/useDocuments';
import { Group, Document, PresenceEntry } from '@/types';
import { BRANDING } from '@/config/branding';
import {
  ArrowLeft,
  FileEdit,
  Radio,
  FileText,
  Clock,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export function LiveMonitoring() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { teacherName, logout } = useAuth();
  const { cls, loading: classLoading } = useClass(classId || null);
  const { groups, loading: groupsLoading } = useGroups(classId || null);

  const groupIds = groups.map((g) => g.id);
  const { documents } = useDocuments(groupIds);

  const getDocumentForGroup = (groupId: string): Document | undefined =>
    documents.find((d) => d.groupId === groupId);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const breadcrumbs = (
    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
      <Link to="/teacher/dashboard" className="text-slate-400 hover:text-slate-700 transition">
        Classes
      </Link>
      <span className="text-slate-300">/</span>
      <Link
        to={`/teacher/classes/${classId}`}
        className="text-slate-400 hover:text-slate-700 transition truncate max-w-[140px]"
      >
        {cls?.title || 'Class'}
      </Link>
      <span className="text-slate-300">/</span>
      <span className="text-slate-800 font-bold">Live Monitor</span>
    </div>
  );

  // Derive metrics safely from existing loaded state
  const totalGroups = groups.length;
  const groupsWriting = groups.filter((g) => g.status === 'WRITING').length;
  const groupsSubmitted = groups.filter((g) => g.status === 'SUBMITTED' || g.status === 'REVIEWED').length;

  return (
    <div className="min-h-screen bg-[#fbfaf7] font-sans flex flex-col justify-between">
      <div>
        {/* Sticky App Header */}
        <AppHeader
          productName={BRANDING.productName}
          userName={teacherName}
          roleLabel="Teacher"
          roleVariant="orange"
          breadcrumbs={breadcrumbs}
          onLogout={handleLogout}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Top Navigation & Live Pulse Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Link
              to={`/teacher/classes/${classId}`}
              className="group inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition"
            >
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              <span>Back to Class Detail</span>
            </Link>

            {/* Live Indicator Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3.5 py-1.5 text-xs font-bold text-green-700 shadow-2xs self-start sm:self-auto">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600" />
              </span>
              <Radio className="h-3.5 w-3.5 text-green-600" />
              <span>Realtime Monitoring Active</span>
            </div>
          </div>

          {/* Compact Overview Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Class Overview</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {classLoading ? 'Loading class...' : cls?.title || 'Live Supervision Grid'}
                </h1>
                {cls?.topic && (
                  <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 mt-1">
                    <span className="font-semibold text-slate-700">Topic: </span>
                    {cls.topic}
                  </p>
                )}
              </div>

              {/* Stat Badges Row */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
                  <Layers className="h-4 w-4 text-orange-500" />
                  <span>{totalGroups} Groups Total</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50/70 px-4 py-2 text-xs font-semibold text-green-800">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span>{groupsWriting} Actively Writing</span>
                </div>
                {groupsSubmitted > 0 && (
                  <div className="flex items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50/70 px-4 py-2 text-xs font-semibold text-purple-800">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span>{groupsSubmitted} Submitted / Reviewed</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Group Monitoring Grid */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Live Group Writing Cards
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time document previews and student active presence
                </p>
              </div>
            </div>

            {groupsLoading ? (
              <div className="text-center py-20 text-slate-400 font-medium">
                Loading class groups...
              </div>
            ) : groups.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-8 w-8 text-orange-600" />}
                title="No groups found in this class"
                description="Before monitoring, please create writing groups in the Class Detail page."
                action={
                  <Link to={`/teacher/classes/${classId}`}>
                    <Button variant="ws-primary">
                      <span>Go to Class Detail</span>
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {groups.map((group, index) => (
                  <GroupMonitoringCard
                    key={group.id}
                    classId={classId || null}
                    group={group}
                    document={getDocumentForGroup(group.id)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

interface GroupMonitoringCardProps {
  classId: string | null;
  group: Group;
  document: Document | undefined;
  index: number;
}

function GroupMonitoringCard({
  classId,
  group,
  document,
  index,
}: GroupMonitoringCardProps) {
  // Use existing RTDB presence hook safely
  const peers = useGroupPresence(classId, group.id);
  const peerList = Object.entries(peers || {});
  const onlinePeers = peerList.filter(([, p]: [string, PresenceEntry]) => p?.online === true);
  const onlineCount = onlinePeers.length;

  const isOrange = index % 2 === 0;

  // Safe document text extraction
  let previewText = '';
  let isEmpty = false;

  if (document?.textContent !== undefined && document.textContent !== null) {
    const trimmed = document.textContent.trim();
    if (trimmed.length > 0) {
      previewText = trimmed.slice(0, 180) + (trimmed.length > 180 ? '...' : '');
    } else {
      isEmpty = true;
    }
  } else {
    isEmpty = true;
  }

  // Calculate visible avatar display (max 4, then +N)
  const maxVisibleAvatars = 4;
  const visibleAvatars = onlinePeers.slice(0, maxVisibleAvatars);
  const remainingCount = onlineCount - maxVisibleAvatars;

  return (
    <div className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl overflow-hidden">
      {/* Top Accent Line */}
      <div
        className={`absolute top-0 inset-x-0 h-1.5 ${
          isOrange ? 'bg-orange-500' : 'bg-green-600'
        }`}
      />

      <div>
        {/* Card Header: Group Name + Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                isOrange
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {group.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition">
                {group.name}
              </h3>
              <div className="text-[11px] text-slate-400">
                {group.members.length} student{group.members.length === 1 ? '' : 's'} assigned
              </div>
            </div>
          </div>

          <StatusBadge status={group.status} />
        </div>

        {/* Real-time Document Text Preview */}
        <div className="h-40 rounded-2xl bg-[#faf9f6] p-4 mb-4 border border-slate-100 overflow-y-auto">
          {previewText ? (
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-normal">
              {previewText}
            </p>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-4">
              <FileText className="h-5 w-5 mb-1 text-slate-300" />
              <p className="text-xs font-medium">Waiting for first contribution...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-4">
              <p className="text-xs italic">No writing content available yet.</p>
            </div>
          )}
        </div>

        {/* Word count & document metadata if available */}
        {document?.wordCount !== undefined && document.wordCount > 0 && (
          <div className="text-[11px] font-semibold text-slate-400 mb-3 flex items-center justify-between">
            <span>Word count: {document.wordCount}</span>
            {document.version ? <span>v{document.version}</span> : null}
          </div>
        )}
      </div>

      {/* Card Footer: Online Student Avatars & Review CTA */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        {/* Presence Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                onlineCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
            <span className="font-semibold text-slate-600">
              {onlineCount > 0
                ? `${onlineCount} / ${group.members.length} online`
                : 'Presence idle (no active cursors)'}
            </span>
          </div>

          {/* Member Avatars Stack */}
          {onlineCount > 0 && (
            <div className="flex items-center -space-x-1.5">
              {visibleAvatars.map(([uid, p]: [string, PresenceEntry]) => (
                <Avatar
                  key={uid}
                  name={p.name}
                  size="sm"
                  variant="green"
                  className="ring-2 ring-white"
                />
              ))}
              {remainingCount > 0 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-700">
                  +{remainingCount}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button: Navigate to Review Mode */}
        <Link
          to={`/teacher/classes/${classId}/groups/${group.id}/review`}
          className="block w-full"
        >
          <Button
            size="sm"
            variant="ws-primary"
            className="w-full text-xs font-bold py-2 flex items-center justify-center gap-1.5"
          >
            <FileEdit className="h-3.5 w-3.5" />
            <span>Open Review & Feedback</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { MessageSquare, Reply, Send, X } from 'lucide-react';
import { HighlightColor, WritingComment, WRITESPACE_HIGHLIGHT_COLORS } from '@/types';
import { HighlightColorPicker } from './HighlightColorPicker';
import { cn } from '@/utils';

interface CommentsSidebarProps {
  comments: WritingComment[];
  canComment: boolean;
  selectedQuote: string | null;
  highlightColor: HighlightColor;
  onHighlightColorChange: (color: HighlightColor) => void;
  onClearSelection: () => void;
  onAddComment: (body: string, parentId?: string | null) => Promise<void>;
  currentUserId?: string | null;
  canResolve?: boolean;
  onResolveThread?: (commentId: string) => Promise<void>;
  onReopenThread?: (commentId: string) => Promise<void>;
  onEditComment?: (commentId: string, body: string) => Promise<void>;
  onDeleteReply?: (commentId: string) => Promise<void>;
  onSoftDeleteThread?: (commentId: string) => Promise<void>;
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  comments,
  canComment,
  selectedQuote,
  highlightColor,
  onHighlightColorChange,
  onClearSelection,
  onAddComment,
  currentUserId,
  canResolve = false,
  onResolveThread,
  onReopenThread,
  onEditComment,
  onDeleteReply,
  onSoftDeleteThread,
}) => {
  const [newBody, setNewBody] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');

  const { roots, repliesByParent } = useMemo(() => {
    const rootsList: WritingComment[] = [];
    const map: Record<string, WritingComment[]> = {};
    for (const c of comments) {
      if (c.isDeleted) continue;
      if (!c.parentId) {
        rootsList.push(c);
      } else {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    }
    const filteredRoots = rootsList.filter((root) =>
      filter === 'all'
        ? true
        : filter === 'resolved'
          ? root.status === 'resolved'
          : root.status !== 'resolved'
    );
    return { roots: filteredRoots, repliesByParent: map };
  }, [comments, filter]);

  const handleSubmitRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBody.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(newBody.trim(), null);
      setNewBody('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyBody.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(replyBody.trim(), parentId);
      setReplyBody('');
      setReplyingTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="w-full lg:w-[360px] shrink-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col max-h-[80vh] lg:sticky lg:top-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-orange-500" />
          <h3 className="text-base font-extrabold text-slate-900">Comments</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
          {comments.filter((comment) => !comment.parentId && !comment.isDeleted && comment.status !== 'resolved').length} open
        </span>
      </div>
      <div className="flex gap-1 pt-3">
        {(['open', 'resolved', 'all'] as const).map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-bold capitalize',
              filter === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {roots.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8">
            No comments yet. Select text in the essay or write a general comment below.
          </p>
        ) : (
          roots.map((comment) => {
            const isTeacher = comment.authorRole === 'teacher';
            const quoteMeta = comment.highlightColor
              ? WRITESPACE_HIGHLIGHT_COLORS[comment.highlightColor]
              : WRITESPACE_HIGHLIGHT_COLORS.orange;
            const replies = repliesByParent[comment.id] || [];

            return (
              <div key={comment.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white',
                        isTeacher ? 'bg-orange-500' : 'bg-green-600'
                      )}
                    >
                      {comment.authorName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{comment.authorName}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {isTeacher ? 'Teacher' : 'Student'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>

                {comment.selectedText && (
                  <blockquote
                    className={cn(
                      'mt-2.5 rounded-lg border-l-4 px-2.5 py-1.5 text-xs italic line-clamp-3',
                      quoteMeta.quoteClass
                    )}
                  >
                    “{comment.selectedText}”
                  </blockquote>
                )}

                {editingId === comment.id ? (
                  <div className="mt-2.5 space-y-2">
                    <textarea
                      rows={2}
                      value={editingBody}
                      onChange={(event) => setEditingBody(event.target.value)}
                      className="ws-field text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!editingBody.trim() || !onEditComment) return;
                          await onEditComment(comment.id, editingBody.trim());
                          setEditingId(null);
                        }}
                        className="text-xs font-bold text-green-700"
                      >
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-xs font-bold text-slate-500">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2.5 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {comment.body}
                  </p>
                )}

                {comment.authorId === currentUserId && (
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditingBody(comment.body);
                      }}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      Edit
                    </button>
                    {onSoftDeleteThread && (
                      <button
                        type="button"
                        onClick={() => onSoftDeleteThread(comment.id)}
                        className="text-[11px] font-bold text-red-500"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}

                {canResolve && comment.status !== 'resolved' && onResolveThread && (
                  <button
                    type="button"
                    onClick={() => onResolveThread(comment.id)}
                    className="mt-2 text-[11px] font-bold text-orange-600"
                  >
                    Resolve
                  </button>
                )}
                {canResolve && comment.status === 'resolved' && onReopenThread && (
                  <button
                    type="button"
                    onClick={() => onReopenThread(comment.id)}
                    className="mt-2 text-[11px] font-bold text-orange-600"
                  >
                    Reopen
                  </button>
                )}

                {canComment && (
                  <button
                    type="button"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-orange-600"
                  >
                    <Reply size={13} /> Reply
                  </button>
                )}

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="mt-3 space-y-2.5 border-l-2 border-slate-200 pl-3">
                    {replies.map((reply) => {
                      const replyTeacher = reply.authorRole === 'teacher';
                      return (
                        <div key={reply.id} className="rounded-xl bg-white p-2.5 border border-slate-100">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white',
                                replyTeacher ? 'bg-orange-500' : 'bg-green-600'
                              )}
                            >
                              {reply.authorName.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {reply.authorName}
                            </span>
                            <span className="text-[10px] font-semibold uppercase text-slate-400">
                              {replyTeacher ? 'Teacher' : 'Student'}
                            </span>
                          </div>
                          {editingId === reply.id ? (
                            <div className="mt-1.5 space-y-2">
                              <textarea
                                rows={2}
                                value={editingBody}
                                onChange={(event) => setEditingBody(event.target.value)}
                                className="ws-field text-xs resize-none"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!editingBody.trim() || !onEditComment) return;
                                  await onEditComment(reply.id, editingBody.trim());
                                  setEditingId(null);
                                }}
                                className="text-[11px] font-bold text-green-700"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <p className="mt-1.5 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {reply.body}
                            </p>
                          )}
                          {reply.authorId === currentUserId && (
                            <div className="mt-1.5 flex gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(reply.id);
                                  setEditingBody(reply.body);
                                }}
                                className="text-[10px] font-bold text-slate-500"
                              >
                                Edit
                              </button>
                              {onDeleteReply && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteReply(reply.id)}
                                  className="text-[10px] font-bold text-red-500"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {replyingTo === comment.id && canComment && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Write a reply..."
                      className="ws-field py-2 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitReply(comment.id);
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={!replyBody.trim() || submitting}
                      onClick={() => handleSubmitReply(comment.id)}
                      className="ws-btn-primary px-3 py-2 text-xs"
                      aria-label="Send reply"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add new comment */}
      {canComment && (
        <form onSubmit={handleSubmitRoot} className="pt-4 border-t border-slate-100 space-y-2.5">
          {selectedQuote && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-orange-800">Selected excerpt</span>
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Clear selection"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs italic text-slate-700 line-clamp-2">“{selectedQuote}”</p>
              <HighlightColorPicker
                value={highlightColor}
                onChange={onHighlightColorChange}
                size="sm"
              />
            </div>
          )}

          <textarea
            rows={2}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder={selectedQuote ? 'Comment on selected text...' : 'Add a general comment...'}
            className="ws-field py-2.5 text-sm resize-none"
          />
          <button
            type="submit"
            disabled={!newBody.trim() || submitting}
            className="ws-btn-primary w-full py-2.5 text-xs"
          >
            <Send size={14} />
            {submitting ? 'Posting...' : 'Post comment'}
          </button>
        </form>
      )}
    </aside>
  );
};

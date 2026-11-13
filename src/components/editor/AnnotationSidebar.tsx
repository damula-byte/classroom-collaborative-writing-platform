import { cn } from '@/utils';
import { Annotation } from '@/types';

interface AnnotationSidebarProps {
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
  onResolve?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function AnnotationSidebar({
  annotations,
  onAnnotationClick,
  onResolve,
  onDelete,
}: AnnotationSidebarProps) {
  if (annotations.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 text-sm">
        No annotations yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {annotations.map((ann) => (
        <div
          key={ann.id}
          className={cn(
            'p-3 rounded-lg border cursor-pointer transition',
            ann.resolved ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-yellow-50 border-yellow-200'
          )}
          onClick={() => onAnnotationClick?.(ann)}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">
              {ann.type}
            </span>
            {!ann.resolved && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve?.(ann.id);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Resolve
              </button>
            )}
          </div>
          <p className="text-sm text-slate-700 mt-1 font-medium">
            "{ann.selectedText}"
          </p>
          {ann.comment && (
            <p className="text-sm text-slate-600 mt-1">{ann.comment}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">{ann.authorName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(ann.id);
              }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

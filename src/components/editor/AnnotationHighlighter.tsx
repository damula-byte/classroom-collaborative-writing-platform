import { useMemo } from 'react';
import { Annotation } from '@/types';

interface AnnotationHighlighterProps {
  content: string;
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
}

export function AnnotationHighlighter({
  content,
  annotations,
  onAnnotationClick,
}: AnnotationHighlighterProps) {
  // Build highlighted HTML by finding annotation text in content
  const highlightedHtml = useMemo(() => {
    if (!content || annotations.length === 0) {
      return escapeHtml(content);
    }

    const segments: Array<{ start: number; end: number; annotation: Annotation }> = [];
    for (const ann of annotations) {
      if (!ann.selectedText) continue;
      let start = ann.from > 0 ? ann.from : -1;
      if (start >= 0 && content.slice(start, start + ann.selectedText.length) !== ann.selectedText) {
        start = content.indexOf(ann.selectedText);
      }
      if (start < 0) continue;
      const end = start + ann.selectedText.length;
      segments.push({ start, end, annotation: ann });
    }

    segments.sort((a, b) => a.start - b.start);
    let cursor = 0;
    let html = '';
    for (const segment of segments) {
      if (segment.start < cursor) continue;
      html += escapeHtml(content.slice(cursor, segment.start));
      const color = annotationColor(segment.annotation.type);
      html += `<mark class="annotation-highlight" style="background-color: ${color}; cursor: pointer; border-radius: 2px;" data-annotation-id="${segment.annotation.id}">${escapeHtml(content.slice(segment.start, segment.end))}</mark>`;
      cursor = segment.end;
    }
    html += escapeHtml(content.slice(cursor));
    return html;
  }, [content, annotations]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const annId = target.getAttribute('data-annotation-id');
    if (annId) {
      const ann = annotations.find((a) => a.id === annId);
      if (ann && onAnnotationClick) onAnnotationClick(ann);
    }
  };

  return (
    <div
      className="annotation-highlighter prose max-w-none p-4 min-h-[200px]"
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      onClick={handleClick}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function annotationColor(type: string): string {
  const colors: Record<string, string> = {
    highlight: 'rgba(250, 204, 21, 0.4)',
    comment: 'rgba(59, 130, 246, 0.3)',
    correction: 'rgba(239, 68, 68, 0.2)',
  };
  return colors[type] || colors.highlight;
}

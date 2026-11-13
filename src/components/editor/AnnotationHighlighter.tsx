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

    // Sort annotations by position (descending) to avoid offset shifts
    const sorted = [...annotations].sort((a, b) => b.from - a.from);
    let html = content;

    // Simple approach: replace selected text with highlighted spans
    for (const ann of sorted) {
      if (!ann.selectedText) continue;
      const escaped = escapeRegex(ann.selectedText);
      const regex = new RegExp(`(${escaped})`, 'g');
      const color = annotationColor(ann.type);
      html = html.replace(
        regex,
        `<mark class="annotation-highlight" style="background-color: ${color}; cursor: pointer; border-radius: 2px;" data-annotation-id="${ann.id}">$1</mark>`
      );
    }

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

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function annotationColor(type: string): string {
  const colors: Record<string, string> = {
    highlight: 'rgba(250, 204, 21, 0.4)',
    comment: 'rgba(59, 130, 246, 0.3)',
    correction: 'rgba(239, 68, 68, 0.2)',
  };
  return colors[type] || colors.highlight;
}

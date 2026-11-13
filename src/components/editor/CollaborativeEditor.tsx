import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { cn } from '@/utils';

interface CollaborativeEditorProps {
  ydoc: Y.Doc | null;
  content?: string;
  onChange?: (content: string) => void;
  onSelectText?: (text: string) => void;
  editable?: boolean;
  className?: string;
  user?: { name: string; color: string };
}

export function CollaborativeEditor({
  ydoc,
  content = '',
  onChange,
  onSelectText,
  editable = true,
  className,
  user = { name: 'Anonymous', color: '#6366f1' },
}: CollaborativeEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      ...(ydoc
        ? [
            Collaboration.configure({
              document: ydoc,
            }),
            CollaborationCursor.configure({
              user: user,
            }),
          ]
        : []),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getText());
    },
    onSelectionUpdate: ({ editor }) => {
      if (!editable || !onSelectText) return;
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ');
        if (text.trim()) {
          onSelectText(text);
        }
      }
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getText()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className={cn('border border-slate-300 rounded-lg', className)}>
      <Toolbar editor={editor} editable={editable} />
      <EditorContent
        editor={editor}
        className="p-4 min-h-[200px] prose max-w-none"
      />
    </div>
  );
}

function Toolbar({ editor, editable }: { editor: any; editable: boolean }) {
  if (!editable) return null;

  return (
    <div className="border-b border-slate-200 p-2 flex gap-1 bg-slate-50 rounded-t-lg">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().toggleBold()}
        className="px-2 py-1 rounded hover:bg-slate-200 disabled:opacity-40"
        title="Bold"
      >
        <b>B</b>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().toggleItalic()}
        className="px-2 py-1 rounded hover:bg-slate-200 disabled:opacity-40"
        title="Italic"
      >
        <i>I</i>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().toggleStrike()}
        className="px-2 py-1 rounded hover:bg-slate-200 disabled:opacity-40"
        title="Strikethrough"
      >
        <s>S</s>
      </button>
      <span className="w-px h-6 bg-slate-300 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="px-2 py-1 rounded hover:bg-slate-200"
        title="Bullet List"
      >
        &#8226;
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="px-2 py-1 rounded hover:bg-slate-200"
        title="Numbered List"
      >
        1.
      </button>
    </div>
  );
}
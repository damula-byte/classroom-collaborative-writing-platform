import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Collaboration } from '@tiptap/extension-collaboration';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import * as Y from 'yjs';
import { cn } from '@/utils';

interface CollaborativeEditorProps {
  ydoc: Y.Doc | null;
  content?: string;
  onChange?: (content: string) => void;
  onHtmlChange?: (html: string) => void;
  onSelectText?: (text: string) => void;
  editable?: boolean;
  className?: string;
  user?: { name: string; color: string };
}

export function CollaborativeEditor({
  ydoc,
  content = '',
  onChange,
  onHtmlChange,
  onSelectText,
  editable = true,
  className,
}: CollaborativeEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      ...(ydoc
        ? [
            Collaboration.configure({
              document: ydoc,
            }),
          ]
        : []),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getText());
      onHtmlChange?.(editor.getHTML());
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
        className={cn('px-2 py-1 rounded hover:bg-slate-200', editor.isActive('bold') && 'bg-slate-200')}
        title="Bold"
      >
        <b>B</b>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn('px-2 py-1 rounded hover:bg-slate-200', editor.isActive('italic') && 'bg-slate-200')}
        title="Italic"
      >
        <i>I</i>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn('px-2 py-1 rounded hover:bg-slate-200', editor.isActive('underline') && 'bg-slate-200')}
        title="Underline (Ctrl+U)"
      >
        <u>U</u>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
        className={cn('px-2 py-1 rounded hover:bg-slate-200', editor.isActive('highlight') && 'bg-yellow-100')}
        title="Highlight"
      >
        <span className="bg-yellow-200 px-1">H</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="px-2 py-1 rounded hover:bg-slate-200 disabled:opacity-40"
        title="Undo"
      >
        ↶
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="px-2 py-1 rounded hover:bg-slate-200 disabled:opacity-40"
        title="Redo"
      >
        ↷
      </button>
      <span className="w-px h-6 bg-slate-300 mx-1" />
      {([
        ['left', 'Align left'],
        ['center', 'Align center'],
        ['right', 'Align right'],
      ] as const).map(([alignment, title]) => (
        <button
          key={alignment}
          type="button"
          onClick={() => editor.chain().focus().setTextAlign(alignment).run()}
          className={cn(
            'px-2 py-1 rounded hover:bg-slate-200',
            editor.isActive({ textAlign: alignment }) && 'bg-slate-200'
          )}
          title={title}
        >
          {alignment === 'left' ? '≡' : alignment === 'center' ? '≡' : '≡'}
        </button>
      ))}
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
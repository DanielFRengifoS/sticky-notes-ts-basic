import { memo, useEffect, useRef, type PointerEvent } from 'react';
import type { Note, NoteId, NoteRect } from '../../domain/types';

interface NoteCardProps {
  note: Note;
  previewRect?: NoteRect | undefined;
  selected: boolean;
  pendingFocus: boolean;
  onTextChange: (noteId: NoteId, text: string) => void;
  onHeaderPointerDown: (noteId: NoteId, event: PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (noteId: NoteId, event: PointerEvent<HTMLDivElement>) => void;
  onFocusRequestConsumed: (noteId: NoteId) => void;
}

function NoteCardComponent({
  note,
  previewRect,
  selected,
  pendingFocus,
  onTextChange,
  onHeaderPointerDown,
  onResizePointerDown,
  onFocusRequestConsumed,
}: NoteCardProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const rect = previewRect ?? note.rect;

  useEffect(() => {
    if (!pendingFocus) return;
    editorRef.current?.focus();
    onFocusRequestConsumed(note.id);
  }, [pendingFocus, note.id, onFocusRequestConsumed]);

  return (
    <div
      className="noteCard"
      data-selected={selected}
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
    >
      <div
        className="noteHeader"
        onPointerDown={(event) => onHeaderPointerDown(note.id, event)}
      >
        <span
          className="noteHeader__controls"
          onPointerDown={(event) => event.stopPropagation()}
        />
      </div>

      <textarea
        ref={editorRef}
        className="noteEditor"
        value={note.text}
        onChange={(event) => onTextChange(note.id, event.target.value)}
        onPointerDown={(event) => event.stopPropagation()}
      />

      <div
        className="resizeHandle"
        onPointerDown={(event) => onResizePointerDown(note.id, event)}
      />
    </div>
  );
}

export const NoteCard = memo(NoteCardComponent);

import './Board.css';

export function Board() {
  return (
    <div className="board">
      <div className="toolbar">
        <button type="button" className="toolbar__button" aria-pressed={false}>
          New note
        </button>
      </div>

      <div className="boardFrame">
        <div className="boardSurface">
          <p className="emptyState">
            Select &ldquo;New note&rdquo;, then drag on the board to create a note.
          </p>

          <div className="trashZone" aria-hidden="true">
            <span className="trashZone__icon" aria-hidden="true">
              🗑
            </span>
            <span className="trashZone__label">Trash</span>
          </div>
        </div>
      </div>
    </div>
  );
}

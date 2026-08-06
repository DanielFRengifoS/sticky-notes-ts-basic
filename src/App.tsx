import { Board } from './features/board/Board';
import './App.css';

export function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>Sticky Notes</h1>
        <p>React and TypeScript project scaffold</p>
      </header>

      <Board />
    </div>
  );
}

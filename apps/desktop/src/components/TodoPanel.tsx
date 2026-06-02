import { useState } from "react";
import type { TodoItem } from "../lib/todos";

interface TodoPanelProps {
  todos: TodoItem[];
  loading: boolean;
  error: string | null;
  onAdd: (text: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function TodoPanel({
  todos,
  loading,
  error,
  onAdd,
  onToggle,
  onEdit,
  onRemove,
}: TodoPanelProps) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  async function handleAdd(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      return;
    }
    setDraft("");
    await onAdd(text);
  }

  function startEditing(todo: TodoItem): void {
    setEditingId(todo.id);
    setEditDraft(todo.text);
  }

  async function saveEditing(id: string): Promise<void> {
    const text = editDraft.trim();
    if (!text) {
      return;
    }
    await onEdit(id, text);
    setEditingId(null);
    setEditDraft("");
  }

  return (
    <section className="todo-panel" aria-label="Todos">
      <header className="todo-panel-header">
        <div>
          <h2>Todos</h2>
          <p className="todo-summary">
            {loading ? "Loading..." : `${todos.filter((todo) => !todo.done).length} open`}
          </p>
        </div>
        <p className="shortcut-hint">Press ⌘⇧Space to focus DeskNinja</p>
      </header>

      <form className="todo-composer" onSubmit={handleAdd}>
        <label className="sr-only" htmlFor="todo-input">
          New todo
        </label>
        <input
          id="todo-input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a todo..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || draft.trim().length === 0}>
          Add
        </button>
      </form>

      {error ? <p className="todo-error">{error}</p> : null}

      <ul className="todo-list">
        {todos.length === 0 && !loading ? (
          <li className="todo-empty">No todos yet.</li>
        ) : (
          todos.map((todo) => (
            <li key={todo.id} className={`todo-item${todo.done ? " todo-item-done" : ""}`}>
              <label className="todo-check">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => void onToggle(todo.id)}
                  aria-label={`Mark "${todo.text}" as ${todo.done ? "open" : "done"}`}
                />
              </label>
              {editingId === todo.id ? (
                <form
                  className="todo-edit-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveEditing(todo.id);
                  }}
                >
                  <input
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    aria-label="Edit todo"
                    autoFocus
                  />
                  <button type="submit">Save</button>
                  <button type="button" className="secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className="todo-text"
                    onClick={() => startEditing(todo)}
                  >
                    {todo.text}
                  </button>
                  <button
                    type="button"
                    className="todo-delete"
                    onClick={() => void onRemove(todo.id)}
                    aria-label={`Delete "${todo.text}"`}
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

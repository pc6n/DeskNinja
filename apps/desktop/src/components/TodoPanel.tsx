import { useMemo, useState } from "react";
import { reorderOpenIds, sortTodos, type TodoItem, type TodoSortMode } from "../lib/todos";
import { TodoRow } from "./TodoRow";

interface TodoPanelProps {
  todos: TodoItem[];
  sortMode: TodoSortMode;
  loading: boolean;
  error: string | null;
  onSortModeChange: (mode: TodoSortMode) => void;
  onAdd: (text: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
  onDueChange: (id: string, dueAt: number | null) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function TodoPanel({
  todos,
  sortMode,
  loading,
  error,
  onSortModeChange,
  onAdd,
  onToggle,
  onEdit,
  onDueChange,
  onReorder,
  onRemove,
}: TodoPanelProps) {
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const sorted = useMemo(() => sortTodos(todos, sortMode), [todos, sortMode]);
  const openTodos = sorted.filter((todo) => !todo.done);
  const doneTodos = sorted.filter((todo) => todo.done);
  const canDrag = sortMode === "manual";

  async function handleAdd(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      return;
    }
    setDraft("");
    await onAdd(text);
  }

  function handleDrop(targetId: string): void {
    if (!dragId) {
      return;
    }
    const next = reorderOpenIds(
      openTodos.map((todo) => todo.id),
      dragId,
      targetId,
    );
    setDragId(null);
    void onReorder(next);
  }

  const rowProps = {
    draggable: canDrag,
    onToggle,
    onEdit,
    onDueChange,
    onRemove,
    onDragStart: setDragId,
    onDragOver: (event: React.DragEvent, _id: string) => event.preventDefault(),
    onDrop: handleDrop,
    onDragEnd: () => setDragId(null),
  };

  return (
    <section className="todo-panel" aria-label="Todos">
      <div className="todo-toolbar">
        <label className="todo-sort">
          <span className="sr-only">Sort by</span>
          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value as TodoSortMode)}
            aria-label="Sort todos"
          >
            <option value="manual">Manual · drag to reorder</option>
            <option value="due">Due date</option>
            <option value="created">Created</option>
          </select>
        </label>
      </div>

      <form className="todo-add" onSubmit={handleAdd}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="New todo…"
          disabled={loading}
          aria-label="New todo"
        />
        <button type="submit" disabled={loading || draft.trim().length === 0} aria-label="Add todo">
          +
        </button>
      </form>

      {error ? (
        <p className="todo-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="todo-body">
        {loading && todos.length === 0 ? (
          <p className="todo-empty">Loading…</p>
        ) : todos.length === 0 ? (
          <p className="todo-empty">No todos yet — add one above.</p>
        ) : (
          <>
            {openTodos.length > 0 ? (
              <ul className="todo-list">
                {openTodos.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    {...rowProps}
                    isDragging={dragId === todo.id}
                  />
                ))}
              </ul>
            ) : null}
            {doneTodos.length > 0 ? (
              <>
                <p className="todo-section-label">
                  Completed <span>{doneTodos.length}</span>
                </p>
                <ul className="todo-list todo-list-done">
                  {doneTodos.map((todo) => (
                    <TodoRow key={todo.id} todo={todo} {...rowProps} draggable={false} />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </div>

      <footer className="todo-footer">
        <span>{openTodos.length} open</span>
        <span>⌘⇧Space at cursor · again to hide</span>
      </footer>
    </section>
  );
}

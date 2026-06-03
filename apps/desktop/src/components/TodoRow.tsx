import { useEffect, useRef, useState } from "react";
import {
  formatDueAt,
  isOverdue,
  parseDatetimeLocal,
  toDatetimeLocalValue,
  type TodoItem,
} from "../lib/todos";

interface TodoRowProps {
  todo: TodoItem;
  draggable: boolean;
  isDragging?: boolean;
  onToggle: (id: string) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
  onDueChange: (id: string, dueAt: number | null) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onDragStart: (id: string) => void;
  onDragOver: (event: React.DragEvent, id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
}

export function TodoRow({
  todo,
  draggable,
  isDragging = false,
  onToggle,
  onEdit,
  onDueChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TodoRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const [dueOpen, setDueOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dueLabel = formatDueAt(todo.dueAt);
  const overdue = isOverdue(todo);

  useEffect(() => {
    if (!editing) {
      setDraft(todo.text);
    }
  }, [editing, todo.text]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  async function commitEdit(): Promise<void> {
    const text = draft.trim();
    if (!text) {
      return;
    }
    await onEdit(todo.id, text);
    setEditing(false);
  }

  function cancelEdit(): void {
    setDraft(todo.text);
    setEditing(false);
  }

  async function handleDueInput(value: string): Promise<void> {
    await onDueChange(todo.id, parseDatetimeLocal(value));
    setDueOpen(false);
  }

  return (
    <li
      className={`todo-row${todo.done ? " todo-row-done" : ""}${isDragging ? " todo-row-dragging" : ""}`}
      draggable={draggable && !editing}
      onDragStart={() => onDragStart(todo.id)}
      onDragOver={(event) => onDragOver(event, todo.id)}
      onDrop={() => onDrop(todo.id)}
      onDragEnd={onDragEnd}
    >
      {draggable ? (
        <span className="todo-drag" aria-hidden="true">
          ⋮⋮
        </span>
      ) : (
        <span className="todo-drag todo-drag-spacer" aria-hidden="true" />
      )}
      <button
        type="button"
        className={`todo-check${todo.done ? " is-checked" : ""}`}
        onClick={() => void onToggle(todo.id)}
        aria-label={`Mark "${todo.text}" as ${todo.done ? "open" : "done"}`}
        aria-pressed={todo.done}
      />
      <div className="todo-row-main">
        {editing ? (
          <input
            ref={inputRef}
            className="todo-row-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void commitEdit()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void commitEdit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEdit();
              }
            }}
            aria-label="Edit todo"
          />
        ) : (
          <button type="button" className="todo-row-label" onClick={() => setEditing(true)}>
            {todo.text}
          </button>
        )}
        {!todo.done && (dueLabel || dueOpen) ? (
          <div className="todo-due-wrap">
            {dueOpen ? (
              <input
                type="datetime-local"
                className="todo-due-input"
                defaultValue={toDatetimeLocalValue(todo.dueAt)}
                onBlur={(event) => void handleDueInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleDueInput(event.currentTarget.value);
                  }
                  if (event.key === "Escape") {
                    setDueOpen(false);
                  }
                }}
                autoFocus
                aria-label="Due date and time"
              />
            ) : (
              <button
                type="button"
                className={`todo-due-badge${overdue ? " is-overdue" : ""}`}
                onClick={() => setDueOpen(true)}
              >
                {dueLabel}
              </button>
            )}
          </div>
        ) : null}
      </div>
      {!todo.done ? (
        <button
          type="button"
          className="todo-due-set"
          onClick={() => setDueOpen((open) => !open)}
          aria-label={todo.dueAt ? "Change due date" : "Set due date"}
          title="Due date"
        >
          ⏱
        </button>
      ) : null}
      <button
        type="button"
        className="todo-row-remove"
        onClick={() => void onRemove(todo.id)}
        aria-label={`Delete "${todo.text}"`}
        tabIndex={-1}
      >
        ×
      </button>
    </li>
  );
}

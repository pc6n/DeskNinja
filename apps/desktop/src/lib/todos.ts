import { invoke } from "@tauri-apps/api/core";

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  sortOrder: number;
  dueAt: number | null;
}

export type TodoSortMode = "manual" | "due" | "created";

const SORT_MODE_KEY = "deskninja.todoSortMode";

export function getTodoSortMode(): TodoSortMode {
  const stored = localStorage.getItem(SORT_MODE_KEY);
  if (stored === "due" || stored === "created" || stored === "manual") {
    return stored;
  }
  return "manual";
}

export function setTodoSortMode(mode: TodoSortMode): void {
  localStorage.setItem(SORT_MODE_KEY, mode);
}

export async function fetchTodos(): Promise<TodoItem[]> {
  return invoke<TodoItem[]>("get_todos");
}

export async function createTodo(text: string): Promise<TodoItem> {
  return invoke<TodoItem>("add_todo", { text });
}

export async function toggleTodo(id: string): Promise<TodoItem> {
  return invoke<TodoItem>("toggle_todo", { id });
}

export async function updateTodo(id: string, text: string): Promise<TodoItem> {
  return invoke<TodoItem>("update_todo", { id, text });
}

export async function setTodoDue(id: string, dueAt: number | null): Promise<TodoItem> {
  return invoke<TodoItem>("set_todo_due", { id, dueAt });
}

export async function reorderTodos(orderedIds: string[]): Promise<TodoItem[]> {
  return invoke<TodoItem[]>("reorder_todos", { orderedIds });
}

export async function deleteTodo(id: string): Promise<TodoItem[]> {
  return invoke<TodoItem[]>("remove_todo", { id });
}

export function sortTodos(todos: TodoItem[], mode: TodoSortMode = "manual"): TodoItem[] {
  const open = todos.filter((todo) => !todo.done);
  const done = todos.filter((todo) => todo.done);
  const sortedOpen = sortOpenTodos(open, mode);
  const sortedDone = [...done].sort((left, right) => right.createdAt - left.createdAt);
  return [...sortedOpen, ...sortedDone];
}

function sortOpenTodos(todos: TodoItem[], mode: TodoSortMode): TodoItem[] {
  return [...todos].sort((left, right) => {
    if (mode === "due") {
      return compareDue(left.dueAt, right.dueAt) || left.sortOrder - right.sortOrder;
    }
    if (mode === "created") {
      return right.createdAt - left.createdAt;
    }
    return left.sortOrder - right.sortOrder || right.createdAt - left.createdAt;
  });
}

function compareDue(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return left - right;
}

export function countOpenTodos(todos: TodoItem[]): number {
  return todos.filter((todo) => !todo.done).length;
}

export function formatDueAt(dueAt: number | null): string | null {
  if (dueAt === null) {
    return null;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dueAt));
}

export function isOverdue(todo: TodoItem): boolean {
  return !todo.done && todo.dueAt !== null && todo.dueAt < Date.now();
}

export function toDatetimeLocalValue(dueAt: number | null): string {
  if (dueAt === null) {
    return "";
  }
  const date = new Date(dueAt);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDatetimeLocal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function reorderOpenIds(ids: string[], dragId: string, targetId: string): string[] {
  if (dragId === targetId) {
    return ids;
  }
  const from = ids.indexOf(dragId);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0) {
    return ids;
  }
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, dragId);
  return next;
}

import { useCallback, useEffect, useState } from "react";
import {
  countOpenTodos,
  createTodo,
  deleteTodo,
  fetchTodos,
  getTodoSortMode,
  reorderTodos,
  setTodoDue,
  setTodoSortMode,
  sortTodos,
  toggleTodo,
  type TodoItem,
  type TodoSortMode,
  updateTodo,
} from "../lib/todos";

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [sortMode, setSortMode] = useState<TodoSortMode>(getTodoSortMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applySort = useCallback(
    (items: TodoItem[], mode: TodoSortMode = sortMode) => sortTodos(items, mode),
    [sortMode],
  );

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const items = await fetchTodos();
      setTodos(applySort(items));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load todos.");
    } finally {
      setLoading(false);
    }
  }, [applySort]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function changeSortMode(mode: TodoSortMode): void {
    setTodoSortMode(mode);
    setSortMode(mode);
    setTodos((current) => applySort(current, mode));
  }

  async function addTodo(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setError(null);
    try {
      const item = await createTodo(trimmed);
      setTodos((current) => applySort([...current, item]));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not add todo.");
    }
  }

  async function toggleTodoItem(id: string): Promise<void> {
    setError(null);
    try {
      const item = await toggleTodo(id);
      setTodos((current) => applySort(current.map((todo) => (todo.id === id ? item : todo))));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update todo.");
    }
  }

  async function editTodo(id: string, text: string): Promise<void> {
    setError(null);
    try {
      const item = await updateTodo(id, text);
      setTodos((current) => applySort(current.map((todo) => (todo.id === id ? item : todo))));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not edit todo.");
    }
  }

  async function updateDue(id: string, dueAt: number | null): Promise<void> {
    setError(null);
    try {
      const item = await setTodoDue(id, dueAt);
      setTodos((current) => applySort(current.map((todo) => (todo.id === id ? item : todo))));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not set due date.");
    }
  }

  async function reorderOpen(orderedIds: string[]): Promise<void> {
    setError(null);
    try {
      const items = await reorderTodos(orderedIds);
      setTodos(applySort(items, "manual"));
      setSortMode("manual");
      setTodoSortMode("manual");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not reorder todos.");
    }
  }

  async function removeTodo(id: string): Promise<void> {
    setError(null);
    try {
      const items = await deleteTodo(id);
      setTodos(applySort(items));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete todo.");
    }
  }

  return {
    todos,
    sortMode,
    openCount: countOpenTodos(todos),
    loading,
    error,
    refresh,
    changeSortMode,
    addTodo,
    toggleTodoItem,
    editTodo,
    updateDue,
    reorderOpen,
    removeTodo,
  };
}

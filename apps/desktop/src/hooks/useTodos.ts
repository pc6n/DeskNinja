import { useCallback, useEffect, useState } from "react";
import {
  countOpenTodos,
  createTodo,
  deleteTodo,
  fetchTodos,
  sortTodos,
  toggleTodo,
  type TodoItem,
  updateTodo,
} from "../lib/todos";

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const items = await fetchTodos();
      setTodos(sortTodos(items));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load todos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addTodo(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setError(null);
    try {
      const item = await createTodo(trimmed);
      setTodos((current) => sortTodos([...current, item]));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not add todo.");
    }
  }

  async function toggleTodoItem(id: string): Promise<void> {
    setError(null);
    try {
      const item = await toggleTodo(id);
      setTodos((current) => sortTodos(current.map((todo) => (todo.id === id ? item : todo))));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update todo.");
    }
  }

  async function editTodo(id: string, text: string): Promise<void> {
    setError(null);
    try {
      const item = await updateTodo(id, text);
      setTodos((current) => sortTodos(current.map((todo) => (todo.id === id ? item : todo))));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not edit todo.");
    }
  }

  async function removeTodo(id: string): Promise<void> {
    setError(null);
    try {
      const items = await deleteTodo(id);
      setTodos(sortTodos(items));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete todo.");
    }
  }

  return {
    todos,
    openCount: countOpenTodos(todos),
    loading,
    error,
    refresh,
    addTodo,
    toggleTodoItem,
    editTodo,
    removeTodo,
  };
}

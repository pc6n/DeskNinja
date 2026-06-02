import { invoke } from "@tauri-apps/api/core";

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
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

export async function deleteTodo(id: string): Promise<TodoItem[]> {
  return invoke<TodoItem[]>("remove_todo", { id });
}

export function sortTodos(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((left, right) => {
    if (left.done !== right.done) {
      return Number(left.done) - Number(right.done);
    }
    return right.createdAt - left.createdAt;
  });
}

export function countOpenTodos(todos: TodoItem[]): number {
  return todos.filter((todo) => !todo.done).length;
}

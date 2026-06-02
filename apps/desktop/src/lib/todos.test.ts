import { describe, expect, it } from "vitest";
import { countOpenTodos, sortTodos, type TodoItem } from "./todos";

const sample: TodoItem[] = [
  { id: "a", text: "Done task", done: true, createdAt: 2 },
  { id: "b", text: "Open task", done: false, createdAt: 3 },
  { id: "c", text: "Older open", done: false, createdAt: 1 },
];

describe("sortTodos", () => {
  it("shows open todos first and newest within each group", () => {
    expect(sortTodos(sample).map((todo) => todo.id)).toEqual(["b", "c", "a"]);
  });
});

describe("countOpenTodos", () => {
  it("counts only open todos", () => {
    expect(countOpenTodos(sample)).toBe(2);
  });
});

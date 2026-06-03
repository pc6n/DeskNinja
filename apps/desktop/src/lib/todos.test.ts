import { describe, expect, it } from "vitest";
import {
  countOpenTodos,
  formatDueAt,
  isOverdue,
  parseDatetimeLocal,
  reorderOpenIds,
  sortTodos,
  type TodoItem,
} from "./todos";

const sample: TodoItem[] = [
  { id: "a", text: "Done", done: true, createdAt: 2, sortOrder: 0, dueAt: null },
  { id: "b", text: "Open B", done: false, createdAt: 3, sortOrder: 1, dueAt: 200 },
  { id: "c", text: "Open C", done: false, createdAt: 1, sortOrder: 0, dueAt: 100 },
];

describe("sortTodos", () => {
  it("sorts open todos by manual order", () => {
    expect(sortTodos(sample, "manual").map((todo) => todo.id)).toEqual(["c", "b", "a"]);
  });

  it("sorts open todos by due date", () => {
    expect(sortTodos(sample, "due").map((todo) => todo.id)).toEqual(["c", "b", "a"]);
  });
});

describe("reorderOpenIds", () => {
  it("moves dragged id before target", () => {
    expect(reorderOpenIds(["c", "b"], "b", "c")).toEqual(["b", "c"]);
  });
});

describe("due helpers", () => {
  it("formats due timestamps", () => {
    expect(formatDueAt(1_704_067_200_000)).toMatch(/\d/);
  });

  it("detects overdue open todos", () => {
    const overdueTodo: TodoItem = {
      id: "x",
      text: "Late",
      done: false,
      createdAt: 0,
      sortOrder: 0,
      dueAt: 1,
    };
    expect(isOverdue(overdueTodo)).toBe(true);
  });

  it("parses datetime-local values", () => {
    expect(parseDatetimeLocal("2026-06-02T14:30")).toBeGreaterThan(0);
    expect(parseDatetimeLocal("")).toBeNull();
  });
});

describe("countOpenTodos", () => {
  it("counts only open todos", () => {
    expect(countOpenTodos(sample)).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { parseChatTodoCommands } from "./chatTodos";

describe("parseChatTodoCommands", () => {
  it("extracts a single todo line", () => {
    expect(parseChatTodoCommands("/todo Buy milk")).toEqual({
      todos: ["Buy milk"],
      chatContent: "",
    });
  });

  it("is case-insensitive for the todo keyword", () => {
    expect(parseChatTodoCommands("/TODO Call dentist")).toEqual({
      todos: ["Call dentist"],
      chatContent: "",
    });
  });

  it("extracts multiple todos and keeps chat text", () => {
    expect(
      parseChatTodoCommands("/todo Buy milk\n/todo Walk dog\nWhat is TypeScript?"),
    ).toEqual({
      todos: ["Buy milk", "Walk dog"],
      chatContent: "What is TypeScript?",
    });
  });

  it("ignores empty todo lines", () => {
    expect(parseChatTodoCommands("/todo   \nHello")).toEqual({
      todos: [],
      chatContent: "Hello",
    });
  });

  it("leaves normal messages unchanged", () => {
    expect(parseChatTodoCommands("Explain recursion")).toEqual({
      todos: [],
      chatContent: "Explain recursion",
    });
  });
});

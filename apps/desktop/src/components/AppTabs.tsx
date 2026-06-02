export type AppTab = "chat" | "todos";

interface AppTabsProps {
  activeTab: AppTab;
  openTodoCount: number;
  onChange: (tab: AppTab) => void;
}

export function AppTabs({ activeTab, openTodoCount, onChange }: AppTabsProps) {
  return (
    <nav className="app-tabs" role="tablist" aria-label="Sections">
      <button
        type="button"
        role="tab"
        id="tab-chat"
        aria-selected={activeTab === "chat"}
        aria-controls="panel-chat"
        className={activeTab === "chat" ? "active" : undefined}
        onClick={() => onChange("chat")}
      >
        Chat
      </button>
      <button
        type="button"
        role="tab"
        id="tab-todos"
        aria-selected={activeTab === "todos"}
        aria-controls="panel-todos"
        className={activeTab === "todos" ? "active" : undefined}
        onClick={() => onChange("todos")}
      >
        Todos{openTodoCount > 0 ? ` (${openTodoCount})` : ""}
      </button>
    </nav>
  );
}

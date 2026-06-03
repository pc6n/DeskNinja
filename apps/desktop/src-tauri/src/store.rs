use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoItem {
    pub id: String,
    pub text: String,
    pub done: bool,
    pub created_at: u64,
    #[serde(default)]
    pub sort_order: u32,
    #[serde(default)]
    pub due_at: Option<u64>,
}

pub struct TodoStore {
    todos: Vec<TodoItem>,
    path: PathBuf,
}

impl TodoStore {
    pub fn new(data_dir: PathBuf) -> Self {
        let path = data_dir.join("todos.json");
        let mut todos: Vec<TodoItem> = fs::read_to_string(&path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default();
        let migrated = migrate_legacy(&mut todos);
        let store = Self { todos, path };
        if migrated {
            store.persist();
        }
        store
    }

    pub fn list(&self) -> &[TodoItem] {
        &self.todos
    }

    pub fn add(&mut self, text: String) -> TodoItem {
        let sort_order = self
            .todos
            .iter()
            .map(|todo| todo.sort_order)
            .max()
            .unwrap_or(0)
            .saturating_add(1);
        let item = TodoItem {
            id: format!("todo-{}", new_id()),
            text,
            done: false,
            created_at: now_ms(),
            sort_order,
            due_at: None,
        };
        self.todos.push(item.clone());
        self.persist();
        item
    }

    pub fn toggle(&mut self, id: &str) -> Option<TodoItem> {
        let item = self.todos.iter_mut().find(|todo| todo.id == id)?;
        item.done = !item.done;
        let updated = item.clone();
        self.persist();
        Some(updated)
    }

    pub fn update_text(&mut self, id: &str, text: String) -> Option<TodoItem> {
        let trimmed = text.trim();
        if trimmed.is_empty() {
            return None;
        }
        let item = self.todos.iter_mut().find(|todo| todo.id == id)?;
        item.text = trimmed.to_string();
        let updated = item.clone();
        self.persist();
        Some(updated)
    }

    pub fn set_due(&mut self, id: &str, due_at: Option<u64>) -> Option<TodoItem> {
        let item = self.todos.iter_mut().find(|todo| todo.id == id)?;
        item.due_at = due_at;
        let updated = item.clone();
        self.persist();
        Some(updated)
    }

    pub fn reorder(&mut self, ordered_ids: &[String]) -> Result<Vec<TodoItem>, String> {
        for (index, id) in ordered_ids.iter().enumerate() {
            let item = self
                .todos
                .iter_mut()
                .find(|todo| todo.id == *id && !todo.done)
                .ok_or_else(|| format!("open todo not found: {id}"))?;
            item.sort_order = index as u32;
        }
        self.persist();
        Ok(self.todos.clone())
    }

    pub fn remove(&mut self, id: &str) -> bool {
        let before = self.todos.len();
        self.todos.retain(|todo| todo.id != id);
        if self.todos.len() == before {
            return false;
        }
        self.persist();
        true
    }

    fn persist(&self) {
        if let Some(parent) = self.path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(raw) = serde_json::to_string_pretty(&self.todos) {
            let _ = fs::write(&self.path, raw);
        }
    }
}

fn migrate_legacy(todos: &mut [TodoItem]) -> bool {
    if todos.len() <= 1 {
        return false;
    }
    let all_zero = todos.iter().all(|todo| todo.sort_order == 0);
    if !all_zero {
        return false;
    }
    for (index, todo) in todos.iter_mut().enumerate() {
        todo.sort_order = index as u32;
    }
    true
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis() as u64)
        .unwrap_or(0)
}

fn new_id() -> String {
    let stamp = now_ms();
    let random = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.subsec_nanos())
        .unwrap_or(0);
    format!("{stamp}-{random}")
}

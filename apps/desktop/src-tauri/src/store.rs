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
}

pub struct TodoStore {
    todos: Vec<TodoItem>,
    path: PathBuf,
}

impl TodoStore {
    pub fn new(data_dir: PathBuf) -> Self {
        let path = data_dir.join("todos.json");
        let todos = fs::read_to_string(&path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default();
        Self { todos, path }
    }

    pub fn list(&self) -> &[TodoItem] {
        &self.todos
    }

    pub fn add(&mut self, text: String) -> TodoItem {
        let item = TodoItem {
            id: format!("todo-{}", new_id()),
            text,
            done: false,
            created_at: now_ms(),
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

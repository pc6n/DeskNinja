use crate::store::{TodoItem, TodoStore};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;

pub struct TodoState {
    pub store: Arc<Mutex<TodoStore>>,
}

#[tauri::command]
pub fn get_todos(state: State<'_, TodoState>) -> Result<Vec<TodoItem>, String> {
    Ok(state.store.lock().list().to_vec())
}

#[tauri::command]
pub fn add_todo(state: State<'_, TodoState>, text: String) -> Result<TodoItem, String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err("todo text is required".into());
    }
    Ok(state.store.lock().add(trimmed.to_string()))
}

#[tauri::command]
pub fn toggle_todo(state: State<'_, TodoState>, id: String) -> Result<TodoItem, String> {
    state
        .store
        .lock()
        .toggle(&id)
        .ok_or_else(|| "todo not found".into())
}

#[tauri::command]
pub fn update_todo(
    state: State<'_, TodoState>,
    id: String,
    text: String,
) -> Result<TodoItem, String> {
    state
        .store
        .lock()
        .update_text(&id, text)
        .ok_or_else(|| "todo not found".into())
}

#[tauri::command]
pub fn remove_todo(state: State<'_, TodoState>, id: String) -> Result<Vec<TodoItem>, String> {
    if !state.store.lock().remove(&id) {
        return Err("todo not found".into());
    }
    Ok(state.store.lock().list().to_vec())
}

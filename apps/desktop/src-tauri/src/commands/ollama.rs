use reqwest;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const OLLAMA_BASE_URL: &str = "http://127.0.0.1:11434";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaHealth {
    reachable: bool,
    version: Option<String>,
    error: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PullProgressPayload {
    status: String,
    completed: Option<u64>,
    total: Option<u64>,
    percent: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageInput {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct VersionResponse {
    version: String,
}

#[derive(Deserialize)]
struct TagsResponse {
    models: Vec<ModelTag>,
}

#[derive(Deserialize)]
struct ModelTag {
    name: String,
}

#[derive(Deserialize)]
struct PullChunk {
    status: String,
    total: Option<u64>,
    completed: Option<u64>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatUsagePayload {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

#[derive(Deserialize)]
struct ChatChunk {
    message: Option<ChatMessagePartial>,
    done: Option<bool>,
    prompt_eval_count: Option<u32>,
    eval_count: Option<u32>,
}

#[derive(Deserialize)]
struct ChatMessagePartial {
    content: Option<String>,
}

#[tauri::command]
pub async fn check_ollama() -> Result<OllamaHealth, String> {
    fetch_health().await
}

#[tauri::command]
pub async fn ensure_ollama_running() -> Result<OllamaHealth, String> {
    let health = fetch_health().await?;
    if health.reachable {
        return Ok(health);
    }

    let _ = open_ollama_app_internal();
    if let Ok(health) = wait_for_health(4).await {
        if health.reachable {
            return Ok(health);
        }
    }

    spawn_ollama_serve()?;
    wait_for_health(12).await
}

#[tauri::command]
pub async fn open_ollama_app() -> Result<OllamaHealth, String> {
    ensure_ollama_running().await
}

#[tauri::command]
pub async fn list_ollama_models() -> Result<Vec<String>, String> {
    let client = build_client()?;
    let response = client
        .get(format!("{OLLAMA_BASE_URL}/api/tags"))
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err("Failed to list Ollama models".into());
    }

    let payload = response
        .json::<TagsResponse>()
        .await
        .map_err(|error| error.to_string())?;

    Ok(payload.models.into_iter().map(|model| model.name).collect())
}

#[tauri::command]
pub async fn pull_ollama_model(app: AppHandle, model: String) -> Result<(), String> {
    let client = build_streaming_client()?;
    let response = client
        .post(format!("{OLLAMA_BASE_URL}/api/pull"))
        .json(&serde_json::json!({ "name": model, "stream": true }))
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Failed to pull model: {model}"));
    }

    stream_pull_progress(&app, response).await
}

#[tauri::command]
pub async fn stream_ollama_chat(
    app: AppHandle,
    model: String,
    messages: Vec<ChatMessageInput>,
) -> Result<(), String> {
    let client = build_streaming_client()?;
    let response = client
        .post(format!("{OLLAMA_BASE_URL}/api/chat"))
        .json(&serde_json::json!({
            "model": model,
            "messages": messages,
            "stream": true
        }))
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(if body.is_empty() {
            "Ollama chat request failed".into()
        } else {
            body
        });
    }

    let mut stream = response.bytes_stream();
    use futures_util::StreamExt;

    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|error| error.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        while let Some(newline_index) = buffer.find('\n') {
            let line = buffer[..newline_index].trim().to_string();
            buffer.drain(..=newline_index);
            emit_chat_delta(&app, &line)?;
        }
    }

    emit_chat_delta(&app, buffer.trim())?;
    Ok(())
}

fn emit_chat_delta(app: &AppHandle, line: &str) -> Result<(), String> {
    if line.is_empty() {
        return Ok(());
    }

    let payload: ChatChunk = match serde_json::from_str(line) {
        Ok(payload) => payload,
        Err(_) => return Ok(()),
    };

    if let Some(content) = payload.message.and_then(|message| message.content) {
        app.emit("ollama-chat-delta", content)
            .map_err(|error| error.to_string())?;
    }

    if payload.done == Some(true) {
        let prompt = payload.prompt_eval_count.unwrap_or(0);
        let completion = payload.eval_count.unwrap_or(0);
        if prompt > 0 || completion > 0 {
            app.emit(
                "ollama-chat-usage",
                ChatUsagePayload {
                    prompt_tokens: prompt,
                    completion_tokens: completion,
                    total_tokens: prompt + completion,
                },
            )
            .map_err(|error| error.to_string())?;
        }
    }

    Ok(())
}

async fn stream_pull_progress(app: &AppHandle, response: reqwest::Response) -> Result<(), String> {
    let mut stream = response.bytes_stream();
    use futures_util::StreamExt;

    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|error| error.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        while let Some(newline_index) = buffer.find('\n') {
            let line = buffer[..newline_index].trim().to_string();
            buffer.drain(..=newline_index);
            emit_pull_progress(app, &line)?;
        }
    }

    emit_pull_progress(app, buffer.trim())?;
    Ok(())
}

fn emit_pull_progress(app: &AppHandle, line: &str) -> Result<(), String> {
    if line.is_empty() {
        return Ok(());
    }

    let payload: PullChunk = match serde_json::from_str(line) {
        Ok(payload) => payload,
        Err(_) => return Ok(()),
    };

    let percent = match (payload.completed, payload.total) {
        (Some(completed), Some(total)) if total > 0 => {
            Some(((completed as f64 / total as f64) * 100.0) as u32)
        }
        _ => None,
    };

    app.emit(
        "ollama-pull-progress",
        PullProgressPayload {
            status: payload.status,
            completed: payload.completed,
            total: payload.total,
            percent,
        },
    )
    .map_err(|error| error.to_string())?;

    Ok(())
}

async fn fetch_health() -> Result<OllamaHealth, String> {
    let client = build_client()?;
    match client
        .get(format!("{OLLAMA_BASE_URL}/api/version"))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            let version = response
                .json::<VersionResponse>()
                .await
                .ok()
                .map(|payload| payload.version);
            Ok(OllamaHealth {
                reachable: true,
                version,
                error: None,
            })
        }
        Ok(response) => Ok(OllamaHealth {
            reachable: false,
            version: None,
            error: Some(format!("HTTP {}", response.status())),
        }),
        Err(error) => Ok(OllamaHealth {
            reachable: false,
            version: None,
            error: Some(error.to_string()),
        }),
    }
}

async fn wait_for_health(seconds: u64) -> Result<OllamaHealth, String> {
    for _ in 0..seconds {
        tokio::time::sleep(Duration::from_secs(1)).await;
        let health = fetch_health().await?;
        if health.reachable {
            return Ok(health);
        }
    }
    fetch_health().await
}

fn open_ollama_app_internal() -> Result<(), String> {
    Command::new("open")
        .arg("-a")
        .arg("Ollama")
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn spawn_ollama_serve() -> Result<(), String> {
    let binary = resolve_ollama_binary()?;
    Command::new(&binary)
        .arg("serve")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Failed to start {binary}: {error}"))?;
    Ok(())
}

fn resolve_ollama_binary() -> Result<String, String> {
    const CANDIDATES: &[&str] = &[
        "/usr/local/bin/ollama",
        "/opt/homebrew/bin/ollama",
        "/Applications/Ollama.app/Contents/Resources/ollama",
    ];

    for candidate in CANDIDATES {
        if Path::new(candidate).exists() {
            return Ok(candidate.to_string());
        }
    }

    Err("Could not find the ollama binary. Reinstall Ollama from ollama.com.".into())
}

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|error| error.to_string())
}

fn build_streaming_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .build()
        .map_err(|error| error.to_string())
}

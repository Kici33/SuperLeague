use irelia::rest::LcuClient;
use irelia::requests::RequestClientType;
use serde_json::Value;

/// Concrete client type alias — avoids generics leaking into commands.rs
pub type Client = LcuClient<RequestClientType>;

/// Try to create an LCU connection. Returns None if League is not running.
pub fn get_lcu_client() -> Option<Client> {
    LcuClient::connect().ok()
}

/// Check if the LCU is reachable
pub fn check_connection() -> bool {
    get_lcu_client().is_some()
}

/// GET request returning Result<Value, String> — uses irelia (kept for backward compat)
pub async fn lcu_get(endpoint: &str) -> Result<Value, String> {
    match get_lcu_client() {
        Some(c) => c.get::<Value>(endpoint).await.map_err(|e| e.to_string()),
        None => Ok(Value::Array(vec![])),
    }
}

/// GET request that errors when disconnected
pub async fn lcu_get_required(endpoint: &str) -> Result<Value, String> {
    get_lcu_client()
        .ok_or_else(|| "League client not connected".to_string())?
        .get::<Value>(endpoint)
        .await
        .map_err(|e| e.to_string())
}

/// PUT request returning bool
pub async fn lcu_put(endpoint: &str, body: &Value) -> Result<bool, String> {
    get_lcu_client()
        .ok_or_else(|| "League client not connected".to_string())?
        .put::<Value, Value>(endpoint, body.clone())
        .await
        .map(|_| true)
        .map_err(|e| e.to_string())
}

// ═══════════════════════════════════════════════════════════════════════
// Direct reqwest-based LCU access — bypasses irelia for data fetching
// ═══════════════════════════════════════════════════════════════════════

/// Read the LCU lockfile to get connection info: (port, auth_token)
fn read_lockfile() -> Option<(u16, String)> {
    // Try standard lockfile paths
    let lockfile = if cfg!(windows) {
        // On Windows, the lockfile is in the League install directory
        // irelia found the connection, so we can find it too
        find_lockfile_windows()
    } else {
        None
    };

    let content = std::fs::read_to_string(lockfile?).ok()?;
    // Format: processName:pid:port:password:protocol
    let parts: Vec<&str> = content.split(':').collect();
    if parts.len() >= 5 {
        let port: u16 = parts[2].parse().ok()?;
        let password = parts[3].to_string();
        Some((port, password))
    } else {
        None
    }
}

#[cfg(windows)]
fn find_lockfile_windows() -> Option<std::path::PathBuf> {
    use std::process::Command;
    // Use WMIC to find the League client process and its working directory
    let output = Command::new("wmic")
        .args(["process", "where", "name='LeagueClientUx.exe'", "get", "ExecutablePath", "/value"])
        .output()
        .ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if let Some(path) = line.strip_prefix("ExecutablePath=") {
            let path = path.trim();
            if !path.is_empty() {
                let exe_path = std::path::Path::new(path);
                let dir = exe_path.parent()?;
                let lockfile = dir.join("lockfile");
                if lockfile.exists() {
                    return Some(lockfile);
                }
            }
        }
    }
    // Fallback: common install locations
    for base in &[
        r"C:\Riot Games\League of Legends",
        r"D:\Riot Games\League of Legends",
    ] {
        let p = std::path::Path::new(base).join("lockfile");
        if p.exists() {
            return Some(p);
        }
    }
    None
}

#[cfg(not(windows))]
fn find_lockfile_windows() -> Option<std::path::PathBuf> {
    None
}

/// Build a reqwest client that accepts self-signed certs (LCU uses self-signed)
fn build_reqwest_client() -> Option<reqwest::Client> {
    reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .ok()
}

/// Direct GET to LCU via reqwest — bypasses irelia entirely
pub async fn lcu_direct_get(endpoint: &str) -> Result<Value, String> {
    let (port, password) = read_lockfile()
        .ok_or_else(|| "Cannot read LCU lockfile".to_string())?;

    let client = build_reqwest_client()
        .ok_or_else(|| "Cannot create HTTP client".to_string())?;

    let url = format!("https://127.0.0.1:{}{}", port, endpoint);

    let response = client
        .get(&url)
        .basic_auth("riot", Some(&password))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let body_text = response.text().await.map_err(|e| format!("Read body failed: {}", e))?;

    if status.is_success() {
        if body_text.is_empty() {
            Ok(Value::Null)
        } else {
            serde_json::from_str(&body_text)
                .map_err(|e| format!("JSON parse error: {} (body: {})", e, &body_text[..100.min(body_text.len())]))
        }
    } else {
        Err(format!("LCU returned {}: {}", status.as_u16(), &body_text[..200.min(body_text.len())]))
    }
}

/// Generic request used by the debug command and data fetching
pub async fn lcu_raw(method: &str, endpoint: &str, body: &Value) -> Result<Value, String> {
    // Try direct reqwest first (most reliable)
    if method == "GET" {
        if let Ok(val) = lcu_direct_get(endpoint).await {
            return Ok(val);
        }
    }

    // Fallback to irelia
    let client = match get_lcu_client() {
        Some(c) => c,
        None => return Err("League client not connected".to_string()),
    };

    let result: Result<Value, _> = match method {
        "GET"    => client.get::<Value>(endpoint).await,
        "DELETE" => client.delete::<Value>(endpoint).await,
        "POST"   => client.post::<Value, Value>(endpoint, body.clone()).await,
        "PUT"    => client.put::<Value, Value>(endpoint, body.clone()).await,
        "PATCH"  => client.patch::<Value, Value>(endpoint, body.clone()).await,
        _        => return Err(format!("Unsupported method: {method}")),
    };

    result.map_err(|e| e.to_string())
}

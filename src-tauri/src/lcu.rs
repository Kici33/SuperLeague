use irelia::rest::LcuClient;
use irelia::requests::RequestClientType;
use serde_json::Value;

/// Concrete client type alias — avoids generics leaking into commands.rs
pub type Client = LcuClient<RequestClientType>;

/// Try to create an LCU connection. Returns None if League is not running.
pub fn get_lcu_client() -> Option<Client> {
    LcuClient::connect().ok()
}

/// GET request returning Result<Value, String>
pub async fn lcu_get(endpoint: &str) -> Result<Value, String> {
    match get_lcu_client() {
        Some(c) => c.get::<Value>(endpoint).await.map_err(|e| e.to_string()),
        None => Ok(Value::Array(vec![])),
    }
}

/// GET request that errors when disconnected (instead of returning empty)
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

/// Generic request used by the debug command
pub async fn lcu_raw(method: &str, endpoint: &str, body: &Value) -> Result<Value, String> {
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

/// Check if the LCU is reachable
pub fn check_connection() -> bool {
    get_lcu_client().is_some()
}

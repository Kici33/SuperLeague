use std::sync::Mutex;
use rusqlite::Connection;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub lcu_connected: Mutex<bool>,
}

mod state;
mod db;
mod lcu;
mod commands;

use rusqlite::Connection;
use state::AppState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Open or create the SQLite database
    let db_path = {
        let home = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        format!("{}/SuperLeague/superleague.db", home)
    };

    // Ensure directory exists
    if let Some(parent) = std::path::Path::new(&db_path).parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let conn = Connection::open(&db_path).expect("Failed to open database");
    db::init_db(&conn).expect("Failed to initialize database");

    let state = AppState {
        db: Mutex::new(conn),
        lcu_connected: Mutex::new(false),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            // Connection
            commands::get_connection_status,
            commands::refresh_connection,
            // Summoner
            commands::get_current_summoner,
            // Challenges
            commands::get_challenges,
            commands::get_challenges_summary,
            // Mastery
            commands::get_champion_masteries,
            commands::get_champion_mastery,
            // Lobby
            commands::get_lobby_members,
            // Eternals
            commands::get_eternals,
            // Skins
            commands::get_owned_skins,
            // Match History (DB)
            commands::get_match_history,
            commands::get_champion_match_history,
            // Mastery Snapshots (DB)
            commands::get_mastery_snapshots,
            commands::get_daily_mastery,
            // Profile
            commands::set_profile_icon,
            commands::set_status,
            commands::set_ranked_display,
            // Debug
            commands::lcu_request,
            // Accounts
            commands::get_accounts,
            commands::switch_account,
            commands::add_account,
            // Discord
            commands::send_discord_webhook,
            // Ranked / LP
            commands::get_ranked_stats,
            commands::get_recent_matches,
            // Champions & Builds
            commands::get_all_champions,
            commands::get_champion_builds,
            // Summoner Lookup
            commands::get_summoner_by_name,
            commands::get_summoner_challenges,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

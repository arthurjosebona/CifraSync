//! CifraSync desktop (Tauri 2): carrega a SPA e expõe só o que o WebView não faz sozinho.

use std::sync::Mutex;

use keepawake::KeepAwake;
use tauri::State;

/// Trava de "tela sempre ligada" enquanto o palco está aberto (ADR 0002).
#[derive(Default)]
struct Awake(Mutex<Option<KeepAwake>>);

#[tauri::command]
fn keep_awake(on: bool, state: State<'_, Awake>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if on {
        if guard.is_none() {
            let lock = keepawake::Builder::default()
                .display(true)
                .idle(true)
                .reason("Modo palco do CifraSync")
                .app_name("CifraSync")
                .app_reverse_domain("com.cifrasync.app")
                .create()
                .map_err(|e| e.to_string())?;
            *guard = Some(lock);
        }
    } else {
        // soltar a trava (Drop) devolve o controle de energia ao sistema
        *guard = None;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(Awake::default())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .invoke_handler(tauri::generate_handler![keep_awake])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o CifraSync");
}

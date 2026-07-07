#[tauri::command]
fn get_open_path() -> Option<String> {
    if let Some(arg) = std::env::args().nth(1) {
        if (arg.ends_with(".md") || arg.ends_with(".markdown")) && std::path::Path::new(&arg).exists() {
            return Some(arg);
        }
    }
    None
}

#[tauri::command]
fn save_atomic(path: String, contents: String) -> Result<(), String> {
    use std::fs;
    use std::io::Write;
    use std::path::Path;
    
    let target = Path::new(&path);
    let parent = target.parent().unwrap_or(Path::new(""));
    let file_name = target.file_name().and_then(|n| n.to_str()).unwrap_or("unnamed");
    let pid = std::process::id();
    let tmp_name = format!(".{}.tmp-{}", file_name, pid);
    let tmp_path = parent.join(&tmp_name);
    
    // Write to tmp
    let mut file = fs::File::create(&tmp_path).map_err(|e| format!("Failed to create tmp file: {}", e))?;
    file.write_all(contents.as_bytes()).map_err(|e| format!("Failed to write to tmp file: {}", e))?;
    file.sync_all().map_err(|e| format!("Failed to sync tmp file: {}", e))?;
    
    // Rename
    fs::rename(&tmp_path, &target).map_err(|e| {
        // Cleanup on rename failure
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to rename tmp file: {}", e)
    })?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![get_open_path, save_atomic])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

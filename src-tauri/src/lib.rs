#[tauri::command]
fn get_open_path() -> Option<String> {
    if let Some(arg) = std::env::args().nth(1) {
        let arg_lower = arg.to_lowercase();
        if (arg_lower.ends_with(".md") || arg_lower.ends_with(".markdown")) && std::path::Path::new(&arg).exists() {
            return Some(arg);
        }
    }
    None
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
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

#[tauri::command]
fn resolve_embed(base_dir: String, file_name: String) -> Option<String> {
    use std::path::Path;
    
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return None;
    }
    
    let mut current_dir = Path::new(&base_dir);
    for _ in 0..=5 {
        let direct_path = current_dir.join(&file_name);
        if direct_path.is_file() {
            return direct_path.to_str().map(|s| s.to_string());
        }
        
        let attachment_path = current_dir.join("attachments").join(&file_name);
        if attachment_path.is_file() {
            return attachment_path.to_str().map(|s| s.to_string());
        }
        
        if let Some(parent) = current_dir.parent() {
            current_dir = parent;
        } else {
            break;
        }
    }
    None
}

#[tauri::command]
fn save_binary(path: String, contents_base64: String) -> Result<(), String> {
    use std::fs;
    use std::io::Write;
    use std::path::Path;
    use base64::prelude::*;
    
    let target = Path::new(&path);
    let parent = target.parent().unwrap_or(Path::new(""));
    
    if !parent.exists() {
        return Err("Parent directory does not exist".to_string());
    }
    
    let bytes = BASE64_STANDARD.decode(&contents_base64).map_err(|e| format!("Failed to decode base64: {}", e))?;
    
    let file_name = target.file_name().and_then(|n| n.to_str()).unwrap_or("unnamed");
    let pid = std::process::id();
    let tmp_name = format!(".{}.tmp-{}", file_name, pid);
    let tmp_path = parent.join(&tmp_name);
    
    let mut file = fs::File::create(&tmp_path).map_err(|e| format!("Failed to create tmp file: {}", e))?;
    file.write_all(&bytes).map_err(|e| format!("Failed to write to tmp file: {}", e))?;
    file.sync_all().map_err(|e| format!("Failed to sync tmp file: {}", e))?;
    
    fs::rename(&tmp_path, &target).map_err(|e| {
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
    .invoke_handler(tauri::generate_handler![get_open_path, save_atomic, read_file, resolve_embed, save_binary])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

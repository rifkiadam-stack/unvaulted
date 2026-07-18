#[tauri::command]
fn get_open_path() -> Option<String> {
    if let Some(arg) = std::env::args().nth(1) {
        let arg_lower = arg.to_lowercase();
        let allowed_exts = [".md", ".markdown", ".txt", ".json", ".csv", ".log", ".xml", ".yml", ".yaml", ".ini"];
        if allowed_exts.iter().any(|ext| arg_lower.ends_with(ext)) && std::path::Path::new(&arg).exists() {
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
    
    let mut file = fs::File::create(&tmp_path).map_err(|e| format!("Failed to create tmp file: {}", e))?;
    file.write_all(contents.as_bytes()).map_err(|e| format!("Failed to write to tmp file: {}", e))?;
    file.sync_all().map_err(|e| format!("Failed to sync tmp file: {}", e))?;
    
    fs::rename(&tmp_path, &target).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to rename tmp file: {}", e)
    })?;
    
    Ok(())
}

fn search_embed(base_dir: &std::path::Path, file_name: &str) -> Option<std::path::PathBuf> {
    let mut current_dir = base_dir;
    for _ in 0..=5 {
        let direct_path = current_dir.join(file_name);
        if direct_path.is_file() {
            return Some(direct_path);
        }
        
        let attachment_path = current_dir.join("attachments").join(file_name);
        if attachment_path.is_file() {
            return Some(attachment_path);
        }
        
        let obsidian_dir = current_dir.join(".obsidian");
        if obsidian_dir.is_dir() {
            let app_json_path = obsidian_dir.join("app.json");
            if let Ok(contents) = std::fs::read_to_string(&app_json_path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&contents) {
                    if let Some(att_folder) = json.get("attachmentFolderPath").and_then(|v| v.as_str()) {
                        let candidate = if att_folder == "./" {
                            None
                        } else if att_folder.starts_with("./") {
                            let sub = &att_folder[2..];
                            Some(base_dir.join(sub).join(file_name))
                        } else {
                            Some(current_dir.join(att_folder).join(file_name))
                        };
                        
                        if let Some(c) = candidate {
                            if c.is_file() {
                                return Some(c);
                            }
                        }
                    }
                }
            }
            break; // Stop at vault root
        }
        
        if let Some(parent) = current_dir.parent() {
            current_dir = parent;
        } else {
            break;
        }
    }
    None
}

fn asset_store_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    use tauri::Manager;
    use std::fs;
    
    if let Ok(mut path) = app.path().picture_dir() {
        path.push("Unvaulted");
        if fs::create_dir_all(&path).is_ok() {
            return Ok(path);
        }
    }
    
    if let Ok(mut path) = app.path().home_dir() {
        path.push("Pictures");
        path.push("Unvaulted");
        if fs::create_dir_all(&path).is_ok() {
            return Ok(path);
        }
    }
    
    if let Ok(mut path) = app.path().app_data_dir() {
        path.push("assets");
        let _ = fs::create_dir_all(&path);
        return Ok(path);
    }
    
    Err("Failed to resolve any asset store directory".to_string())
}

#[tauri::command]
fn resolve_embed(app: tauri::AppHandle, base_dir: String, file_name: String) -> Option<String> {
    use std::path::Path;
    use tauri::Manager;
    
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return None;
    }
    
    if !base_dir.is_empty() {
        if let Some(found) = search_embed(Path::new(&base_dir), &file_name) {
            return found.to_str().map(|s| s.to_string());
        }
    }
    
    if let Ok(store) = asset_store_dir(&app) {
        let asset_path = store.join(&file_name);
        if asset_path.is_file() {
            return asset_path.to_str().map(|s| s.to_string());
        }
    }
    
    if let Ok(app_data) = app.path().app_data_dir() {
        let asset_path = app_data.join("assets").join(&file_name);
        if asset_path.is_file() {
            return asset_path.to_str().map(|s| s.to_string());
        }
    }
    
    None
}

#[tauri::command]
fn save_pasted_image(app: tauri::AppHandle, file_name: String, contents_base64: String) -> Result<String, String> {
    use std::fs;
    use std::io::Write;
    use base64::prelude::*;
    
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err("Invalid filename".to_string());
    }
    
    let assets_dir = asset_store_dir(&app)?;
    
    let target = assets_dir.join(&file_name);
    let bytes = BASE64_STANDARD.decode(&contents_base64).map_err(|e| format!("Failed to decode base64: {}", e))?;
    
    let pid = std::process::id();
    let tmp_name = format!(".{}.tmp-{}", file_name, pid);
    let tmp_path = assets_dir.join(&tmp_name);
    
    let mut file = fs::File::create(&tmp_path).map_err(|e| format!("Failed to create tmp file: {}", e))?;
    file.write_all(&bytes).map_err(|e| format!("Failed to write to tmp file: {}", e))?;
    file.sync_all().map_err(|e| format!("Failed to sync tmp file: {}", e))?;
    
    fs::rename(&tmp_path, &target).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to rename tmp file: {}", e)
    })?;
    
    target.to_str().map(|s| s.to_string()).ok_or_else(|| "Invalid target path".to_string())
}

fn is_pasted_image_name(name: &str) -> bool {
    if name.len() != 32 {
        return false;
    }
    if !name.starts_with("Pasted image ") || !name.ends_with(".png") {
        return false;
    }
    
    let chars: Vec<char> = name.chars().collect();
    for i in 13..21 {
        if !chars[i].is_ascii_digit() { return false; }
    }
    if chars[21] != '-' { return false; }
    for i in 22..28 {
        if !chars[i].is_ascii_digit() { return false; }
    }
    true
}

#[tauri::command]
fn delete_pasted_image(app: tauri::AppHandle, file_name: String) -> Result<(), String> {
    use std::fs;
    use tauri::Manager;
    
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err("Invalid filename".to_string());
    }
    
    if !is_pasted_image_name(&file_name) {
        return Err("Invalid format".to_string());
    }
    
    if let Ok(store) = asset_store_dir(&app) {
        let target = store.join(&file_name);
        if target.exists() {
            let _ = fs::remove_file(target);
            return Ok(());
        }
    }
    
    if let Ok(app_data) = app.path().app_data_dir() {
        let legacy = app_data.join("assets").join(&file_name);
        if legacy.exists() {
            let _ = fs::remove_file(legacy);
        }
    }
    
    Ok(())
}

#[tauri::command]
fn open_new_window() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    std::process::Command::new(exe).spawn().map_err(|e| e.to_string())?;
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
    .invoke_handler(tauri::generate_handler![get_open_path, save_atomic, read_file, resolve_embed, save_pasted_image, delete_pasted_image, open_new_window])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    
    #[test]
    fn test_search_embed_vault_root() {
        use std::sync::atomic::{AtomicUsize, Ordering};
        static COUNTER: AtomicUsize = AtomicUsize::new(0);
        let id = COUNTER.fetch_add(1, Ordering::SeqCst);
        let temp_dir = std::env::temp_dir().join(format!("unvaulted_test_{}_{}", std::process::id(), id));
        let vault_dir = temp_dir.join("vault");
        let note_dir = vault_dir.join("wiki").join("concepts");
        let obs_dir = vault_dir.join(".obsidian");
        let attach_dir = vault_dir.join("raw").join("assets");
        
        fs::create_dir_all(&note_dir).unwrap();
        fs::create_dir_all(&obs_dir).unwrap();
        fs::create_dir_all(&attach_dir).unwrap();
        
        fs::write(obs_dir.join("app.json"), r#"{"attachmentFolderPath":"raw/assets"}"#).unwrap();
        let target_file = attach_dir.join("pic.png");
        fs::write(&target_file, "fake image").unwrap();
        
        let resolved = search_embed(&note_dir, "pic.png");
        assert_eq!(resolved, Some(target_file));
        
        let _ = fs::remove_dir_all(&temp_dir);
    }
    
    #[test]
    fn test_search_embed_not_found() {
        let temp_dir = std::env::temp_dir().join(format!("unvaulted_test_nf_{}", std::process::id()));
        std::fs::create_dir_all(&temp_dir).unwrap();
        
        let resolved = search_embed(&temp_dir, "nowhere.png");
        assert_eq!(resolved, None);
        
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_is_pasted_image_name() {
        assert!(is_pasted_image_name("Pasted image 20260718-120000.png"));
        assert!(!is_pasted_image_name("Pasted image 123.png"));
        assert!(!is_pasted_image_name("Pasted image 20260718-120000.jpg"));
        assert!(!is_pasted_image_name("../Pasted image 20260718-120000.png"));
        assert!(!is_pasted_image_name("Pasted image 202607A8-120000.png"));
    }
}

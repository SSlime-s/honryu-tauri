use std::{
    collections::HashMap,
    env, fs,
    sync::{LazyLock, Mutex},
};

use base64::{engine::general_purpose, Engine};
use serde::{Deserialize, Serialize};

mod screenshot;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

const CONFIG_FILE_NAME: &str = "config";
#[cfg(debug_assertions)]
fn get_config_path() -> anyhow::Result<String> {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let parent = std::path::Path::new(manifest_dir)
        .parent()
        .ok_or_else(|| anyhow::anyhow!("manifest dir has no parent"))?;
    let config_path = parent.join(format!("{}.local", CONFIG_FILE_NAME));
    Ok(config_path.to_string_lossy().to_string())
}
#[cfg(not(debug_assertions))]
fn get_config_path() -> anyhow::Result<String> {
    let exe_path = env::current_exe()?;
    let exe_dir = exe_path
        .parent()
        .ok_or_else(|| anyhow::anyhow!("exe path has no parent"))?;
    let config_path = exe_dir.join(CONFIG_FILE_NAME);
    Ok(config_path.to_string_lossy().to_string())
}
static CONFIG: LazyLock<Mutex<anyhow::Result<HashMap<String, String>>>> = LazyLock::new(|| {
    let config_path = get_config_path();
    let config_path = match config_path {
        Ok(config_path) => config_path,
        Err(e) => return Mutex::new(Err(e)),
    };
    let config = fs::read_to_string(config_path);
    let config = match config {
        Ok(config) => config,
        Err(e) => return Mutex::new(Err(e.into())),
    };
    let config = config
        .lines()
        .flat_map(|line| {
            if line.starts_with('#') {
                return None;
            }
            if line.trim().is_empty() {
                return None;
            }
            let (key, value) = line.split_once('=').unwrap();
            Some((key.to_string(), value.to_string()))
        })
        .collect::<HashMap<String, String>>();
    Mutex::new(Ok(config))
});
#[tauri::command]
async fn get_config() -> Result<HashMap<String, String>, String> {
    let config = CONFIG.lock().map_err(|e| e.to_string())?;
    config.as_ref().map_err(|e| e.to_string()).cloned()
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ScreenShot {
    /** base64 encoded */
    pub image: String,
    pub xy: (i32, i32),
    pub wh: (u32, u32),
}
#[tauri::command]
async fn take_screen_shot() -> Result<ScreenShot, String> {
    let image_data = screenshot::take_screen_shot().map_err(|e| e.to_string())?;
    let mut buf = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut buf);
    image_data
        .image
        .write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let base64 = general_purpose::STANDARD.encode(&buf);
    Ok(ScreenShot {
        image: base64,
        xy: image_data.xy,
        wh: image_data.wh,
    })
}

#[tauri::command]
async fn crop_image(image: String, xy: (i32, i32), wh: (u32, u32)) -> Result<String, String> {
    if xy.0 < 0 || xy.1 < 0 {
        return Err("xy must be positive".to_string());
    }
    if wh.0 == 0 || wh.1 == 0 {
        return Err("wh must be positive".to_string());
    }

    let buf = general_purpose::STANDARD
        .decode(image.as_bytes())
        .map_err(|e| e.to_string())?;
    let mut image = image::load_from_memory(&buf).map_err(|e| e.to_string())?;
    let cropped_image = image.crop(xy.0 as u32, xy.1 as u32, wh.0, wh.1);
    let mut buf = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut buf);
    cropped_image
        .write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let base64 = general_purpose::STANDARD.encode(&buf);
    Ok(base64)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut ctx = tauri::generate_context!();
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_theme::init(ctx.config_mut()))
        // .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            take_screen_shot,
            crop_image,
            get_config
        ])
        .run(ctx)
        .expect("error while running tauri application");
}

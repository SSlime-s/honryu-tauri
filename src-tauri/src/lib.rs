use std::env;

use base64::{engine::general_purpose, Engine};
use serde::{Deserialize, Serialize};

mod screenshot;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_api_key() -> Result<String, String> {
    dotenv::from_filename(".env.local").ok();
    env::var("GENAI_API_KEY").map_err(|_| "GENAI_API_KEY is not set".to_string())
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
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_api_key,
            take_screen_shot,
            crop_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

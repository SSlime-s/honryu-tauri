# 🌊 Honryu-tauri

This is Tauri rewrite of [Honryu](https://github.com/trasta298/honryu).

> Honryu (翻流) is a screen capture and translation tool designed for Windows. It allows users to capture a portion of their screen and instantly transcribe and translate the text within the image.

## ✨ Features

- Screen area selection for capture
- Automatic text recognition from captured images
- Translation between Japanese and English
- Real-time display of transcription and translation results

## 🖥️ Requirements

- API key for the Gemini API

## 🚀 Installation

1. Install from Release assets
  - From the latest release on https://github.com/SSlime-s/honryu-tauri/releases/latest, install the appropriate version for your OS.

2. Set up your Gemini API key and optionally specify the model:
   - Create a `config` file in the same directory as the executable
   - Add your API key to the file:
     ```
     GENAI_API_KEY=your_api_key_here
     ```
   - (Optional) Specify a different model by adding:
     (The default model is `gemini-1.5-pro-002`)
     ```
     GENAI_MODEL=gemini-1.5-pro-002
     ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ↔️ Compatibility

Windows 11, macOS, Linux (not wayland)

but I only tested on Windows 11

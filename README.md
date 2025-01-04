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
    - Windows: select one of the following.
      - honryu_{{version}}_x64-setup.exe
      - honryu_{{version}}_x64_en-UI.msi
    - macOS (Apple Silicon): honryu_{{version}}_aarch64.dmg
    - macOS (Intel): honryu_{{version}}_x64.dmg
    - Linux: select one of the following.
      - honryu_{{version}}_amd64.AppImage
      - honryu_{{version}}_amd64.deb
      - honryu_{{version}}-1_x86_64.rpm

2. (On macOS) Since the certificate does not exist, please execute `xattr -rc /Applications/honryu.app` (Use at your own risk).

3. Set up your Gemini API key and optionally specify the model:
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

but I only tested on Windows 11 and **recommend** using it on Windows 11.

Notice: On macOS, application windows cannot span across multiple screens by default, so they can only be displayed on a specific display.

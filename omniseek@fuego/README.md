# OmniSeek GNOME Shell Extension

## Overview
OmniSeek is a GNOME Shell extension that brings powerful, keyword-based search to your desktop. With support for multiple search providers, live suggestions, and custom icons, you can quickly search the web or your favorite services directly from the GNOME overview.

## Features
- Keyword-based search shortcuts (e.g., `g linux` for Google, `y music` for YouTube)
- Live search suggestions for supported providers
- Customizable search providers and icons
- Modern preferences window for easy configuration
- Works with GNOME Shell 48+

## Installation
### Method 1: Direct Download
1. Download the latest release from [GitHub Releases](https://github.com/fuegocoding/omniseek/releases)
2. Extract the downloaded zip file to `~/.local/share/gnome-shell/extensions/omniseek@fuego`
3. Restart GNOME Shell:
   - Press `Alt+F2`, type `r`, and press Enter (on X11), or log out and back in (on Wayland)
4. Enable the extension:
   - Use GNOME Extensions app or run:
     ```sh
     gnome-extensions enable omniseek@fuego
     ```

### Method 2: Manual Installation
1. **Clone or Download** this repository to your local machine:
   ```sh
   git clone https://github.com/fuegocoding/omniseek.git ~/.local/share/gnome-shell/extensions/omniseek@fuego
   ```
   Or copy the files into `~/.local/share/gnome-shell/extensions/omniseek@fuego`.

2. **Compile the GSettings schema:**
   ```sh
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/omniseek@fuego/schemas
   ```

3. **Restart GNOME Shell:**
   - Press `Alt+F2`, type `r`, and press Enter (on X11), or log out and back in (on Wayland).

4. **Enable the extension:**
   - Use GNOME Extensions app or run:
     ```sh
     gnome-extensions enable omniseek@fuego
     ```

## Usage
- Open the GNOME overview (press `Super`/`Windows` key).
- Type a provider shortcut followed by your query (e.g., `g cats`).
- Select a suggestion or press Enter to search.

## Configuration
- Open the extension preferences via the GNOME Extensions app or `gnome-extensions prefs omniseek@fuego`.
- Add, remove, or reorder search providers.
- Customize shortcuts, URLs, and icons.

## Compatibility
- GNOME Shell 48+
- Requires GJS with ES module support
- Uses GTK4/Libadwaita for preferences

## Troubleshooting
- If the extension does not appear, ensure the schema is compiled and GNOME Shell is restarted.
- Check the logs with `journalctl /usr/bin/gnome-shell -f` for errors.
- Make sure your GNOME version is supported.

## License
MIT License. See `LICENSE` file for details. 

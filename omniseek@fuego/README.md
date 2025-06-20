# OmniSeek GNOME Shell Extension

## Overview
OmniSeek is a GNOME Shell extension that brings powerful, keyword-based search to your desktop. With support for multiple search providers, live suggestions with Google fallback, and customizable icons, you can quickly search the web or your favorite services directly from the GNOME overview.

## Features
- **Keyword-based search shortcuts** (e.g., `g linux` for Google, `y music` for YouTube)
- **Live search suggestions** for all providers with intelligent fallback system
- **Google fallback suggestions** for providers without native suggestion APIs
- **12 built-in search providers** covering search engines, media, social, and AI platforms
- **Customizable search providers** - add, remove, edit, and reorder providers
- **Modern preferences window** for easy configuration with GTK4/Libadwaita
- **Works with GNOME Shell 48+**

## Default Search Providers

### Search Engines
- **Google** (`g`) - Own suggestion API
- **Brave Search** (`br`) - Google fallback suggestions
- **DuckDuckGo** (`ddg`) - Google fallback suggestions  
- **Bing** (`b`) - Own suggestion API
- **Startpage** (`sp`) - Google fallback suggestions
- **Qwant** (`q`) - Google fallback suggestions

### Media & Entertainment
- **YouTube** (`y`) - YouTube suggestion API
- **YouTube Music** (`ym`) - YouTube suggestion API
- **Spotify** (`s`) - Google fallback suggestions

### Information & Social
- **Wikipedia** (`w`) - Wikipedia OpenSearch API
- **Reddit** (`r`) - Google fallback suggestions

### AI Assistants
- **ChatGPT** (`gpt`) - Google fallback suggestions, supports URL queries

## Installation

### Method 1: Direct Download
1. Download the latest release from [GitHub Releases](https://github.com/fuegocoding/omniseek/releases)
2. Extract the downloaded zip file to `~/.local/share/gnome-shell/extensions/omniseek@fuego`
3. **Compile the GSettings schema:**
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/omniseek@fuego/schemas
   ```
4. **Restart GNOME Shell:**
   - Press `Alt+F2`, type `r`, and press Enter (on X11), or log out and back in (on Wayland)
5. **Enable the extension:**
   - Use GNOME Extensions app or run:
     ```bash
     gnome-extensions enable omniseek@fuego
     ```

### Method 2: Manual Installation
1. **Clone or Download** this repository to your local machine:
   ```bash
   git clone https://github.com/fuegocoding/omniseek.git ~/.local/share/gnome-shell/extensions/omniseek@fuego
   ```
   Or copy the files into `~/.local/share/gnome-shell/extensions/omniseek@fuego`.

2. **Compile the GSettings schema:**
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/omniseek@fuego/schemas
   ```

3. **Restart GNOME Shell:**
   - Press `Alt+F2`, type `r`, and press Enter (on X11), or log out and back in (on Wayland).

4. **Enable the extension:**
   - Use GNOME Extensions app or run:
     ```bash
     gnome-extensions enable omniseek@fuego
     ```

## Usage

### Basic Search
- Open the GNOME overview (press `Super`/`Windows` key)
- Type a provider shortcut followed by your query (e.g., `g cats`)
- Select a suggestion or press Enter to search

### Example Searches
- `g linux commands` → Google search with live suggestions
- `y python tutorial` → YouTube search with video suggestions  
- `ddg privacy tools` → DuckDuckGo search with Google fallback suggestions
- `w quantum physics` → Wikipedia search with article suggestions
- `gpt explain javascript` → ChatGPT with query parameter
- `s jazz music` → Spotify search with Google fallback suggestions
- `r programming` → Reddit search with Google fallback suggestions

## Live Search Suggestions

OmniSeek provides intelligent live search suggestions through multiple methods:

### Native Suggestion APIs
- **Google, Bing** - Own suggestion services
- **YouTube, YouTube Music** - Google's YouTube suggestion API
- **Wikipedia** - Wikipedia's OpenSearch API

### Google Fallback System
For providers without reliable suggestion APIs, OmniSeek automatically uses Google's suggestion service as a fallback:
- **Brave Search, DuckDuckGo** - Use Google fallback for reliable suggestions
- **ChatGPT, Reddit, Spotify, Startpage, Qwant** - Use Google fallback suggestions

This ensures that **all providers get live search suggestions**, making the search experience consistent and helpful across all services.

## Configuration

### Opening Preferences
- Open the extension preferences via the GNOME Extensions app
- Or run: `gnome-extensions prefs omniseek@fuego`

### Managing Providers
- **Add new providers** - Click the "+" button to add custom search providers
- **Edit providers** - Click on any provider to expand and edit its details
- **Remove providers** - Click the trash icon to delete unwanted providers
- **Reorder providers** - Use the reorder button to change provider order

### Provider Settings
Each provider can be configured with:
- **Name** - Display name for the provider
- **Shortcut** - Keyword trigger (e.g., `g`, `ddg`, `yt`)
- **Search URL** - URL template with `%s` placeholder for queries
- **Suggestions URL** - Optional suggestion API URL (leave empty for Google fallback)
- **Icon** - Icon file name (should be in the `icons/` directory)

### Adding Custom Providers
1. Click the "+" button in preferences
2. Set a unique shortcut (e.g., `gh` for GitHub)
3. Enter the search URL with `%s` placeholder (e.g., `https://github.com/search?q=%s`)
4. Leave suggestions URL empty to use Google fallback
5. Choose an icon file or leave default

## Compatibility
- **GNOME Shell 48+** (tested on 48, 49, 50)
- Requires **GJS with ES module support**
- Uses **GTK4/Libadwaita** for preferences
- **Wayland and X11** compatible

## Troubleshooting

### Extension Not Loading
- Ensure the schema is compiled: `glib-compile-schemas ~/.local/share/gnome-shell/extensions/omniseek@fuego/schemas`
- Restart GNOME Shell: `Alt+F2` → `r` → Enter (X11) or log out/in (Wayland)
- Check if your GNOME version is supported (48+)

### No Search Suggestions
- Check logs: `journalctl /usr/bin/gnome-shell -f`
- Verify network connectivity
- Try using a provider with native suggestions (like Google) to test

### Settings Page Errors
- If you get GObject registration errors, restart GNOME Shell
- Ensure you're using the latest version of the extension files
- Check that all files are properly copied to the extension directory

### Provider Not Working
- Verify the search URL format includes `%s` placeholder
- Test the URL manually in a browser by replacing `%s` with a test query
- Check that the shortcut doesn't conflict with existing shortcuts

### Debugging
Check extension logs for detailed error information:
```bash
journalctl /usr/bin/gnome-shell -f | grep OmniSeek
```

## Recent Updates

### Version 7 Changes
- **Improved live suggestions** with intelligent Google fallback system
- **Removed problematic providers** (Claude AI, Gemini) that don't support URL queries
- **Fixed DuckDuckGo and Brave** suggestions by implementing Google fallback
- **Enhanced preferences interface** with better error handling and GObject management
- **Simplified suggestion parsing** for better reliability across all providers
- **Better debugging** with comprehensive logging for troubleshooting

## Contributing

Contributions are welcome! Please feel free to:
- Report bugs and issues
- Suggest new search providers
- Submit pull requests with improvements
- Help with translations

## License

GNU General Public License v3.0. See `LICENSE` file for details.

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Look at logs using `journalctl /usr/bin/gnome-shell -f`
3. Report issues on the GitHub repository
4. Include your GNOME Shell version and extension logs when reporting bugs

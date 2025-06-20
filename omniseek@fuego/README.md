# OmniSeek - GNOME Shell Extension

A powerful search extension for GNOME Shell that allows you to search across multiple providers using keyboard shortcuts.

## Features

- **Keyword-based search**: Type a shortcut followed by your query
- **Live suggestions**: Get real-time search suggestions from supported providers
- **Multiple providers**: Support for Google, Brave, DuckDuckGo, Bing, YouTube, Wikipedia, and more
- **Customizable**: Add, remove, or modify search providers

## How to Use

1. Open GNOME Shell's search (Super key or click Activities)
2. Type a provider shortcut followed by your search query
3. Press Enter to search or select a suggestion

### Available Shortcuts

- `goog` - Google
- `br` - Brave Search
- `ddg` - DuckDuckGo
- `bing` - Bing
- `sp` - Startpage
- `q` - Qwant
- `r` - Reddit
- `spt` - Spotify
- `y` - YouTube
- `ytm` - YouTube Music
- `w` - Wikipedia
- `c` - ChatGPT

### Examples

- `goog linux` - Search Google for "linux"
- `y music` - Search YouTube for "music"
- `w python` - Search Wikipedia for "python"
- `spt rock` - Search Spotify for "rock"

## Installation

1. Download and extract the extension to `~/.local/share/gnome-shell/extensions/omniseek@fuego`
2. Restart GNOME Shell or log out and back in
3. Enable the extension using GNOME Extensions app or `gnome-extensions enable omniseek@fuego`

## Troubleshooting

### Extension not working?

1. Check if the extension is enabled: `gnome-extensions show omniseek@fuego`
2. Restart GNOME Shell: `killall -3 gnome-shell`
3. Check logs: `journalctl --user -f | grep omniseek`

### Search providers not working?

1. Open the extension preferences
2. Check that the provider URLs are correct
3. Some providers may have rate limits or require API keys

### Suggestions not working?

1. Check your internet connection
2. Some providers may block automated requests
3. Try using a different provider

## Recent Fixes

- Fixed GObject registration error that prevented preferences from opening
- Removed incorrect Spotify API implementation
- Added support for all 12 default providers
- Improved error handling and logging
- Enhanced User-Agent strings for better compatibility
- Added comprehensive shortcuts list in preferences
- Fixed suggestion parsing for various providers

## Development

The extension is written in JavaScript using GNOME Shell's extension API. Key files:

- `extension.js` - Main extension logic
- `prefs.js` - Preferences dialog
- `metadata.json` - Extension metadata
- `schemas/` - GSettings schema

## License

This extension is open source and available under the GPL license. 
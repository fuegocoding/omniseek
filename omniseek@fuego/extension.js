'use strict';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.omniseek';
const session = new Soup.Session();

function getSettings(url) {
    const dir = GLib.path_get_dirname(url.replace('file://', ''));
    const schemaDir = `${dir}/schemas`;
    const src = Gio.SettingsSchemaSource.new_from_directory(schemaDir, Gio.SettingsSchemaSource.get_default(), false);
    const schema = src.lookup(SCHEMA_ID, false);
    if (!schema) {
        throw new Error(`Schema ${SCHEMA_ID} not found in ${schemaDir}`);
    }
    return new Gio.Settings({ settings_schema: schema });
}

function urlencode(str) {
    return encodeURIComponent(str).replace(/'/g, '%27').replace(/"/g, '%22');
}

class OmniProvider {
    constructor(settings, iconsDir) {
        this.id = 'OmniSeek';
        this.isRemoteProvider = true;
        this.canLaunchSearch = true;
        this.appInfo = null;
        this._settings = settings;
        this._iconsDir = iconsDir;
        this._suggestionCache = new Map();
        this.reload();
    }

    reload() {
        try {
            this._providers = JSON.parse(this._settings.get_string('providers-json'));
            
            // Validate that we have the expected providers
            if (!this._providers || this._providers.length === 0) {
                log('[OmniSeek] No providers found, this should not happen');
                return;
            }
            
            // Log loaded providers for debugging
            log(`[OmniSeek] Loaded ${this._providers.length} providers: ${this._providers.map(p => p.name).join(', ')}`);
        } catch (e) {
            log(`[OmniSeek] Error parsing providers: ${e}`);
            this._providers = [];
        }
        
        this._map = {};
        for (const p of this._providers) {
            if (p.shortcut && p.shortcut.trim()) {
                this._map[p.shortcut] = p;
            }
        }
        
        // Clear suggestion cache when reloading
        this._suggestionCache.clear();
    }

    _parse(terms) {
        if (!terms || terms.length < 2) return null;
        const prov = this._map[terms[0]];
        if (!prov) return null;
        const query = terms.slice(1).join(' ');
        return query ? { provider: prov, query } : null;
    }

    _getSuggestionUrl(provider, query) {
        // Use provider's suggestion URL if available, otherwise fall back to Google
        let suggestUrl = provider.suggest;
        
        if (!suggestUrl || suggestUrl.trim() === '') {
            // Use Google suggestions as fallback
            suggestUrl = 'https://suggestqueries.google.com/complete/search?client=firefox&q=%s';
        }
        
        return suggestUrl.replace('%s', urlencode(query));
    }

    _parseSuggestions(data, providerIcon) {
        let suggestions = [];
        
        try {
            // Most providers will use Google fallback, so handle Google format first
            if (Array.isArray(data) && Array.isArray(data[1])) {
                // Google-style format: [query, [suggestions...]]
                suggestions = data[1];
            } else if (Array.isArray(data)) {
                // Handle other formats that might still be used
                suggestions = data.map(s => {
                    if (typeof s === 'string') return s;
                    // Try common suggestion object properties
                    return s.phrase || s.query || s.suggestion || s.text || '';
                }).filter(s => s);
            }
        } catch (e) {
            log(`[OmniSeek] Error parsing suggestions for ${providerIcon}: ${e}`);
            suggestions = [];
        }
        
        return suggestions.slice(0, 5);
    }

    getInitialResultSet(terms) {
        const match = this._parse(terms);
        if (!match) return [];

        let results = [JSON.stringify(match)];
        
        // Try to fetch suggestions synchronously
        if (match.query.length > 0) {
            try {
                const cacheKey = `${match.provider.shortcut}:${match.query}`;
                
                // Check cache first
                if (this._suggestionCache.has(cacheKey)) {
                    const cachedSuggestions = this._suggestionCache.get(cacheKey);
                    results = results.concat(cachedSuggestions);
                } else {
                    // Fetch suggestions synchronously
                    const suggestUrl = this._getSuggestionUrl(match.provider, match.query);
                    const msg = Soup.Message.new('GET', suggestUrl);
                    msg.request_headers.append('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
                    msg.request_headers.append('Accept', 'application/json');
                    
                    const bytes = session.send_and_read(msg, null);
                    const responseText = bytes.get_data().toString();
                    log(`[OmniSeek] Raw response for ${match.provider.name}: ${responseText.substring(0, 200)}...`);
                    
                    const data = JSON.parse(responseText);
                    
                    const suggestions = this._parseSuggestions(data, match.provider.icon);
                    const suggestionResults = suggestions.map(s => JSON.stringify({
                        provider: match.provider,
                        query: s,
                        suggestion: true
                    }));
                    
                    // Cache the results
                    this._suggestionCache.set(cacheKey, suggestionResults);
                    
                    results = results.concat(suggestionResults);
                }
            } catch (e) {
                log(`Error fetching suggestions for ${match.provider.name}: ${e}`);
            }
        }
        
        return results;
    }

    getSubsearchResultSet(previous, terms) {
        return this.getInitialResultSet(terms);
    }

    getResultMetas(ids) {
        return ids.map(id => {
            const result = JSON.parse(id);
            const provider = result.provider;
            const isSuggestion = result.suggestion === true;
            
            // Determine icon
            let icon;
            try {
                const iconPath = GLib.build_filenamev([this._iconsDir, provider.icon]);
                if (GLib.file_test(iconPath, GLib.FileTest.EXISTS)) {
                    icon = Gio.FileIcon.new(Gio.File.new_for_path(iconPath));
                } else {
                    // Fallback to themed icon
                    const isMedia = ['spotify.svg', 'ytmusic.svg', 'youtube.svg'].includes(provider.icon);
                    icon = new Gio.ThemedIcon({ 
                        name: isMedia ? 'multimedia-player-symbolic' : 'system-search-symbolic' 
                    });
                }
            } catch (e) {
                log(`Error loading icon for ${provider.name}: ${e}`);
                const isMedia = ['spotify.svg', 'ytmusic.svg', 'youtube.svg'].includes(provider.icon);
                icon = new Gio.ThemedIcon({ 
                    name: isMedia ? 'multimedia-player-symbolic' : 'system-search-symbolic' 
                });
            }

            // Create display text
            const displayName = isSuggestion ? result.query : `Search "${result.query}"`;
            const description = isSuggestion ? 
                `Search suggestion for ${provider.name}` : 
                `Search on ${provider.name}`;

            return {
                id,
                name: displayName,
                description: description,
                createIcon: size => new St.Icon({
                    gicon: icon,
                    icon_size: size
                })
            };
        });
    }

    activateResult(id, terms, timestamp) {
        const result = JSON.parse(id);
        const url = result.provider.url.replace('%s', urlencode(result.query));
        Gio.AppInfo.launch_default_for_uri(url, null);
    }

    filterResults(results, max) {
        return results.slice(0, max);
    }
}

export default class OmniSeekExtension {
    enable() {
        this._settings = getSettings(import.meta.url);
        const iconsDir = GLib.build_filenamev([
            GLib.path_get_dirname(import.meta.url.replace('file://', '')), 
            'icons'
        ]);
        this._provider = new OmniProvider(this._settings, iconsDir);
        Main.overview.searchController.addProvider(this._provider);
        this._signal = this._settings.connect('changed::providers-json', () => {
            this._provider.reload();
        });
    }

    disable() {
        if (this._provider) {
            Main.overview.searchController.removeProvider(this._provider);
            this._provider = null;
        }
        if (this._settings && this._signal) {
            this._settings.disconnect(this._signal);
            this._signal = null;
        }
        this._settings = null;
    }
}

// Fallback for log if not defined
if (typeof log !== 'function') {
    globalThis.log = console.log;
}
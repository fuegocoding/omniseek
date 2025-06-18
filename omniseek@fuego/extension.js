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

async function fetchSuggestions(url) {
    return new Promise(resolve => {
        const msg = Soup.Message.new('GET', url);
        msg.request_headers.append('User-Agent', 'Mozilla/5.0');
        msg.request_headers.append('Accept', 'application/json');
        session.send_and_read_async(msg, 10000, null, (sess, res) => {
            try {
                const data = JSON.parse(sess.send_and_read_finish(res).get_data().toString());
                resolve(data);
            } catch (e) {
                log(`Error fetching suggestions: ${e}`);
                resolve([]);
            }
        });
    });
}

async function fetchThumbnail(url) {
    return new Promise(resolve => {
        const msg = Soup.Message.new('GET', url);
        msg.request_headers.append('User-Agent', 'Mozilla/5.0');
        session.send_and_read_async(msg, 10000, null, (sess, res) => {
            try {
                const bytes = sess.send_and_read_finish(res).get_data();
                const gicon = Gio.BytesIcon.new(new GLib.Bytes(bytes));
                resolve(gicon);
            } catch (e) {
                log(`Error fetching thumbnail: ${e}`);
                resolve(null);
            }
        });
    });
}

// Cache for thumbnails
const thumbnailCache = new Map();

async function getThumbnail(url) {
    if (!url) return null;
    if (thumbnailCache.has(url)) {
        return thumbnailCache.get(url);
    }
    const thumbnail = await fetchThumbnail(url);
    if (thumbnail) {
        thumbnailCache.set(url, thumbnail);
    }
    return thumbnail;
}

class OmniProvider {
    constructor(settings, iconsDir) {
        this.id = 'OmniSeek';
        this.isRemoteProvider = true;
        this.canLaunchSearch = true;
        this.appInfo = null;
        this._settings = settings;
        this._iconsDir = iconsDir;
        this.reload();
    }
    reload() {
        try {
            this._providers = JSON.parse(this._settings.get_string('providers-json'));
        } catch (e) {
            log(`Error parsing providers: ${e}`);
            this._providers = [];
        }
        this._map = {};
        for (const p of this._providers) {
            this._map[p.shortcut] = p;
        }
    }
    _parse(terms) {
        if (!terms || terms.length < 2) return null;
        const prov = this._map[terms[0]];
        if (!prov) return null;
        const query = terms.slice(1).join(' ');
        return query ? { provider: prov, query } : null;
    }
    async _suggest(match) {
        const p = match.provider;
        log(`[OmniSeek] _suggest called for provider: ${p.name}, query: ${match.query}`);
        if (!p.suggest) return [];
        try {
            const raw = await fetchSuggestions(p.suggest.replace('%s', urlencode(match.query)));
            log(`[OmniSeek] Raw suggestions for ${p.name}: ${JSON.stringify(raw)}`);
            let suggestions = [];
            switch (p.icon) {
                case 'google.svg':
                case 'youtube.svg':
                case 'ytmusic.svg':
                    suggestions = Array.isArray(raw) && Array.isArray(raw[1]) ? raw[1] : [];
                    break;
                case 'brave.svg':
                    suggestions = Array.isArray(raw) ? raw.map(s => s.query || s) : [];
                    break;
                case 'duckduckgo.svg':
                    suggestions = Array.isArray(raw) ? raw.map(s => s.phrase || s) : [];
                    break;
                case 'wikipedia.svg':
                    suggestions = Array.isArray(raw) && Array.isArray(raw[1]) ? raw[1] : [];
                    break;
                default:
                    suggestions = Array.isArray(raw) ? 
                        (Array.isArray(raw[1]) ? raw[1] : 
                            (raw.map(s => typeof s === 'string' ? s : (s.phrase || s.query || s)))) : 
                        [];
            }
            log(`[OmniSeek] Parsed suggestions for ${p.name}: ${JSON.stringify(suggestions)}`);
            return suggestions.slice(0, 5).map(s => JSON.stringify({
                provider: p,
                query: s,
                sug: true
            }));
        } catch (e) {
            log(`[OmniSeek] Error fetching suggestions for ${p.name}: ${e}`);
            return [];
        }
    }
    getInitialResultSet(terms) {
        const m = this._parse(terms);
        if (!m) return [];
        let ids = [JSON.stringify(m)];
        // Synchronously fetch suggestions
        if (m.provider.suggest) {
            try {
                const url = m.provider.suggest.replace('%s', urlencode(m.query));
                const msg = Soup.Message.new('GET', url);
                msg.request_headers.append('User-Agent', 'Mozilla/5.0');
                msg.request_headers.append('Accept', 'application/json');
                const bytes = session.send_and_read(msg, null);
                const data = JSON.parse(bytes.get_data().toString());
                let suggestions = [];
                switch (m.provider.icon) {
                    case 'google.svg':
                    case 'youtube.svg':
                    case 'ytmusic.svg':
                        suggestions = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
                        break;
                    case 'brave.svg':
                        suggestions = Array.isArray(data) ? data.map(s => s.query || s) : [];
                        break;
                    case 'duckduckgo.svg':
                        suggestions = Array.isArray(data) ? data.map(s => s.phrase || s) : [];
                        break;
                    case 'wikipedia.svg':
                        suggestions = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
                        break;
                    default:
                        suggestions = Array.isArray(data) ? 
                            (Array.isArray(data[1]) ? data[1] : 
                                (data.map(s => typeof s === 'string' ? s : (s.phrase || s.query || s)))) : 
                            [];
                }
                ids = ids.concat(suggestions.slice(0, 5).map(s => JSON.stringify({
                    provider: m.provider,
                    query: s,
                    sug: true
                })));
            } catch (e) {
                log(`Error fetching suggestions synchronously: ${e}`);
            }
        }
        return ids;
    }
    getSubsearchResultSet(previous, terms) {
        return this.getInitialResultSet(terms);
    }
    getResultMetas(ids) {
        return ids.map(id => {
            const o = JSON.parse(id);
            const p = o.provider;
            const isMedia = p.icon === 'spotify.svg' || p.icon === 'ytmusic.svg' || p.icon === 'youtube.svg';
            const isSuggestion = o.sug === true;
            let icon;
            try {
                const iconPath = GLib.build_filenamev([this._iconsDir, p.icon]);
                if (GLib.file_test(iconPath, GLib.FileTest.EXISTS)) {
                    icon = Gio.FileIcon.new(Gio.File.new_for_path(iconPath));
                } else {
                    icon = new Gio.ThemedIcon({ name: isMedia ? 'multimedia-player-symbolic' : 'system-search-symbolic' });
                }
            } catch (e) {
                log(`Error loading icon for ${p.name}: ${e}`);
                icon = new Gio.ThemedIcon({ name: isMedia ? 'multimedia-player-symbolic' : 'system-search-symbolic' });
            }

            // For media services, try to fetch a thumbnail
            if (isMedia && isSuggestion) {
                const thumbnailPromise = this._getThumbnailUrl(p, o.query);
                if (thumbnailPromise) {
                    thumbnailPromise.then(thumbnailUrl => {
                        if (thumbnailUrl) {
                            fetchThumbnail(thumbnailUrl).then(thumbIcon => {
                                if (thumbIcon) {
                                    icon = thumbIcon;
                                    Main.overview.searchController.invalidate();
                                }
                            });
                        }
                    });
                }
            }

            const displayName = isSuggestion ? o.query : `Search "${o.query}"`;
            const description = isSuggestion ? 
                (isMedia ? `Play on ${p.name}` : `Search suggestion for ${p.name}`) : 
                `Search on ${p.name}`;
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

    _getThumbnailUrl(provider, query) {
        const apiKeys = this._settings.get_value('api-keys').deep_unpack();

        if (provider.icon === 'spotify.svg') {
            const apiKey = apiKeys['spotify'];
            if (!apiKey) {
                return null;
            }

            // For Spotify, we need to search first to get the track/album ID
            const searchUrl = `https://api.spotify.com/v1/search?q=${urlencode(query)}&type=track&limit=1`;
            return new Promise(resolve => {
                const msg = Soup.Message.new('GET', searchUrl);
                msg.request_headers.append('User-Agent', 'Mozilla/5.0');
                msg.request_headers.append('Accept', 'application/json');
                msg.request_headers.append('Authorization', `Bearer ${apiKey}`);
                session.send_and_read_async(msg, 10000, null, (sess, res) => {
                    try {
                        const data = JSON.parse(sess.send_and_read_finish(res).get_data().toString());
                        if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
                            const track = data.tracks.items[0];
                            if (track.album && track.album.images && track.album.images.length > 0) {
                                resolve(track.album.images[0].url);
                            } else {
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        log(`Error fetching Spotify thumbnail: ${e}`);
                        resolve(null);
                    }
                });
            });
        } else if (provider.icon === 'youtube.svg' || provider.icon === 'ytmusic.svg') {
            const apiKey = apiKeys['youtube'];
            if (!apiKey) {
                return null;
            }

            // For YouTube, search for the video
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${urlencode(query)}&type=video&maxResults=1&key=${apiKey}`;
            return new Promise(resolve => {
                const msg = Soup.Message.new('GET', searchUrl);
                msg.request_headers.append('User-Agent', 'Mozilla/5.0');
                msg.request_headers.append('Accept', 'application/json');
                session.send_and_read_async(msg, 10000, null, (sess, res) => {
                    try {
                        const data = JSON.parse(sess.send_and_read_finish(res).get_data().toString());
                        if (data.items && data.items.length > 0) {
                            const video = data.items[0];
                            if (video.snippet && video.snippet.thumbnails && video.snippet.thumbnails.high) {
                                resolve(video.snippet.thumbnails.high.url);
                            } else {
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        log(`Error fetching YouTube thumbnail: ${e}`);
                        resolve(null);
                    }
                });
            });
        }
        return null;
    }

    activateResult(id, terms, timestamp) {
        const o = JSON.parse(id);
        const url = o.provider.url.replace('%s', urlencode(o.query));
        Gio.AppInfo.launch_default_for_uri(url, null);
    }
    filterResults(results, max) {
        return results.slice(0, max);
    }
}

export default class OmniSeekExtension {
    enable() {
        this._settings = getSettings(import.meta.url);
        const iconsDir = GLib.build_filenamev([GLib.path_get_dirname(import.meta.url.replace('file://','')), 'icons']);
        this._provider = new OmniProvider(this._settings, iconsDir);
        Main.overview.searchController.addProvider(this._provider);
        this._signal = this._settings.connect('changed::providers-json', () => this._provider.reload());
    }
    disable() {
        if (this._provider) Main.overview.searchController.removeProvider(this._provider);
        if (this._settings && this._signal) this._settings.disconnect(this._signal);
    }
}

// Fallback for log if not defined (for debugging outside GNOME Shell)
if (typeof log !== 'function') {
    var log = print;
}

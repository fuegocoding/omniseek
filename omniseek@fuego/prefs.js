'use strict';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

const SCHEMA_ID = 'org.gnome.shell.extensions.omniseek';

function getSettings(url) {
    const schemaDir = GLib.build_filenamev([GLib.path_get_dirname(url.replace('file://', '')), 'schemas']);
    const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
        schemaDir,
        Gio.SettingsSchemaSource.get_default(),
        false
    );
    const schema = schemaSource.lookup(SCHEMA_ID, false);
    
    if (!schema) {
        throw new Error(`Schema ${SCHEMA_ID} not found in ${schemaDir}`);
    }
    
    return new Gio.Settings({ settings_schema: schema });
}

export default class OmniSeekPrefs {
    fillPreferencesWindow(win) {
        const settings = getSettings(import.meta.url);
        let providers;
        
        try {
            providers = JSON.parse(settings.get_string('providers-json'));
            
            // Check if we need to update to include new providers
            const expectedProviders = [
                'Google', 'Brave Search', 'DuckDuckGo', 'Bing', 'YouTube', 
                'YouTube Music', 'Wikipedia', 'ChatGPT', 
                'Reddit', 'Spotify', 'Startpage', 'Qwant'
            ];
            
            const currentProviderNames = providers.map(p => p.name);
            const missingProviders = expectedProviders.filter(name => 
                !currentProviderNames.includes(name)
            );
            
            // If we're missing new providers, reset to defaults
            if (missingProviders.length > 0) {
                console.log(`Missing providers detected: ${missingProviders.join(', ')}, resetting to defaults`);
                providers = null; // Force reload of defaults
            }
        } catch (e) {
            console.log(`Error parsing providers, resetting to defaults: ${e}`);
            providers = null;
        }

        // Create main page
        const page = new Adw.PreferencesPage({
            title: 'OmniSeek',
            icon_name: 'system-search-symbolic'
        });
        win.add(page);

        // Create header group with description
        const headerGroup = new Adw.PreferencesGroup();
        page.add(headerGroup);

        // Add description row
        const descriptionRow = new Adw.ActionRow({
            title: 'How to use shortcuts',
            subtitle: 'Type a shortcut followed by your search query. For example: "g linux" to search Google for "linux".',
            icon_name: 'help-about-symbolic'
        });
        headerGroup.add(descriptionRow);

        // Create providers group with header buttons
        const providersGroup = new Adw.PreferencesGroup({
            title: 'Search Providers',
            description: 'Configure search providers and their shortcuts.'
        });

        // Add header suffix with buttons
        const headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6
        });

        const reorderButton = new Gtk.Button({
            icon_name: 'view-sort-ascending-symbolic',
            tooltip_text: 'Reorder providers',
            css_classes: ['flat']
        });

        const addButton = new Gtk.Button({
            icon_name: 'list-add-symbolic',
            tooltip_text: 'Add new provider',
            css_classes: ['flat']
        });

        headerBox.append(reorderButton);
        headerBox.append(addButton);
        providersGroup.set_header_suffix(headerBox);

        page.add(providersGroup);

        // Create the list store - use simple object store instead of GObject
        const store = new Gio.ListStore({ item_type: GObject.Object });
        
        // If providers is empty, load defaults
        if (!providers || !providers.length) {
            providers = [
                {
                    name: 'Google',
                    shortcut: 'g',
                    url: 'https://www.google.com/search?q=%s',
                    suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&q=%s',
                    icon: 'google.svg'
                },
                {
                    name: 'Brave Search',
                    shortcut: 'br',
                    url: 'https://search.brave.com/search?q=%s',
                    suggest: '', // Force Google fallback
                    icon: 'brave.svg'
                },
                {
                    name: 'DuckDuckGo',
                    shortcut: 'ddg',
                    url: 'https://duckduckgo.com/?q=%s',
                    suggest: '', // Force Google fallback
                    icon: 'duckduckgo.svg'
                },
                {
                    name: 'Bing',
                    shortcut: 'b',
                    url: 'https://www.bing.com/search?q=%s',
                    suggest: 'https://api.bing.com/osjson.aspx?query=%s',
                    icon: 'bing.svg'
                },
                {
                    name: 'YouTube',
                    shortcut: 'y',
                    url: 'https://www.youtube.com/results?search_query=%s',
                    suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=%s',
                    icon: 'youtube.svg'
                },
                {
                    name: 'YouTube Music',
                    shortcut: 'ym',
                    url: 'https://music.youtube.com/search?q=%s',
                    suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=%s',
                    icon: 'ytmusic.svg'
                },
                {
                    name: 'Wikipedia',
                    shortcut: 'w',
                    url: 'https://en.wikipedia.org/wiki/Special:Search/%s',
                    suggest: 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=%s',
                    icon: 'wikipedia.svg'
                },
                {
                    name: 'ChatGPT',
                    shortcut: 'gpt',
                    url: 'https://chat.openai.com/?q=%s',
                    suggest: '',
                    icon: 'chatgpt.svg'
                },
                {
                    name: 'Reddit',
                    shortcut: 'r',
                    url: 'https://www.reddit.com/search/?q=%s',
                    suggest: '',
                    icon: 'reddit.svg'
                },
                {
                    name: 'Spotify',
                    shortcut: 's',
                    url: 'https://open.spotify.com/search/%s',
                    suggest: '',
                    icon: 'spotify.svg'
                },
                {
                    name: 'Startpage',
                    shortcut: 'sp',
                    url: 'https://www.startpage.com/search?q=%s',
                    suggest: '',
                    icon: 'startpage.svg'
                },
                {
                    name: 'Qwant',
                    shortcut: 'q',
                    url: 'https://www.qwant.com/?q=%s',
                    suggest: '',
                    icon: 'qwant.svg'
                }
            ];
            settings.set_string('providers-json', JSON.stringify(providers));
        }

        providers.forEach(p => {
            // Create simple GObject with provider data
            const obj = new GObject.Object();
            obj.providerData = {
                name: p.name || '',
                shortcut: p.shortcut || '',
                url: p.url || '',
                suggest: p.suggest || '',
                icon: p.icon || ''
            };
            store.append(obj);
        });

        // Create the list factory
        const factory = Gtk.SignalListItemFactory.new();
        
        factory.connect('setup', (_, listItem) => {
            const row = new Adw.ExpanderRow({
                show_enable_switch: false,
                expanded: false
            });
            listItem.set_child(row);

            // Main row content
            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                margin_start: 12,
                margin_end: 12,
                margin_top: 12,
                margin_bottom: 12,
                hexpand: true
            });

            const shortcutEntry = new Gtk.Entry({
                width_chars: 4,
                max_width_chars: 10,
                placeholder_text: 'Shortcut',
                margin_end: 12,
                valign: Gtk.Align.CENTER
            });
            shortcutEntry.add_css_class('monospace');

            const nameEntry = new Gtk.Entry({
                hexpand: true,
                placeholder_text: 'Provider name',
                valign: Gtk.Align.CENTER
            });

            // Delete button
            const deleteButton = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                css_classes: ['flat', 'circular'],
                valign: Gtk.Align.CENTER
            });

            mainBox.append(shortcutEntry);
            mainBox.append(nameEntry);
            mainBox.append(deleteButton);
            row.add_prefix(mainBox);

            // Advanced settings
            const urlBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_start: 12,
                margin_end: 12,
                margin_top: 12,
                margin_bottom: 12
            });

            const urlEntry = new Gtk.Entry({
                placeholder_text: 'Search URL (use %s for query)',
                hexpand: true
            });

            const suggestEntry = new Gtk.Entry({
                placeholder_text: 'Suggestions URL (optional - will use Google as fallback)',
                hexpand: true
            });

            urlBox.append(urlEntry);
            urlBox.append(suggestEntry);
            
            const advancedRow = new Adw.ActionRow({
                title: 'Advanced Settings'
            });
            advancedRow.set_child(urlBox);
            row.add_row(advancedRow);

            // Store widgets as properties of the row for easy access in bind
            row.shortcutEntry = shortcutEntry;
            row.nameEntry = nameEntry;
            row.urlEntry = urlEntry;
            row.suggestEntry = suggestEntry;
            row.deleteButton = deleteButton;
        });

        factory.connect('bind', (_, listItem) => {
            const index = listItem.get_position();
            const obj = store.get_item(index);
            const provider = obj.providerData;
            const row = listItem.get_child();
            
            // Set the title and values
            row.nameEntry.set_text(provider.name || '');
            row.shortcutEntry.set_text(provider.shortcut || '');
            row.urlEntry.set_text(provider.url || '');
            row.suggestEntry.set_text(provider.suggest || '');
            row.set_title(provider.name || 'Unnamed Provider');
            row.set_subtitle(provider.shortcut ? 
                `Type "${provider.shortcut}" to search` : 
                'No shortcut set'
            );

            // Set icon if available
            if (provider.icon) {
                const iconPath = GLib.build_filenamev([
                    GLib.path_get_dirname(import.meta.url.replace('file://', '')), 
                    'icons', 
                    provider.icon
                ]);
                if (GLib.file_test(iconPath, GLib.FileTest.EXISTS)) {
                    row.set_icon_name(provider.icon.replace('.svg', ''));
                }
            }

            // Handle changes with proper debouncing
            let timeout = null;
            const saveChanges = () => {
                const currentIndex = listItem.get_position();
                if (currentIndex >= 0 && currentIndex < providers.length) {
                    // Update the provider object and the store
                    providers[currentIndex].name = row.nameEntry.get_text();
                    providers[currentIndex].shortcut = row.shortcutEntry.get_text();
                    providers[currentIndex].url = row.urlEntry.get_text();
                    providers[currentIndex].suggest = row.suggestEntry.get_text();
                    
                    // Update the store object
                    const obj = store.get_item(currentIndex);
                    obj.providerData = {
                        name: providers[currentIndex].name,
                        shortcut: providers[currentIndex].shortcut,
                        url: providers[currentIndex].url,
                        suggest: providers[currentIndex].suggest,
                        icon: providers[currentIndex].icon
                    };
                    
                    // Update the row display
                    const newName = providers[currentIndex].name || 'Unnamed Provider';
                    const newShortcut = providers[currentIndex].shortcut;
                    
                    row.set_title(newName);
                    row.set_subtitle(newShortcut ? 
                        `Type "${newShortcut}" to search` : 
                        'No shortcut set'
                    );

                    // Save to settings and trigger extension reload
                    settings.set_string('providers-json', JSON.stringify(providers));
                }
            };

            const saveProvider = () => {
                if (timeout) {
                    GLib.source_remove(timeout);
                }
                timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                    saveChanges();
                    timeout = null;
                    return GLib.SOURCE_REMOVE;
                });
            };

            // Connect all entry change events
            [row.nameEntry, row.shortcutEntry, row.urlEntry, row.suggestEntry].forEach(entry => {
                entry.connect('changed', saveProvider);
            });

            // Setup delete button
            row.deleteButton.connect('clicked', () => {
                const currentIndex = listItem.get_position();
                if (currentIndex >= 0 && currentIndex < providers.length) {
                    providers.splice(currentIndex, 1);
                    settings.set_string('providers-json', JSON.stringify(providers));
                    store.remove(currentIndex);
                }
            });
        });

        // Setup reorder button
        reorderButton.connect('clicked', () => {
            const dialog = new Gtk.Dialog({
                title: 'Reorder Providers',
                transient_for: win,
                modal: true,
                use_header_bar: true
            });

            const listBox = new Gtk.ListBox({
                selection_mode: Gtk.SelectionMode.NONE,
                css_classes: ['navigation-sidebar']
            });

            const updateButtons = () => {
                const rows = [];
                let child = listBox.get_first_child();
                while (child) {
                    rows.push(child);
                    child = child.get_next_sibling();
                }
                
                rows.forEach((row, index) => {
                    const box = row.get_child();
                    const upButton = box.get_last_child().get_prev_sibling();
                    const downButton = box.get_last_child();
                    upButton.set_sensitive(index > 0);
                    downButton.set_sensitive(index < rows.length - 1);
                });
            };

            providers.forEach((provider, index) => {
                const row = new Gtk.ListBoxRow();
                const box = new Gtk.Box({
                    orientation: Gtk.Orientation.HORIZONTAL,
                    spacing: 12,
                    margin_start: 12,
                    margin_end: 12,
                    margin_top: 6,
                    margin_bottom: 6
                });

                const label = new Gtk.Label({
                    label: `${provider.shortcut}: ${provider.name}`,
                    hexpand: true,
                    xalign: 0
                });

                const upButton = new Gtk.Button({
                    icon_name: 'go-up-symbolic',
                    css_classes: ['flat', 'circular'],
                    sensitive: index > 0
                });

                const downButton = new Gtk.Button({
                    icon_name: 'go-down-symbolic',
                    css_classes: ['flat', 'circular'],
                    sensitive: index < providers.length - 1
                });

                box.append(label);
                box.append(upButton);
                box.append(downButton);
                row.set_child(box);

                upButton.connect('clicked', () => {
                    const currentIndex = [...listBox].indexOf(row);
                    if (currentIndex > 0) {
                        // Swap in providers array
                        [providers[currentIndex], providers[currentIndex - 1]] = 
                        [providers[currentIndex - 1], providers[currentIndex]];
                        
                        // Move in UI
                        listBox.remove(row);
                        listBox.insert(row, currentIndex - 1);
                        
                        settings.set_string('providers-json', JSON.stringify(providers));
                        updateButtons();
                    }
                });

                downButton.connect('clicked', () => {
                    const currentIndex = [...listBox].indexOf(row);
                    if (currentIndex < providers.length - 1) {
                        // Swap in providers array
                        [providers[currentIndex], providers[currentIndex + 1]] = 
                        [providers[currentIndex + 1], providers[currentIndex]];
                        
                        // Move in UI
                        listBox.remove(row);
                        listBox.insert(row, currentIndex + 1);
                        
                        settings.set_string('providers-json', JSON.stringify(providers));
                        updateButtons();
                    }
                });

                listBox.append(row);
            });

            updateButtons();

            const scrolled = new Gtk.ScrolledWindow({
                hexpand: true,
                vexpand: true,
                min_content_height: 300
            });
            scrolled.set_child(listBox);

            dialog.get_content_area().append(scrolled);
            dialog.add_response('close', 'Close');
            dialog.set_default_response('close');
            dialog.present();
        });

        // Setup add button handler
        addButton.connect('clicked', () => {
            const newProvider = {
                name: 'New Provider',
                shortcut: 'new',
                url: 'https://example.com/search?q=%s',
                suggest: '',
                icon: 'system-search-symbolic.svg'
            };
            providers.push(newProvider);
            settings.set_string('providers-json', JSON.stringify(providers));
            
            // Add to store
            const obj = new GObject.Object();
            obj.providerData = {
                name: newProvider.name,
                shortcut: newProvider.shortcut,
                url: newProvider.url,
                suggest: newProvider.suggest,
                icon: newProvider.icon
            };
            store.append(obj);
            
            // Scroll to the new item
            const scrolled = providersGroup.get_first_child().get_next_sibling();
            if (scrolled && scrolled.get_vadjustment) {
                const adj = scrolled.get_vadjustment();
                adj.set_value(adj.get_upper() - adj.get_page_size());
            }
        });

        // Create selection model and list view
        const selectionModel = new Gtk.NoSelection({ model: store });
        const listView = new Gtk.ListView({
            model: selectionModel,
            factory,
            vexpand: true,
            css_classes: ['boxed-list']
        });

        // Create a scrolled window for the list
        const scrolled = new Gtk.ScrolledWindow({
            hexpand: true,
            vexpand: true,
            min_content_height: 300
        });
        scrolled.set_child(listView);
        providersGroup.add(scrolled);

        // Add help section
        const helpGroup = new Adw.PreferencesGroup({
            title: 'Help & Tips'
        });
        page.add(helpGroup);
        
        const helpRow = new Adw.ActionRow({
            title: 'Using Search Shortcuts',
            subtitle: 'Type a provider\'s shortcut followed by your search query. Example: "g linux" searches Google for "linux".',
            icon_name: 'help-about-symbolic'
        });
        helpGroup.add(helpRow);

        const suggestionsRow = new Adw.ActionRow({
            title: 'Live Search Suggestions',
            subtitle: 'Providers without suggestion URLs will automatically use Google suggestions as fallback.',
            icon_name: 'system-search-symbolic'
        });
        helpGroup.add(suggestionsRow);
    }
}
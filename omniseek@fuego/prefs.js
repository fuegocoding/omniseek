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
        let providers = JSON.parse(settings.get_string('providers-json'));

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

        // Create a GObject class for our provider items
        const ProviderObject = GObject.registerClass({
            Properties: {
                'name': GObject.ParamSpec.string(
                    'name', 'name', 'Provider name',
                    GObject.ParamFlags.READWRITE,
                    ''
                ),
                'shortcut': GObject.ParamSpec.string(
                    'shortcut', 'shortcut', 'Provider shortcut',
                    GObject.ParamFlags.READWRITE,
                    ''
                ),
                'url': GObject.ParamSpec.string(
                    'url', 'url', 'Search URL',
                    GObject.ParamFlags.READWRITE,
                    ''
                ),
                'suggest': GObject.ParamSpec.string(
                    'suggest', 'suggest', 'Suggestions URL',
                    GObject.ParamFlags.READWRITE,
                    ''
                ),
                'icon': GObject.ParamSpec.string(
                    'icon', 'icon', 'Provider icon',
                    GObject.ParamFlags.READWRITE,
                    ''
                )
            }
        }, class ProviderObject extends GObject.Object {
            _init(params) {
                super._init();
                this.name = params.name || '';
                this.shortcut = params.shortcut || '';
                this.url = params.url || '';
                this.suggest = params.suggest || '';
                this.icon = params.icon || '';
            }
        });

        // Create the list store with our providers
        const store = new Gio.ListStore({ item_type: ProviderObject });
        
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
                    suggest: 'https://search.brave.com/api/suggest?q=%s',
                    icon: 'brave.svg'
                },
                {
                    name: 'DuckDuckGo',
                    shortcut: 'ddg',
                    url: 'https://duckduckgo.com/?q=%s',
                    suggest: 'https://duckduckgo.com/ac/?q=%s&type=list',
                    icon: 'duckduckgo.svg'
                },
                {
                    name: 'YouTube',
                    shortcut: 'y',
                    url: 'https://www.youtube.com/results?search_query=%s',
                    suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=%s',
                    icon: 'youtube.svg'
                },
                {
                    name: 'Wikipedia',
                    shortcut: 'w',
                    url: 'https://en.wikipedia.org/wiki/Special:Search/%s',
                    suggest: 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=%s',
                    icon: 'wikipedia.svg'
                }
            ];
            settings.set_string('providers-json', JSON.stringify(providers));
        }

        providers.forEach(p => {
            store.append(new ProviderObject({
                name: p.name || '',
                shortcut: p.shortcut || '',
                url: p.url || '',
                suggest: p.suggest || '',
                icon: p.icon || ''
            }));
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
                width_chars: 3,
                max_width_chars: 3,
                placeholder_text: 'Key',
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
                placeholder_text: 'Suggestions URL (optional)',
                hexpand: true
            });

            urlBox.append(urlEntry);
            urlBox.append(suggestEntry);
            row.add_row(new Adw.ActionRow({
                title: 'Advanced Settings',
                child: urlBox
            }));

            // Store widgets as properties of the row for easy access in bind
            row.shortcutEntry = shortcutEntry;
            row.nameEntry = nameEntry;
            row.urlEntry = urlEntry;
            row.suggestEntry = suggestEntry;
            row.deleteButton = deleteButton;
        });

        factory.connect('bind', (_, listItem) => {
            const o = providers[listItem.get_position()];
            const row = listItem.get_child();
            
            // Set the title and values
            row.nameEntry.set_text(o.name || '');
            row.shortcutEntry.set_text(o.shortcut || '');
            row.urlEntry.set_text(o.url || '');
            row.suggestEntry.set_text(o.suggest || '');
            row.set_title(o.name || 'Unnamed Provider');
            row.set_subtitle(o.shortcut ? 
                `Type "${o.shortcut}" to search` : 
                'No shortcut set'
            );

            // Set icon if available
            if (o.icon) {
                const iconPath = GLib.build_filenamev([GLib.path_get_dirname(import.meta.url.replace('file://', '')), 'icons', o.icon]);
                if (GLib.file_test(iconPath, GLib.FileTest.EXISTS)) {
                    row.set_icon_name(o.icon.replace('.svg', ''));
                }
            }

            // Handle changes
            let timeout = null;
            const saveChanges = () => {
                // Update the provider object
                o.name = row.nameEntry.get_text();
                o.shortcut = row.shortcutEntry.get_text();
                o.url = row.urlEntry.get_text();
                o.suggest = row.suggestEntry.get_text();
                
                // Update the row display
                row.set_title(o.name || 'Unnamed Provider');
                row.set_subtitle(o.shortcut ? 
                    `Type "${o.shortcut}" to search` : 
                    'No shortcut set'
                );

                // Update the providers array and save to settings
                const index = listItem.get_position();
                providers[index] = {
                    name: o.name,
                    shortcut: o.shortcut,
                    url: o.url,
                    suggest: o.suggest,
                    icon: o.icon
                };
                settings.set_string('providers-json', JSON.stringify(providers));
            };

            const saveProvider = () => {
                if (timeout) GLib.source_remove(timeout);
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
                const index = listItem.get_position();
                providers.splice(index, 1);
                settings.set_string('providers-json', JSON.stringify(providers));
                store.remove(index);
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
                    label: provider.name,
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
                    if (index > 0) {
                        [providers[index], providers[index - 1]] = [providers[index - 1], providers[index]];
                        listBox.remove(row);
                        listBox.insert(row, index - 1);
                        settings.set_string('providers-json', JSON.stringify(providers));
                    }
                });

                downButton.connect('clicked', () => {
                    if (index < providers.length - 1) {
                        [providers[index], providers[index + 1]] = [providers[index + 1], providers[index]];
                        listBox.remove(row);
                        listBox.insert(row, index + 1);
                        settings.set_string('providers-json', JSON.stringify(providers));
                    }
                });

                listBox.append(row);
            });

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
                store.append(new ProviderObject(newProvider));
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

        // Add help text
        const helpGroup = new Adw.PreferencesGroup();
        page.add(helpGroup);
        
        const helpRow = new Adw.ActionRow({
            title: 'How to use shortcuts',
            subtitle: 'Type a provider\'s shortcut followed by your search query. For example: "g linux" to search Google for "linux".',
            icon_name: 'help-about-symbolic'
        });
        helpGroup.add(helpRow);

        // Add API keys group
        const apiGroup = new Adw.PreferencesGroup({
            title: 'API Keys (Optional)',
            description: 'Configure API keys to enable enhanced features like thumbnails. These are optional and the extension will work without them.'
        });
        page.add(apiGroup);

        // API key configuration
        const apiKeys = settings.get_value('api-keys').deep_unpack();
        const apiConfigs = [
            {
                id: 'spotify',
                name: 'Spotify',
                description: 'Enables album/track thumbnails in search results',
                help: '1. Go to https://developer.spotify.com/dashboard\n2. Log in and create a new application\n3. Copy the Client ID'
            },
            {
                id: 'youtube',
                name: 'YouTube',
                description: 'Enables video thumbnails in search results',
                help: '1. Go to https://console.cloud.google.com\n2. Create a project and enable YouTube Data API\n3. Create credentials and copy the API key'
            }
        ];

        apiConfigs.forEach(config => {
            const row = new Adw.ActionRow({
                title: config.name,
                subtitle: config.description
            });
            apiGroup.add(row);

            const keyEntry = new Gtk.Entry({
                hexpand: true,
                placeholder_text: `Enter your ${config.name} API key`,
                visibility: false
            });
            keyEntry.set_text(apiKeys[config.id] || '');
            keyEntry.connect('changed', () => {
                const currentKeys = settings.get_value('api-keys').deep_unpack();
                if (keyEntry.get_text()) {
                    currentKeys[config.id] = keyEntry.get_text();
                } else {
                    delete currentKeys[config.id];
                }
                settings.set_value('api-keys', new GLib.Variant('a{ss}', currentKeys));
            });
            row.add_suffix(keyEntry);

            const helpRow = new Adw.ActionRow({
                title: `How to get a ${config.name} API key`,
                subtitle: config.help,
                icon_name: 'help-about-symbolic'
            });
            apiGroup.add(helpRow);
        });
    }
}

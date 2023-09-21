import { CompendiumBrowserApp } from "./apps/compendium-browser-app.js";
import { Hierarchy } from "./hierarchy.js";
import { ImportBook } from "./importBook.js";
import { registerSettings } from "./settings.js";

export let debug = (...args) => {
    if (ForgeCompendiumBrowser.debugEnabled > 1) console.log("DEBUG: forge-compendium-browser | ", ...args);
};
export let log = (...args) => console.log("forge-compendium-browser | ", ...args);
export let warn = (...args) => {
    if (ForgeCompendiumBrowser.debugEnabled > 0) console.warn("forge-compendium-browser | ", ...args);
};
export let error = (...args) => console.error("forge-compendium-browser | ", ...args);
export let i18n = (key, args) => {
    if (args) {
        return game.i18n.format(key, args);
    }
    return game.i18n.localize(key);
};
export let setting = (key) => {
    return game.settings.get("forge-compendium-browser", key);
};

export class ForgeCompendiumBrowser {
    static books = [];
    static debugEnabled = 1;
    static iconMap = null;
    static indexed = {};

    static init() {
        registerSettings();
        ForgeCompendiumBrowser.registerHooks();

        ForgeCompendiumBrowser.SOCKET = "module.forge-compendium-browser";

        Dlopen.register("forge-compendium-browser-vueport", {
            scripts: foundry.utils.getRoute(
                "/modules/forge-compendium-browser/dist/ForgeCompendiumBrowserVue.umd.min.js"
            ),
            styles: foundry.utils.getRoute("/modules/forge-compendium-browser/dist/ForgeCompendiumBrowserVue.css"),
            dependencies: "vue",
            init: () => Vue.component("ForgeCompendiumBrowser", ForgeCompendiumBrowserVue),
        });

        game.ForgeCompendiumBrowser = ForgeCompendiumBrowser;
    }

    static setup() {
        //compile the DnDBeyond compendiums
        const isV10 = isNewerVersion(game.version, "9.999999");
        if (isV10) {
            ForgeCompendiumBrowser.getIconMap().then((data) => {
                ForgeCompendiumBrowser.iconMap = data;
            });
        }
        ForgeCompendiumBrowser.parseCompendiums();
    }

    static setting(key) {
        return game.settings.get("forge-compendium-browser", key);
    }

    static ready() {
        game.socket.on(ForgeCompendiumBrowser.SOCKET, ForgeCompendiumBrowser.onMessage);
    }

    static registerHooks() {
        Hooks.on("renderCompendiumDirectory", (app, html) => {
            $(".directory-header", html).append(
                $("<div>")
                    .addClass("forge-compendium-actions action-buttons flexrow")
                    .append(
                        $("<button>")
                            .addClass("open-forge-compendium-browser")
                            .attr("type", "button")
                            .on("click", ForgeCompendiumBrowser.openBrowser.bind(app, null))
                            .html(
                                `<img src="/modules/forge-compendium-browser/img/the-forge-logo-32x32.png" width="16" height="16" style="border: 0px;margin-bottom: -3px;" /> ${i18n(
                                    "ForgeCompendiumBrowser.OpenCompendiumBrowser"
                                )}`
                            )
                    )
            );

            ForgeCompendiumBrowser.clearPacks();
        });

        Hooks.on("setupTileActions", (app) => {
            app.registerTileGroup("forge-compendium-browser", i18n("ForgeCompendiumBrowser.ForgeCompendiumLibrary"));
            app.registerTileAction("forge-compendium-browser", i18n("ForgeCompendiumBrowser.ForgeCompendiumLibrary"), {
                name: i18n("ForgeCompendiumBrowser.OpenBook"),
                ctrls: [
                    {
                        id: "bookid",
                        name: i18n("ForgeCompendiumBrowser.CompendiumBook"),
                        list: () => {
                            let list = {};
                            for (const book of game.ForgeCompendiumBrowser.books) {
                                list[book.id] = book.name;
                            }
                            return list;
                        },
                        type: "list",
                    },
                ],
                group: "forge-compendium-browser",
                fn: async (args = {}) => {
                    const { action, userid } = args;

                    if (userid === game.user.id) {
                        game.ForgeCompendiumBrowser.openBrowser(action.data.bookid);
                    } else {
                        game.socket.emit(
                            game.ForgeCompendiumBrowser.SOCKET,
                            { action: "open", userid: userid, bookid: action.data.bookid },
                            () => {}
                        );
                    }
                },
                content: async (trigger, action) => {
                    const book = game.ForgeCompendiumBrowser.books.find((b) => b.id === action.data.bookid);
                    return `<span class="action-style">${i18n("ForgeCompendiumBrowser.OpenCompendiumBook")}</span> <span class="details-style">"${
                        book.name || i18n("ForgeCompendiumBrowser.Unknown")
                    }"</span>`;
                },
            });
        });

        Hooks.on("renderModuleManagement", (app, html) => {
            const isV10 = isNewerVersion(game.version, "9.999999");
            for (const module of game.modules.values()) {
                const flags = module.flags ?? module.data.flags;
                let packageElem = isV10
                    ? `.package[data-module-id="${module.id || module.name}"]`
                    : `.package[data-module-name="${module.id || module.name}"]`;
                if (flags["forge-compendium-browser"]?.active) {
                    $("<span>")
                        .addClass("tag compendium-library")
                        .html(
                            `<img title="${i18n(
                                "ForgeCompendiumBrowser.ForgeCompendiumLibrary"
                            )}" src="/modules/forge-compendium-browser/img/the-forge-logo-32x32.png" width="16" height="16" style="border: 0px;margin-bottom: -3px;">`
                        )
                        .insertAfter($(`${packageElem} .package-title`, html));
                }
            }
        });

        // If the permissions change, make sure to update the book
        Hooks.on("updateSetting", (setting) => {
            if (setting.key === "forge-compendium-browser.permissions") {
                for (const [bookId, permission] of Object.entries(setting.value)) {
                    const book = ForgeCompendiumBrowser.books.find((b) => b.id === bookId);
                    if (book) {
                        book.permissions = permission;
                    }
                }
            }
        });
    }

    static async onMessage(data) {
        switch (data.action) {
            case "open": {
                if (data.userid === game.user.id || data.userid == undefined) {
                    ForgeCompendiumBrowser.openBrowser(data.book);
                }
            }
        }
    }

    static get version() {
        const module = game.modules.get("forge-compendium-browser");
        return module.version ?? module.data.version;
    }

    static getIconMap = async function () {
        let iconMap = {};
        try {
            const icons = await ForgeCompendiumBrowser.getFileData("systems/dnd5e/json/icon-migration.json", {
                expand: false,
            });
            const spellIcons = await ForgeCompendiumBrowser.getFileData(
                "systems/dnd5e/json/spell-icon-migration.json",
                { expand: false }
            );
            iconMap = { ...icons, ...spellIcons };
        } catch (err) {
            console.warn(`Failed to retrieve icon migration data: ${err.message}`);
        }
        return iconMap;
    };

    static mapIcon(path) {
        if (path && game.ForgeCompendiumBrowser.iconMap) {
            if (path.startsWith("/") || path.startsWith("\\")) path = path.substring(1);
            return game.ForgeCompendiumBrowser.iconMap[path] || path;
        }
        return path;
    }

    static async parseCompendiums() {
        const permissions = game.ForgeCompendiumBrowser.setting("permissions") || {};

        //Find all the DnDBeyond modules
        log("Parsing compendiums");
        for (const module of game.modules.values()) {
            const flags = module.flags ?? module.data.flags;
            if (flags["forge-compendium-browser"]?.active && module.active) {
                const book = {
                    id: module.id,
                    name: module.title ?? module.data.title,
                    description: module.description ?? module.data.description,
                    img: flags["forge-compendium-browser"]?.cover,
                    background: flags["forge-compendium-browser"]?.background,
                    module: module,
                    packs: module.packs ?? module.data.packs,
                    children: [],
                    type: "book",
                    permissions: permissions[module.id] || {},
                    version: module.version ?? module.data.version,
                };

                ForgeCompendiumBrowser.books.push(book);

                const hierarchy = new Hierarchy(book);
                hierarchy.getHierarchy().then((data) => {
                    if (data == null) {
                        book.error = true;
                    }
                });

                log(
                    `Found package:${module.title ?? module.data.title}, hiding ${
                        module.packs.length ?? module.packs.size
                    } associated compendiums`
                );
            }
        }

        ForgeCompendiumBrowser.clearPacks();
    }

    static async getFileData(src, options = {}) {
        // Load the referenced translation file
        let err;
        let resp;
        try {
            resp = await fetch(src, { cache: "no-cache" }).catch((e) => {
                err = e;
                return null;
            });
        } catch (err) {
            // ignore this error, it should be caught in the next statement
            error(err);
        }
        if (resp == undefined || resp.status !== 200) {
            const msg = `Unable to load data "${src}"`;
            warn(msg, err);
            return null;
        }

        // Parse and expand the provided translation object
        let json;
        try {
            json = await resp.json();
            log(`Loaded file ${src}`);
            if (options.expand !== false) json = foundry.utils.expandObject(json);
        } catch (err) {
            warn(err);
            json = null;
        }
        return json;
    }

    static async indexBook(book) {
        const indexPacks = (parent) => {
            if (parent.children && parent.children.length) {
                for (const child of parent.children) {
                    child.parent = parent;
                    child.section = parent.section || (parent.type === "section" && parent.id);

                    if (child.children) indexPacks(child);
                }
            }
        };

        if (!ForgeCompendiumBrowser.indexed[book.id]) {
            indexPacks(book);
            ForgeCompendiumBrowser.indexed[book.id] = true;
        }
    }

    static importBook(book, options) {
        ImportBook.importBook(book, options);
    }

    static openBrowser(book) {
        ForgeCompendiumBrowser.browser = new CompendiumBrowserApp(book).render(true);
    }

    static clearPacks() {
        const isV11 = isNewerVersion(game.version, "10.999999");
        if (ui?.compendium?.element) {
            for (const book of ForgeCompendiumBrowser.books) {
                for (const pack of book.packs) {
                    if (isV11) {
                        $(
                            `.directory-item.compendium[data-entry-id="${book.id}.${pack.name}"]`,
                            ui.compendium.element
                        ).addClass("forge-compendium-pack");
                    } else {
                        $(`.compendium-pack[data-pack="${book.id}.${pack.name}"]`, ui.compendium.element).addClass(
                            "forge-compendium-pack"
                        );
                    }
                }
            }
        }
    }

    static async showPermissions(book) {
        const isV10 = isNewerVersion(game.version, "9.999999");

        const permissions = duplicate(game.ForgeCompendiumBrowser.setting("permissions") || {});
        const permission = permissions[book.id] || {};

        const data = {
            defaultLevels: {
                true: i18n("ForgeCompendiumBrowser.Allowed"),
                false: i18n("ForgeCompendiumBrowser.NotAllowed"),
            },
            playerLevels: {
                null: i18n("ForgeCompendiumBrowser.Default"),
                true: i18n("ForgeCompendiumBrowser.Allowed"),
                false: i18n("ForgeCompendiumBrowser.NotAllowed"),
            },
            currentDefault: permission["default"] == undefined || permission["default"] ? "true" : "false",
            users: game.users
                .filter((u) => !u.isGM)
                .map((u) => {
                    return {
                        id: u.id,
                        name: u.name,
                        allowed: permission[u.id] == undefined ? "null" : permission[u.id] ? "true" : "false",
                    };
                }),
        };

        const html = await renderTemplate("./modules/forge-compendium-browser/templates/permissions.html", data);
        Dialog.prompt({
            title: `${i18n("ForgeCompendiumBrowser.ConfigurePermissions")}: ${book.name}`,
            content: html,
            label: i18n("ForgeCompendiumBrowser.SaveChanges"),
            callback: (html) => {
                const form = $("#permission-control", html)[0];
                const fd = new FormDataExtended(form);

                const changes = isV10 ? fd.object : fd.toObject();

                for (const [key, value] of Object.entries(changes)) {
                    permission[key] = value === "null" ? null : value === "true";
                }

                permissions[book.id] = book.permissions = permission;
                game.settings.set("forge-compendium-browser", "permissions", permissions);
            },
            rejectClose: false,
        });
    }

    static compare(a, b) {
        let result = (a.sort ?? 0) - (b.sort ?? 0);
        return result == 0 ? (a.name || "").localeCompare(b.name || "") : result;
    }
}

Hooks.on("init", ForgeCompendiumBrowser.init);
Hooks.on("setup", ForgeCompendiumBrowser.setup);
Hooks.on("ready", ForgeCompendiumBrowser.ready);

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
export let i18n = key => {
    return game.i18n.localize(key);
};
export let setting = key => {
    return game.settings.get("forge-compendium-browser", key);
};

export class ForgeCompendiumBrowser {
    static books = [];
    static debugEnabled = 1;

    static init() {
        registerSettings();

        ForgeCompendiumBrowser.SOCKET = "module.forge-compendium-browser";

        Dlopen.register('forge-compendium-browser-vueport', {
            scripts: foundry.utils.getRoute("/modules/forge-compendium-browser/dist/ForgeCompendiumBrowserVue.umd.min.js"),
            styles: foundry.utils.getRoute("/modules/forge-compendium-browser/dist/ForgeCompendiumBrowserVue.css"),
            dependencies: "vue",
            init: () => Vue.component("ForgeCompendiumBrowser", ForgeCompendiumBrowserVue),
        });

        game.ForgeCompendiumBrowser = ForgeCompendiumBrowser;
    }

    static setup() {
        //compile the DnDBeyond compendiums
        ForgeCompendiumBrowser.parseCompendiums();
    }

    static setting(key) {
        return game.settings.get("forge-compendium-browser", key);
    }

    static ready() {
        game.socket.on(ForgeCompendiumBrowser.SOCKET, ForgeCompendiumBrowser.onMessage);
    }

    static async onMessage(data) {
        switch (data.action) {
            case 'open': {
                if (data.userid == game.user.id || data.userid == undefined) {
                    ForgeCompendiumBrowser.openBrowser(data.book);
                }
            }
        }
    }

    static get version() {
        const module = game.modules.get("forge-compendium-browser");
        return module.version ?? module.data.version;
    }

    static async parseCompendiums() {
        //Find all the DnDBeyond modules
        log("Parsing compendiums");
        for (let module of game.modules.values()) {
            const flags = module.flags ?? module.data.flags;
            if (flags["forge-compendium-browser"]?.active && module.active) {
                let book = {
                    id: module.id,
                    name: module.title ?? module.data.title,
                    description: module.description ?? module.data.description,
                    img: flags["forge-compendium-browser"]?.cover,
                    background: flags["forge-compendium-browser"]?.background,
                    module: module,
                    packs: module.packs ?? module.data.packs,
                    children: [],
                    type: "book",
                };

                let hierarchy = new Hierarchy(book);
                await hierarchy.getHierarchy();

                ForgeCompendiumBrowser.books.push(book);
                log(`Found package:${module.title ?? module.data.title}, hiding ${module.packs.length} associated compendiums`);
            }
        }

        ForgeCompendiumBrowser.clearPacks();
    }

    static async getFileData(src) {
        // Load the referenced translation file
        let err;
        let resp;
        try {
            resp = await fetch(src, {cache: "no-cache"}).catch(e => {
                err = e;
                return null;
            });
        } catch {
            // ignore this error, it should be caught in the next statement
        }
        if (resp.status !== 200) {
            const msg = `Unable to load hierarchy data "${src}"`;
            warn(msg);
            return null;
        }

        // Parse and expand the provided translation object
        let json;
        try {
            json = await resp.json();
            log(`Loaded hierarchy file ${src}`);
            json = foundry.utils.expandObject(json);
        } catch (err) {
            json = null;
        }
        return json;
    }

    static async indexBook(book) {
        const indexPacks = (parent) => {
            if (parent.children && parent.children.length) {
                for (let child of parent.children) {
                    child.parent = parent;
                    child.section = parent.section || (parent.type == "section" && parent.id);

                    if (child.children)
                        indexPacks(child);
                }
            }
        }

        if (!book._indexed) {
            indexPacks(book);
            book._indexed = true;
        }
    }

    static importBook(book, options) {
        ImportBook.importBook(book, options);
    }

    static openBrowser(book) {
        ForgeCompendiumBrowser.browser = new CompendiumBrowserApp(book).render(true);
    }

    static clearPacks() {
        for (let book of ForgeCompendiumBrowser.books) {
            for (let pack of book.packs) {
                $(`.compendium-pack[data-pack="${book.id}.${pack.name}"]`, ui.compendium.element).addClass('forge-compendium-pack');
            }
        }
    }
}

Hooks.on('init', ForgeCompendiumBrowser.init);
Hooks.on('setup', ForgeCompendiumBrowser.setup);
Hooks.on('ready', ForgeCompendiumBrowser.ready);

Hooks.on("renderCompendiumDirectory", (app, html, data) => {
    $('.directory-header', html).append(
        $('<div>')
            .addClass('forge-compendium-actions action-buttons flexrow')
            .append($('<button>')
                .addClass('open-forge-compendium-browser')
                .attr('type', 'button')
                .on("click", ForgeCompendiumBrowser.openBrowser.bind(app, null))
                .html(`<img src="/modules/forge-compendium-browser/img/the-forge-logo-32x32.png" width="16" height="16" style="border: 0px;margin-bottom: -3px;" /> ${i18n("ForgeCompendiumBrowser.OpenCompendiumBrowser")}`)
            )
    );

    ForgeCompendiumBrowser.clearPacks();
});

Hooks.on("setupTileActions", (app) => {
    app.registerTileGroup('forge-compendium-browser', "Forge Compendium Library");
    app.registerTileAction('forge-compendium-browser', 'Forge Compendium Library', {
        name: 'Open Book',
        ctrls: [
            {
                id: "bookid",
                name: "Compendium Book",
                list: () => {
                    let list = {};
                    for (let book of game.ForgeCompendiumBrowser.books) {
                        list[book.id] = book.name;
                    }
                    return list;
                },
                type: "list"
            },
        ],
        group: 'forge-compendium-browser',
        fn: async (args = {}) => {
            const { action, userid } = args;

            if(userid == game.user.id) {
                game.ForgeCompendiumBrowser.openBrowser(action.data.bookid);
            } else {
                game.socket.emit( game.ForgeCompendiumBrowser.SOCKET, { action: "open", userid: userid, bookid: action.data.bookid}, (resp) => { } );
            }
        },
        content: async (trigger, action) => {
            let book = game.ForgeCompendiumBrowser.books.find(b => b.id == action.data.bookid);
            return `<span class="action-style">Open Compendium Book</span> <span class="details-style">"${book.name || 'Unknown'}"</span>`;
        }
    });
});

Hooks.on('renderModuleManagement', (app, html, data) => {
    for (let module of game.modules.values()) {
        const flags = module.flags ?? module.data.flags;
        if (flags["forge-compendium-browser"]?.active) {
               $("<span>")
                .addClass("tag compendium-library")
                .html('<img title="Forge Compendium Browser" src="/modules/forge-compendium-browser/img/the-forge-logo-32x32.png" width="16" height="16" style="border: 0px;margin-bottom: -3px;">')
                .insertAfter($(`.package[data-module-name="${module.id || module.name}"] .package-title,.package[data-module-id="${module.id || module.name}"] .package-title`, html));
        }
    }
});
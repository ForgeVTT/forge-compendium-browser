import { CompendiumBrowserApp } from "./apps/compendium-browser-app.js";
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

    static parseCompendiums() {
        ForgeCompendiumBrowser.hierarchyCache = {};
        //Find all the DnDBeyond modules
        log("Parsing compendiums");
        for (let module of game.modules.values()) {
            const flags = module.flags ?? module.data.flags;
            if (flags["forge-compendium-browser"]?.active && module.active) {
                let bookData = {
                    id: module.id,
                    name: module.title ?? module.data.title,
                    description: module.description ?? module.data.description,
                    img: flags["forge-compendium-browser"]?.cover,
                    background: flags["forge-compendium-browser"]?.background,
                    module: module,
                    packs: module.packs ?? module.data.packs,
                    type: "book",
                };

                this.getHierarchy(bookData);

                ForgeCompendiumBrowser.books.push(bookData);
                log(`Found package:${module.title ?? module.data.title}, hiding ${module.packs.length} associated compendiums`);
            }
        }

        //if (ForgeCompendiumBrowser.books.find(b => !b._cached).length > 0) {
        //Save the books hierarchy to the hierarchyCache
        //}
    }

    static async getHierarchy(book) {
        book._cached = true;
        //check the hierarchy cache
        book.hierarchy = ForgeCompendiumBrowser.hierarchyCache[book.id];

        if (book.hierarchy == undefined) {
            book._cached = false;
            //check for the compendium's hierarchy file
            book.hierarchy = await this.getHierarchyData(`modules/${book.id}/hierarchy.json`);
        }

        if (book.hierarchy && (book.hierarchy.version || "-") != ForgeCompendiumBrowser.version)
            book.hierarchy = null; //The version has changed, so reload the hierarchy

        if (book.hierarchy == undefined) {
            book._cached = false;
            book.hierarchy = this.buildHierarchy(book.packs);

            if (book.hierarchy) {
                let src = "data";
                if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
                    src = "forgevtt";
                }

                FilePicker.upload(src, `modules/${book.id}/`, new File([JSON.stringify(book.hierarchy)], "hierarchy.json"), {}, { notify: false });
            }
        }

        book.children = duplicate(book.hierarchy.children);
    }

    static async getHierarchyData(src) {
        // Load the referenced translation file
        let err;
        const resp = await fetch(src).catch(e => {
            err = e;
            return null;
        });
        if (resp.status !== 200) {
            const msg = `Unable to load hierarchy data ${src}`;
            error(msg);
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

    static buildHierarchy(bookpacks) {
        //if that doesn't exist then this is old and we need to build from packs
        const checkKeys = (item, key) => {
            if (item.name == key)
                return false;
            if (item.parent)
                return checkKeys(item.parent, key);
            else
                return true;
        }

        const processPacks = (parent, section) => {
            let realparent = parent;

            const packs = bookpacks.filter((p) => {
                return p._source.parent == parent.id;
            });
            if (packs.length)
                parent.children = [];
            for (let pack of packs) {
                if (pack._source.parent == null) {
                    realparent = parent.children.find(c => c.id == pack.entity);
                    if (!realparent) {
                        //If the parent id is null, then these technically need to be added to the entity type parent
                        let icon = 'fa-book-open';
                        switch (pack.entity) {
                            case 'Item': icon = 'fa-suitcase'; break;
                            case 'Actor': icon = 'fa-user'; break;
                            case 'Scene': icon = 'fa-map'; break;
                        }
                        realparent = {
                            id: pack.entity,
                            name: CONFIG[pack.entity].collection.name,
                            type: "section",
                            count: 0,
                            icon: icon,
                            children: []
                        };
                        parent.children.push(realparent);
                        section = realparent;
                    }
                }

                if (!checkKeys(realparent, pack.name))
                    continue;

                let childData = {
                    id: pack.name,
                    name: pack.label,
                    pack: pack.name,
                    section: section.id
                }
                if (!realparent.children.find(c => c.id == childData.id)) {
                    realparent.children.push(childData);
                }

                if (section) {
                    let key = `${pack._source.module}.${pack.name}`;
                    let collection = game.packs.get(key);
                    section.count += (collection?.index?.size || 0);
                }

                processPacks(childData, section);
            }
            return parent;
        }

        return processPacks({ version: ForgeCompendiumBrowser.version, children: [] });
    }

    static async indexBook(book, progress) {
        let totalPacks = 0;
        let indexedPacks = 0;

        const indexPacks = async (parent) => {
            for (let child of parent.children) {
                child.parent = parent;

                if (child.children)
                    await indexPacks(child);

                if (child.pack) {
                    //index the compendium
                    child.children = child.children || [];

                    let key = `${book.id}.${child.pack}`;
                    try {
                        let collection = game.packs.get(key);
                        if ( !collection.indexed ) await collection.getIndex();
                        //const documents = await collection.getDocuments();
                        for (let document of collection.index) {
                            indexedPacks++;
                            console.log("document", document);
                            progress(indexedPacks / totalPacks);
                            if (!child.children.find(c => c.id == document.id)) {
                                child.children.push({
                                    id: document._id,
                                    name: document.name,
                                    type: "document",
                                    img: document.img,
                                    sort: (isNewerVersion(game.version, "9.999999") ? document.sort : document.data?.sort),
                                    index: document,
                                    collection: collection,
                                    parent: child
                                });
                            }
                            child.children = child.children.sort((a, b) => {
                                return a.sort - b.sort;
                            });
                        }
                    } catch(err) {
                        warn("Error importing compendium", key, err);
                    }
                }
            }
        }

        if (!book._indexed) {
            totalPacks = 0;
            for (let child of book.children) {
                totalPacks+= child.count;
            }
            indexedPacks = 0;
            await indexPacks(book);
            book._indexed = true;
        }
    }

    static openBrowser(book) {
        ForgeCompendiumBrowser.browser = new CompendiumBrowserApp(book).render(true);
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
                .on("click", ForgeCompendiumBrowser.openBrowser)
                .html(`<img src="/modules/forge-compendium-browser/img/the-forge-logo-32x32.png" width="16" height="16" style="border: 0px;margin-bottom: -3px;" /> ${i18n("ForgeCompendiumBrowser.OpenCompendiumBrowser")}`)
            )
    );

    for (let book of ForgeCompendiumBrowser.books) {
        for (let pack of book.packs) {
            $(`.compendium-pack[data-pack="${book.id}.${pack.name}"]`, html).addClass('forge-compendium-pack');
        }
    }
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

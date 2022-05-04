import { CompendiumBrowserApp } from "./apps/compendium-browser-app.js";
import { registerSettings } from "./settings.js";

export let debug = (...args) => {
    if (debugEnabled > 1) console.log("DEBUG: forge-compendium-browser | ", ...args);
};
export let log = (...args) => console.log("forge-compendium-browser | ", ...args);
export let warn = (...args) => {
    if (debugEnabled > 0) console.warn("forge-compendium-browser | ", ...args);
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

    static init() {
        registerSettings();

        Dlopen.register('forge-compendium-browser-vueport', {
            scripts: "/modules/forge-compendium-browser/dist/ForgeCompendiumBrowserVue.umd.min.js",
            styles: "/modules/forge-compendium-browser/dist/ForgeCompendiumBrowserVue.css",
            dependencies: "vue",
            init: () => Vue.component("ForgeCompendiumBrowser", ForgeCompendiumBrowserVue),
        });

        game.ForgeCompendiumBrowser = ForgeCompendiumBrowser;
    }

    static ready() {
        //compile the DnDBeyond compendiums
        ForgeCompendiumBrowser.parseCompendiums();
    }

    static setting(key) {
        return game.settings.get("forge-compendium-browser", key);
    }

    static i18n(key) {
        return game.i18n.localize(key);
    }

    static get version() {
        return game.modules.get("forge-compendium-browser").data.version;
    }

    static parseCompendiums() {
        ForgeCompendiumBrowser.hierarchyCache = {};
        //Find all the DnDBeyond modules
        log("Parsing compendiums");
        for (let module of game.modules.values()) {
            if (module.data.flags["forge-compendium-browser"]?.active && module.active) {
                let bookData = {
                    id: module.id,
                    name: module.data.title,
                    description: module.data.description,
                    img: module.data.flags["forge-compendium-browser"]?.cover,
                    background: module.data.flags["forge-compendium-browser"]?.background,
                    module: module,
                    packs: module.data.packs,
                    type: "book",
                };

                this.getHierarchy(bookData);

                ForgeCompendiumBrowser.books.push(bookData);
                log(`Found package:${module.data.title}, hiding ${module.packs.length} associated compendiums`);
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
                return p._source.parent == parent.name;
            });
            if (packs.length)
                parent.children = [];
            for (let pack of packs) {
                if (pack._source.parent == null) {
                    //If the parent id is null, then these technically need to be added to the entity type parent
                    let icon = 'fa-book-open';
                    switch (pack.entity) {
                        case 'Item': icon = 'fa-suitcase'; break;
                        case 'Actor': icon = 'fa-user'; break;
                        case 'Scene': icon = 'fa-map'; break;
                    }

                    realparent = parent.children.find(c => c.id == pack.entity);
                    if (!realparent) {
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
                realparent.children.push(childData);

                if (section){
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

    static async indexBook(book) {
        let indexPacks = async (parent) => {
            for (let child of parent.children) {
                child.parent = parent;

                if (child.children)
                    await indexPacks(child);

                if (child.pack) {
                    //index the compendium
                    child.children = child.children || [];

                    let key = `${book.id}.${child.pack}`;
                    let collection = game.packs.get(key);
                    for (let document of await collection.getDocuments()) {
                        child.children.push({
                            id: document.id,
                            name: document.name,
                            type: "document",
                            img: document.data.img,
                            sort: document.data.sort,
                            document: document,
                            collection: collection,
                            parent: child
                        });
                    }
                    child.children = child.children.sort((a, b) => {
                        return a.sort - b.sort;
                    });
                }
            }
        }

        if (!book._indexed) {
            await indexPacks(book);
            book._indexed = true;
        }
    }

    static openBrowser() {
        new CompendiumBrowserApp().render(true);
    }
}

Hooks.on('init', ForgeCompendiumBrowser.init);
Hooks.on('ready', ForgeCompendiumBrowser.ready);

Hooks.on("renderCompendiumDirectory", (app, html, data) => {
    $('.directory-footer', html).append(
        $('<div>')
            .addClass('forge-compendium-actions action-buttons flexrow')
            .append($('<button>')
                .addClass('open-forge-compendium-browser')
                .attr('type', 'button')
                .on("click", ForgeCompendiumBrowser.openBrowser)
                .html('<i class="fas fa-d-and-d-beyond"></i> Open Compendium Browser')
            )
    );

    for (let book of ForgeCompendiumBrowser.books) {
        for (let pack of book.packs) {
            $(`.compendium-pack[data-pack="${pack._source.module}.${pack.name}"]`, html).addClass('forge-compendium-pack');
        }
    }
});

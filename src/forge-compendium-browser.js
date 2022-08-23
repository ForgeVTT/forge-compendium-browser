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
            book.hierarchy = await this.getFileData(`modules/${book.id}/hierarchy.json`);
            console.log("finding hierarchy", book);
        }

        if (book.hierarchy && (book.hierarchy.version || "-") != ForgeCompendiumBrowser.version && book.hierarchy.dynamic != false) {
            console.log("reloading hierarchy", book);
            book.hierarchy = null; //The version has changed, so reload the hierarchy
        }

        if (book.hierarchy == undefined) {
            book._cached = false;

            console.log("building hierarchy", book);

            const moduleData = await this.getFileData(`modules/${book.id}/module.json`);
            if (!moduleData)
                return;

            this.buildHierarchy(moduleData.packs, book).then((hierarchy) => {
                book.hierarchy = hierarchy;

                if (book.hierarchy) {
                    let src = "data";
                    if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
                        src = "forgevtt";
                    }
    
                    FilePicker.upload(src, `modules/${book.id}/`, new File([JSON.stringify(book.hierarchy)], "hierarchy.json"), {}, { notify: false });
                }

                book.children = duplicate(book.hierarchy.children);
            });
        } else {
            book.children = duplicate(book.hierarchy.children);
        }
    }

    static async getFileData(src) {
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

    static async buildHierarchy(bookpacks, book) {
        //if that doesn't exist then this is old and we need to build from packs
        const checkKeys = (item, key) => {
            if (item.name == key)
                return false;
            if (item.parent)
                return checkKeys(item.parent, key);
            else
                return true;
        }

        const createFolder = (data, sort) => {
            let folder = {                 
                id: data.id || data._id || data.name,
                name: data.label || data.name,
                type: "folder",
                children: [],
                sort: data.sort instanceof Array ? sort : (data.sort || sort)
            }
            folderIndex[folder.id] = folder;
            return folder;
        }

        const startsWithNumber = (str) => {
            return /^\d/.test(str);
        }

        const getSection = (type) => {
            let section = hierarchy.children.find(c => c.packtype == type);
            if (!section) {
                let icon = 'fa-book-open';
                switch (type) {
                    case 'Item': icon = 'fa-suitcase'; break;
                    case 'Actor': icon = 'fa-user'; break;
                    case 'Scene': icon = 'fa-map'; break;
                }
                section = {
                    id: type,
                    name: CONFIG[type]?.collection.name || "Unknown",
                    packtype: type,
                    type: "section",
                    count: 0,
                    icon: icon,
                    children: []
                };
                hierarchy.children.push(section);
            }
            return section;
        }

        const getEntityFolder = (document, type) => {
            let folder = folderIndex[document.folder];
            if (!folder) {
                let path = getProperty(document, "flags.ddb.path");
                if (path) {
                    let section = getSection(type);
                    folder = section;
                    for (let part of path) {
                        let parent = folder;
                        folder = parent.children.find(c => c.id == part.id);
                        if (!folder) {
                            folder = createFolder(part);
                            parent.children.push(folder);
                        }
                    }
                }
            }

            return folder;
        }

        const parseFolders = (folders, parent) => {
            for (let folder of folders) {
                let type = folder.type || folder.entity;
                let _parent = parent || getSection(type);
                let child = createFolder(folder);
                _parent.children.push(child);
                parseFolders(parent.children, child);
            }
        }

        const parsePacks = async (packs, parent) => {
            let folderSort = 0;
            for (let pack of packs) {
                let type = pack.type || pack.entity;
                let _parent = parent || getSection(type);
                let folder = _parent;

                if (startsWithNumber(pack.name)) {
                    // If this is the older pack hierarchy, then add this pack as the folder structure
                    folder = _parent.children.find(f => f.id == pack.name);
                    if (!folder) {
                        folder = createFolder(pack, folderSort++);
                        _parent.children.push(folder);
                    }
                }

                // Go through all this pack's entries
                await parseEntries(pack, folder);

                // If this is an older pack hierarchy, then parse all the packs that are child packs
                let children = bookpacks.filter((p) => {
                    return p.parent == pack.id && p.parent != undefined;
                });
                if (children.length) {
                    await parsePacks(children, folder);
                }
            }
        }

        const parseEntries = async (pack, folder) => {
            let key = `${book.id}.${pack.name}`;
            try {
                let type = pack.type || pack.entity;
                let collection = game.packs.get(key);
                
                //if (pack.entity == "Scene") {
                //    await collection.getDocuments();
                //} else if(!collection.indexed) {
                    await collection.getIndex({fields: ["flags", "folder", "img", "thumb"]});
                //}
                
                for (let index of collection.index) {
                    let document = index;
                    let img = document.img;
                    if (pack.entity == "Scene") {
                        //document = await collection.contents.find(c => c.id);
                        try {
                            const thumb = await ImageHelper.createThumbnail(document.thumb, { width: 48, height: 48 });
                            img = thumb?.thumb || thumb || document.thumb;
                        } catch {
                            img = document.img;
                        }
                    }

                    // find the folder according to the entry
                    let _folder = getEntityFolder(document, type) || folder;

                    if (!_folder.children.find(c => c.id == document.id)) {
                        _folder.children.push({
                            id: document._id,
                            name: document.name,
                            type: "document",
                            img: img,
                            sort: (isNewerVersion(game.version, "9.999999") ? document.sort : document.data?.sort),
                            packId: key
                        });
                    }
                }

                let section = hierarchy.children.find(c => c.packtype == type);
                if (section) {
                    section.count += (collection?.index?.size || 0);
                }
            } catch(err) {
                warn("Error importing compendium", key, err);
            }
        }

        // create the base hierarchy
        let hierarchy = { version: ForgeCompendiumBrowser.version, dynamic: true, children: [] };
        let folderIndex = {};

        // check for a folders.json
        let folders = await ForgeCompendiumBrowser.getFileData(`modules/${book.id}/folders.json`);
        if (folders) {
            parseFolders(folders);
        }

        const packs = bookpacks.filter((p) => {
            return p.parent == undefined;
        });
        await parsePacks(packs);

        return hierarchy;
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

    static async importBook(book, options) {
        let { progress } = options;
        let translate = {};
        let folders = [];

        let isV10 = isNewerVersion(game.version, "9.999999");

        let processChildren = async function(parent, type, parentFolder) {
            let documentData = [];
            let folderSort = 100000;
            for (let child of parent.children) {
                if (child.type == "folder") {
                    let folder;
                    if (type == "Actor") {
                        folder = game.folder.find(f => f.folder?.id == parentFolder.id && f.name == child.name);
                    }
                    if (!folder) {
                        let folderData = new Folder({
                            name: child.name,
                            type: type,
                            folder: parentFolder,
                            sorting: "m",
                            sort: child.sort ?? folderSort
                        });
                        folderSort++;
                        folder = await Folder.create(folderData);
                    }
                    folders.push(folder.id);
                    documentData = documentData.concat(await processChildren(child, type, folder));
                } else if( child.type == "document") {
                    let collection = game.packs.get(child.packId);
                    let document = await collection.getDocument(child.id);
                    if (type == "Actor") {
                        const actor = game.actors.find(a => {
                            let a_ddbid = getProperty(a, "flags.forge-compendium-browser.ddbid");
                            let b_ddbid = getProperty(document, "flags.forge-compendium-browser.ddbid");
                            return a.folder?.id == parentFolder.id && ((a_ddbid && b_ddbid && a_ddbid == b_ddbid) || (a.name == document.name));
                        });
                        if (actor)
                            continue;
                    }
                    let data = document.toObject(false);
                    data._id = randomID();
                    data.folder = parentFolder;
                    setProperty(data, "flags.forge-compendium-browser.originalId", `${child.packId}.${document.id}`);

                    if (progress) {
                        progress("increase", { type: type });
                    }

                    documentData.push(data);
                }
            }
            return documentData;
        }

        const documentData = await Promise.all(book.hierarchy.children.map(async (c) => {
            let mainfolder;
            if (c.packtype == "Actor") {
                mainfolder = game.folders.find(f => f.folder == undefined && f.name == "Monsters");
            }
            if (!mainfolder) {
                let folderData = new Folder({
                    name: c.packtype == "Actor" ? "Monsters" : book.name,
                    type: c.packtype,
                    sorting: "m"
                });
                mainfolder = await Folder.create(folderData);
            }
            folders.push(mainfolder.id);
            if (progress)
                progress("reset", { type: c.packtype, max: c.count, message: 'Processing' });
            let data = await processChildren(c, c.packtype, mainfolder);
            return {
                type: c.packtype,
                data: data
            };
        }));

        console.log("Document Data", documentData);

        function timeout(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        let newDocs = await Promise.all(documentData.map(async (document) => {
            if (progress)
                progress("reset", { max: 1, type: document.type, message: 'Creating' });

            let cls = getDocumentClass(document.type);
            let docs = await cls.createDocuments(document.data, { render: false });

            if (progress)
                progress("increase", { type: document.type });

            return { type: document.type, data: docs };
        }));

        const getDocumentProperty = function(document) {
            let type = document.folder?.type || document.parent?.folder?.type;
            switch (type) {
                case "Item": return "system.description.value";
                case "Actor": return "system.details.biography.value";
                case "JournalEntry": return (isV10 ? "text.content" : "content");
            }
        } 

        const getReplaceableValue = function(doc) {
            let type = doc.folder?.type || doc.parent?.folder?.type;
            console.log("Type", type);
            if (type == "JournalEntry" && isV10) {
                return doc.pages.map((page) => { 
                    return getProperty(page, getDocumentProperty(page))
                }).filter(p => !!p);
            } else {
                return [getProperty(doc, getDocumentProperty(doc))]
            }
        }

        for (let doc of newDocs) {
            for (let document of doc.data) {
                let type = document.folder?.type || document.parent?.folder?.type;
                let originalId = getProperty(document, "flags.forge-compendium-browser.originalId");
                if (originalId) {
                    translate[originalId] = {id: document._id, uuid: document.uuid};
                }
                if (document.pages) {
                    for (let page of document.pages) {
                        originalId = getProperty(page, "flags.forge-compendium-browser.originalId");
                        if (originalId) {
                            translate[originalId] = {id: page._id, uuid: page.uuid, type: type};
                        }
                    }
                }
            }
        }
        console.log("Translate", translate);
        
        const updates = await Promise.all(newDocs.map(async (update) => {
            let { type, data } = update;

            if (progress)
                progress("reset", { max: data.length, type: type, message: 'Re-linking' });

            let updates = [];
            for (let document of data) {
                if (progress) {
                    progress("increase", { type: type });
                    await timeout(1);
                }

                let type = document.folder?.type || document.parent?.folder?.type;
                if (type == "JournalEntry" && isV10) {
                    let isChanged = false;
                    for (let page of document.pages) {
                        let repvalue = getProperty(page, "text.content");
                        let original = repvalue;
                        if (repvalue) {
                            for (let [key, id] of Object.entries(translate)) {
                                let value = `@UUID[${id.uuid}]`;
                                repvalue = repvalue.replaceAll(`@Compendium[${key}]`, value); 
                            }
                            if (repvalue != original) {
                                let update = { object: page, "value": repvalue };
                                updates.push(update);
                            }
                        }
                    }
                    if (isChanged) {
                        let update = {_id: document._id, pages: pages};
                        updates.push(update);
                    }
                } else {
                    let repvalue = getProperty(document, getDocumentProperty(document));
                    let original = repvalue;
                    if (repvalue) {
                        for (let [key, id] of Object.entries(translate)) {
                            let value = (isV10 ? `@UUID[${id.uuid}]` : `@${id.type}[${id.id}]`);
                            repvalue = repvalue.replaceAll(`@Compendium[${key}]`, value); 
                        }
                        if (repvalue != original) {
                            let update = {_id: document._id};
                            update[getDocumentProperty(document)] = repvalue;
                            updates.push(update);
                        }
                    }
                }
            }

            update.data = updates;
            return update;
        }));

        console.log("Updates", updates);
        
        await Promise.all(updates.map(async (update) => {
            if (update && update.data.length) {
                if (update.type == "JournalEntry" && isV10) {
                    if (progress)
                        progress("reset", { max: update.data.length, type: update.type, message: 'Updating' });

                    for (let page of update.data) {
                        await page.object.update({"text.content": page.value});

                        if (progress)
                            progress("increase", { type: update.type });
                    }
                } else {
                    if (progress)
                        progress("reset", { max: 1, type: update.type, message: 'Updating' });

                    let cls = getDocumentClass(update.type);
                    await cls.updateDocuments(update.data, { render: false });

                    if (progress)
                        progress("increase", { type: update.type });
                }
            }
        })).then(() => {
            if (progress) {
                progress("finish");
            }
            // refresh the directory listing, for some reason they're not being refreshed.
            for (let dir of ["actors", "cards", "items", "journal", "playlists", "scenes", "tables"]) {
                ui[dir].render();
            }
        });
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

Hooks.on('renderModuleManagement', (app, html, data) => {
    for (let module of game.modules.values()) {
        const flags = module.flags ?? module.data.flags;
        if (flags["forge-compendium-browser"]?.active) {
            console.log((module.id || module.name), $(`.package[data-module-name="${module.id || module.name}"] .package-title,.package[data-module-id="${module.id || module.name}"] .package-title`, html));
            $("<span>")
                .addClass("tag compendium-library")
                .html('<img title="Forge Compendium Browser" src="/modules/forge-compendium-browser/img/the-forge-logo-32x32.png" width="16" height="16" style="border: 0px;margin-bottom: -3px;">')
                .insertAfter($(`.package[data-module-name="${module.id || module.name}"] .package-title,.package[data-module-id="${module.id || module.name}"] .package-title`, html));
        }
    }
});
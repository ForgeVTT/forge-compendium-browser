import { ForgeCompendiumBrowser, log, warn, error, i18n, setting } from "./forge-compendium-browser.js";

export class Hierarchy {
    static folderCache = {};
    static folderSort = {};
    static hierarchy = {};

    static startsWithNumber (str) {
        return /^\d/.test(str);
    }

    static async getHierarchy(book) {
        book._cached = true;
        //check the hierarchy cache
        book.hierarchy = ForgeCompendiumBrowser.hierarchyCache[book.id];

        if (book.hierarchy == undefined) {
            book._cached = false;
            //check for the compendium's hierarchy file
            book.hierarchy = await ForgeCompendiumBrowser.getFileData(`modules/${book.id}/hierarchy.json`);
            console.log("finding hierarchy", book);
        }

        if (book.hierarchy && (book.hierarchy.version || "-") != ForgeCompendiumBrowser.version && book.hierarchy.dynamic != false) {
            console.log("reloading hierarchy", book);
            book.hierarchy = null; //The version has changed, so reload the hierarchy
        }

        if (book.hierarchy == undefined) {
            book._cached = false;

            console.log("building hierarchy", book);

            const moduleData = await ForgeCompendiumBrowser.getFileData(`modules/${book.id}/module.json`);
            if (!moduleData)
                return;

            Hierarchy.build(book, moduleData.packs).then((hierarchy) => {
                book.hierarchy = hierarchy;

                if (book.hierarchy) {
                    let src = "data";
                    if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
                        src = "forgevtt";
                    }
    
                    FilePicker.upload(src, `modules/${book.id}/`, new File([JSON.stringify(book.hierarchy)], "hierarchy.json"), {}, { notify: false });
                }

                book.children = duplicate(book.hierarchy.children);
                ui.notifications.info(`${book.name}, hierarchy has finished building.`);
            });
        } else {
            book.children = duplicate(book.hierarchy.children);
        }
    }

    static async build(book, bookpacks) {
        //if that doesn't exist then this is old and we need to build from packs
        const checkKeys = (item, key) => {
            if (item.name == key)
                return false;
            if (item.parent)
                return checkKeys(item.parent, key);
            else
                return true;
        }

        // create the base hierarchy
        Hierarchy.hierarchy = { version: ForgeCompendiumBrowser.version, dynamic: true, children: [] };
        Hierarchy.folderCache = {};

        // check for a folders.json
        let folders = await ForgeCompendiumBrowser.getFileData(`modules/${book.id}/folders.json`);
        if (folders) {
            if (folder instanceof Array) {
                parseFolders(folders);
            } else {
                Hierarchy.folderSort = folders;
            }
        }

        const packs = bookpacks.filter((p) => {
            return p.parent == undefined;
        });
        await Hierarchy.parsePacks(book, packs, packs, null);

        return Hierarchy.hierarchy;
    }

    static parseFolders (folders, parent) {
        for (let folder of folders) {
            let type = folder.type || folder.entity;
            let _parent = parent || getSection(type);
            let child = createFolder(folder);
            _parent.children.push(child);
            parseFolders(parent.children, child);
        }
    }

    static async parsePacks (book, bookpacks, packs, parent) {
        let sort = 0;
        for (let pack of packs) {
            let type = pack.type || pack.entity;
            let _parent = parent || Hierarchy.getSection(type);
            let folder = _parent;

            if (Hierarchy.startsWithNumber(pack.name)) {
                // If this is the older pack hierarchy, then add this pack as the folder structure
                folder = _parent.children.find(f => f.id == pack.name);
                if (!folder) {
                    let data = { id: pack.name, name: pack.label, sort: pack.sort || sort };
                    folder = Hierarchy.createFolder(data, sort);
                    sort += 1000;
                    _parent.children.push(folder);
                }
            }

            // Go through all this pack's entries
            await Hierarchy.parseEntries(book, pack, folder);

            // If this is an older pack hierarchy, then parse all the packs that are child packs
            let children = bookpacks.filter((p) => {
                return p.parent == pack.id && p.parent != undefined;
            });
            if (children.length) {
                await Hierarchy.parsePacks(book, bookpacks, children, folder);
            }
        }
    }

    static getSection (type) {
        let section = Hierarchy.hierarchy.children.find(c => c.packtype == type);
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
            Hierarchy.hierarchy.children.push(section);
        }
        return section;
    }

    static createFolder (data, sort) {
        let folder = {                 
            id: data.id || data._id,
            name: data.name,
            type: "folder",
            children: [],
            sort: data.sort instanceof Array ? sort[0] : (data.sort || sort)
        }
        Hierarchy.folderCache[folder.id] = folder;
        return folder;
    }

    static getEntityFolder (document, type) {
        let folder = Hierarchy.folderCache[document.folder];
        if (!folder) {
            let path = getProperty(document, "flags.ddb.path");
            if (path) {
                let section = Hierarchy.getSection(type);
                folder = section;
                if (typeof path == "string")
                    path = path.split("\\");
                for (let i = 0; i < path.length; i++) {
                    let part = path[i];
                    if (typeof part == "string"){
                        part = { name: part };
                    }
                    // If the path is the actual entity id, then we've gone too far.
                    if (document._id == part.id)
                        break;
                    let parent = folder;
                    folder = parent.children.find(c => c.id == part.id || (part.id == undefined && c.name == part.name));
                    if (!folder) {
                        let key = path.slice(0, i + 1).join("\\");
                        let sort = Hierarchy.folderSort[key];
                        folder = Hierarchy.createFolder(part, sort);
                        parent.children.push(folder);
                    }
                    // Once we've found the parent folder in the path list, then stop going any further
                    if (document.folder && folder.id == document.folder)
                        break;
                }
            }
        }

        return folder;
    }

    /*
    static parseFolders (folders, parent) {
        for (let folder of folders) {
            let type = folder.type || folder.entity;
            let _parent = parent || Hierarchy.getSection(type);
            let child = Hierarchy.createFolder(folder);
            _parent.children.push(child);
            Hierarchy.parseFolders(parent.children, child);
        }
    }
    */

    static async parseEntries (book, pack, folder) {
        let key = `${book.id}.${pack.name}`;
        try {
            let type = pack.type || pack.entity;
            console.log("Finding compendium", key);
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
                let _folder = Hierarchy.getEntityFolder(document, type) || folder;

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

            let section = Hierarchy.hierarchy.children.find(c => c.packtype == type);
            if (section) {
                section.count += (collection?.index?.size || 0);
            }
        } catch(err) {
            warn("Error importing compendium", key, err);
        }
    }
}
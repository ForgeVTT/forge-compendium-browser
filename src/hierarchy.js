import { ForgeCompendiumBrowser, log, warn, error, i18n, setting } from "./forge-compendium-browser.js";

export class Hierarchy {
    book;

    constructor(book) {
        this.book = book;
    }

    static startsWithNumber (str) {
        return /^\d/.test(str);
    }

    static checkKeys = (item, key) => {
        if (item.name == key)
            return false;
        if (item.parent)
            return Hierarchy.checkKeys(item.parent, key);
        else
            return true;
    }

    async getHierarchy() {
        // Check for the compendium's hierarchy file
        this.book.hierarchy = await ForgeCompendiumBrowser.getFileData(`modules/${this.book.id}/hierarchy.json`);
        console.log("finding hierarchy", this.book);

        // If the Compendium Library version is greater than the current hierarchy, and it's allowed to update, then clear the hierarchy and reload
        if (this.book.hierarchy && (this.book.hierarchy.version || "-") != ForgeCompendiumBrowser.version && this.book.hierarchy.dynamic != false) {
            console.log("reloading hierarchy", this.book);
            this.book.hierarchy = null; //The version has changed, so reload the hierarchy
        }

        if (this.book.hierarchy == undefined) {
            console.log("building hierarchy", this.book);

            const moduleData = await ForgeCompendiumBrowser.getFileData(`modules/${this.book.id}/module.json`);
            if (!moduleData)
                return;

            this.book.hierarchy = await this.build(moduleData.packs)
            

            if (this.book.hierarchy) {
                let src = "data";
                if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
                    src = "forgevtt";
                }

                await FilePicker.upload(src, `modules/${this.book.id}/`, new File([JSON.stringify(this.book.hierarchy)], "hierarchy.json"), {}, { notify: false });
            }

            this.book.children = duplicate(this.book.hierarchy.children);
            ui.notifications.info(`${this.book.name}, hierarchy has finished building.`);

            return this.book.hierarchy;
        } else {
            this.book.children = duplicate(this.book.hierarchy.children);
            return this.book.hierarchy;
        }
    }

    async build(bookpacks) {
        // setup the global variables
        this.hierarchy = {};
        this.folderCache = {};
        this.folderSort = {};
        this.bookpacks = bookpacks;

        // create the base hierarchy
        this.hierarchy = { version: ForgeCompendiumBrowser.version, dynamic: true, children: [] };

        // check for a folders.json
        let folders = await ForgeCompendiumBrowser.getFileData(`modules/${this.book.id}/folders.json`);
        if (folders) {
            if (folders instanceof Array) {
                this.parseFolders(folders);
            } else {
                this.folderSort = folders;
            }
        }

        // find the root packs, and start by parsing them
        const packs = this.bookpacks.filter((p) => {
            return p.parent == undefined;
        });
        await this.parsePacks(packs, null);

        // destroy the global variables
        const hierarchy = this.hierarchy;
        delete this.folderCache;
        delete this.folderSort;
        delete this.hierarchy;

        return hierarchy;
    }

    parseFolders (folders, parent) {
        for (let folder of folders) {
            const type = folder.type || folder.entity;
            let _parent = parent || this.getSection(type);
            let child = this.createHierarchyFolder(folder);
            _parent.children.push(child);
            this.parseFolders(parent.children, child);
        }
    }

    async parsePacks (packs, parent) {
        let sort = 10000;
        for (let pack of packs) {
            const type = pack.type || pack.entity;
            let _parent = parent || this.getSection(type);  // Create the section if the parent doesn't exist
            let folder = _parent;
            const olderPackStructure = Hierarchy.startsWithNumber(pack.name);

            // The old packs started with a number, check if it's the old format
            if (olderPackStructure) {
                // If this is the older pack hierarchy, then add this pack as the folder structure
                folder = _parent.children.find(f => f.id == pack.name);
                if (!folder) {
                    let data = { 
                        id: pack.name, 
                        name: pack.label, 
                        sort: pack.sort || sort 
                    };
                    folder = this.createHierarchyFolder(data, sort);
                    sort += 1000;
                    _parent.children.push(folder);
                }
            }

            // Go through all this pack's entries
            await this.parseEntries(pack, folder);

            if (olderPackStructure) {
                // If this is an older pack hierarchy, then parse all the packs that are child packs
                let children = this.bookpacks.filter((p) => {
                    return p.parent == pack.id && p.parent != undefined;
                });
                if (children.length) {
                    await this.parsePacks(children, folder);
                }
            }
        }
    }

    // Try and find the section, and create it if it doesn't exist
    getSection (type) {
        let section = this.hierarchy.children.find(c => c.packtype == type);
        if (!section) {
            let icon = 'fa-book-open';
            switch (type) {
                case 'Item': icon = 'fa-suitcase'; break;
                case 'Actor': icon = 'fa-user'; break;
                case 'Scene': icon = 'fa-map'; break;
                case 'Cards': icon = 'fa-cards'; break;
                case 'Macro': icon = 'fa-code'; break;
                case 'RollTable': icon = 'fa-th-list'; break;
                case 'Playlist': icon = 'fa-music'; break;
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
            this.hierarchy.children.push(section);
        }
        return section;
    }

    createHierarchyFolder (data, sort) {
        const folder = {                 
            id: data.id || data._id,
            name: data.name,
            type: "folder",
            children: [],
            sort: data.sort instanceof Array ? sort[0] : (data.sort || sort)
        }
        this.folderCache[folder.id] = folder;
        return folder;
    }

    getEntityFolder (document, type) {
        let folder = this.folderCache[document.folder];
        if (!folder) {
            let path = getProperty(document, "flags.forge-compendium-browser.path");
            if (path) {
                const section = this.getSection(type);
                folder = section;
                if (typeof path == "string") {
                    path = path.split("/");
                }
                if (path instanceof Array) {
                    // traverse the path to make sure all folders are present
                    for (let i = 0; i < path.length; i++) {
                        let part = path[i];
                        if (typeof part == "string") {
                            part = { name: part };
                        }
                        // If the path is the actual entity id, then we've gone too far.
                        if (document._id == part.id)
                            break;
                        
                        // see if we can find the folder
                        let parent = folder;
                        const name = decodeURIComponent(part.name);
                        folder = parent.children.find(c => c.id == part.id || (part.id == undefined && c.name == name));
                        if (!folder) {
                            // Get the key to find the sort information
                            const key = path.slice(0, i + 1).map(p => p.name).join("/");
                            const typeData = this.folderSort[type];
                            const folderData = typeData && typeData[key];
                            // create the folder
                            folder = this.createHierarchyFolder({ id: part.id, name: folderData?.label || name }, folderData?.sort);
                            parent.children.push(folder);
                        }
                        // Once we've found the parent folder in the path list, then stop going any further
                        if (document.folder && folder.id == document.folder)
                            break;
                    }
                }
            }
        }

        return folder;
    }

    async parseEntries (pack, folder) {
        const key = `${this.book.id}.${pack.name}`;
        try {
            const type = pack.type || pack.entity;
            let collection = game.packs.get(key);
            
            // Make sure to keep checking in case the data store isn't ready yet.
            let count = 0;
            do {
                try {
                    await collection.getIndex({fields: ["flags", "folder", "img", "thumb"]});
                    //let documents = await collection.getDocuments();
                } catch {
                    count++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } while(!collection.indexed && count < 10)
            
            for (let index of collection.index) {
                let document = index;
                let img = document.img;
                if (pack.entity == "Scene") {
                    //document = await collection.contents.find(c => c.id);
                    try {
                        // If this is a Scene then create a thumbnail to speed up loading the Book
                        const thumb = await ImageHelper.createThumbnail(document.thumb, { width: 48, height: 48 });
                        img = thumb?.thumb || thumb || document.thumb;
                    } catch {
                        img = document.img;
                    }
                }

                // find the folder according to the entry
                let _folder = this.getEntityFolder(document, type) || folder;

                if (!_folder.children.find(c => c.id == document._id)) {
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

            let section = this.hierarchy.children.find(c => c.packtype == type);
            if (section) {
                section.count += (collection?.index?.size || 0);
            }
        } catch(err) {
            warn("Error importing compendium", key, err);
        }
    }
}

import { ForgeCompendiumBrowser } from "./forge-compendium-browser.js";

export class ImportBook{
    static async importBook(book, options) {
        let { progress } = options;
        let translate = {};
        let folders = [];

        let isV10 = isNewerVersion(game.version, "9.999999");

        const documentData = await Promise.all(book.hierarchy.children.map(async (c) => {
            let mainfolder;
            if (c.packtype == "Actor") {
                mainfolder = game.folders.find(f => f.folder == undefined && f.name == "Monsters");
            }
            if (!mainfolder) {
                let folderData = new Folder({
                    name: c.packtype == "Actor" ? "Monsters" : book.name,
                    type: c.packtype,
                    sorting: "a"
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

        await timeout(1);

        const getDocumentProperty = function(document) {
            let type = document.folder?.type || document.parent?.folder?.type;
            switch (type) {
                case "Item": return "system.description.value";
                case "Actor": return "system.details.biography.value";
                case "JournalEntry": return (isV10 ? "text.content" : "content");
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
                progress("reset", { max: data.length, type: type, message: (type == "Scene" ? "Linking tokens" : 'Fixing inline links') });

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
                } else if(type == "Scene") {
                    // Check the scene's journal entry

                    // Go through the tokens and point them to the right actors.
                    let tokens = (document.tokens || document.data.tokens || []);
                    for (let token of tokens) {
                        let tokenName = getProperty(token, "flags.ddbActorFlags.name") || getProperty(token.data, "flags.ddbActorFlags.name") || token.name;
                        if (!tokenName)
                            continue;
                        // Check to see if it's being imported with this adventure.
                        let actor;
                        let actorUpdates = newDocs.find(d => d.type == "Actor");
                        if (actorUpdates) {
                            actor = actorUpdates.data.find(a => a.name == tokenName);
                        }
                        // Check to see if it already exists in the Monsters folder
                        let folderName = `Monsters | ${tokenName[0].toUpperCase()}`;
                        let monsterFolder = game.folders.find(f => f.name == folderName && f.folder?.name == "Monsters");
                        if (!actor && monsterFolder) {
                            actor = game.actors.find(a => {
                                if (a.name != tokenName)
                                    return false;
                                return a.folder?.id == monsterFolder.id;
                            });
                        }
                        // Check to see if it's in the Monsters SRD Compendium
                        if (!actor) {
                            let monsterPack = game.packs.get("dnd5e.monsters");
                            if (monsterPack) {
                                await monsterPack.getIndex();
                                let index = monsterPack.index.find(i => i.name == tokenName);

                                if (index) {
                                    let document = await monsterPack.getDocument(index._id);
                                    let data = document.toObject(false);
                                    if (!monsterFolder) {
                                        let parentFolder = game.folders.find(f => f.name == "Monsters" && f.folder == undefined);
                                        if (!parentFolder) {
                                            let folderData = new Folder({
                                                name: "Monsters",
                                                type: "Actor",
                                                folder: null,
                                                sorting: "m"
                                            });
                                            parentFolder = await Folder.create(folderData);
                                        }
                                        let folderData = new Folder({
                                            name: folderName,
                                            type: "Actor",
                                            folder: parentFolder,
                                            sorting: "m"
                                        });
                                        monsterFolder = await Folder.create(folderData);
                                    }
                                    data.folder = monsterFolder;
                                    let results = await Actor.createDocuments([data]);
                                    actor = results[0];
                                    console.log("Creating a new actor", results, actor, tokenName);
                                }
                            }
                        }

                        if (actor) {
                            let tokenUpdate = { actorId: actor.id };
                            if ((!token.texture?.src || token.texture?.src == "icons/svg/mystery-man.svg") && actor?.prototypeToken?.texture?.src)
                                tokenUpdate.texture = { src: actor?.prototypeToken?.texture?.src };
                            await token.update(tokenUpdate);
                        }
                    }
                    // Go through notes and point them to the right Journal Entry
                    for (let note of (document.notes || document.data.notes || [])) {
                        console.log("Note", note);
                        //note.entryId
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

    static async processChildren(parent, type, parentFolder) {
        let documentData = [];
        let folderSort = 100000;
        for (let child of parent.children) {
            if (child.type == "folder") {
                let folder;
                if (type == "Actor") {
                    folder = game.folders.find(f => f.folder?.id == parentFolder.id && f.name == child.name);
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
                let key = `${child.packId}.${document.id}`;
                if (type == "Actor") {
                    const actor = game.actors.find(a => {
                        let a_ddbid = getProperty(a, "flags.forge-compendium-browser.ddbid");
                        let b_ddbid = getProperty(document, "flags.forge-compendium-browser.ddbid");
                        return a.folder?.id == parentFolder.id && ((a_ddbid && b_ddbid && a_ddbid == b_ddbid) || (a.name == document.name));
                    });
                    if (actor) {
                        translate[key] = { id: actor.id, uuid: actor.uuid };
                        continue;
                    }
                } else if (type == "Scene") {
                    for (let note of (document.notes || document.data.notes || [])) {
                        console.log("Check Note", note);
                        //note.entryId
                    }
                }
                let data = document.toObject(false);
                data._id = randomID();
                data.folder = parentFolder;
                setProperty(data, "flags.forge-compendium-browser.originalId", key);

                if (progress) {
                    progress("increase", { type: type });
                }

                documentData.push(data);
            }
        }
        return documentData;
    }
}
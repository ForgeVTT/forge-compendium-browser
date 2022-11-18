import { ForgeCompendiumBrowser } from "./forge-compendium-browser.js";

export class ImportBook{
    static async importBook(book, options) {
        let { progress } = options;
        ImportBook.translate = {};

        let isV10 = isNewerVersion(game.version, "9.999999");

        const documentData = {};
        for (let c of book.hierarchy.children) {
            let mainfolder;
            if (c.packtype == "Actor") {
                mainfolder = game.folders.find(f => f.folder == undefined && f.name == "Monsters");
            }
            if (!mainfolder) {
                let folderData = {
                    name: c.packtype == "Actor" ? "Monsters" : book.name,
                    type: c.packtype,
                    sorting: c.packtype == "Actor" ? "a" : "m"
                };
                folderData[isV10 ? "folder" : "parent"] = null;
                mainfolder = await Folder.create(folderData);
            }
            console.log("Processing", { type: c.packtype, max: c.count, message: `Processing ${c.packtype}` });
            if (progress)
                progress("reset", { type: c.packtype, max: c.count, message: `Processing ${c.packtype}` });
            let data = await ImportBook.processChildren(c, c.packtype, mainfolder, progress);

            documentData[c.packtype] = data;
        }

        if (isV10) { 
            // v10 lets us set the document id when creating, so we can update all the related ids before saving.
            ImportBook.updateDocumentKeys(documentData, progress);
        }

        let newDocs = {};
        for (let [type, documents] of Object.entries(documentData)){
            if (progress)
                progress("reset", { max: 1, type, message: `Creating ${type}` });

            let cls = getDocumentClass(type);
            let docs = await cls.createDocuments(documents, { render: false, keepId: true });

            if (progress)
                progress("increase", { type: type });

            newDocs[type] = docs;
        }

        if (!isV10) {
            // v9 doesn't allow us to create documents with specific IDs, therefore we have to go through after creation to collect the new IDs and replace the IDs witht he old ones.
            let docUpdates = ImportBook.updateDocumentKeys(newDocs, progress);

            //  Update the document changes with the inline link keys
            for (let [type, data] of Object.entries(docUpdates)) {
                if (data && data.length) {
                    if (type == "JournalEntry" && isV10) {
                        if (progress)
                            progress("reset", { max: data.length, type, message: `Updating ${type}` });

                        for (let page of data) {
                            await page.object.update({"text.content": page.value});

                            if (progress)
                                progress("increase", { type });
                        }
                    } else {
                        if (progress)
                            progress("reset", { max: 1, type, message: `Updating ${type}` });

                        let cls = getDocumentClass(type);
                        await cls.updateDocuments(data, { render: false });

                        if (progress)
                            progress("increase", { type });
                    }
                }
            }
        }

        if (progress) {
            progress("finish");
        }
        // refresh the directory listing, for some reason they're not being refreshed.
        for (let dir of ["actors", "cards", "items", "journal", "playlists", "scenes", "tables"]) {
            ui[dir].render();
        }
    }

    static getDocumentProperty(document) {
        let isV10 = isNewerVersion(game.version, "9.999999");
        let type = document.folder?.type || document.parent?.folder?.type;
        switch (type) {
            case "Item": return "system.description.value";
            case "Actor": return "system.details.biography.value";
            case "JournalEntry": return (isV10 ? "text.content" : "content");
        }
    } 

    static async updateDocumentKeys(newDocs, progress) {
        let isV10 = isNewerVersion(game.version, "9.999999");
        if (!isV10) {
            // Collect the original ID since v9 didn't create documents with a provided ID
            for (let doc of newDocs) {
                for (let document of doc.data) {
                    let type = document.folder?.type || document.parent?.folder?.type;
                    let originalId = getProperty(document, "flags.forge-compendium-browser.originalId");
                    if (originalId) {
                        ImportBook.translate[originalId] = { id: document._id, uuid: document.uuid };
                    }
                    if (document.pages) {
                        for (let page of document.pages) {
                            originalId = getProperty(page, "flags.forge-compendium-browser.originalId");
                            if (originalId) {
                                ImportBook.translate[originalId] = { id: page._id, uuid: page.uuid, type: type };
                            }
                        }
                    }
                }
            }
        }

        console.log("translations", ImportBook.translate);
        // Go through the documents and see if there are any inline links that need replacing
        let docUpdates = {};
        for (let [type, data] of Object.entries(newDocs)) {
            if (progress)
                progress("reset", { max: data.length, type, message: (type == "Scene" ? "Linking tokens in scenes" : `Fixing inline links in ${type}`) });

            let updates = [];
            for (let document of data) {
                if (progress) {
                    progress("increase", { type });
                }

                let type = document.folder?.type || document.parent?.folder?.type;
                if (type == "JournalEntry" && isV10) {
                    let isChanged = false;
                    for (let page of document.pages) {
                        let repvalue = getProperty(page, "text.content");
                        let original = repvalue;
                        if (repvalue) {
                            for (let [key, id] of Object.entries(ImportBook.translate)) {
                                let value = `@UUID[${id.uuid}]`;
                                repvalue = repvalue.replaceAll(`@Compendium[${key}]`, value); 
                            }
                            if (repvalue != original) {
                                isChanged = true;
                                if (isV10)
                                    setProperty(page, "text.content", repvalue);
                                else
                                    updates.push({ object: page, "value": repvalue });
                            }
                        }
                    }
                    if (isChanged && !isV10) {
                        let update = { _id: document._id, pages: pages };
                        updates.push(update);
                    }
                } else if (type == "Scene") {
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
                                            let folderData = {
                                                name: "Monsters",
                                                type: "Actor",
                                                sorting: "m"
                                            };
                                            folderData[isV10 ? "folder" : "parent"] = null;
                                            parentFolder = await Folder.create(folderData);
                                        }
                                        let folderData = {
                                            name: folderName,
                                            type: "Actor",
                                            sorting: "m"
                                        };
                                        folderData[isV10 ? "folder" : "parent"] = parentFolder;
                                        monsterFolder = await Folder.create(folderData);
                                    }
                                    data.folder = monsterFolder;
                                    let results = await Actor.createDocuments([data]);
                                    actor = results[0];
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
                    let prop = ImportBook.getDocumentProperty(document)
                    let repvalue = getProperty(document, prop);
                    let original = repvalue;
                    if (repvalue) {
                        for (let [key, id] of Object.entries(ImportBook.translate)) {
                            let value = (isV10 ? `@UUID[${id.uuid}]` : `@${id.type}[${id.id}]`);
                            repvalue = repvalue.replaceAll(`@Compendium[${key}]`, value); 
                        }
                        if (repvalue != original) {
                            if (isV10)
                                setProperty(document, prop, repvalue);
                            else {
                                let update = { _id: document._id };
                                update[prop] = repvalue;
                                updates.push(update);
                            }
                        }
                    }
                }
            }

            docUpdates[type] = updates;
        }

        return docUpdates;
    }

    static async processChildren(parent, type, parentFolder, progress) {
        let documentData = [];
        let folderSort = 100000;
        let isV10 = isNewerVersion(game.version, "9.999999");

        for (let child of parent.children) {
            if (child.type == "folder") {
                let folder;
                if (type == "Actor") {
                    folder = game.folders.find(f => f.folder?.id == parentFolder.id && f.name == child.name);
                }
                if (!folder) {
                    let folderData = {
                        name: child.name,
                        type: type,
                        sorting: "m",
                        sort: child.sort ?? folderSort
                    };
                    folderData[isV10 ? "folder" : "parent"] = parentFolder;

                    folderSort++;
                    folder = await Folder.create(folderData);
                }
                documentData = documentData.concat(await ImportBook.processChildren(child, type, folder, progress));
            } else if (child.type == "document") {
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
                        ImportBook.translate[key] = { id: actor.id, uuid: actor.uuid };
                        continue;
                    }
                } else if (type == "Scene") {
                    for (let note of (document.notes || document.data.notes || [])) {
                        console.log("Check Note", note);
                        //note.entryId
                    }
                }
                let data = document.toObject(false);
                data.folder = parentFolder;
                if (data.name == "")
                    console.log("Here");

                data._id = randomID();
                if (!isV10) {
                    setProperty(data, "flags.forge-compendium-browser.originalId", key);
                } else {
                    ImportBook.translate[key] = { id: data._id, uuid: `${document.documentName}.${data._id}` };
                }

                if (progress) {
                    progress("increase", { type: type });
                }

                documentData.push(data);
            }
        }
        return documentData;
    }
}
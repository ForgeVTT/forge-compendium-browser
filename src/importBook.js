import { error } from "./forge-compendium-browser.js";

export class ImportBook{
    static async importBook(book, options) {
        let { progress } = options;
        ImportBook.translate = [];

        const isV10 = isNewerVersion(game.version, "9.999999");

        try {
            const documentData = {};
            for (const c of book.hierarchy.children) {
                let mainfolder;
                if (c.packtype === "Actor") {
                    mainfolder = game.folders.find(f => f[isV10 ? "folder" : "parentFolder"] == undefined && f.name === "Monsters");
                }
                if (!mainfolder) {
                    const folderData = {
                        name: c.packtype === "Actor" ? "Monsters" : book.name,
                        type: c.packtype,
                        sorting: c.packtype === "Actor" ? "a" : "m"
                    };
                    folderData[isV10 ? "folder" : "parent"] = null;
                    mainfolder = await Folder.create(folderData);
                }
                if (progress) {
                    progress("reset", { type: c.packtype, max: c.count, message: `Processing ${c.packtype}` });
                }
                const data = await ImportBook.processChildren(c, c.packtype, mainfolder, progress);

                documentData[c.packtype] = data;
            }

            if (isV10) { 
                // v10 lets us set the document id when creating, so we can update all the related ids before saving.
                await ImportBook.updateDocumentKeys(documentData, progress);
            }

            const newDocs = {};
            for (const [type, documents] of Object.entries(documentData)){
                if (progress) {
                    progress("reset", { max: 1, type, message: `Creating ${type}` });
                }

                const cls = getDocumentClass(type);
                const docs = await cls.createDocuments(documents, { render: false, keepId: true });

                if (progress) {
                    progress("increase", { type: type });
                }

                newDocs[type] = docs;
            }

            if (!isV10) {
                // v9 doesn't allow us to create documents with specific IDs, therefore we have to go through after creation to collect the new IDs and replace the IDs witht he old ones.
                const docUpdates = await ImportBook.updateDocumentKeys(newDocs, progress);

                //  Update the document changes with the inline link keys
                for (const [type, data] of Object.entries(docUpdates)) {
                    if (data && data.length) {
                        if (type === "JournalEntry" && isV10) {
                            if (progress)
                                progress("reset", { max: data.length, type, message: `Updating ${type}` });

                            for (const page of data) {
                                await page.object.update({"text.content": page.value});

                                if (progress)
                                    progress("increase", { type });
                            }
                        } else {
                            if (progress) {
                                progress("reset", { max: 1, type, message: `Updating ${type}` });
                            }

                            const cls = getDocumentClass(type);
                            await cls.updateDocuments(data, { render: false });

                            if (progress) {
                                progress("increase", { type });
                            }
                        }
                    }
                }
            }

            if (progress) {
                progress("finish");
            }
            // refresh the directory listing, for some reason they're not being refreshed.
            for (const dir of ["actors", "cards", "items", "journal", "playlists", "scenes", "tables"]) {
                ui[dir].render();
            }
        } catch (err) {
            error(err);
            progress("finish", { message: "Unknown Error Encountered" });
        }
    }

    static getDocumentProperty(document) {
        const isV10 = isNewerVersion(game.version, "9.999999");
        const type = document.folder?.type || document.parent?.folder?.type;
        switch (type) {
            case "Item": return "system.description.value";
            case "Actor": return "system.details.biography.value";
            case "JournalEntry": return (isV10 ? "text.content" : "content");
        }
    } 

    static async updateDocumentKeys(newDocs, progress) {
        const isV10 = isNewerVersion(game.version, "9.999999");
        if (!isV10) {
            // Collect the original ID since v9 didn't create documents with a provided ID
            for (const [type, documents] of Object.entries(newDocs)) {
                for (const document of documents) {
                    const docType = document.folder?.type || document.parent?.folder?.type || type;
                    let originalData = getProperty(document, "data.flags.forge-compendium-browser.originalData");
                    if (originalData) {
                        ImportBook.translate.push({ original: originalData.id, key: originalData.key, id: document.id, uuid: document.uuid, type: docType });
                    }
                }
            }
        }

        // Store the Actor data in case we're importing a Scene
        const actorUpdates = newDocs["Actor"];

        // Go through the documents and see if there are any inline links that need replacing
        const docUpdates = {};
        for (const [type, data] of Object.entries(newDocs)) {
            if (progress) {
                progress("reset", { max: data.length, type, message: (type === "Scene" ? "Linking tokens in scenes" : `Fixing inline links in ${type}`) });
            }

            const updates = [];
            for (const document of data) {
                if (progress) {
                    progress("increase", { type });
                }

                const type = document.folder?.type || document.parent?.folder?.type;
                if (type === "JournalEntry") {
                    if (isV10) {
                        for (const page of document.pages) {
                            let repvalue = getProperty(page, "text.content");
                            const original = repvalue;
                            if (repvalue) {
                                for (const translate of ImportBook.translate) {
                                    repvalue = repvalue.replaceAll(`@Compendium[${translate.key}]`, `@UUID[${translate.uuid}]`); 
                                }

                                // Remove the links to the same document
                                repvalue = repvalue.replaceAll(`@UUID[JournalEntry.${document._id}]{${document.name}}`, ''); 

                                // Clean any ddbeyond links
                                repvalue = ImportBook.cleanText(document._id, document.name, repvalue);

                                if (repvalue !== original) {
                                    setProperty(page, "text.content", repvalue);
                                }
                            }
                        }
                    } else {
                        let repvalue = getProperty(document, "data.content");
                        const original = repvalue;
                        if (repvalue) {
                            for (const translate of ImportBook.translate) {
                                repvalue = repvalue.replaceAll(`@Compendium[${translate.key}]`, `@JournalEntry[${translate.id}]`); 
                            }
                            // Remove the links to the same document
                            repvalue = repvalue.replaceAll(`@JournalEntry[${document.id}]{${document.name}}`, ''); 

                            // Clean any ddbeyond links
                            repvalue = ImportBook.cleanText(document.id, document.name, repvalue);

                            if (repvalue !== original) {
                                updates.push({ _id: document.id, content: repvalue });
                            }
                        }
                    }
                } else if (type === "Scene") {
                    // Check the scene's journal entry
                    if (document.journal) {
                        document.journal = ImportBook.translate.find(t => t.original == document.journal);
                    }

                    // Go through the tokens and point them to the right actors.
                    const tokens = (document.tokens || document.data.tokens || []);
                    for (const token of tokens) {
                        const tokenName = getProperty(token, "flags.ddbActorFlags.name") || getProperty(token.data, "flags.ddbActorFlags.name") || token.name;
                        if (!tokenName)
                            continue;
                        // Check to see if it's being imported with this adventure.
                        let actor;
                        if (actorUpdates) {
                            actor = actorUpdates.find(a => a.name === tokenName);
                        }

                        // Check to see if it already exists in the Monsters folder
                        // Save the monsterFolder for later in case we need to pull from the monster compendium
                        const folderName = `Monsters | ${tokenName[0].toUpperCase()}`;
                        let monsterFolder = game.folders.find(f => f.name === folderName && f[isV10 ? "folder" : "parentFolder"]?.name === "Monsters");
                        if (!actor && monsterFolder) {
                            actor = game.actors.find(a => {
                                if (a.name !== tokenName)
                                    return false;
                                return a.folder?.id === monsterFolder.id;
                            });
                        }
                        // Check to see if it's in the Monsters SRD Compendium
                        if (!actor) {
                            const monsterPack = game.packs.get("dnd5e.monsters");
                            if (monsterPack) {
                                await monsterPack.getIndex();
                                const index = monsterPack.index.find(i => i.name === tokenName);

                                if (index) {
                                    const document = await monsterPack.getDocument(index._id);
                                    const data = document.toObject(false);
                                    if (!monsterFolder) {
                                        let parentFolder = game.folders.find(f => f.name === "Monsters" && f[isV10 ? "folder" : "parentFolder"] == undefined);
                                        if (!parentFolder) {
                                            const parentFolderData = {
                                                name: "Monsters",
                                                type: "Actor",
                                                sorting: "a"
                                            };
                                            parentFolderData[isV10 ? "folder" : "parent"] = null;
                                            parentFolder = await Folder.create(parentFolderData);
                                        }
                                        const folderData = {
                                            name: folderName,
                                            type: "Actor",
                                            sorting: "a"
                                        };
                                        folderData[isV10 ? "folder" : "parent"] = parentFolder;
                                        monsterFolder = await Folder.create(folderData);
                                    }
                                    data.folder = monsterFolder;
                                    const results = await Actor.createDocuments([data]);
                                    actor = results[0];
                                }
                            }
                        }

                        if (actor) {
                            if (isV10) {
                                token.actorId = actor._id;
                                if ((!token.texture?.src || token.texture?.src === "icons/svg/mystery-man.svg") && actor?.prototypeToken?.texture?.src)
                                    token.texture.src = actor?.prototypeToken?.texture?.src;
                            } else {
                                const tokenUpdate = { actorId: actor.id };
                                if ((!token.data.img || token.data.img === "icons/svg/mystery-man.svg") && actor?.data?.token?.img)
                                    tokenUpdate.img = actor?.data?.token?.img;

                                await token.update(tokenUpdate);
                            }
                        }
                    }
                    // Go through notes and point them to the right Journal Entry
                    for (const note of (document.notes || document.data.notes || [])) {
                        let entryId = isV10 ? note.entryId : note.data.entryId;
                        let translate = ImportBook.translate.find(t => t.original == entryId);

                        if (translate) {
                            if (isV10) {
                                note.entryId = translate.id;
                            } else {
                                await note.update({ entryId: translate.id })
                            }
                        }
                    }
                } else {
                    const prop = ImportBook.getDocumentProperty(document)
                    let repvalue = getProperty(document, prop);
                    const original = repvalue;
                    if (repvalue) {
                        for (const translate of ImportBook.translate) {
                            const value = (isV10 ? `@UUID[${translate.uuid}]` : `@${translate.type}[${translate.id}]`);
                            repvalue = repvalue.replaceAll(`@Compendium[${translate.key}]`, value); 
                        }
                        if (repvalue !== original) {
                            if (isV10)
                                setProperty(document, prop, repvalue);
                            else {
                                const update = { _id: document._id };
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
        let maxDepthSort = 1;
        const isV10 = isNewerVersion(game.version, "9.999999");

        for (const child of parent.children) {
            if (child.type === "folder") {
                let folder;
                if (type === "Actor") {
                    folder = game.folders.find(f => f[isV10 ? "folder" : "parentFolder"]?.id === parentFolder.id && f.name === child.name);
                }
                if (!folder) {
                    const folderData = {
                        name: child.name,
                        type: type,
                        sorting: type === "Actor" ? "a" : "m",
                        sort: child.sort ?? folderSort
                    };
                    folderData[isV10 ? "folder" : "parent"] = parentFolder;

                    if (parentFolder.depth >= (CONST.FOLDER_MAX_DEPTH || 3)) {
                        folderData.name = `${parentFolder.name}, ${child.name}`;
                        folderData.sort = getProperty(parentFolder, isV10 ? "sort" : "data.sort") + maxDepthSort;
                        folderData[isV10 ? "folder" : "parent"] = parentFolder[isV10 ? "folder" : "parentFolder"];
                        maxDepthSort++;
                    }

                    folderSort += 1000;
                    folder = await Folder.create(folderData);
                }
                documentData = documentData.concat(await ImportBook.processChildren(child, type, folder, progress));
            } else if (child.type === "document") {
                const collection = game.packs.get(child.packId);
                if (!collection.contents.length) {
                    await collection.getDocuments();
                }
                const document = collection.get(child.id);
                if (!document)
                    continue;

                const key = `${child.packId}.${document.id}`;
                if (type === "Actor") {
                    const actor = game.actors.find(a => {
                        const a_ddbid = getProperty(a, "flags.forge-compendium-browser.ddbid");
                        const b_ddbid = getProperty(document, "flags.forge-compendium-browser.ddbid");
                        return a.folder?.id === parentFolder.id && ((a_ddbid && b_ddbid && a_ddbid === b_ddbid) || (a.name === document.name));
                    });
                    if (actor) {
                        ImportBook.translate.push({ original: document.id, key: key, id: actor.id, uuid: actor.uuid, type });
                        continue;
                    }
                } else if (type === "Scene") {
                    for (const note of (document.notes || document.data.notes || [])) {
                        // TODO import the note properly
                    }
                }
                const data = document.toObject(false);
                data.folder = parentFolder;

                data._id = randomID();
                if (!isV10) {
                    setProperty(data, "flags.forge-compendium-browser.originalData", { id: document.id, key });
                } else {
                    ImportBook.translate.push({ original: document.id, key: key, id: data._id, uuid: `${document.documentName}.${data._id}`, type });
                }

                if (progress) {
                    progress("increase", { type: type });
                }

                documentData.push(data);
            }
        }
        return documentData;
    }

    static cleanText(id, name, text) {
        let html = $(`<div>${text}</div>`);

        // Try and fix any ddb links
        $('a[href^="ddb://"]', html).each((idx, link) => {
            const linkHtml = $(link).html() || "";
            let href = $(link).attr('href');
            if (href.startsWith("ddb://compendium")) {
                try {
                    const bookid = href.replace("ddb://compendium/", "").split("/")[0];

                    $(link).addClass("content-link").removeAttr("href").attr("data-pack", `dndbeyond-${bookid}`);
                } catch { 
                // don't bother with the catch
                }
            } else {
                if (href.startsWith("ddb://spells"))
                    href = "https://www.dndbeyond.com/spells/"+ linkHtml.replaceAll(" ", "-");
                else {
                    href = href
                        .replace("ddb://", "https://www.dndbeyond.com/")
                        .replace("magicitems", "magic-items") + "-" + linkHtml.replaceAll(" ", "-");
                }
                $(link).attr('href', href).attr("target", "_blank");
            }
        });
        return html.html();
    }
}
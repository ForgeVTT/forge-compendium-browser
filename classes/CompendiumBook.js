import { ForgeCompendiumBrowser, log, error, setting, i18n } from '../forge-compendium-browser.js';

export class CompendiumBook {
    constructor(data) {
        this.data = data;
        this.getHierarchy();
    }

    get id() {
        return this.data.module.id;
    }

    get name() {
        return this.data.title;
    }

    get img() {
        return this.data.img;
    }

    get type() {
        return "book";
    }

    async getHierarchy() {
        this._cached = true;
        //check the hierarchy cache
        this.hierarchy = ForgeCompendiumBrowser.hierarchyCache[this.id];

        if (this.hierarchy && this.hierarchy.version != ForgeCompendiumBrowser.version)
            this.hierarchy = null; //The version has changed, so reload the hierarchy

        if (this.hierarchy == undefined) {
            this._cached = false;
            //check for the compendium's hierarchy file
            this.hierarchy = await this.getHierarchyData(`modules/${this.id}/hierarchy.json`);
        }

        if (this.hierarchy && (this.hierarchy.version || "-") != ForgeCompendiumBrowser.version)
            this.hierarchy = null; //The version has changed, so reload the hierarchy

        if (this.hierarchy == undefined) {
            this._cached = false;
            this.hierarchy = this.buildHierarchy();

            let src = "data";
            if (typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
                src = "forgevtt";
            }

            FilePicker.upload(src, `modules/${this.id}/`, new File([JSON.stringify(this.hierarchy)], "hierarchy.json"), {}, { notify: false });
        }

        this.children = duplicate(this.hierarchy.children);
    }

    async getHierarchyData(src) {
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

    buildHierarchy() {
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

            const packs = this.data.packs.filter((p) => {
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
                            type: "category",
                            count: 0,
                            icon: icon,
                            children: []
                        };
                        parent.children.push(realparent);
                        section = pack.entity;
                    }
                }

                if (!checkKeys(realparent, pack.name))
                    continue;

                let childData = {
                    id: pack.name,
                    name: pack.label,
                    pack: pack.name,
                    section: section
                }
                realparent.children.push(childData);

                processPacks(childData, section);
            }
            return parent;
        }

        return processPacks({ version: ForgeCompendiumBrowser.version, children: [] });
    }

    async index() {
        let indexPacks = async (parent) => {
            for (let child of parent.children) {
                child.parent = parent;

                if (child.children)
                    await indexPacks(child);

                if (child.pack) {
                    //index the compendium
                    child.children = child.children || [];

                    let key = `${this.id}.${child.pack}`;
                    let collection = game.packs.get(key);
                    for (let document of await collection.getDocuments()) {
                        child.children.push({
                            id: document.id,
                            name: document.name,
                            type: "document",
                            img: document.data.img,
                            sort: document.data.sort,
                            document: document,
                            collection: collection
                        });
                    }
                    child.children = child.children.sort((a, b) => {
                        return a.sort - b.sort;
                    });
                }
            }
        }

        if (!this._indexed) {
            await indexPacks(this);
            this._indexed = true;
        }
    }
}
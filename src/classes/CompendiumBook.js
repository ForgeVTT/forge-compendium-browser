import { ForgeCompendiumBrowser, log, error, setting, i18n } from '../browser.js';

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

        const processPacks = (parent) => {
            let realparent = parent;

            const packs = this.data.packs.filter((p) => {
                return p._source.parent == parent.name;
            });
            if (packs.length)
                parent.children = [];
            for (let pack of packs) {
                if (pack._source.parent == null) {
                    //If the parent id is null, then these technically need to be added to the entity type parent
                    let icon = '<i class="fas fa-book-open"></i>';
                    switch (pack.entity) {
                        case 'Item': icon = '<i class="fas fa-suitcase"></i>'; break;
                        case 'Actor': icon = '<i class="fas fa-user"></i>'; break;
                        case 'Scene': icon = '<i class="fas fa-map"></i>'; break;
                    }

                    realparent = parent.children.find(c => c.id == pack.entity);
                    if (!realparent) {
                        realparent = {
                            id: pack.entity,
                            name: CONFIG[pack.entity].collection.name,
                            type: "category",
                            icon: icon,
                            children: []
                        };
                        parent.children.push(realparent);
                    }
                }

                if (!checkKeys(realparent, pack.name))
                    continue;

                let childData = {
                    id: pack.name,
                    name: pack.label,
                    pack: pack.name
                }
                realparent.children.push(childData);

                processPacks(childData);
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
                    indexPacks(child);

                if (child.pack) {
                    //index the compendium
                    child.children = [];

                    let key = `${this.id}.${child.pack}`;
                    let collection = game.packs.get(key);
                    if (!collection.indexed) await collection.getIndex();
                    for (let index of collection.index) {
                        child.children.push({
                            id: index._id,
                            name: index.name,
                            type: "document",
                            img: index.img,
                            entry: index,
                            collection: collection
                        });
                    }
                }
            }
        }

        if (!this._indexed) {
            indexPacks(this);
            this._indexed = true;
        }
    }
}
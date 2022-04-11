import { ForgeCompendiumBrowser, log, setting, i18n } from '../main.js';

export class CompendiumBrowser extends Application {
    constructor(object, options = {}) {
        super(object, options);
        if (this.listing == undefined) {
            this.openItem(null);
        }
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "compendium-browser",
            template: "./modules/compendium-browser/templates/browser.html",
            title: "Compendium Browser",
            classes: ["compendium-browser"],
            popOut: true,
            resizable: true,
            width: 800,
            height: 500,
            scrollY: ["ol.directory-list"],
        });
    }

    getData(options) {
        let data = super.getData(options);

        data.listing = this.listing;
        data.tree = this.book?.hierarchy;
            /*this.path.map(item => {
            return {
                id: item.id,
                parent: item.parent?.id,
                name: item.name,
                img: item.img,
                type: item.type
            }
        });*/

        data.book = this.book;

        log("Data", data);

        return data;
    }


    activateListeners(html) {
        super.activateListeners(html);

        $('.forge-compendium-item', html).on('click', this.clickItem.bind(this));
        $('.forge-compendium-sidebar .compendium-library', html).on('click', this.home.bind(this));
        $('.forge-compendium-sidebar .directory-header img', html).on('click', this.openItem.bind(this, this.book));

        html.find('.collapse-all').click(this.collapseAll.bind(this));

        const directory = html.find(".directory-list");
        directory.on("click", ".folder-header", this._toggleFolder.bind(this));
    }

    collapseAll() {
        this.element.find('li.folder').addClass("collapsed");

        let collapseFolder = function (folder) {
            for (let f of folder.children) {
                f.expanded = false;
                collapseFolder(f);
            }
        }
        collapseFolder(this.book.hierarchy);
        
        this.setPosition();
    }

    _toggleFolder(event) {
        let folder = $(event.currentTarget.parentElement);
        let collapsed = folder.hasClass("collapsed");

        if ($('.subdirectory', folder).length == 0)
            collapsed = false;

        // find the item in question
        let parents = $(folder).parents('.directory-item.folder');
        let item = this.book;
        for (let p of parents) {
            if (item)
                item = item.children.find(i => i.id == p.dataset.id);
        }
        if (item)
            item.expanded = !collapsed

        if ($('.subdirectory', folder).length == 0) {
            folder.removeClass("collapsed");
            this.openItem(item);

            //+++ close all the sibling folders that have no subdirectories
        } else {
            // Expand
            if (collapsed) folder.removeClass("collapsed");

            // Collapse
            else {
                folder.addClass("collapsed");
                const subs = folder.find('.folder').addClass("collapsed");
                subs.each((i, f) => {
                    if (item) {
                        item = item.children.find(c => c.id == f.dataset.id);
                        item.expanded = false;
                    }
                });
            }
        }

        // Resize container
        this.setPosition();
    }

    home(event) {
        this.openItem(null);
    }

    clickItem(event) {
        let id = $(event.currentTarget).data("id");
        let item = this.listing.find(i => i.id == id);
        this.openItem(item);
    }

    async openItem(item) {
        if (item?.type == "document") {
            let document = await item.collection.getDocument(item.id);
            document.sheet.render(true);
        } else {
            //if this is the upper level
            this.content = null;
            this.listing = [];

            if (item == null) {
                this.listing = ForgeCompendiumBrowser.books;/*.map(b => {
                return {
                    id: b.id,
                    title: b.title,
                    img: b.img,
                    type: "book",
                    parent: null
                }
            });*/
                this.book = null;
            }
            // if this is a book
            else {
                this.object = item;

                if (item.type == "book") {
                    //check to see if this books hierarchy has been loaded
                    this.book = item;
                    this.book.index();
                }

                if (this.object && this.object.children) {
                    // show the entry type listing
                    this.listing = this.object.children;
                } else {
                    this.listing = [];
                }
            }
        }

        this.render(true);
    }
}
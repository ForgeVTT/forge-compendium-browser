import { ForgeCompendiumBrowser, i18n } from '../forge-compendium-browser.js';

export class CompendiumBrowserApp extends Application {
    constructor(book, options = {}) {
        super(null, options);

        if (book) {
            game.user.setFlag("forge-compendium-browser", "last-book", book);
        }
    }

    static get defaultOptions() {
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)

        return mergeObject(super.defaultOptions, {
            id: "forge-compendium-browser",
            template: "./modules/forge-compendium-browser/templates/compendium-browser.html",
            title: i18n("ForgeCompendiumBrowser.ForgeCompendiumLibrary"),
            classes: ["forge-compendium-browser"],
            popOut: true,
            resizable: true,
            width: vw - 400,
            height: vh - 200,
            scrollY: ["ol.forge-compendium-directory-list", ".forge-compendium-listing > div"],
            dragDrop: [{ dragSelector: ".draggable-item" }]
        });
    }

    getData(options) {
        const data = super.getData(options);
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        this._contextmenu = ContextMenu.create(this, html.parent(), ".forge-compendium-book", this._getContextMenuOptions());
    }

    _getContextMenuOptions() {
        return [
            {
                name: "Configure Permissions",
                icon: '<i class="fas fa-lock"></i>',
                condition: () => {
                    return game.user.isGM;
                },
                callback: async (bookid) => {
                    const id = $(bookid).data()["id"];

                    const book = game.ForgeCompendiumBrowser.books.find(b => b.id === id);

                    if (!book)
                        return;

                    ForgeCompendiumBrowser.showPermissions(book);
                }
            },
            {
                name: "Rebuild Book Structure",
                icon: '<i class="fas fa-book"></i>',
                condition: () => {
                    return game.user.isGM;
                },
                callback: async (bookid) => {
                    const id = $(bookid).data()["id"];

                    const book = game.ForgeCompendiumBrowser.books.find(b => b.id === id);

                    if (!book)
                        return;

                    // Delete `modules/${book.id}/hierarchy.json`
                    let src = "data";
                    if (typeof ForgeVTT !== "undefined" && ForgeVTT.usingTheForge) {
                        src = "forgevtt";
                    }
                    await FilePicker.upload(src, `modules/${book.id}/`, new File(['{"rebuild":true}'], "hierarchy.json"), {}, { notify: false });
                    ui.notifications.info(`${book.name} will be rebuilt the next time Foundry is loaded.`)
                }
            }
        ];
    }
}
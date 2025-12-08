import { ForgeCompendiumBrowser, i18n } from "../forge-compendium-browser.js";
import { Hierarchy } from "../hierarchy.js";

export class CompendiumBrowserApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(book, options = {}) {
        console.warn("CompendiumBrowserApp.constructor", book, options);
        super(options);

        if (book) {
            game.user.setFlag("forge-compendium-browser", "last-book", book);
        }
    }

    static DEFAULT_OPTIONS = {
        id: "forge-compendium-browser",
        classes: ["forge-compendium-browser"],
        tag: "div",
        window: {
            title: "ForgeCompendiumBrowser.ForgeCompendiumLibrary",
            resizable: true,
        },
        position: {
            width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) - 400,
            height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) - 200,
        },
        actions: {},
        dragDrop: [{ dragSelector: ".draggable-item" }],
    };

    static PARTS = {
        browser: {
            template: "modules/forge-compendium-browser/templates/compendium-browser.html",
        },
    };

    async _prepareContext(options) {
        console.warn("CompendiumBrowserApp._prepareContext", options);
        const context = await super._prepareContext(options);
        return context;
    }

    _onRender(context, options) {
        console.warn("CompendiumBrowserApp._onRender", context, options);
        super._onRender(context, options);
        this._contextmenu = new foundry.applications.ux.ContextMenu(
            this.element,
            ".forge-compendium-book",
            this._getContextMenuOptions(),
            { jQuery: false },
        );
    }

    _getContextMenuOptions() {
        return [
            {
                name: i18n("ForgeCompendiumBrowser.ConfigurePermissions"),
                icon: '<i class="fas fa-lock"></i>',
                condition: () => {
                    return game.user.isGM;
                },
                callback: async (bookid) => {
                    const id = bookid.dataset.id;

                    const book = game.ForgeCompendiumBrowser.books.find((b) => b.id === id);

                    if (!book) return;

                    ForgeCompendiumBrowser.showPermissions(book);
                },
            },
            {
                name: i18n("ForgeCompendiumBrowser.RebuildBookStructure"),
                icon: '<i class="fas fa-book"></i>',
                condition: () => {
                    return game.user.isGM;
                },
                callback: async (bookid) => {
                    const id = bookid.dataset.id;

                    const book = game.ForgeCompendiumBrowser.books.find((b) => b.id === id);

                    if (!book) return;

                    const hierarchy = new Hierarchy(book);
                    await hierarchy.buildHierarchy();
                    ForgeCompendiumBrowser.indexed[book.id] = false;
                },
            },
        ];
    }
}

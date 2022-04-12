import { CompendiumBrowser } from "./apps/browser.js";
import { CompendiumBook } from "./classes/CompendiumBook.js";
import { registerSettings } from "./settings.js";

export let debug = (...args) => {
    if (debugEnabled > 1) console.log("DEBUG: forge-compendium-browser | ", ...args);
};
export let log = (...args) => console.log("forge-compendium-browser | ", ...args);
export let warn = (...args) => {
    if (debugEnabled > 0) console.warn("forge-compendium-browser | ", ...args);
};
export let error = (...args) => console.error("forge-compendium-browser | ", ...args);
export let i18n = key => {
    return game.i18n.localize(key);
};
export let setting = key => {
    return game.settings.get("forge-compendium-browser", key);
};

export class ForgeCompendiumBrowser {
    static books = [];

    static init() {
        registerSettings();

        Dlopen.register('forge-compendium-browser', {
            scripts: "/modules/forge-compendium-browser/dist/ForgeCompendiumBrowserVue.umd.js",
            styles: "/modules/forge-compendium-browser/dist/ForgeCompendiumBrowserVue.css",
            init: () => Vue.component("ForgeCompendiumBrowser", ForgeCompendiumBrowserVue),
            dependencies: "vue"
        });

        //compile the DnDBeyond compendiums
        ForgeCompendiumBrowser.parseCompendiums();
    }

    static ready() {
    }

    static get version() {
        return game.modules.get("forge-compendium-browser").version;
    }

    static parseCompendiums() {
        ForgeCompendiumBrowser.hierarchyCache = {};
        //Find all the DnDBeyond modules
        log("Parsing compendiums");
        for (let module of game.modules.values()) {
            if (module.data.flags["forge-compendium-browser"]?.active && module.active) {
                let bookData = {
                    id: module.id,
                    title: module.data.title,
                    description: module.data.description,
                    img: module.data.flags["forge-compendium-browser"]?.background,
                    module: module,
                    packs: module.data.packs,
                };

                ForgeCompendiumBrowser.books.push(new CompendiumBook(bookData));
                log(`Found package:${module.data.title}, hiding ${module.packs.length} associated compendiums`);
            }
        }

        if (ForgeCompendiumBrowser.books.find(b => !b._cached).length > 0) {
            //Save the books hierarchy to the hierarchyCache
        }
    }

    static openBrowser() {
        new CompendiumBrowser().render(true);
    }
}

Hooks.on('init', ForgeCompendiumBrowser.init);
Hooks.on('ready', ForgeCompendiumBrowser.ready);

Hooks.on("renderCompendiumDirectory", (app, html, data) => {
    $('.directory-footer', html).append(
        $('<div>')
            .addClass('forge-compendium-actions action-buttons flexrow')
            .append($('<button>')
                .addClass('open-forge-compendium-browser')
                .attr('type', 'button')
                .on("click", ForgeCompendiumBrowser.openBrowser)
                .html('<i class="fas fa-d-and-d-beyond"></i> Open Compendium Browser')
            )
    );

    for (let book of ForgeCompendiumBrowser.books) {
        for (let pack of book.data.packs) {
            $(`.compendium-pack[data-pack="${pack.package}.${pack.name}"]`, html).addClass('forge-compendium-pack');
        }
    }
});

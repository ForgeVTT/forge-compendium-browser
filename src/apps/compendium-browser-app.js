import { ForgeCompendiumBrowser, log, setting, i18n } from '../forge-compendium-browser.js';

export class CompendiumBrowserApp extends Application {
    constructor(object, options = {}) {
        super(object, options);
    }

    static get defaultOptions() {
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)

        return mergeObject(super.defaultOptions, {
            id: "forge-compendium-browser",
            template: "./modules/forge-compendium-browser/templates/compendium-browser.html",
            title: "Compendium Browser",
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
        let data = super.getData(options);
        return data;
    }
}
import { i18n } from "./forge-compendium-browser.js";

export const registerSettings = function () {
    const modulename = "forge-compendium-browser";

    game.settings.register(modulename, "same-name", {
        name: i18n("ForgeCompendiumBrowser.same-name.name"),
        hint: i18n("ForgeCompendiumBrowser.same-name.hint"),
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register(modulename, "set-navigate", {
        name: i18n("ForgeCompendiumBrowser.set-navigate.name"),
        hint: i18n("ForgeCompendiumBrowser.set-navigate.hint"),
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register(modulename, "permissions", {
        scope: "world",
        config: false,
        default: {},
        type: Object,
    });
};

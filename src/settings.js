import { i18n } from "./forge-compendium-browser.js";

export const registerSettings = function () {
    let modulename = "forge-compendium-browser";

    const debouncedReload = foundry.utils.debounce(function () { window.location.reload(); }, 100);

	game.settings.register(modulename, "same-name", {
		name: i18n("ForgeCompendiumBrowser.same-name.name"),
		hint: i18n("ForgeCompendiumBrowser.same-name.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
}
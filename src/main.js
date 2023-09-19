import Vue from "vue";
import App from "./App.vue";

Vue.config.productionTip = false;

globalThis.game = {
    ForgeCompendiumBrowser: {
        books: [dndbeyond_br],
        setting(key) {
            switch (key) {
                case "same-name":
                    return true;
                case "permissions":
                    return {
                        "dndbeyond-br": {
                            default: false,
                            kjl345kjhl4235l: true,
                        },
                    };
            }
        },
        i18n(key) {
            return "";
        },
        async indexBook(book) {
            const indexPacks = async (parent) => {
                for (let child of parent.children) {
                    child.parent = parent;

                    if (child.children) await indexPacks(child);
                }
            };

            if (!ForgeCompendiumBrowser.indexed[book.id]) {
                await indexPacks(book);
                ForgeCompendiumBrowser.indexed[book.id] = true;
            }
        },
    },
    user: {
        getFlag: () => {
            return "dndbeyond-br";
        },
        setFlag: () => {},
        unsetFlag: () => {},
        id: "kjl345kjhl4235l",
    },
    i18n: {
        localize: (key) => {
            const keys = {
                "ForgeCompendiumBrowser.same-name.name": "Auto open with same name",
                "ForgeCompendiumBrowser.same-name.hint":
                    "Automatically open documents with the same name as the listing name",

                "ForgeCompendiumBrowser.OpenCompendiumBrowser": "Open Compendium Browser",
                "ForgeCompendiumBrowser.ForgeCompendiumLibrary": "Forge Compendium Library",
                "ForgeCompendiumBrowser.LibraryMessage":
                    "This is your library of compendium books.  If you have no books listed, please use the {link} from the Bazaar to import your books.",
                "ForgeCompendiumBrowser.NoBooksLoaded": "No Books Loaded",
                "ForgeCompendiumBrowser.CompendiumLibrary": "Compendium Library",
                "ForgeCompendiumBrowser.Prev": "Prev",
                "ForgeCompendiumBrowser.Next": "Next",
                "ForgeCompendiumBrowser.Search": "Search",
                "ForgeCompendiumBrowser.NoSearchResults": "No Search Results",
                "ForgeCompendiumBrowser.ImportDocuments": "Import Documents",
                "ForgeCompendiumBrowser.ImportCompendiumDocuments": "Import Compendium Documents",
                "ForgeCompendiumBrowser.Import": "Import",
            };
            return keys[key];
        },
        format: (key, data) => {
            const keys = {
                "ForgeCompendiumBrowser.LibraryMessage":
                    "This is your library of compendium books.  If you have no books listed, please use the {link} from the Bazaar to import your books.",
            };

            let str = keys[key];
            const fmt = /\{[^\}]+\}/g; //eslint-disable-line
            str = str.replace(fmt, (k) => {
                return data[k.slice(1, -1)];
            });
            return str;
        },
    },
};

new Vue({
    render: (h) => h(App),
}).$mount("#app");

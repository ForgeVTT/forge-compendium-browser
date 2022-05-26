import { ForgeCompendiumBrowser, log, setting, i18n } from '../forge-compendium-browser.js';

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
          let id = $(bookid).data()["id"];

          const book = game.ForgeCompendiumBrowser.books.find(b => b.id == id);

          if (!book)
            return;

          const permissions = duplicate(game.ForgeCompendiumBrowser.setting("permissions") || {});
          const permission = permissions[book.id] || {};

          const data = {
            defaultLevels: { "true": "Allowed", "false": "Not Allowed" },
            playerLevels: { "null": "Default", "true": "Allowed", "false": "Not Allowed" },
            currentDefault: permission["default"] == undefined || permission["default"] ? "true" : "false",
            users: game.users.filter(u => !u.isGM).map(u => {
              return {
                id: u.id,
                name: u.name,
                allowed: permission[u.id] == undefined ? "null" : permission[u.id] ? "true" : "false",
              }
            })
          };

          const html = await renderTemplate("./modules/forge-compendium-browser/templates/permissions.html", data);
          Dialog.prompt({
            title: `Configure Permissions: ${book.name}`,
            content: html,
            label: "Save Changes",
            callback: (html) => {
              const form = $("#permission-control", html)[0];
              const fd = new FormDataExtended(form);

              const changes = fd.toObject();

              for (let [key, value] of Object.entries(changes)) {
                permission[key] = value == "null" ? null : value == "true";
              }

              permissions[book.id] = permission;
              game.settings.set("forge-compendium-browser", "permissions", permissions);
            },
            rejectClose: false,
          });
        }
      }
    ];
  }
}
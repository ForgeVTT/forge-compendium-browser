<template>
  <div ref="entry" class="forge-compendium-entry" :class="documentClasses" v-html="html"></div>
</template>

<script>
export default {
  name: "CompendiumEntry",
  props: {
    entry: Object,
  },
  data: () => ({
    html: "",
    subsheet: null,
  }),
  computed: {
    documentClasses() {
      const classes = this.subsheet?.options?.classes || [];
      // if (game.version.startsWith("10.")) classes.push("v10");
      return classes.join(" ");
    },
  },
  watch: {
    entry: function () {
      this.loadDocument();
    },
  },
  async mounted() {
    this.loadDocument();
  },
  methods: {
    i18n(key, args) {
      if (args) return game.i18n.format(key, args);
      return game.i18n.localize(key);
    },
    openLink(e) {
      const packId = e.currentTarget.dataset.pack;
      const id = e.currentTarget.dataset.id;

      this.$emit("link", packId, id);
      e.preventDefault();
      e.stopPropagation();
    },
    async loadScene(document) {
      const templateData = {
        img: document.background?.src ?? document.data.img,
        stats: [],
      };

      // Collect the stats on the scene
      const statIcon = {
        Drawing: "fa-solid fa-pencil-alt",
        AmbientLight: "fa-regular fa-lightbulb",
        Note: "fas fa-bookmark",
        AmbientSound: "fa-solid fa-music",
        Tile: "fa-solid fa-cubes",
        Token: "fas fa-user-alt",
        Wall: "fa-solid fa-university",
      };
      const stats = {};
      for (const collection of ["drawings", "lights", "notes", "sounds", "tiles", "tokens", "walls"]) {
        const collectionData = foundry.utils.isNewerVersion(game.version, "9.99999")
          ? document[collection]
          : document.data[collection];
        if (collectionData.size) {
          const name = collectionData.documentClass.documentName;
          stats[name] = collectionData.size;
        }
      }

      templateData.stats = Object.keys(stats).map((key) => {
        const nameKey = this.i18n(`ForgeCompendiumBrowser.${key}`);
        return {
          name: `${stats[key]} ${nameKey}`,
          icon: statIcon[key],
          value: stats[key],
        };
      });

      const html = await renderTemplate("modules/forge-compendium-browser/templates/scene-entry.html", templateData);

      this.$refs.entry.innerHTML = html;

      this.subsheet = { options: { classes: ["scene-entry"] } };

      $(".forge-compendium-scene", this.$refs.entry).on("click", () => {
        const ip = new ImagePopout(templateData.img, {
          title: this.entry.name,
          uuid: `Compendium.${this.entry.packId}.Scene.${this.entry.id}`,
          showTitle: true,
        });
        ip.render(true);
      });
    },
    preparePagesData(document, cls) {
      if (document instanceof JournalEntry) {
        return this.prepareJournalPagesData(document, cls);
      } else {
        return [{ document, cls }];
      }
    },
    prepareJournalPagesData(document) {
      const pages = [];
      const cfg = CONFIG["JournalEntryPage"];
      
      for (const page of this.entry.document.pages) {
        const sheets = cfg.sheetClasses[page.type] || {};

        const sheetMap = {
          "image": "core.JournalEntryPageImageSheet",
          "pdf": "core.JournalEntryPagePDFSheet",
          "text": "core.JournalEntryPageProseMirrorSheet",
          "video": "core.JournalEntryPageVideoSheet",
        };

        const cls = sheetMap[page.type] ? 
          sheets[sheetMap[page.type]]?.cls : 
          Object.values(sheets[document.type])[0]?.cls;

        pages.push({ document: page, cls });
      }

      return pages;
    },
    async renderPages(pages) {
      const container = window.document.createElement("div");
      for (const page of pages) {
        if (page.cls && page.document) {
          const rendered = await this.renderPage(page);
          container.appendChild(rendered);
          // this.subsheet._state = this.subsheet.constructor.RENDER_STATES.RENDERING;
          // const templateData = await (
          //   typeof this.subsheet._prepareContext === "function"
          //     ? this.subsheet._prepareContext()
          //     : this.subsheet.getData()
          // );

          // if (templateData.enrichedText instanceof Promise) templateData.enrichedText = await templateData.enrichedText;
          // if (templateData.data?.img)
          //   templateData.data.img = game.ForgeCompendiumBrowser.mapIcon(templateData.data.img);
          // if (templateData.item?.img)
          //   templateData.item.img = game.ForgeCompendiumBrowser.mapIcon(templateData.item.img);
          // const template = await renderTemplate(this.subsheet.template, templateData);
          // html += `<article>${template}</article>`;
        } else {
          container.appendChild(await this.renderPageNotFound(page));
        }
      }

      return container.innerHTML;
    },
    compendiumBrowserSheetMixin(Cls) {
      /**
       * Extend the original sheet class so we can override some of the methods
       * in order to remove unwanted elements and behaviors, or to avoid errors
       * that are caused by our unusual rendering method.
       */
      return class extends Cls {
        /**
         * Disable position changes since we're rendering in a custom container
         */
        _updatePosition() {
          return {};
        }

        /**
         * Create only a basic frame and skip all the usual frame rendering from all the superclasses
         * this is done to avoid errors from other classes expecting a certain structure.
         */
        async _renderFrame() {
          const frame = document.createElement(this.options.tag);
          frame.id = this.id;

          if ( this.options.classes.length ) {
            frame.className = this.options.classes.join(" ");
          }

          frame.classList.add("application");

          return frame;
        }

        /** 
         * This method causes errors because the frame is missing some things. We don't
         * need it though since the compendium is read-only.
         */
        _renderModeToggle() {
          return null;
        }
      };
    },
    async renderPage(page) {
      const SheetClass = this.compendiumBrowserSheetMixin(page.cls);

      const sheet = new SheetClass({ 
        tag: "article",
        id: "{id}-view",
        document: page.document, 
        editPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
        mode: "view",
        window: {
          frame: false,
          position: false
        }
      });
      
      const rendered = await sheet.render({ force: true });
      // rendered.element.removeAttribute("class");

      this.subsheet = sheet;
      return rendered.element;
    },
    async renderPageNotFound() {
      this.subsheet = new JournalSheet(new JournalEntry({name: game.i18n.localize("ForgeCompendiumBrowser.DocumentNotFound")}), { editable: false });
      const container = window.document.createElement("div");
      container.innerHTML = `<div class="flexcol" style="text-align: center;justify-content: center;font-size: 18px;color: #808080;">${game.i18n.localize("ForgeCompendiumBrowser.DocumentNotFound")}</div>`;
      return container.firstChild;
    },
    cleanUpHtml(entryWrapper) {
      // Remove all the links that point back to this entry, just to clean up
      entryWrapper.querySelectorAll(`a.content-link[data-id='${this.entry.id}']`).forEach((link) => {
        if (link.querySelector("i.fas.fa-book-open") && link.innerHTML.includes(this.entry.name)) {
          link.remove();
        }
      });

      entryWrapper.querySelectorAll("a[href^='ddb://']").forEach((link) => {
        // const linkHtml = $(link).html() || "";
        let href = link.getAttribute("href") || "";

        if (href.startsWith("ddb://compendium")) {
          try {
            const bookid = href.replace("ddb://compendium/", "").split("/")[0];
            link.classList.add("content-link");
            link.removeAttribute("href");
            link.setAttribute("data-pack", `dndbeyond-${bookid}`);
          } catch {
            // don't bother with the catch
          }
        } else {
          if (href.startsWith("ddb://spells"))
            href = "https://www.dndbeyond.com/spells/" + link.textContent.replaceAll(" ", "-");
          else {
            href =
              href.replace("ddb://", "https://www.dndbeyond.com/").replace("magicitems", "magic-items") +
              "-" +
              link.textContent.replaceAll(" ", "-");
          }
          link.setAttribute("href", href);
          link.setAttribute("target", "_blank");
        }
      });

      entryWrapper.querySelectorAll("a.entity-link[data-pack], a.content-link[data-pack]").forEach((link) => {
        link.addEventListener("click", this.openLink.bind(this));
      });
    },
    async loadDocument() {
      const document = this.entry.document;
      let cls = document?._getSheetClass ? document._getSheetClass() : null;

      if (document instanceof Scene) {
        return this.loadScene(document);
      }

      const pages = this.preparePagesData(document, cls);

      this.$refs.entry.innerHTML = await this.renderPages(pages);

      const entryWrapper = this.$refs.entry;

      // this.subsheet.form = entryWrapper.querySelector("form:first-of-type") || null;
      // this.subsheet._element = entryWrapper;

      if (this.subsheet.options.tabs) {
        this.subsheet._tabs = this.subsheet.options.tabs.map((tab) => {
          tab.callback = this.subsheet._onChangeTab.bind(this.subsheet);
          return new Tabs(tab);
        });

        this.subsheet._tabs.forEach((tab) => tab.bind(entryWrapper[0]));
      }

      try {
        this.subsheet.activateListeners(entryWrapper);
      } catch {
        //continue regardless of error
      }

      this.cleanUpHtml(entryWrapper);

      // this.subsheet._disableFields(entryWrapper[0]);

      if (document) {
        document._sheet = null; // eslint-disable-line
      }

      this.subsheet._state = this.subsheet.constructor.RENDER_STATES.RENDERED;
    },
  },
};
</script>

<style>
.forge-compendium-entry {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: flex-start;
  padding: 8px;
  color: var(--color-text-light-primary);
  overflow-y: auto;
  overflow-x: hidden;
}

.theme-light .forge-compendium-entry {
  color: var(--color-text-dark-primary);
}

.forge-compendium-entry.scene-entry {
  overflow-y: hidden;
}
.forge-compendium-entry input[name="name"],
.forge-compendium-entry select[name="folder"] {
  display: none;
}

.forge-compendium-entry.journal-sheet form .editor {
  height: 100%;
}

.forge-compendium-entry.journal-sheet.v10 > header {
  display: none;
}

.forge-compendium-entry.journal-sheet .journal-page-content img {
  border: 0px;
}

.forge-compendium-entry a.content-link {
  color: var(--color-text-hyperlink);
  background: transparent;
  padding: 0px;
  border: 0px;
}

.forge-compendium-entry a.content-link i {
  color: var(--color-text-hyperlink);
}
</style>

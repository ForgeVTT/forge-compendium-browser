<template>
  <div
    ref="entry"
    class="forge-compendium-entry"
    :class="documentClasses"
    v-html="html"
  ></div>
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
  methods: {
    openLink(e) {
      const packId = e.currentTarget.dataset.pack;
      const id = e.currentTarget.dataset.id;

      //console.log("Opening a link", id);

      this.$emit("link", packId, id);
      e.preventDefault();
      e.stopPropagation();
    },
    async loadDocument() {
      //console.log("Entry", this.entry);
      const document = this.entry.document;
      let cls = document._getSheetClass ? document._getSheetClass() : null;

      if (document instanceof Scene) {
        const templateData = {
          img: document.background?.src ?? document.data.img,
          stats: [],
        };

        // Collect the stats on the scene
        const stats = {};
        for (const collection of ["drawings", "lights", "notes", "sounds", "tiles", "tokens", "walls",]) {
          const collectionData = isNewerVersion(game.version, "9.99999") ? document[collection] : document.data[collection];
          if (collectionData.size) {
            const name = collectionData.documentClass.documentName;
            stats[name] = collectionData.size;
          }
        }

        templateData.stats = Object.keys(stats).map((key) => ({ name: key, value: stats[key]}));

        const html = await renderTemplate("modules/forge-compendium-browser/templates/scene-entry.html", templateData);

        this.$refs.entry.innerHTML = html;

        this.subsheet = { options: { classes: ["scene-entry"] } };
      } else {
        let html = "";
        const pages = [];
        if (document instanceof JournalEntry) {
          if (document instanceof JournalEntry && isNewerVersion(game.version, "9.99999")) {
            const cfg = CONFIG["JournalEntryPage"];
            for (const page of this.entry.document.pages) {
              const sheets = cfg.sheetClasses[page.type] || {};
              switch (page.type) {
                case 'image': pages.push({document: page, cls: sheets["core.JournalImagePageSheet"].cls}); break;
                case 'pdf': pages.push({document: page, cls: sheets["core.JournalPDFPageSheet"].cls}); break;
                case 'text': pages.push({document: page, cls: sheets["core.JournalTextPageSheet"].cls}); break;
                case 'video': pages.push({document: page, cls: sheets["core.JournalVideoPageSheet"].cls}); break;
                default: pages.push({document: page, cls: Object.values(sheets[document.type])[0].cls});
              }
            }
          } else {
            const cfg = CONFIG["JournalEntry"];
            const sheets = cfg.sheetClasses[CONST.BASE_DOCUMENT_TYPE] || {};
            cls = sheets["core.JournalSheet"].cls;
            pages.push({document, cls});
          }
        } else {
          pages.push({document, cls});
        }

        for (const page of pages){
          this.subsheet = new page.cls(page.document, { editable: false });
          this.subsheet._state = this.subsheet.constructor.RENDER_STATES.RENDERING;
          const templateData = await this.subsheet.getData();

          if (templateData.enrichedText instanceof Promise)
            templateData.enrichedText = await templateData.enrichedText;
          const template = await renderTemplate(this.subsheet.template, templateData);
          html += `<article>${template}</article>`;
        }

        this.$refs.entry.innerHTML = html;
        const subdocument = $(this.$refs.entry);
        this.subsheet.form = $("form:first", subdocument);
        this.subsheet._element = subdocument;

        this.subsheet._tabs = this.subsheet.options.tabs.map((t) => {
          t.callback = this.subsheet._onChangeTab.bind(this.subsheet);
          return new Tabs(t);
        });
        this.subsheet._tabs.forEach((t) => t.bind(subdocument[0]));

        try {
          this.subsheet.activateListeners(this.subdocument);
        } catch {
          //continue regardless of error
        }
        this.subsheet._disableFields(subdocument[0]);

        // Remove all the links that point back to this entry, just to clean up
        $(`a.content-link[data-id="${this.entry.id}"]`, this.$refs.entry).each((idx, link) => {
          const linkHtml = $(link).html() || "";
          if (linkHtml.indexOf('<i class="fas fa-book-open"></i>') >= 0 && linkHtml.indexOf(this.entry.name) >= 0) {
            $(link).remove();
          }
        });

        $('a[href^="ddb://"]', this.$refs.entry).each((idx, link) => {
          const linkHtml = $(link).html() || "";
          let href = $(link).attr('href');
          if (href.startsWith("ddb://compendium")) {
            try {
              const bookid = href.replace("ddb://compendium/", "").split("/")[0];

              $(link).addClass("content-link").removeAttr("href").attr("data-pack", `dndbeyond-${bookid}`);
            } catch { 
              // don't bother with the catch
            }
          } else {
            if (href.startsWith("ddb://spells"))
              href = "https://www.dndbeyond.com/spells/"+ linkHtml.replaceAll(" ", "-");
            else {
              href = href
                .replace("ddb://", "https://www.dndbeyond.com/")
                .replace("magicitems", "magic-items") + "-" + linkHtml.replaceAll(" ", "-");
            }
            $(link).attr('href', href).attr("target", "_blank");
          }
        });

        $('a.entity-link[data-pack]', this.$refs.entry).on("click", this.openLink.bind(this));
        $('a.content-link[data-pack]', this.$refs.entry).on("click", this.openLink.bind(this));

        document._sheet = null; // eslint-disable-line
        this.subsheet._state = this.subsheet.constructor.RENDER_STATES.RENDERED;
      }
    },
  },
  computed: {
    documentClasses() {
      const classes = this.subsheet?.options?.classes || [];
      if (game.version.startsWith("10.")) 
        classes.push("v10");
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
};
</script>

<style>
.forge-compendium-entry {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: flex-start;
  padding: 8px;
  color: var(--color-text-dark-primary);
  overflow-y: auto;
  overflow-x: hidden;
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
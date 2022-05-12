<template>
    <div ref="entry" class="forge-compendium-entry" :class="documentClasses" v-html="html">
    </div>
</template>

<script>
export default {
    name: "CompendiumEntry",
    props: {
        entry: Object
    },
    data: () => ({
        html: "",
        subsheet: null,
    }),
    methods: {
        openLink(e) {
            const packId = e.currentTarget.dataset.pack;
            const id = e.currentTarget.dataset.id;

            console.log("Opening a Link", packId, id);

            this.$emit("link", packId, id);
            e.preventDefault();
            e.stopPropagation();
        },
        async loadDocument() {
            console.log("Entry", this.entry);
            let cls = (this.entry.document._getSheetClass ? this.entry.document._getSheetClass() : null);
            if (this.entry.document instanceof JournalEntry) {
                const cfg = CONFIG["JournalEntry"];
                const sheets = cfg.sheetClasses[CONST.BASE_DOCUMENT_TYPE] || {};
                cls = sheets["core.JournalSheet"].cls;
            }
            if (this.entry.document instanceof Scene) {
                const templateData = {
                    img: this.entry.document.data.img,
                    stats: {}
                }

                // Collect the stats on the scene
                for (let collection of ["drawings", "lights", "notes", "sounds", "tiles", "tokens", "walls"]) {
                    if (this.entry.document.data[collection].size) {
                        const name = this.entry.document.data[collection].documentClass.documentName;
                        templateData.stats[name] = this.entry.document.data[collection].size;
                    }
                }

                const html = await renderTemplate("modules/forge-compendium-browser/templates/scene-entry.html", templateData);

                this.$refs.entry.innerHTML = html;

                this.subsheet = { options: { classes: ["scene-entry"]}};
            } else {
                this.subsheet = new cls(this.entry.document, { editable: false });
                this.subsheet._state = this.subsheet.constructor.RENDER_STATES.RENDERING;
                const templateData = await this.subsheet.getData();
                const html = await renderTemplate(this.subsheet.template, templateData);

                this.$refs.entry.innerHTML = html;
                const subdocument = $(this.$refs.entry);
                this.subsheet.form = $('form:first', subdocument);
                this.subsheet._element = subdocument;

                this.subsheet._tabs = this.subsheet.options.tabs.map(t => {
                    t.callback = this.subsheet._onChangeTab.bind(this.subsheet);
                    return new Tabs(t);
                });
                this.subsheet._tabs.forEach(t => t.bind(subdocument[0]));

                try {
                    this.subsheet.activateListeners(this.subdocument);
                } catch {
                    //continue regardless of error
                }
                this.subsheet._disableFields(subdocument[0]);

                //Hooks.callAll('renderJournalSheet', this.subsheet, subdocument, templateData);
                const parts = this.entry.document.pack.split(".");
                $(`a[data-pack^="${parts[0]}"]`, this.$refs.entry).on("click", this.openLink.bind(this));

                this.entry.document._sheet = null;  // eslint-disable-line
                this.subsheet._state = this.subsheet.constructor.RENDER_STATES.RENDERED;
            }
        }
    },
    computed: {
        documentClasses() {
            if (!this.subsheet)
                return "";
            return this.subsheet.options.classes.join(' ');
        }
    },
    watch: {
        entry: function() {
            this.loadDocument();
        }
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
</style>
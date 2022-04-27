<template>
    <div class="forge-compendium-entry" :class="documentClasses" v-html="html">
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

            this.$emit("link", packId, id);
            e.preventDefault();
            e.stopPropagation();
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
    },
    async mounted() {
        console.log("Entry", this.entry);
        this.entry.document.type = "base";  // eslint-disable-line
        const cls = (this.entry.document._getSheetClass ? this.entry.document._getSheetClass() : null);
        this.subsheet = new cls(this.entry.document, { editable: false });
        this.subsheet._state = this.subsheet.constructor.RENDER_STATES.RENDERING;
        const templateData = await this.subsheet.getData();
        this.html = await renderTemplate(this.subsheet.template, templateData);
        const subdocument = $(this.html).get(0);
        this.subsheet.form = (subdocument.tagName == 'FORM' ? subdocument : $('form:first', subdocument));
        this.subsheet._element = $(subdocument);

        /*
        this._tabs = this.subsheet.options.tabs.map(t => {
            t.callback = this.subsheet._onChangeTab.bind(this);
            return new Tabs(t);
        });
        this._tabs.forEach(t => t.bind(this.subdocument));
        */

        //this.subsheet.activateListeners($(this.subdocument), this);

        Hooks.callAll('renderJournalSheet', this.subsheet, this.subsheet._element, templateData);

        $(`a[data-pack="${this.entry.document.pack}"]`).on("click", this.openLink.bind(this));

        this.entry.document._sheet = null;  // eslint-disable-line
        this.subsheet._state = this.subsheet.constructor.RENDER_STATES.RENDERED;
    },
};
</script>

<template>
    <div class="forge-compendium-browser">
        <compendium-library v-if="!showBook" :library="library" @select="selectBook"></compendium-library>
        <compendium-book v-else :book="book" @exit="selectBook"></compendium-book>
    </div>
</template>

<script>
export default {
    props: {
    },
    data: () => ({
        library: null,
        book: null,

    }),
    methods: {
        selectBook(id) {
            console.log("Select book", id);
            this.book = this.library.find(b => b.id == id);
        }
    },
    computed: {
        showBook() {
            return this.book != null;
        }
    },
    watch: {
    },
    mounted() {
        this.library = game.ForgeCompendiumBrowser.books;
    },
};
</script>
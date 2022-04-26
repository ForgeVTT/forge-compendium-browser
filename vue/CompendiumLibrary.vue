<template>
    <div class="forge-compendium-library">
        <div v-if="hasBooks" class="forge-compendium-library flexcol">
            <h3 class="flexcontain">Library</h3>
            <p class="notes flexcontain">
                This is your library of compendium books.  If you have no books listed, please use the D&amp;D Beyond importer from the Bazaar to import your books.
            </p>
            <div class="flexrow" style="overflow-y: auto;">
                <div v-for="book in library" :key="book.id" class="forge-compendium-book" :data-id="book.id" data-type="book" @click="selectBook(book.id)">
                    <div v-if="book.img" class="forge-compendium-img" :style="bookImage(book)" />
                    <div class="forge-compendium-title">{{book.name}}</div>
                </div>
            </div>
        </div>
        <div v-else class="compendium-information flexrow">
            <h3 class="compendium-muted">No Books loaded</h3>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        library: Array
    },
    data: () => ({
    }),
    methods: {
        selectBook(id) {
            this.$emit("select", id);
        },
        bookImage(book) {
            return `background-image: url(${book.img})`;
        }
    },
    computed: {
        hasBooks() {
            return this.library && this.library.length > 0;
        }
    },
    watch: {
    },
    mounted() {
        console.log("library", this.library);
    },
};
</script>
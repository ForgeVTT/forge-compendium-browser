<template>
    <div class="forge-compendium-browser">
        <compendium-library v-if="!showBook" :library="library" @select="selectBook"></compendium-library>
        <compendium-book v-else :book="book" @exit="selectBook"></compendium-book>
    </div>
</template>

<script>
import CompendiumLibrary from "./CompendiumLibrary.vue";
import CompendiumBook from "./CompendiumBook.vue";

export default {
    name: 'CompendiumBrowser',
    components: {
      CompendiumLibrary,
      CompendiumBook
    },
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

<style>
.window-app .window-content .forge-compendium-container {
    max-height:100%;
}

.forge-compendium-browser {
    max-height: 100%;
}

.forge-compendium-library {
    width: 100%;
    height: 100%;
}

.forge-compendium-sidebar {
    flex: 0 0 var(--sidebar-width);
    height: 100%;
    flex-wrap: nowrap;
    justify-content: flex-start;
    border: 1px solid var(--color-border-dark);
    border-top: 0px;
    overflow: hidden;
    background: url(../../public/ui/denim075.png) repeat;
    color: var(--color-text-light-highlight);
}

.forge-compendium-sidebar img {
    height: 200px;
    width: 100%;
    object-fit: cover;
    object-position: top center;
}

.forge-compendium-sidebar .directory-header {
    height: 236px;
    overflow: hidden;
}

.forge-compendium-pack {
    display: none;
}

.forge-compendium-content {
    height:100%;
    overflow: hidden;
}

.forge-compendium-listing {
    height: 100%;
}

.forge-compendium-listing > div {
    overflow-y: auto;
}

.forge-compendium-listing > div > div {
    columns: 400px;
}

.forge-compendium-listing > div > div > div {
    padding: 4px;
}

.forge-compendium-listing > div > div div {
    break-inside: avoid;
}

.forge-compendium-library .forge-compendium-book {
    flex: 0 0 210px;
    height: 250px;
    margin: 10px;
    position: relative;
    cursor: pointer;
}

.forge-compendium-library .forge-compendium-book:hover {
    opacity: 0.8;
}

.forge-compendium-library .forge-compendium-book .forge-compendium-img {
    width: 100%;
    height: 100%;
    background: linear-gradient(to right, rgb(60, 13, 20) 3px, rgba(255, 255, 255, 0.5) 5px, rgba(255, 255, 255, 0.25) 7px, rgba(255, 255, 255, 0.25) 10px, transparent 12px, transparent 16px, rgba(255, 255, 255, 0.25) 17px, transparent 22px);
    background-size: cover;
    background-position: top center;
    box-shadow: 0 0 5px -1px black, inset -1px 1px 2px rgba(255, 255, 255, 0.5);
    border-radius: 5px;
}

.forge-compendium-library .forge-compendium-book .forge-compendium-title {
    position: absolute;
    bottom: 0px;
    width: calc(100% - 8px);
    font-size: 14px;
    color: #fff;
    background: rgba(0, 0, 0, 0.7);
    text-align: center;
    padding: 10px;
    border-radius: 5px;
    margin: 4px;
    border: 1px solid #000;
}

.forge-compendium-listing .forge-compendium-item {
    border-radius: 8px;
    cursor: pointer;
    background-color: rgba(255, 255, 255, 0.8);
}

.forge-compendium-listing .forge-compendium-item .forge-compendium-title {
    font-size: 20px;
    line-height: 40px;
    margin: 0px 10px;
}

.forge-compendium-listing .forge-compendium-list[depth="1"] .forge-compendium-title {
    font-size: 16px;
    margin-left: 20px;
}

.forge-compendium-listing .forge-compendium-category {
    height: 60px;
    flex: 0 0 60px;
    position: relative;
    margin: 8px;
    border-radius: 8px;
    cursor: pointer;
    background-color: rgba(255, 255, 255, 0.8);
}

.forge-compendium-listing .forge-compendium-category .forge-compendium-icon {
    height: 60px;
    flex: 0 0 50px;
    padding: 10px;
    text-align: center;
    font-size: 40px;
    line-height: 1px;
}

.forge-compendium-listing .forge-compendium-category .forge-compendium-title {
    font-size: 30px;
    line-height: 60px;
    margin: 0px;
}

.forge-compendium-sidebar .directory-list .subdirectory .folder {
    border-left: 6px solid transparent;
    border-color: transparent;
}

#forge-compendium-browser .compendium-information {
    text-align: center;
    width: 100%;
    height: 100%;
    align-content: center;
}

#forge-compendium-browser .compendium-muted {
    opacity: 0.4;
    font-weight: bold;
}

.forge-compendium-browser .forge-compendium-book-container {
    height: calc(100% + 16px);
    overflow: hidden;
    margin: -8px;
}

.forge-compendium-browser .forge-compendium-background {
    height: 100%;
    background-size: cover;
    background-position: top center;
}

.forge-compendium-browser .forge-compendium-book-title {
    font-size: 100px;
    text-align: center;
    flex: 0 0 25%;
    overflow: hidden;
    white-space:nowrap;
    text-overflow: ellipsis;
}

.forge-compendium-browser .forge-compendium-info {
    margin: 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.4);
    overflow-y: auto;
    overflow-x: hidden;
}

.forge-compendium-browser .forge-compendium-description {
    margin: 10px;
    padding: 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.8);
}

.forge-compendium-browser .forge-compendium-contains {
    margin: 10px;
    padding: 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.8);
    flex: 0 0 300px;
}

.forge-compendium-browser .forge-compendium-list {
}

.forge-compendium-browser .flexcontain {
    flex-grow: 0;
}

.forge-compendium-browser .forge-compendium-listing-header {
    padding: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    margin-bottom: 0px;
}

.forge-compendium-browser .navigation-row {
    flex: 0 0 30px;
}

.navigation-row .navigation-button {
    padding: 8px;
    text-transform: uppercase;
    cursor: pointer;
}

.navigation-row .navigation-button.next {
    text-align: right;
}

.navigation-row .navigation-button.disabled {
    cursor: default;
    color: #C0C0C0;
}

.navigation-row .navigation-section-link {
    flex-grow: 0;
    padding: 4px;
    line-height: 22px;
}

.navigation-row .navigation-section-link:first-child {
    margin-left: 4px;
}

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
</style>
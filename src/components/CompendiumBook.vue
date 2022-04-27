<template>
    <div class="forge-compendium-book-container flexrow">
        <div class="forge-compendium-sidebar directory flexcol">
            <header class="directory-header">
                <div class="header-actions action-buttons flexrow">
                    <button class="compendium-library" @click="exit"><i class="fas fa-atlas"></i> Compendium Library</button>
                </div>
                <img :src="book.img" @click="selectMain">
            </header>
            <div class="flexrow navigation-row">
                <div class="navigation-button prev" :class="chapterLinkDisabled('prev')">
                    <i class="fas fa-chevron-left"></i> Prev Chapter
                </div>
                <div class="navigation-button next" :class="chapterLinkDisabled('next')">
                    Next Chapter <i class="fas fa-chevron-right"></i>
                </div>
            </div>
            <div v-if="entry || listing" class="flexrow navigation-row">
                <div v-for="section in mainListing" :key="section.id" class="navigation-section-link" :class="sectionClass(section)" :title="section.name" @click="selectListing(section)">
                    <i class="fas" :class="section.icon"></i>
                </div>
            </div>
            <compendium-directory :hierarchy="mainSection" @select="selectListing"></compendium-directory>
        </div>
        <div class="forge-compendium-content flexcol">
            <h2 v-if="entry || listing" class="flexrow flexcontain forge-compendium-listing-header">
                <a href="#" style="flex: 0 0 20px;"><i class="fas fa-chevron-left"></i></a>
            </h2>
            <compendium-entry v-if="entry" :entry="entry" @link="openLink"></compendium-entry>
            <compendium-listing v-else-if="listing" :listing="listing" @select="selectListing" @entry="selectEntry"></compendium-listing>
            <div v-else class="forge-compendium-background flexcol" :style="backgroundStyle">
                <div class="forge-compendium-book-title">{{book.name}}</div>
                <div class="forge-compendium-info flexcol">
                    <div class="flexrow flexcontain">
                        <div class="forge-compendium-description" v-html="book.data.description"></div>
                        <div class="forge-compendium-contains">
                            <b>Contains:</b>
                            <ul>
                                <li>
                                    <i class="fas fa-book-open"></i> 200 Journal Entries
                                </li>
                                <li>
                                    <i class="fas fa-suitcase"></i> 100 Items
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="forge-compendium-listing flexcol">
                        <div class="forge-compendium-category flexrow" v-for="item in mainListing" :key="item.id" :data-id="item.id" @click="selectListing(item)">
                            <div class="forge-compendium-icon"><i class="fas" :class="item.icon"></i></div>
                            <div class="forge-compendium-title">{{item.name}}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import CompendiumEntry from "./CompendiumEntry.vue";
import CompendiumDirectory from "./CompendiumDirectory.vue";
import CompendiumListing from "./CompendiumListing.vue";

export default {
    name: "CompendiumBook",
    components: {
        CompendiumDirectory,
        CompendiumListing,
        CompendiumEntry
    },
    props: {
        book: Object
    },
    data: () => ({
        listing: null,
        entry: null
    }),
    methods: {
        exit() {
            this.$emit("exit");
        },
        selectListing(item) {
            console.log("selecting listing", item);
            this.listing = item;
            this.entry = null;
        },
        selectEntry(item) {
            this.entry = item;
        },
        selectMain() {
            this.listing = null;
            this.entry = null;
        },
        sectionClass(section) {
            return this.mainSection.id == section.id ? "active" : "";
        },
        chapterLinkDisabled(direction) {
            return "disabled";
        },
        openLink(pack, id) {
            //find the other entry and open it.
            console.log("Open a link", pack, id);
        }
    },
    computed: {
        mainListing() {
            return this.book.children;
        },
        mainSection() {
            return this.book.children.find(c => c.id == this.entity?.section || c.id == this.listing?.section);
        },
        backgroundStyle() {
            return `background-image:url(${this.book.data.background})`;
        }
    },
    watch: {
    },
    mounted() {
        this.book.index();
        console.log("Book", this.book);
    },
};
</script>
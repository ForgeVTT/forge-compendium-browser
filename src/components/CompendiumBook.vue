<template>
    <div class="forge-compendium-book-container flexrow">
        <div class="forge-compendium-sidebar flexcol">
            <header class="directory-header flexcol">
                <div class="header-action-buttons flexrow">
                    <button class="compendium-library" @click="exit"><i class="fas fa-atlas"></i> Compendium Library</button>
                </div>
                <img class="forge-compendium-book-image" :src="book.img" @click="clearPath">
                <hr />
                <div class="flexrow navigation-row">
                    <div class="navigation-button prev" :class="!canPrevChapter ? 'disabled' : ''" @click="changeChapter(-1)">
                        <i class="fas fa-chevron-left"></i> Prev Chapter
                    </div>
                    <div class="navigation-button next" :class="!canNextChapter ? 'disabled' : ''" @click="changeChapter(1)">
                        Next Chapter <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
                <!-- section links -->
                <div class="flexrow navigation-section">
                    <div v-for="section in sections" :key="section.id" class="navigation-section-link" :class="sectionActive(section)" :title="section.name" @click="selectEntity(section)">
                        <i class="fas" :class="section.icon"></i>
                        <span>{{ section.name }}</span>
                    </div>
                </div>
                <hr />
            </header>
            <compendium-directory :hierarchy="directoryList" :entity="entity" @select="selectEntity"></compendium-directory>
        </div>
        <div class="forge-compendium-content flexcol">
            <h2 v-if="currentEntity" class="flexrow flexcontain forge-compendium-listing-header">
                <div class="back-button" @click="selectEntity(entity.parent)"><i class="fas fa-chevron-left"></i></div>
                <!-- breadcrumbs -->
                <ul class="flexrow forge-compendium-breadcrumbs">
                    <li v-for="(item, index) in path" :key="item.id">
                        <span v-if="index != 0">/</span>
                        <div @click="selectEntity(item)">{{item.name}}</div>
                    </li>
                </ul>
            </h2>
            <div v-if="!currentEntity" class="forge-compendium-background flexcol" :style="backgroundStyle">
                <div class="forge-compendium-book-title">
                    <svg :viewBox="titleViewbox" class="forge-compendium-svg">
                        <text x="15" y="60" stroke="#000000" fill="#ffffff" stroke-width="3" font-family="Modesto Condensed" font-weight="bold">
                            {{ bookName }}
                        </text>
                    </svg>
                </div>
                <div class="forge-compendium-info flexcol">
                    <div class="flexrow flexcontain">
                        <div class="forge-compendium-description" v-html="book.description"></div>
                        <div class="forge-compendium-contains">
                            <b>Contains:</b>
                            <ul class="forge-compendium-contains-list">
                                <li v-for="section in sections" :key="section.id">
                                    <i class="fas" :class="section.icon"></i> {{section.count}} {{section.name}}
                                </li>
                            </ul>
                        </div>
                    </div>
                    <!-- Section listing -->
                    <div class="forge-compendium-listing flexcol">
                        <div class="forge-compendium-section flexrow" v-for="item in sections" :key="item.id" :data-id="item.id" @click="selectEntity(item)">
                            <div class="forge-compendium-icon"><i class="fas" :class="item.icon"></i></div>
                            <div class="forge-compendium-title">{{item.name}}<span class="forge-compendium-stat">{{item.count}} entries</span></div>
                        </div>
                    </div>
                </div>
            </div>
            <compendium-entry v-else-if="currentEntity.type == 'document'" :entry="currentEntity" @link="openLink"></compendium-entry>
            <compendium-listing v-else :listing="currentEntity" @select="selectEntity"></compendium-listing>
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
        entity: null,
    }),
    methods: {
        exit() {
            this.$emit("exit");
        },
        clearPath() {
            this.entity = null;
        },
        selectEntity(entity) {
            console.log("Book, Selecting Entity", entity);
            if (entity && entity.type == "book") {
                this.clearPath();
            } else if(entity) {
                if (game.ForgeCompendiumBrowser.setting("same-name") && entity.children && entity.children.length && entity.children[0].name == entity.name) {
                    this.entity = entity.children[0];
                } else {
                    this.entity = entity;
                }
            }
        },
        changeChapter(dir) {
            const currentChapter = this.currentChapter;
            if (currentChapter) {
                let idx = this.currentSection.children.findIndex(c => c.id == currentChapter.id);
                idx += dir;
                // If there is an entry with the same name as the current chapter, then use that to display as the entity.
                const chapter = this.currentSection.children[idx];
                const entry = (game.ForgeCompendiumBrowser.setting("same-name") && chapter.children.length == 1 ? chapter.children.find(c => c.name == chapter.name) : null);
                
                console.log("Changing Chapter", chapter, entry);
                
                this.selectEntity(entry || chapter);
            }
        },
        sectionActive(section) {
            return this.currentSection?.id == section.id ? "active" : "";
        },
        findEntity(parent, id) {
            if (parent.children) {
                let entity = parent.children.find(c => c.id == id);
                if (entity) return entity;
                for (let child of parent.children) {
                    entity = this.findEntity(child, id);
                    if (entity) return entity;
                }
            }
            return null;
        },
        openLink(pack, id) {
            //find the other entry and open it.
            console.log("Open a link", pack, id);
            const parts = pack.split(".");
            if (parts.length && parts[0] == this.book.id) {
                // This is document is from this book, so find it and open it
                let entity = this.findEntity(this.book, id);
                if (entity) {
                    this.entity = entity;
                }
            } else {
                // TODO: check to see if this is another compendium book
            }
        },
    },
    computed: {
        canPrevChapter() {
            const currentChapter = this.currentChapter;
            console.log("current chapter", currentChapter);
            if (!currentChapter) {
                return false;
            } else {
                console.log("Section", this.currentSection);
                return this.currentSection.children.findIndex(c => c.id == currentChapter.id) > 0;
            }
        },
        canNextChapter() {
            const currentChapter = this.currentChapter;
            console.log("current chapter", currentChapter, this.currentSection);
            if (!currentChapter) {
                return false;
            } else {
                console.log("Section", this.currentSection);
                return this.currentSection.children.findIndex(c => c.id == currentChapter.id) < this.currentSection.children.length - 1;
            }
        },
        path() {
            let items = [];
            let item = this.entity;
            items.push(item);
            while(item.parent){
                item = item.parent;
                if (item.type != "book") {
                    let canAdd = true;
                    if (game.ForgeCompendiumBrowser.setting("same-name") && item.name == items[items.length - 1].name) {
                        //Don't double up on the names if the user doesn't want to see them
                        canAdd = false;
                    }
                    if(canAdd) {
                        console.log("Adding breadcrumb", item);
                        items.push(item);
                    }
                }
            }
            items = items.reverse();
            return items;
        },
        sections() {
            return this.book.children;
        },
        directoryList() {
            console.log("Directory List", this.currentSection);
            if (this.currentSection) {
                return [this.currentSection];
            } //else if(this.sections) {
            //    return this.sections.map(({children, ...o}) => o);   //Don't include the children, we only want the upper level at this point
            //}
            return [];
        },
        currentSection() {
            if (!this.entity) {
                return null;
            } else {
                let section = this.entity;
                while(section.type != "section" && section.parent){
                    section = section.parent;
                }
                return section;
            }
        },
        currentChapter() {
            if (!this.entity || this.entity.type == "section") {
                return null;
            } else {
                let chapter = this.entity;
                while(chapter.parent && chapter.parent.type != "section"){
                    chapter = chapter.parent;
                }
                return chapter;
            }
        },
        currentEntity() {
            return this.entity;
        },
        backgroundStyle() {
            if (!this.book)
                return "";

            return `background-image:url(${this.book.background})`;
        },
        bookName() {
            return this.book.name.toUpperCase();
        },
        titleViewbox() {
            return `0 0 ${this.book.name.length * 100} 50`;
        }
    },
    watch: {
    },
    async mounted() {
        console.log("game", game);
        await game.ForgeCompendiumBrowser.indexBook(this.book);
        console.log("Book", this.book);
    },
};
</script>

<style scoped>
.forge-compendium-book-container {
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
    /* Permalink - use to edit and share this gradient: https://colorzilla.com/gradient-editor/#45484d+0,000000+100;Black+3D+%231 */
    background: rgb(69,72,77); /* Old browsers */
    background: -moz-linear-gradient(top,  rgba(69,72,77,1) 0%, rgba(0,0,0,1) 100%); /* FF3.6-15 */
    background: -webkit-linear-gradient(top,  rgba(69,72,77,1) 0%,rgba(0,0,0,1) 100%); /* Chrome10-25,Safari5.1-6 */
    background: linear-gradient(to bottom,  rgba(69,72,77,1) 0%,rgba(0,0,0,1) 100%); /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */
    filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#45484d', endColorstr='#000000',GradientType=0 ); /* IE6-9 */

    color: var(--color-text-light-highlight);
}

.forge-compendium-sidebar header {
    overflow: hidden;
    text-align: center;
    flex: 0 0 442px;
}

.forge-compendium-sidebar .header-action-buttons {
    flex: 0 0 36px;
    width: 100%;
}

.forge-compendium-sidebar header button {
  height: 28px;
  line-height: 26px;
  margin: 4px;
  white-space: nowrap;
  cursor: pointer;
}

.forge-compendium-sidebar header img {
    height: 300px;
    flex: 0 0 300px;
    width: 100%;
    object-fit: contain;
    object-position: top center;
    cursor: pointer;
    border: 0px;
}

.forge-compendium-sidebar header hr {
    flex: 0 0 1px;
    width: 100%;
    border-top-color: var(--color-border-dark-primary);
    border-bottom-color: var(--color-border-dark-secondary);
    margin: 4px 0px 1px 0px;
}

.forge-compendium-browser .navigation-row {
    flex: 0 0 30px;
}

.forge-compendium-browser .navigation-row .navigation-button {
    padding: 8px;
    text-transform: uppercase;
    cursor: pointer;
}

.forge-compendium-browser .navigation-row .navigation-button:not(.disabled):hover {
    text-shadow: 0 0 8px var(--color-shadow-primary);
}

.forge-compendium-browser .navigation-row .navigation-button.next {
    text-align: right;
}

.forge-compendium-browser .navigation-row .navigation-button.disabled {
    cursor: default;
    color: #808080;
}

.forge-compendium-browser .navigation-section {
    flex: 0 0 55px;
    height: 55px;
}

.forge-compendium-browser .navigation-section .navigation-section-link {
    flex-grow: 0;
    padding: 4px 6px;
    line-height: 22px;
    cursor: pointer;
}

.forge-compendium-browser .navigation-section .navigation-section-link i {
    font-size: 24px;
}

.forge-compendium-browser .navigation-section .navigation-section-link span {
    font-size: 12px;
}

.forge-compendium-browser .navigation-section .navigation-section-link:first-child {
    margin-left: 4px;
}

.forge-compendium-browser .navigation-section .navigation-section-link:hover {
    color: lightgray;
    text-shadow: 0 0 8px var(--color-shadow-primary);
}

.forge-compendium-browser .navigation-section .navigation-section-link.active {
    color: limegreen;
}

.forge-compendium-sidebar .directory-list {
    flex: 1;
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
}

.forge-compendium-sidebar .directory-list .directory-item {
  line-height: var(--sidebar-item-height);
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
}
.forge-compendium-sidebar .directory-list .directory-item h3,
.forge-compendium-sidebar .directory-list .directory-item h4 {
  white-space: nowrap;
  overflow: hidden;
}
.forge-compendium-sidebar .directory-list .directory-item .document-name {
  margin: 0 0 0 8px;
}
.forge-compendium-sidebar .directory-list .directory-item img {
  flex: 0 0 var(--sidebar-item-height);
  height: var(--sidebar-item-height);
  width: var(--sidebar-item-height);
  object-fit: cover;
  object-position: 50% 0;
  border: none;
}
.forge-compendium-sidebar .directory-list .directory-item img[data-src] {
  visibility: hidden;
}
.forge-compendium-sidebar .directory-list .directory-item.folder {
  border: none;
}
.forge-compendium-sidebar .directory-list .directory-item.folder .context {
  background-color: transparent !important;
  border-color: var(--color-border-highlight);
}
.forge-compendium-sidebar .directory-list .directory-item.document {
  border-top: 1px solid var(--color-border-dark);
  border-bottom: 1px solid var(--color-border-dark-3);
}
.forge-compendium-sidebar .directory-list .directory-item:last-child {
  border-bottom-color: transparent;
}
.forge-compendium-sidebar .directory-list .directory-item.context,
.forge-compendium-sidebar .directory-list .directory-item.active {
  border-color: var(--color-border-highlight);
}

.forge-compendium-content {
    height: 100%;
}

.forge-compendium-content .forge-compendium-description {
    margin: 10px;
    padding: 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.8);
}

.forge-compendium-content .forge-compendium-contains {
    margin: 10px;
    padding: 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.8);
    flex: 0 0 300px;
}

.forge-compendium-content .forge-compendium-contains .forge-compendium-contains-list {
    list-style: none;
    padding-left: 10px;
}

.forge-compendium-content .forge-compendium-contains i {
    width: 24px;
}

.forge-compendium-content .forge-compendium-section {
    height: 60px;
    flex: 0 0 60px;
    position: relative;
    margin: 8px;
    border-radius: 8px;
    cursor: pointer;
    background-color: rgba(255, 255, 255, 0.8);
}

.forge-compendium-content .forge-compendium-section .forge-compendium-icon {
    height: 60px;
    flex: 0 0 50px;
    padding: 10px;
    text-align: center;
    font-size: 40px;
    line-height: 1px;
}

.forge-compendium-content .forge-compendium-section .forge-compendium-title {
    font-size: 30px;
    line-height: 60px;
    margin: 0px;
}

.forge-compendium-content .forge-compendium-section .forge-compendium-stat{
    font-size: 18px;
    color: #808080;
    margin-left: 10px;
}

.forge-compendium-content .forge-compendium-book-title {
    font-size: 100px;
    text-align: center;
    flex: 0 0 25%;
    overflow: hidden;
    white-space:nowrap;
    text-overflow: ellipsis;
}

.forge-compendium-content .forge-compendium-book-title  .forge-compendium-svg {
    width: 100%;
    height: 100%;
}

.forge-compendium-content .forge-compendium-info {
    margin: 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.4);
    overflow-y: auto;
    overflow-x: hidden;
}

.forge-compendium-browser .forge-compendium-listing-header {
    padding: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    margin-bottom: 0px;
}

.forge-compendium-breadcrumbs {
    list-style: none;
    margin: 0;
    padding: 0;
}
.forge-compendium-breadcrumbs li {
    flex-grow: 0;
    white-space: nowrap;
}
.forge-compendium-breadcrumbs li > * {
    display: inline-block;
    white-space: nowrap;
}
.forge-compendium-breadcrumbs li > span {
    padding: 0px 8px;
}
.forge-compendium-breadcrumbs li > div {
    cursor: pointer;
}
.forge-compendium-breadcrumbs li > div:hover {
    text-shadow: 0 0 8px var(--color-shadow-primary);
}

.back-button {
    flex: 0 0 20px;
    cursor: pointer;
}
.back-button:hover {
    text-shadow: 0 0 8px var(--color-shadow-primary);
}
</style>
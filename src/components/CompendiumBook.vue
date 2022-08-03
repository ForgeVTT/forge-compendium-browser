<template>
  <div class="forge-compendium-book-container flexrow">
    <div class="forge-compendium-sidebar flexcol">
      <header class="directory-header flexcol">
        <div class="header-action-buttons flexrow">
          <div class="compendium-library" @click="exit">
            <i class="fas fa-atlas"></i> {{ this.i18n("ForgeCompendiumBrowser.CompendiumLibrary") }}
          </div>
        </div>
        <img
          class="forge-compendium-book-image"
          :src="book.img"
          @click="clearPath"
        />
        <hr />
        <!-- navigation row -->
        <div class="flexrow navigation-row">
          <div
            class="navigation-button first"
            :class="canPrevChapter"
            @click="changeChapter(-1)"
          >
            <i class="fas fa-angle-double-left"></i>
          </div>
          <div
            class="navigation-button prev"
            :class="canPrevItem"
            @click="changeItem(-1)"
          >
            <i class="fas fa-chevron-left"></i> {{ this.i18n("ForgeCompendiumBrowser.Prev") }}
          </div>
          <div
            class="navigation-button next"
            :class="canNextItem"
            @click="changeItem(1)"
          >
            {{ this.i18n("ForgeCompendiumBrowser.Next") }} <i class="fas fa-chevron-right"></i>
          </div>
          <div
            class="navigation-button last"
            :class="canNextChapter"
            @click="changeChapter(1)"
          >
            <i class="fas fa-angle-double-right"></i>
          </div>
        </div>
        <!-- section links -->
        <div class="flexrow navigation-section">
          <div
            v-for="section in sections"
            :key="section.id"
            class="navigation-section-link"
            :class="sectionActive(section)"
            :title="section.name"
            @click="selectEntity(section)"
          >
            <i class="fas" :class="section.icon"></i>
            <span>{{ section.name }}</span>
          </div>
          <div
            class="navigation-section-link"
            :class="sectionActive({ id: 'search' })"
            @click="openSearch()"
          >
            <i class="fas fa-search"></i>
            <span>{{ this.i18n("ForgeCompendiumBrowser.Search") }}</span>
          </div>
        </div>
        <hr />
      </header>
      <ol v-if="currentSection" class="forge-compendium-directory-list">
        <compendium-directory
          :entity="currentSection"
          :selected="folder"
          @select="selectEntity"
          @open="selectEntity"
        ></compendium-directory>
      </ol>
    </div>
    <div class="forge-compendium-content flexcol">
      <h2
        v-if="document"
        class="flexrow flexcontain forge-compendium-listing-header"
      >
        <div
          class="back-button"
          :class="canHistory(-1)"
          @click="viewHistory(-1)"
        >
          <i class="fas fa-chevron-left"></i>
        </div>
        <div
          class="forward-button"
          :class="canHistory(1)"
          @click="viewHistory(1)"
        >
          <i class="fas fa-chevron-right"></i>
        </div>
        <!-- breadcrumbs -->
        <ul class="flexrow forge-compendium-breadcrumbs">
          <li v-for="(item, index) in path" :key="item.id">
            <span v-if="index != 0">/</span>
            <div @click="selectEntity(item)">{{ item.name }}</div>
          </li>
        </ul>
        <div class="forge-entry-import" @click="importEntry">
            <i class="fas fa-download"></i> {{ this.i18n("ForgeCompendiumBrowser.Import") }}
        </div>
      </h2>
      <compendium-entry
        v-if="document"
        :entry="document"
        @link="openLink"
      ></compendium-entry>
      <compendium-listing
        v-else-if="currentSection"
        :listing="currentSection"
        @select="selectEntity"
        @open="selectEntity"
      ></compendium-listing>
      <div
        v-else
        class="forge-compendium-background flexcol"
        :style="backgroundStyle"
      >
        <!-- Book Title -->
        <div class="forge-compendium-book-title">
          <svg class="forge-compendium-svg">
            <text
              x="15"
              y="110"
              stroke="#000000"
              fill="#ffffff"
              stroke-width="3"
              font-family="Modesto Condensed"
              font-weight="bold"
            >
              {{ bookName }}
            </text>
          </svg>
        </div>
        <div class="forge-compendium-info flexcol">
          <!-- Search -->
          <div
            v-if="searchTerm != null"
            class="forge-compendium-search-area flexcol"
          >
            <div class="forge-compendium-search-bar flexrow">
              <input type="text" v-model="searchTerm" @keypress="checkEnter" />
              <button type="button" @click="searchBook()" title="Search">
                <i class="fas fa-search"></i>
              </button>
              <button
                type="button"
                @click="clearSearch()"
                title="Clear search term"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
            <!-- Search Results -->
            <div
              v-if="searchResults.length"
              class="forge-compendium-search-list"
            >
              <table class="forge-compendium-search-table">
                <tr
                  v-for="item in searchResults"
                  :key="item.id"
                  :data-id="item.id"
                  @click="selectFromSearch(item.document)"
                >
                  <td class="search-image">
                    <img v-if="item.img" :src="item.img" />
                  </td>
                  <td class="search-section">
                    <i class="fas" :class="item.icon" :title="item.section"></i>
                  </td>
                  <td class="search-name">
                    {{ item.name }}
                  </td>
                  <td class="search-parent">
                    {{ item.parent }}
                  </td>
                </tr>
              </table>
            </div>
            <div v-else class="no-results"><div>{{ this.i18n("ForgeCompendiumBrowser.NoSearchResults") }}</div></div>
          </div>
          <div v-else>
            <div class="flexrow flexcontain">
              <div
                class="forge-compendium-description"
                v-html="book.description"
              ></div>
              <div class="forge-compendium-contains">
                <b>Contains:</b>
                <ul class="forge-compendium-contains-list">
                  <li v-for="section in sections" :key="section.id">
                    <i class="fas" :class="section.icon"></i>
                    {{ section.count }} {{ section.name }}
                  </li>
                </ul>
                <div style="text-align: center; display: none">
                  <button @click="importModule">
                    <i class="fas fa-download"></i> {{ this.i18n("ForgeCompendiumBrowser.ImportDocuments") }}
                  </button>
                </div>
              </div>
            </div>
            <!-- Section listing -->
            <div class="forge-compendium-section-listing flexrow">
              <div
                class="forge-compendium-section flexcol"
                v-for="item in sections"
                :key="item.id"
                :data-id="item.id"
                @click="selectEntity(item)"
              >
                <div class="forge-compendium-icon">
                  <i class="fas" :class="item.icon"></i>
                </div>
                <div class="forge-compendium-title">{{ item.name }}</div>
              </div>
              <div
                class="forge-compendium-section flexcol"
                @click="openSearch()"
              >
                <div class="forge-compendium-icon">
                  <i class="fas fa-search"></i>
                </div>
                <div class="forge-compendium-title">{{ this.i18n("ForgeCompendiumBrowser.Search") }}</div>
              </div>
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
    CompendiumEntry,
  },
  props: {
    book: Object,
  },
  data: () => ({
    folder: null,   // This is used to determine the selected path on the left side
    document: null,
    history: [],
    historyPosition: 0,
    searchTerm: null,
    searchResults: [],
  }),
  methods: {
    exit() {
      this.$emit("exit");
    },
    clearPath() {
      this.folder = null;
      this.document = null;
      this.searchTerm = null;
    },
    selectFromSearch(entity) {
      this.addToHistory({ type: "search", query: this.searchTerm });
      this.selectEntity(entity);
    },
    async selectEntity(entity) {
      if (!entity) return;

      if (entity.type == "search") {
        this.openSearch(entity.query);
      } else if (entity.type == "book") {
        this.clearPath();
      } else if (entity.type == "document") {
        if (!entity.document) {
          let collection = game.packs.get(entity.packId);
          entity.document = await collection.getDocument(entity.id);
          console.log("Getting document", entity.document, entity);
        }
        this.document = entity;
        this.addToHistory(entity);
        this.folder = entity;
      } else if (entity) {
        this.folder = entity;
        if (entity.type == "section") this.document = null;
      }
    },
    findClosestChapter(dir) {
      const currentChapter = this.currentChapter;
      if (
        !currentChapter ||
        !this.currentSection ||
        !this.currentSection.children
      )
        return false;

      let idx = this.currentSection.children.findIndex((c) => c.id == currentChapter.id);
      idx += dir;
      // If there is an entry with the same name as the current chapter, then use that to display as the entity.
      const chapter = this.currentSection.children[idx];
      return chapter;
    },
    changeChapter(dir) {
      const chapter = this.findClosestChapter(dir);
      if (!chapter) 
        return;

      let checkedEntities = [];
      // when changing the chapter, find the next available document in the chapter to display
      const entry = this.findDocument(0, chapter, 1, checkedEntities);

      this.selectEntity(entry || chapter);
    },
    moveUpParent(id, parent, dir, checkedEntities) {
      if (!parent || parent.type == "book") 
        return null;

      // Haven't found any children, so go up a parent and move to the next one
      let pidx = parent.children.findIndex((c) => c.id == id);
      if (!checkedEntities.includes(parent.id)) {
        let entity = this.findDocument(pidx + dir, parent, dir, checkedEntities);
        if (entity) 
            return entity;
      }
      return this.moveUpParent(parent.id, parent.parent, dir, checkedEntities);
    },
    findDocument(index, parent, dir, checkedEntities) {
      checkedEntities.push(parent.id);
      for (let i = index; i >= 0 && i < parent.children.length; i += dir) {
        if (parent.children[i].children) {
          let idx = dir < 0 ? parent.children[i].children.length - 1 : 0;
          if (!checkedEntities.includes(parent.children[i].id)) {
            let entity = this.findDocument(idx, parent.children[i], dir, checkedEntities);
            if (entity) 
                return entity;
          }
        } else if (parent.children[i].type == "document") {
          return parent.children[i];
        }
      }
      return null;
    },
    findClosestItem(dir, idx) {
      let checkedEntities = [];

      if (idx == undefined) {
        if (!this.document) 
            return null;
        idx = this.document.parent.children.findIndex((i) => i.id == this.document.id);
      }

      let newChild = this.findDocument(idx + dir, this.document.parent, dir, checkedEntities);
      if (!newChild) {
        newChild = this.moveUpParent(this.document.parent.id, this.document.parent.parent, dir, checkedEntities);
      }

      return newChild;
    },
    changeItem(dir) {
      let entity = this.findClosestItem(dir);
      if (entity && entity.type == "document") {
        this.selectEntity(entity);
      }
    },
    sectionActive(section) {
      return this.currentSection?.id == section.id ||
        (this.searchTerm !== null &&
          section.id == "search" &&
          this.currentSection?.id == null)
        ? "active"
        : "";
    },
    findEntity(parent, id) {
      if (parent.children) {
        let entity = parent.children.find((c) => c.id == id);
        if (entity) 
            return entity;
        for (let child of parent.children) {
          entity = this.findEntity(child, id);
          if (entity) 
            return entity;
        }
      }
      return null;
    },
    openLink(pack, id) {
      //find the other entry and open it.
      const parts = pack.split(".");
      if (parts.length) {
        if (parts[0] == this.book.id) {
          // This is document is from this book, so find it and open it
          const entity = this.findEntity(this.book, id);
          if (entity) {
            this.selectEntity(entity);
          }
        } else {
          // check to see if this is another compendium book
          this.$emit("link", parts[0], pack, id);
        }
      }
    },
    addToHistory(document) {
      if (this.historyPosition < this.history.length - 1) {
        this.history.length = this.historyPosition + 1;
      }
      this.history.push(document);
      this.historyPosition = this.history.length - 1;
    },
    viewHistory(dir) {
      this.historyPosition += dir;
      this.historyPosition = Math.min(Math.max(0, this.historyPosition), this.history.length - 1);
      const entity = this.history[this.historyPosition];
      if (entity.type == "search") {
        this.openSearch(entity.query);
      } else {
        this.document = entity;
        this.folder = entity;
      }
    },
    canHistory(dir) {
      const position = this.historyPosition + dir;
      return position < 0 || position > this.history.length - 1 ? "disabled" : "";
    },
    async importModule() {
      const sections = this.sections.map((s) => ({
        id: s.id,
        name: s.name,
        count: s.count,
      }));
      const html = await renderTemplate("modules/forge-compendium-browser/import-documents.html", { sections });
      Dialog.prompt({
        title: game.i18n.localize("ForgeCompendiumBrowser.ImportCompendiumDocuments"),
        content: html,
        label: game.i18n.localize("ForgeCompendiumBrowser.Import"),
        callback: (html) => {
          const form = html.querySelector("#forge-compendium-browser-import");
          const fd = new FormDataExtended(form);
          const data = fd.toObject();

          const doImport = (entry) => {
            //go through this entry, find all documents and import them
            if (entry) {
              if (entry.type == "document") {
                const collection = game.collections.get(entry.collection.documentName);
                return collection.importFromCompendium(entry.collection, entry.id, {}, { renderSheet: false });
              } else if (entry.children && entry.children.length) {
                for (let child of entry.children) {
                  doImport(child);
                }
              }
            }
          };

          for (let [k, v] of Object.entries(data.sections)) {
            if (v) {
              const section = this.sections.find((s) => s.id == k);
              doImport(section);
            }
          }
        },
        rejectClose: false,
      });
    },
    openSearch(query = "") {
      this.searchTerm = query;
      this.document = null;
      this.folder = null;
    },
    clearSearch() {
      this.searchTerm = "";
      this.searchResults = [];
    },
    checkEnter(e) {
      if (e.keyCode === 13) {
        this.searchBook();
      }
    },
    searchBook() {
      if (this.searchTerm.length < 3) {
        this.searchResults = [];
      }
      // adding title and type here for a future improvement to allow for a more specific searching
      let title = this.searchTerm.toLowerCase();
      let type = null;
      let query = this.searchTerm.toLowerCase();

      // added idx and text here for a future improvement to show highlighted text
      let resultObject = (entity, idx, text) => {
        let section = this.book.children.find((s) => s.id == entity.parent.section);
        return {
          id: entity.id,
          name: entity.name,
          img: entity.img,
          parent: entity.parent.name,
          section: section.name,
          icon: section.icon,
          document: entity,
        };
      };

      let traverseSearch = (parent, results) => {
        let searchResult = null;

        if (parent.type == "document") {
          if (title != null) {
            const idx = parent.name.toLowerCase().indexOf(title);
            if (idx >= 0) {
              searchResult = resultObject(parent, idx, parent.name);
            }
          }
          if (query != null) {
            try {
              if (parent.document instanceof JournalEntry) {
                const idx = parent.document.data.content.toLowerCase().indexOf(query);
                if (idx >= 0) {
                  searchResult = resultObject(parent, idx, parent.document.data.content);
                }
              } else if (parent.document instanceof Actor) {
                const idx = parent.document.data.data.details.biography.value.toLowerCase().indexOf(query);
                if (idx >= 0) {
                  searchResult = resultObject(parent, idx, parent.document.data.data.details.biography.value);
                }
              } else if (parent.document instanceof Item) {
                const idx = parent.document.data.data.description.value.toLowerCase().indexOf(query);
                if (idx >= 0) {
                  searchResult = resultObject(parent, idx, parent.document.data.data.description.value);
                }
              }
            } catch {
              // continue regardless of error
            }
          }
          if (searchResult) {
            results[searchResult.id] = searchResult;
          }
        }
        if (parent.children && parent.children.length) {
          for (let child of parent.children) {
            if (parent.type == "book" && type != null && child.type != type)
              continue;
            traverseSearch(child, results);
          }
        }
      };

      let results = {};
      traverseSearch(this.book, results);
      this.searchResults = Object.values(results);
    },
    i18n(key) {
        return game.i18n.localize(key);
    },
    importEntry() {
        const collection = this.document.document.collection;
        const pack = game.packs.get(this.document.packId);
        console.log("importing", this.document, collection, pack);
        if (collection && collection.importFromCompendium(pack, this.document.id, {}, { renderSheet: true })) {
            ui.notifications.info("Document has been imported");
        }
    }
  },
  computed: {
    canPrevChapter() {
      return !this.findClosestChapter(-1) ? "disabled" : "";
    },
    canNextChapter() {
      return !this.findClosestChapter(1) || !this.currentChapter ? "disabled" : "";
    },
    canPrevItem() {
      return !this.findClosestItem(-1) ? "disabled" : "";
    },
    canNextItem() {
      return !this.findClosestItem(1) ? "disabled" : "";
    },
    path() {
      let items = [];
      let item = this.document;
      items.push(item);
      while (item.parent) {
        item = item.parent;
        if (item.type != "book") {
          let canAdd = true;
          if (game.ForgeCompendiumBrowser.setting("same-name") && item.name == items[items.length - 1].name) {
            //Don't double up on the names if the user doesn't want to see them
            canAdd = false;
          }
          if (canAdd) {
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
      if (this.currentSection) {
        return [this.currentSection];
      }
      return [];
    },
    currentSection() {
      if (!this.document && !this.folder) {
        return null;
      } else {
        let section = this.document || this.folder;
        while (section.type != "section" && section.parent) {
          section = section.parent;
        }
        return section;
      }
    },
    currentChapter() {
      if (!this.folder || this.folder.type == "section") {
        return null;
      } else {
        let chapter = this.folder;
        while (chapter.parent && chapter.parent.type != "section") {
          chapter = chapter.parent;
        }
        return chapter;
      }
    },
    backgroundStyle() {
      if (!this.book) 
        return "";

      return `background-image:url(${this.book.background})`;
    },
    bookName() {
      return this.book.name.toUpperCase();
    }
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
  background: rgb(69, 72, 77); /* Old browsers */
  background: -moz-linear-gradient(
    top,
    rgba(69, 72, 77, 1) 0%,
    rgba(0, 0, 0, 1) 100%
  ); /* FF3.6-15 */
  background: -webkit-linear-gradient(
    top,
    rgba(69, 72, 77, 1) 0%,
    rgba(0, 0, 0, 1) 100%
  ); /* Chrome10-25,Safari5.1-6 */
  background: linear-gradient(
    to bottom,
    rgba(69, 72, 77, 1) 0%,
    rgba(0, 0, 0, 1) 100%
  ); /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */
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

.forge-compendium-background {
  background-position: top center;
  background-size: cover;
  background-repeat: no-repeat;
  height: 100%;
}

.forge-compendium-browser .navigation-row {
  flex: 0 0 30px;
  padding: 0px 8px;
}

.forge-compendium-browser .navigation-row .navigation-button {
  padding: 8px 4px;
  text-transform: uppercase;
  cursor: pointer;
}

.forge-compendium-browser .navigation-row .navigation-button:not(.disabled):hover {
  text-shadow: 0 0 8px var(--color-shadow-primary);
}

.forge-compendium-browser .navigation-row .navigation-button.prev {
  text-align: left;
}
.forge-compendium-browser .navigation-row .navigation-button.next {
  text-align: right;
}

.forge-compendium-browser .navigation-row .navigation-button.first,
.forge-compendium-browser .navigation-row .navigation-button.last {
  flex: 0 0 20px;
}

.forge-compendium-browser .navigation-row .navigation-button.disabled {
  cursor: default;
  color: #808080;
}

.forge-compendium-browser .navigation-section {
  flex: 0 0 55px;
  height: 55px;
  justify-content: center;
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

.forge-compendium-sidebar .forge-compendium-directory-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.forge-compendium-sidebar > .forge-compendium-directory-list {
  flex: 1;
  overflow-y: auto;
}

.forge-compendium-content {
  height: 100%;
}

.forge-compendium-content .forge-compendium-description {
  margin: 10px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
}

.forge-compendium-content .forge-compendium-contains {
  margin: 10px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
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
  height: 200px;
  flex: 0 0 170px;
  position: relative;
  margin: 8px;
  border-radius: 8px;
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.95);
}

.forge-compendium-content .forge-compendium-section .forge-compendium-icon {
  height: 40px;
  padding: 30px;
  text-align: center;
  font-size: 80px;
  line-height: 1px;
}

.forge-compendium-content .forge-compendium-section .forge-compendium-title {
  font-size: 30px;
  line-height: 30px;
  margin: 0px;
  text-align: center;
  flex: 0 0 60px;
}

.forge-compendium-content .forge-compendium-section .forge-compendium-stat {
  font-size: 18px;
  color: #808080;
  margin-left: 10px;
}

.forge-compendium-content .forge-compendium-book-title {
  font-size: 100px;
  text-align: center;
  flex: 0 0 150px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.forge-compendium-content .forge-compendium-book-title .forge-compendium-svg {
  width: 100%;
  height: 100%;
}

.forge-compendium-content .forge-compendium-info {
  margin: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.4);
  overflow-y: auto;
}

.forge-compendium-content .forge-compendium-info .forge-compendium-section-listing {
  justify-content: center;
  margin-top: 20px;
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

.back-button,
.forward-button {
  flex: 0 0 30px;
  text-align: center;
  margin-right: 10px;
  cursor: pointer;
}

.back-button:not(.disabled):hover,
.forward-button:not(.disabled):hover {
  text-shadow: 0 0 8px var(--color-shadow-primary);
}

.back-button.disabled,
.forward-button.disabled {
  cursor: default;
  color: #808080;
}

.forge-compendium-search-area {
  padding: 10px;
  height: 100%;
}
.forge-compendium-search-area .forge-compendium-search-bar {
  flex: 0 0 30px;
}
.forge-compendium-search-area input[type="text"] {
  flex: 1;
  margin: 0 3px;
  background: rgba(255, 255, 245, 0.8);
  height: 30px;
  padding: 1px 3px;
  color: var(--color-text-dark-primary);
  font-family: inherit;
  font-size: inherit;
  text-align: inherit;
  line-height: inherit;
  border: 1px solid var(--color-border-light-tertiary);
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}
.forge-compendium-search-area button {
  flex: 0 0 30px;
  border-radius: 0px;
  cursor: pointer;
  overflow: hidden;
  height: 30px;
}
.forge-compendium-search-area button:last-child {
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
}
.forge-compendium-search-area .no-results {
  width: 100%;
  text-align: center;
  margin-top: 100px;
} 
.forge-compendium-search-area .no-results > div{
        padding: 20px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 10px;
    border: 2px solid #eee;
    width: 300px;
    margin: auto;
    font-weight: bold;
}
.forge-compendium-search-area .forge-compendium-search-list {
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  padding: 8px;
  height: calc(100% - 60px);
  margin-top: 10px;
  overflow-y: auto;
}
.forge-compendium-search-area .forge-compendium-search-table {
  max-height: 100%;
  margin: 0px;
}
.forge-compendium-search-area .forge-compendium-search-table tr {
  cursor: pointer;
}
.forge-compendium-search-area .forge-compendium-search-table tr td.search-image {
  width: 40px;
  max-height: 40px;
  text-align: center;
}
.forge-compendium-search-area .forge-compendium-search-table tr td.search-section {
  width: 30px;
  text-align: center;
}
.forge-compendium-search-area .forge-compendium-search-table tr td img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border: 0px;
}

.forge-entry-import {
  flex-grow: 0;
  cursor: pointer;
  margin-right: 8px;
  white-space: nowrap;
}
.forge-entry-import:hover {
  text-shadow: 0 0 8px var(--color-shadow-primary);
}
.compendium-library {
    cursor: pointer;
    padding: 6px;
    color: #ffffff;
    text-shadow: 0 -1px 0 rgb(0 0 0 / 25%);
    background-color: #363636;
    *background-color: #222222;
    background-image: -moz-linear-gradient(top, #444444, #222222);
    background-image: -webkit-gradient(linear, 0 0, 0 100%, from(#444444), to(#222222));
    background-image: -webkit-linear-gradient(top, #444444, #222222);
    background-image: -o-linear-gradient(top, #444444, #222222);
    background-image: linear-gradient(to bottom, #444444, #222222);
    background-repeat: repeat-x;
    border: 1px solid #000000;
    border-color: #222222 #222222 #000000;
    border-color: rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.25);
    border-radius: 4px;
    margin: 4px;
}
.compendium-library:hover {
    text-shadow: 0 0 8px var(--color-shadow-primary);
    background-color: #222222;
    *background-color: #151515;
}
</style>
<template>
  <div class="forge-compendium-book-container flexrow">
    <div class="forge-compendium-sidebar flexcol">
      <header class="directory-header flexcol">
        <div class="header-action-buttons flexrow">
          <div class="compendium-library" @click="exit" :title="this.i18n('ForgeCompendiumBrowser.ReturnToLibrary')">
            <i class="fas fa-circle-arrow-left"></i>
            {{ this.i18n("ForgeCompendiumBrowser.CompendiumLibrary") }}
          </div>
        </div>
        <div class="forge-compendium-book-image-container">
          <div class="forge-compendium-book-image-background" :style="backgroundStyle"></div>
          <img class="forge-compendium-book-image" :src="book.img" @click="clearPath" />
        </div>
        <hr />
        <!-- navigation row -->
        <div class="flexrow navigation-row">
          <div class="navigation-button first" :class="canPrevChapter" @click="changeChapter(-1)">
            <i class="fas fa-angle-double-left"></i>
          </div>
          <div class="navigation-button prev" :class="canPrevItem" @click="changeItem(-1)">
            <i class="fas fa-chevron-left"></i> {{ this.i18n("ForgeCompendiumBrowser.Prev") }}
          </div>
          <div class="navigation-button next" :class="canNextItem" @click="changeItem(1)">
            {{ this.i18n("ForgeCompendiumBrowser.Next") }} <i class="fas fa-chevron-right"></i>
          </div>
          <div class="navigation-button last" :class="canNextChapter" @click="changeChapter(1)">
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
          <div class="navigation-section-link" :class="sectionActive({ id: 'search' })" @click="openSearch()">
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
      <h2 v-if="document" class="flexrow flexcontain forge-compendium-listing-header">
        <div class="back-button" :class="canHistory(-1)" @click="viewHistory(-1)">
          <i class="fas fa-chevron-left"></i>
        </div>
        <div class="forward-button" :class="canHistory(1)" @click="viewHistory(1)">
          <i class="fas fa-chevron-right"></i>
        </div>
        <!-- breadcrumbs -->
        <ul class="flexrow forge-compendium-breadcrumbs">
          <li v-for="(item, index) in path" :key="item.id">
            <span v-if="index !== 0">/</span>
            <div class="breadcrumb-link" v-on="item.id !== document.id ? { click: () => selectEntity(item) } : {}">
              {{ item.name }}
            </div>
          </li>
        </ul>
        <div class="forge-entry-import" @click="importEntry">
          <i class="fas fa-download"></i> {{ this.i18n("ForgeCompendiumBrowser.Import") }}
        </div>
      </h2>
      <compendium-entry v-if="document" :entry="document" @link="openLink"></compendium-entry>
      <compendium-listing
        v-else-if="currentSection"
        :listing="currentSection"
        @select="selectEntity"
        @open="selectEntity"
      ></compendium-listing>
      <div v-else class="forge-compendium-background flexcol" :style="backgroundStyle">
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
          <div v-if="searchTerm != null" class="forge-compendium-search-area flexcol">
            <div class="forge-compendium-search-bar flexrow">
              <input type="text" v-model="searchTerm" />
              <button type="button" @click="clearSearch()" title="Clear search term">
                <i class="fas fa-times-circle"></i>
              </button>
              <span class="search-span">
                <i class="fas fa-search"></i>
              </span>
            </div>
            <!-- Search Results -->
            <div v-if="searchResults.length" class="forge-compendium-search-list">
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
            <div v-else class="no-results">
              <div>{{ this.i18n("ForgeCompendiumBrowser.NoSearchResults") }}</div>
            </div>
          </div>
          <div v-else class="flexcol">
            <div class="flexrow flexcontain">
              <div class="forge-compendium-description" v-html="book.description"></div>
              <div class="forge-compendium-contains flexcol">
                <b style="flex-grow: 0">{{ this.i18n("ForgeCompendiumBrowser.Contains") }}:</b>
                <ul class="forge-compendium-contains-list">
                  <li v-for="section in sections" :key="section.id">
                    <i class="fas" :class="section.icon"></i>
                    {{ section.count }} {{ section.name }}
                  </li>
                </ul>
                <div style="text-align: center; flex-grow: 0">
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
              <div class="forge-compendium-section flexcol" @click="openSearch()">
                <div class="forge-compendium-icon">
                  <i class="fas fa-search"></i>
                </div>
                <div class="forge-compendium-title">{{ this.i18n("ForgeCompendiumBrowser.Search") }}</div>
              </div>
            </div>
            <div class="flexrow forge-compendium-permissions">
              <button
                class="permission-button"
                @click="updatePermissions"
                :title="i18n('ForgeCompendiumBrowser.ConfigurePermissions')"
              >
                <i class="fas fa-lock"></i>
              </button>
              <b style="flex-grow: 0; margin-left: 8px">{{ this.i18n("ForgeCompendiumBrowser.Permissions") }}:</b>
              <div class="permission-text">
                <span class="user-permission" v-for="(permission, i) in permissionText" :key="i">{{ permission }}</span>
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
    folder: null, // This is used to determine the selected path on the left side
    document: null,
    history: [],
    historyPosition: 0,
    searchTerm: null,
    searchResults: [],
  }),
  watch: {
    book() {
      this.reset();
    },
    searchTerm() {
      this.searchBook();
      console.log("Search Results", this.searchResults, this.searchTerm);
    },
  },
  methods: {
    isV10() {
      return foundry.utils.isNewerVersion(game.version, "9.999999");
    },
    reset() {
      this.folder = null;
      this.document = null;
      this.history = [];
      this.historyPosition = 0;
      this.searchTerm = null;
      this.searchResults = [];
    },
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

      if (entity.type === "search") {
        this.openSearch(entity.query);
      } else if (entity.type === "book") {
        this.clearPath();
      } else if (entity.type === "folder") {
        const child = entity.children.find((c) => c.name === entity.name && c.type === "document");
        if (child) this.selectEntity(child);
        else {
          // traverse up the parents to find the first section type
          let parent = entity;
          while (parent && parent.type !== "section") {
            parent = parent.parent;
          }
          this.folder = parent;
          this.document = null;
          this.addToHistory(parent);

          this.$nextTick(() => {
            const el = document.querySelector(`.forge-compendium-listing [data-id="${entity.id}"] .forge-compendium-title`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
      } else if (entity.type === "document") {
        if (!entity.document) {
          const collection = game.packs.get(entity.packId);
          entity.document = await collection.getDocument(entity.id);
        }
        this.document = entity;
        this.addToHistory(entity);
        this.folder = entity;
      } else if (entity) {
        this.folder = entity;
        this.addToHistory(entity);
        if (entity.type === "section") this.document = null;
      }
    },
    findClosestChapter(dir) {
      const currentChapter = this.currentChapter;
      if (!currentChapter || !this.currentSection || !this.currentSection.children) return false;

      let idx = this.currentSection.children.findIndex((c) => c.id === currentChapter.id);
      idx += dir;
      // If there is an entry with the same name as the current chapter, then use that to display as the entity.
      const chapter = this.currentSection.children[idx];
      return chapter;
    },
    changeChapter(dir) {
      const chapter = this.findClosestChapter(dir);
      if (!chapter) return;

      const checkedEntities = [];
      // when changing the chapter, find the next available document in the chapter to display
      const entry = this.findDocument(0, chapter, 1, checkedEntities);

      this.selectEntity(entry || chapter);
    },
    moveUpParent(id, parent, dir, checkedEntities) {
      if (!parent || parent.type === "book") return null;

      // Haven't found any children, so go up a parent and move to the next one
      const pidx = parent.children.findIndex((c) => c.id === id);
      if (!checkedEntities.includes(parent.id)) {
        const entity = this.findDocument(pidx + dir, parent, dir, checkedEntities);
        if (entity) return entity;
      }
      return this.moveUpParent(parent.id, parent.parent, dir, checkedEntities);
    },
    findDocument(index, parent, dir, checkedEntities) {
      checkedEntities.push(parent.id);
      for (let i = index; i >= 0 && i < parent.children.length; i += dir) {
        if (parent.children[i].children) {
          const idx = dir < 0 ? parent.children[i].children.length - 1 : 0;
          if (!checkedEntities.includes(parent.children[i].id)) {
            const entity = this.findDocument(idx, parent.children[i], dir, checkedEntities);
            if (entity) return entity;
          }
        } else if (parent.children[i].type === "document") {
          return parent.children[i];
        }
      }
      return null;
    },
    findClosestItem(dir, idx) {
      const checkedEntities = [];

      if (idx == undefined) {
        if (!this.document) return null;
        idx = this.document.parent.children.findIndex((i) => i.id === this.document.id);
      }

      let newChild = this.findDocument(idx + dir, this.document.parent, dir, checkedEntities);
      if (!newChild) {
        newChild = this.moveUpParent(this.document.parent.id, this.document.parent.parent, dir, checkedEntities);
      }

      return newChild;
    },
    changeItem(dir) {
      const entity = this.findClosestItem(dir);
      if (entity && entity.type === "document") {
        this.selectEntity(entity);
      }
    },
    sectionActive(section) {
      return this.currentSection?.id === section.id ||
        (this.searchTerm !== null && section.id === "search" && !this.currentSection?.id)
        ? "active"
        : "";
    },
    findEntity(parent, id) {
      if (parent.children) {
        let entity = parent.children.find((c) => c.id === id);
        if (entity) return entity;
        for (const child of parent.children) {
          entity = this.findEntity(child, id);
          if (entity) return entity;
        }
      }
      return null;
    },
    openLink(pack, id) {
      //find the other entry and open it.
      const parts = pack.split(".");
      if (parts.length) {
        if (parts[0] === this.book.id) {
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
      if (entity.type === "search") {
        this.openSearch(entity.query);
      } else {
        this.folder = entity;
        this.document = entity.type === "section" ? null : entity;
      }
    },
    canHistory(dir) {
      const position = this.historyPosition + dir;
      return position < 0 || position > this.history.length - 1 ? "disabled" : "";
    },
    updatePermissions() {
      game.ForgeCompendiumBrowser.showPermissions(this.book);
    },
    async importModule() {
      let max = 0;
      let count = 0;
      let lastPerc = 0;

      let dialogHtml;

      const progressFn = (command, options) => {
        // If there's a message included, then update the message text
        if (options?.message) {
          $(".message", dialogHtml).html(options.message);
          console.log("Progress Message", options.message);
        }
        // reset command to restart progress bar for an action
        if (command === "reset") {
          max = options?.max ?? 0;
          count = 0;
          lastPerc = 0;
          $(".progress-bar .bar", dialogHtml).css({ width: "0%" });
          $(".progress-bar .percent-msg", dialogHtml).html("0%");

          // increase command to increase the progress bar by one
        } else if (command === "increase") {
          count++;
          // only update the interface if this addition has changed the percent
          const currentPerc = Math.round((count / max) * 100);
          if (currentPerc !== lastPerc) {
            lastPerc = currentPerc;
            $(".progress-bar .bar", dialogHtml).css({ width: `${lastPerc}%` });
            $(".progress-bar .percent-msg", dialogHtml).html(`${lastPerc}%`);
          }

          // finish command when the process is done and the dialog needs to be cleaned up
        } else if (command === "finish") {
          $(".start-import", dialogHtml).hide();
          $(".finish-import", dialogHtml).show();
          if (!options?.message) {
            $(".message", dialogHtml).html("");
          }
          $(".progress-bar .bar", dialogHtml).css({ width: "100%" });
          $(".progress-bar .percent-msg", dialogHtml).html("100%");
        }
      };

      const startImport = function (html) {
        $(".start-import", html).prop("disabled", true);
        game.ForgeCompendiumBrowser.importBook(this.book, { progress: progressFn });
      };

      const closeDialog = function (event) {
        $(event.currentTarget).closest(".dialog").find("header .close").click();
      };

      const template = await renderTemplate("modules/forge-compendium-browser/templates/import-documents.html");
      new Dialog({
        title: game.i18n.localize("ForgeCompendiumBrowser.ImportCompendiumDocuments"),
        content: template,
        label: game.i18n.localize("ForgeCompendiumBrowser.Import"),
        buttons: {},
        render: (html) => {
          dialogHtml = html;
          $(".start-import", html).on("click", startImport.bind(this, html));
          $(".finish-import", html).on("click", closeDialog.bind(this));
        },
        rejectClose: false,
      }).render(true);
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
    searchBook() {
      if (this.searchTerm.length < 2) {
        this.searchResults = [];
        return;
      }
      // adding title and type here for a future improvement to allow for a more specific searching
      let title = this.searchTerm.toLowerCase();
      let type = null;
      let query = this.searchTerm.toLowerCase();

      const resultObject = (entity) => {
        const section =
          entity.parent.type === "section"
            ? entity.parent
            : this.book.children.find((s) => s.id === entity.parent.section);
        let img = entity.img;
        if (this.isV10 && img && img.indexOf("systems/dnd5e/icons")) {
          img = img.replace("systems/dnd5e/icons", "images/icons");
        }
        return {
          id: entity.id,
          name: entity.name,
          img: img,
          parent: entity.parent.name,
          section: section.name,
          icon: section.icon,
          document: entity,
        };
      };

      const traverseSearch = (parent, results) => {
        let searchResult = null;

        if (parent.type === "document") {
          if (title != null) {
            const idx = parent.name.toLowerCase().indexOf(title);
            if (idx >= 0) {
              searchResult = resultObject(parent, idx, parent.name);
            }
          }
          if (query != null) {
            try {
              if (parent.document instanceof JournalEntry) {
                if (foundry.utils.isNewerVersion(game.version, "9.99999")) {
                  for (const page of parent.pages) {
                    const field = page.content;
                    const idx = field.toLowerCase().indexOf(query);
                    if (idx >= 0) {
                      searchResult = resultObject(parent, idx, field);
                      break;
                    }
                  }
                } else {
                  const field = parent.document.data.content;
                  const idx = field.toLowerCase().indexOf(query);
                  if (idx >= 0) {
                    searchResult = resultObject(parent, idx, field);
                  }
                }
              } else if (parent.document instanceof Actor) {
                const field = foundry.utils.isNewerVersion(game.version, "9.99999")
                  ? parent.document.system.details.biography.value
                  : parent.document.data.data.details.biography.value;
                const idx = field.toLowerCase().indexOf(query);
                if (idx >= 0) {
                  searchResult = resultObject(parent, idx, field);
                }
              } else if (parent.document instanceof Item) {
                const field = foundry.utils.isNewerVersion(game.version, "9.99999")
                  ? parent.document.system.description.value
                  : parent.document.data.data.description.value;
                const idx = field.toLowerCase().indexOf(query);
                if (idx >= 0) {
                  searchResult = resultObject(parent, idx, field);
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
          for (const child of parent.children) {
            if (parent.type === "book" && type != null && child.type !== type) continue;
            traverseSearch(child, results);
          }
        }
      };

      const results = {};
      traverseSearch(this.book, results);
      this.searchResults = Object.values(results);
    },
    i18n(key, args) {
      if (args) return game.i18n.format(key, args);
      return game.i18n.localize(key);
    },
    async importEntry() {
      const collection = this.document.document.collection;
      const pack = game.packs.get(this.document.packId);
      if (collection) {
        if (this.document.section === "Scene") {
          ui.notifications.info(this.i18n('Beginning the import of scene {name}', {name: this.document.name}));
          let sceneBook = {
            name: this.document.name,
            hierarchy: {
              children: [
                {
                  children: [this.document],
                  packtype: "Scene",
                  type: "section",
                },
              ],
            },
          };
          let tokens = this.document.document.tokens || this.document.document.data.tokens;
          if (tokens?.size) {
            let monsterFolders = [];
            const packId = `${this.book.id}.actors`;
            const collection = game.packs.get(packId);
            if (!collection.contents.length) {
              await collection.getDocuments();
            }
            for (const token of tokens) {
              const tokenName =
              foundry.utils.getProperty(token, "flags.ddbActorFlags.name") ||
              foundry.utils.getProperty(token.data, "flags.ddbActorFlags.name") ||
                token.name;
              if (!tokenName) continue;

              let actor = collection.find((a) => a.name === tokenName);
              if (!actor) continue;

              const folderName = `Monsters | ${actor.name[0].toUpperCase()}`;
              let actorFolder = monsterFolders.find((a) => a.name === folderName);
              if (!actorFolder) {
                actorFolder = {
                  children: [],
                  packtype: "Actor",
                  name: folderName,
                  type: "folder",
                };
                monsterFolders.push(actorFolder);
              }
              if (!actorFolder.children.find((a) => a.id === actor.id)) {
                actorFolder.children.push({
                  id: actor.id,
                  name: actor.name,
                  packId,
                  type: "document",
                });
              }
            }
            if (monsterFolders.length) {
              sceneBook.hierarchy.children.push({
                children: monsterFolders,
                packtype: "Actor",
                type: "section",
              });
            }
          }

          let notes = this.document.document.notes || this.document.document.data.notes;
          if (notes?.size) {
            let journalChild = {
              children: [],
              packtype: "JournalEntry",
              type: "section",
            };

            for (const note of notes) {
              let entryId = this.isV10 ? note.entryId : note.data.entryId;

              if (!journalChild.children.find((je) => je.id === entryId)) {
                journalChild.children.push({
                  id: entryId,
                  packId: `${this.book.id}.journal`,
                  type: "document",
                });
              }
            }
            if (journalChild.children.length) {
              sceneBook.hierarchy.children.push(journalChild);
            }
          }
          let result = await game.ForgeCompendiumBrowser.importBook(sceneBook, { actorFolderName: this.document.name });
          if (result !== false) return ui.notifications.info(this.i18n("ForgeCompendiumBrowser.DocumentHasBeenImported"));
        } else {
          let document = await collection.importFromCompendium(pack, this.document.id, {}, { renderSheet: true });
          if (this.document.section === "Item" && document?.img) {
            await document.update({ img: game.ForgeCompendiumBrowser.mapIcon(document.img) });
          }
          if (document) return ui.notifications.info(this.i18n("ForgeCompendiumBrowser.DocumentHasBeenImported"));
        }
      }
      ui.notifications.error(this.i18n("ForgeCompendiumBrowser.ErrorImportingDocument"));
    },
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
        if (item.type !== "book") {
          let canAdd = true;
          if (game.ForgeCompendiumBrowser.setting("same-name") && item.name === items[items.length - 1].name) {
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
        while (section.type !== "section" && section.parent) {
          section = section.parent;
        }
        return section;
      }
    },
    currentChapter() {
      if (!this.folder || this.folder.type === "section") {
        return null;
      } else {
        let chapter = this.folder;
        while (chapter.parent && chapter.parent.type !== "section") {
          chapter = chapter.parent;
        }
        return chapter;
      }
    },
    backgroundStyle() {
      if (!this.book || !this.book.background) return "";

      return `background-image:url(${this.book.background})`;
    },
    bookName() {
      return this.book.name.toUpperCase();
    },
    permissionText() {
      const permission = this.book.permissions || {};

      const levels = {
        true: this.i18n("ForgeCompendiumBrowser.Allowed"),
        false: this.i18n("ForgeCompendiumBrowser.NotAllowed"),
      };

      const currentDefault = permission["default"] == undefined || permission["default"] ? "true" : "false";
      const playerPermissions = Object.entries(permission)
        .map(([k, v]) => {
          if (k === "default" || v === currentDefault || v == undefined) return null;
          const user = game.users.get(k);
          const value = v ? "true" : "false";
          return `${user.name}: ${levels[value]}`;
        })
        .filter((p) => !!p);

      return [`${this.i18n("ForgeCompendiumBrowser.Everyone")}: ${levels[currentDefault]}`, ...playerPermissions];
    },
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
  background: -moz-linear-gradient(top, rgba(69, 72, 77, 1) 0%, rgba(0, 0, 0, 1) 100%); /* FF3.6-15 */
  background: -webkit-linear-gradient(top, rgba(69, 72, 77, 1) 0%, rgba(0, 0, 0, 1) 100%); /* Chrome10-25,Safari5.1-6 */
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

.forge-compendium-sidebar header .forge-compendium-book-image-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 300px;
  flex: 0 0 300px;
}

.forge-compendium-sidebar header .forge-compendium-book-image-background {
  float: left;
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  filter: blur(10px);
  opacity: 0.6;
}

.forge-compendium-sidebar header .forge-compendium-book-image {
  height: 100%;
  width: 100%;
  object-fit: contain;
  object-position: top center;
  cursor: pointer;
  border: 0px;
  position: absolute;
  top: 0px;
  left: 0px;
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

.forge-compendium-content .forge-compendium-permissions {
  flex-grow: 0;
  margin: 10px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
  line-height: 32px;
}

.forge-compendium-content .forge-compendium-permissions .user-permission {
  border-radius: 4px;
  border: 1px solid #808080;
  padding: 4px 8px;
  margin-right: 4px;
}

.forge-compendium-content .forge-compendium-permissions .permission-button {
  flex: 0 0 30px;
  width: 30px;
  padding: 2px;
  height: 30px;
  line-height: 25px;
  padding: 2px 2px 2px 6px;
}

.forge-compendium-content .forge-compendium-permissions .permission-text {
  margin-left: 8px;
}

.forge-compendium-content .forge-compendium-contains .forge-compendium-contains-list {
  list-style: none;
  padding-left: 10px;
}

.forge-compendium-content .forge-compendium-contains .forge-compendium-contains-list li {
  margin-bottom: 5px;
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

.forge-compendium-breadcrumbs li:not(:last-child) .breadcrumb-link {
  cursor: pointer;
}

.forge-compendium-breadcrumbs li:not(:last-child) .breadcrumb-link:hover {
  text-shadow: 0 0 8px var(--color-shadow-primary);
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
  margin: 0;
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
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}
.forge-compendium-search-area button {
  flex: 0 0 30px;
  border-radius: 0px;
  margin: 0;
  cursor: pointer;
  overflow: hidden;
  height: 30px;
}
.forge-compendium-search-area .no-results {
  width: 100%;
  text-align: center;
  margin-top: 100px;
}
.forge-compendium-search-area .no-results > div {
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
  position: relative;
  cursor: pointer;
  padding: 6px;
  color: #ffffff;
  text-shadow: 0 -1px 0 rgb(0 0 0 / 25%);
  background-color: #5bb75b;
  *background-color: #51a351;
  background-image: linear-gradient(180deg,#62c462,#51a351);
  background-repeat: repeat-x;
  border: 2px solid #468847;
  border-color: #51a351 #51a351 #387038;
  border-radius: 4px;
  margin: 4px;
}
.compendium-library:hover {
  text-shadow: 0 0 8px var(--color-shadow-primary);
  border-color: #478f47 #478f47 #2f5e2f;
}
.compendium-library i {
  float:left;
  position: absolute;
  left: 8px;
  top: 7px;
}

.search-span {
  flex: 0 0 30px;
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
  height: 30px;
  background: rgba(240,240,240,.8);
  border: 1px solid var(--color-border-light-primary);
  font-size: var(--font-size-14);
  line-height: 28px;
  font-family: var(--font-primary);
  text-align: center;
}
</style>

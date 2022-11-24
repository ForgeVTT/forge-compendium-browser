<template>
  <div class="forge-compendium-browser">
    <compendium-library
      v-if="!showBook"
      :library="library"
      @select="selectBook"
    ></compendium-library>
    <compendium-book
      v-else
      ref="compendiumBook"
      :book="book"
      @exit="selectBook"
      @link="selectBook"
    ></compendium-book>
    <div v-if="indexing" class="forge-compendium-indexing">
      <div class="forge-compendium-progress">
        <div class="forge-compendium-bar" :style="barWidth">
        </div>
        <div class="forge-compendium-progress-text">Indexing...</div>
      </div>
    </div>
  </div>
</template>

<script>
import CompendiumLibrary from "./CompendiumLibrary.vue";
import CompendiumBook from "./CompendiumBook.vue";

export default {
  name: "CompendiumBrowser",
  components: {
    CompendiumLibrary,
    CompendiumBook,
  },
  data: () => ({
    library: null,
    book: null,
    indexing: false,
    progress: 0,
  }),
  methods: {
    async selectBook(bookId, packId, id) {
      if (bookId) {
        const book = this.library.find((b) => b.id === bookId);
        if (book) {
          if (!this.isAvailable(book)) {
            ui.notifications.warn("Please wait, book is still building its index, this may take some time");
          } else {
            this.indexing = true;
            await game.ForgeCompendiumBrowser.indexBook(book, (progress) => { this.progress = progress; });
            this.indexing = false;
            this.progress = 0;
            this.book = Object.freeze(book);

            if (packId || id) {
              this.$refs.compendiumBook.openLink(packId, id);
            }
            game.user.setFlag("forge-compendium-browser", "last-book", bookId);
          }
        } else if(typeof bookId === "string") {
          ui.notifications.warn(`You don't have access to this compendium book. (${bookId})`);
          this.book = null;
        }
      } else {
        this.book = null;
        game.user.unsetFlag("forge-compendium-browser", "last-book");
      }
    },
    isAvailable(book) {
      return book && book.children && book.children.length;
    },
  },
  computed: {
    showBook() {
      return this.book != null;
    },
    bookName() {
      return this.book ? this.book.name : "";
    },
    barWidth() {
      return `width: ${this.progress * 100 }%`;
    },
  },
  mounted() {
    this.library = game.ForgeCompendiumBrowser.books;
    const lastBook = game.user.getFlag("forge-compendium-browser", "last-book");
    if (lastBook) {
      this.selectBook(lastBook);
    }
  },
};
</script>

<style>
.forge-compendium-browser {
  max-height: 100%;
  overflow: hidden;
}
.forge-compendium-browser .flexcontain {
  flex-grow: 0;
}
.forge-compendium-browser .compendium-muted {
  opacity: 0.4;
  font-weight: bold;
}
.forge-compendium-indexing {
  position: absolute;
  width: 400px;
  height: 50px;
  border-radius: 8px;
  margin: auto;
  top: 50%;
  left: 50%;
  margin-left: -200px;
  background: #000;
  color: #fff;
  padding: 15px;
}
.forge-compendium-progress {
  width: calc(100% - 30px);
  height: 20px;
  border: 2px inset;
  position: absolute;
  border-radius: 4px;
}
.forge-compendium-bar {
  height: 100%;
  top: 0px;
  left: 0px;
  background-color: #0000ff;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}
.forge-compendium-progress-text {
    position: absolute;
    margin-left: 10px;
    top: 0px;
}
</style>
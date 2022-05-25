<template>
  <div class="forge-compendium-library">
    <div class="forge-compendium-library flexcol">
      <div class="forge-compendium-banner flexrow">
        <img
          class="forge-logo"
          src="https://forge-vtt.com/images/the-forge-logo-400x400.png"
          @click="forgeLink"
        />
        <div class="flexcol">
          <h2 class="flexcontain">
            {{ this.i18n("ForgeCompendiumBrowser.ForgeCompendiumLibrary") }}
          </h2>
          <p class="notes flexcontain" v-html="LibraryMessage"></p>
        </div>
      </div>
      <div v-if="hasBooks" class="flexrow forge-compendium-library-list">
        <div
          v-for="book in library"
          :key="book.id"
          class="forge-compendium-book"
          :data-id="book.id"
          data-type="book"
          @click="selectBook(book.id)"
        >
          <div
            v-if="book.img"
            class="forge-compendium-img"
            :style="bookImage(book)"
          />
          <div class="forge-compendium-title">{{ book.name }}</div>
        </div>
      </div>
      <div v-else class="compendium-information flexrow">
        <h3 class="compendium-muted">
            {{ this.i18n("ForgeCompendiumBrowser.NoBooksLoaded") }}
        </h3>
    </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "CompendiumLibrary",
  props: {
    library: Array,
  },
  methods: {
    selectBook(id) {
      this.$emit("select", id);
    },
    bookImage(book) {
      return `background-image: url(${book.img})`;
    },
    forgeLink() {
      window.open("https://forge-vtt.com/", "_blank");
    },
    i18n(key){
        return game.i18n.localize(key);
    },
  },
  computed: {
    hasBooks() {
      return this.library && this.library.length > 0;
    },
    LibraryMessage() {
        return game.i18n.format("ForgeCompendiumBrowser.LibraryMessage", { link: '<a href="https://forge-vtt.com/bazaar#filter=all&type=dndbeyond" target="_blank">D&amp;D Beyond converter</a>' })
    }
  },
};
</script>

<style scoped>
.forge-compendium-library {
  width: 100%;
  height: 100%;
  padding: 8px;
}

.forge-compendium-library .forge-compendium-banner {
  padding: 10px;
  border-radius: 10px;
  border: 2px solid #468847;
  color: #ffffff;
  text-shadow: 0 -1px 0 rgb(0 0 0 / 25%);
  background-color: #5bb75b;
  *background-color: #51a351;
  background-image: -moz-linear-gradient(top, #62c462, #51a351);
  background-image: -webkit-gradient(linear, 0 0, 0 100%, from(#62c462), to(#51a351));
  background-image: -webkit-linear-gradient(top, #62c462, #51a351);
  background-image: -o-linear-gradient(top, #62c462, #51a351);
  background-image: linear-gradient(to bottom, #62c462, #51a351);
  background-repeat: repeat-x;
  border-color: #51a351 #51a351 #387038;
  border-color: rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.25);
  flex: 0 0 100px;
  width: 100%;
}

.forge-compendium-library .forge-compendium-banner a[href] {
  color: #468847;
}

.forge-compendium-library .forge-logo {
  width: 100px;
  height: 100px;
  flex: 0 0 100px;
  margin-right: 20px;
  cursor: pointer;
  border: none;
}

.forge-compendium-library .forge-compendium-book {
  flex: 0 0 190px;
  height: 250px;
  margin: 10px;
  position: relative;
  cursor: pointer;
  opacity: 0.9;
}

.forge-compendium-library .forge-compendium-book:hover {
  opacity: 1;
}

.forge-compendium-library .forge-compendium-book .forge-compendium-img {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to right,
    rgb(60, 13, 20) 3px,
    rgba(255, 255, 255, 0.5) 5px,
    rgba(255, 255, 255, 0.25) 7px,
    rgba(255, 255, 255, 0.25) 10px,
    transparent 12px,
    transparent 16px,
    rgba(255, 255, 255, 0.25) 17px,
    transparent 22px
  );
  background-size: cover;
  background-position: top center;
  box-shadow: 0 0 5px -1px black, inset -1px 1px 2px rgba(255, 255, 255, 0.5);
  border-radius: 5px;
}

.forge-compendium-library .forge-compendium-book .forge-compendium-title {
  position: absolute;
  bottom: 0px;
  width: calc(100% - 10px);
  font-size: 14px;
  color: #fff;
  background: rgba(0, 0, 0, 0.7);
  text-align: center;
  padding: 10px;
  border-radius: 5px;
  margin: 4px;
  border: 1px solid #000;
}

.forge-compendium-library-list {
    overflow-y: auto;
    align-content: flex-start;
}
.compendium-information {
    text-align: center;
    margin: auto;
    margin-top: 10%;
}
</style>
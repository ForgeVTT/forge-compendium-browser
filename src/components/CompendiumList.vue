<template>
  <div v-if="showListing" class="forge-compendium-list" :depth="depth">
    <div v-for="item in sortedList" :key="item.id" :data-id="item.id">
      <div class="flexcol" :class="listClass">
        <div
          class="forge-compendium-title draggable-item flexrow"
          :class="hasImage(item)"
          @click="openItem(item)"
          draggable
          @dragstart="startDrag($event, item)"
        >
          <img v-if="item.img" :data-src="item.img" class="lazy forge-compendium-image" />
          <span>{{ item.name }}</span>
        </div>
        <compendium-list
          :listing="filteredList(item)"
          :parent="item"
          :depth="depth + 1"
          @open="openItem"
        ></compendium-list>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "CompendiumList",
  props: {
    listing: Array,
    parent: Object,
    depth: Number,
  },
  methods: {
    openItem(item) {
      if (item.type == "document") {
        this.$emit("open", item);
      } else if (item.children && item.children.length && item.children[0].name == item.name) {
        this.$emit("open", item.children[0]);
      }
    },
    startDrag(event, item) {
      const dragData = {
        id: item.id,
        uuid: `Compendium.${item.packId}.${item.id}`,
        pack: item.packId,
        type: item.section,
      };

      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    },
    filteredList(item) {
      const useSameName = game.ForgeCompendiumBrowser.setting("same-name");
      if (!item.children || (item.children.length == 1 && item.children[0].name == item.name)) {
        return [];
      }

      return item.children.filter((c) => c.name != item.name || !useSameName);
    },
    hasImage(item) {
        return item.img ? 'has-image' : '';
    },
  },
  computed: {
    showListing() {
      return this.listing && this.listing.length;
    },
    listClass() {
      return this.depth == 0 ? "forge-compendium-item" : "";
    },
    sortedList() {
      return [...this.listing].sort((a, b) => { return (a.sort ?? 0) - (b.sort ?? 0) });
    }
  },
};
</script>

<style scoped>
.forge-compendium-listing > div > .forge-compendium-list {
  columns: 300px;
}

.forge-compendium-listing > div > .forge-compendium-list > div {
  padding: 4px;
}

.forge-compendium-listing > div > .forge-compendium-list div {
  break-inside: avoid;
}

.forge-compendium-list .forge-compendium-item {
  border-radius: 8px;
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 8px 14px;
}

.forge-compendium-list .forge-compendium-item .forge-compendium-title {
  font-size: 20px;
  line-height: 32px;
}

.forge-compendium-list .forge-compendium-item .forge-compendium-title.has-image {
  line-height: 48px;
  margin: 0px;
}

.forge-compendium-list .forge-compendium-item .forge-compendium-list > div:last-child .forge-compendium-title.has-image {
  margin-bottom: 8px;
}

.forge-compendium-list .forge-compendium-item .forge-compendium-title span {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.forge-compendium-list .forge-compendium-item .forge-compendium-title:hover {
  text-shadow: 0 0 8px var(--color-shadow-primary);
}

.forge-compendium-list .forge-compendium-item .forge-compendium-image {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  object-fit: contain;
  border-radius: 4px;
  margin-right: 10px;
}

.forge-compendium-list .forge-compendium-list[depth="1"] .forge-compendium-title {
  font-size: 16px;
  margin-left: 20px;
  margin-top: 4px;
}
</style>
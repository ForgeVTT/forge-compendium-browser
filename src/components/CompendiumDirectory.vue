<template>
  <li class="forge-compendium-directory-item flexcol" :class="entitySelected">
    <header
      class="forge-compendium-folder-header flexrow"
      @click="selectEntity()"
    >
      <h3 class="flexrow">
        <span>{{ this.entity.name }}</span>
        <i v-if="showMarker" class="fas" :class="itemClass"></i>
      </h3>
    </header>
    <ol
      v-if="showChildren"
      class="forge-compendium-directory-list subdirectory"
    >
      <compendium-directory
        v-for="item in filterList"
        :key="item.id"
        :entity="item"
        :selected="selected"
        @select="bubbleEvent('select', arguments[0])"
        @open="bubbleEvent('open', arguments[0])"
      ></compendium-directory>
    </ol>
  </li>
</template>

<script>
export default {
  name: "CompendiumDirectory",
  props: {
    entity: Object,
    selected: Object,
  },
  methods: {
    selectEntity() {
      if (this.entity.type === "document") {
        this.$emit("open", this.entity);
      } else {
        if (
          this.entity.children &&
          this.entity.children.length &&
          this.entity.children[0].name === this.entity.name &&
          this.entity.children[0].type === "document"
        ) {
          this.$emit("open", this.entity.children[0]);
        } else {
          this.$emit("select", this.entity);
        }
      }
    },
    bubbleEvent(name, entity) {
      this.$emit(name, entity);
    },
  },
  computed: {
    entitySelected() {
      if (!this.entity)
        return "";

      const ids = [];
      let item = this.selected;
      while (item.parent) {
        ids.push(item.id);
        item = item.parent;
      }

      return ids.includes(this.entity.id) ? "active" : "";
    },
    filterList() {
      if (!this.entity.children) return [];

      return this.entity.children.filter((c) => (c.name !== this.entity.name || c.type !== "document") && c.visible !== false).sort(game.ForgeCompendiumBrowser.compare);
    },
    showChildren() {
      if (this.entity.children &&
          this.entity.children.length === 1 &&
          this.entity.children[0].name === this.entity.name &&
          this.entity.type === "document") {
        return false;
      }

      if (!this.entitySelected) 
        return false;

      return true;
    },
    showMarker() {
      if (
        (this.entity.children &&
          this.entity.children.length === 1 &&
          this.entity.children[0].name === this.entity.name) ||
        this.entity.type === "document"
      )
        return false;

      return true;
    },
    itemClass() {
      return this.entitySelected ? "fa-chevron-down" : "fa-chevron-right";
    },
  },
};
</script>

<style scoped>
.forge-compendium-directory-list {
  padding: 0;
  margin: 0;
  overflow-y: auto;
}
.forge-compendium-directory-list .forge-compendium-directory-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.forge-compendium-directory-list .forge-compendium-directory-item header {
  border-left: 6px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  padding: 4px 0px 4px 8px;
}

.forge-compendium-directory-list .forge-compendium-directory-item header h3 {
  margin: 0px;
  font-size: 14px;
  border-bottom: 0px;
}

.forge-compendium-directory-list .forge-compendium-directory-item header h3 span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.forge-compendium-directory-list .forge-compendium-directory-item header h3 i {
  flex: 0 0 20px;
}

.forge-compendium-directory-list .forge-compendium-directory-item header:hover {
  text-shadow: 0 0 8px var(--color-shadow-primary);
}

.forge-compendium-directory-list .forge-compendium-directory-item.active > header {
  border-left-color: #47d18c;
}

.forge-compendium-directory-list .subdirectory {
  padding-left: 16px;
  margin-top: 0px;
}

.forge-compendium-directory-list .subdirectory .forge-compendium-directory-item header {
  font-size: 14px;
}
</style>
<template>
  <div ref="mainlisting" class="forge-compendium-listing flexcol">
    <div>
      <compendium-list
        :listing="listing.children"
        :parent="listing"
        :depth="0"
        @select="selectItem"
        @open="selectItem"
      ></compendium-list>
    </div>
  </div>
</template>

<script>
import CompendiumList from "./CompendiumList.vue";

export default {
  name: "CompendiumListing",
  components: {
    CompendiumList,
  },
  props: {
    listing: Object,
  },
  methods: {
    selectItem(item) {
      this.$emit("select", item);
    },
  },
};
</script>

<style scoped>
.forge-compendium-listing {
  height: 100%;
  overflow: hidden;
}

.forge-compendium-listing > div {
  overflow-y: auto;
}
</style>
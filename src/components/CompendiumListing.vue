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
  data() {
    return {
      observer: null,        
    };
  },
  methods: {
    selectItem(item) {
      this.$emit("select", item);
    },
    observeImages() {
      this.$nextTick(function () {
        const lazyloadImages = document.querySelectorAll(".lazy");
        const observer = this.observer;
        lazyloadImages.forEach(function(image) {
          observer.observe(image);
        });
      });
    }
  },
  created() {
    this.observer = new IntersectionObserver(function(entries, observer) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var image = entry.target;
          image.src = image.dataset.src;
          image.classList.remove("lazy");
          observer.unobserve(image);
        }
      });
    });
  },
  mounted() {
    this.observeImages();
  },
  updated() {
    this.observer.disconnect();
    this.observeImages();
  },
  beforeDestroy() {
    this.observer.disconnect();
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
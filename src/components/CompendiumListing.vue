<template>
    <div class="forge-compendium-listing flexcol">
        <div>
            <compendium-list :listing="listing.children" :depth="0" @select="selectListing" @entry="selectListing"></compendium-list>
        </div>
    </div>
</template>

<script>
import CompendiumList from "./CompendiumList.vue";

export default {
    name: "CompendiumListing",
    components: {
      CompendiumList
    },
    props: {
        listing: Object,
    },
    data: () => ({
    }),
    methods: {
        selectListing(item) {
            if (item.type === "document")
                this.$emit("entry", item);
            else
                this.$emit("select", item);
        },
        goBack() {
            this.$emit("select", null);
        },
    },
    computed: {
    },
    watch: {
    },
    mounted() {
        console.log("Listing", this.listing);
    },
};
</script>
<template>
    <div class="forge-compendium-list" :depth="depth">
        <div  v-for="item in listing" :key="item.id" :data-id="item.id" data-type="category" @click="selectListing(item)">
            <div class="flexcol" :class="listClass">
                <div class="forge-compendium-title">{{item.name}}</div>
                <compendium-list :listing="item.children" :depth="depth + 1" @select="selectListing" @entry="selectListing"></compendium-list>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "CompendiumList",
    props: {
        listing: Array,
        depth: Number,
    },
    data: () => ({
    }),
    methods: {
        selectListing(item) {
            console.log("Select Listing", item);
            if (item.type === "document")
                this.$emit("entry", item);
            else
                this.$emit("select", item);
        },
    },
    computed: {
        listClass() {
            return this.depth == 0 ? 'forge-compendium-item' : '';
        }
    },
    watch: {
    },
    mounted() {
        console.log("List", this.listing);
    },
};
</script>
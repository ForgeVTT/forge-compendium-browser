<template>
    <div v-if="listing.length" class="forge-compendium-list" :depth="depth">
        <div v-for="item in listing" :key="item.id" :data-id="item.id">
            <div class="flexcol" :class="listClass(item)">
                <div class="forge-compendium-title draggable-item flexrow" :class="item.img ? 'has-image' : ''" @click="selectItem(item)">
                    <img v-if="item.img" :src="item.img" class="forge-compendium-image" draggable @dragstart="startDrag($event, item)" />
                    <span>{{item.name}}</span>
                </div>
                <compendium-list :listing="filteredList(item)" :parent="item" :depth="depth + 1" @select="selectItem"></compendium-list>
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
    data: () => ({
    }),
    methods: {
        selectItem(item) {
            console.log("Select Item", item);
            if (game.ForgeCompendiumBrowser.setting("same-name") && item.children && item.children.length && item.children[0].name == item.name) {
                this.$emit("select", item.children[0]);
            } else {
                this.$emit("select", item);
            }
        },
        startDrag (event, item) {
            const dragData = { 
                id: item.id, 
                pack: item.document.pack,
                type: item.document.documentName
            };
            console.log("Start Drag", dragData, item);

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        },
        listClass(item) {
            return (this.depth == 0 ? 'forge-compendium-item' : '');// + (item.type == "document" || this.hasChildren(item) ? '' : ' no-children');
        },
        filteredList(item) {
            const useSameName = game.ForgeCompendiumBrowser.setting("same-name");
            if (!item.children)
                return [];
                
            return item.children.filter(i => i.name != item.name || !useSameName);
        }
    },
    computed: {

    },
    watch: {
    },
    mounted() {
        console.log("Mount List", this.listing, this.parent);
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

/*
.forge-compendium-listing .forge-compendium-item.no-children .forge-compendium-title {
    margin-bottom: 10px;
}
*/

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

.forge-compendium-list .forge-compendium-item .forge-compendium-title:hover{
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

/*
.forge-compendium-listing > div > .forge-compendium-list > div > .forge-compendium-item > .forge-compendium-title > .forge-compendium-image {
    height: 48px;
    width: 48px;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    border-top-right-radius: 0px;
    border-bottom-right-radius: 0px;
    margin-right: 10px;
    margin-top: 0px;
}
*/

.forge-compendium-list .forge-compendium-list[depth="1"] .forge-compendium-title {
    font-size: 16px;
    margin-left: 20px;
    margin-top: 4px;
}
</style>
<template>
    <div class="forge-compendium-list" :depth="depth">
        <div v-for="item in listing" :key="item.id" :data-id="item.id">
            <div v-if="includeEntry(item)" class="flexcol" :class="listClass">
                <div class="forge-compendium-title draggable-item flexrow" @click="selectItem(item)">
                    <img v-if="item.img" :src="item.img" class="forge-compendium-image" draggable @dragstart="startDrag($event, item)" />
                    <span>{{item.name}}</span>
                </div>
                <compendium-list :listing="item.children" :parent="item" :depth="depth + 1" @select="selectItem"></compendium-list>
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
            if(item.type == "document" || item.children == undefined) {
                this.$emit("select", item);
            } else if(game.ForgeCompendiumBrowser.setting("same-name")) {
                const childEntry = item.children.find(c => c.name == item.name);
                this.$emit("select", childEntry);
            }
        },
        includeEntry(item) {
            return item.name != this.parent.name || !game.ForgeCompendiumBrowser.setting("same-name");
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
    },
    computed: {
        listClass() {
            return this.depth == 0 ? 'forge-compendium-item' : '';
        }
    },
    watch: {
    },
    mounted() {
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
}

.forge-compendium-list .forge-compendium-item .forge-compendium-title {
    font-size: 20px;
    line-height: 40px;
    margin: 0px 10px;
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
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    object-fit: contain;
    margin-top: 4px;
    margin-right: 4px;
    border-radius: 4px;
}

.forge-compendium-listing > div > .forge-compendium-list > div > .forge-compendium-item > .forge-compendium-title > .forge-compendium-image {
    margin-left: -10px;
    height: 40px;
    width: 40px;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    border-top-right-radius: 0px;
    border-bottom-right-radius: 0px;
    margin-right: 10px;
    margin-top: 0px;
}

.forge-compendium-list .forge-compendium-list[depth="1"] .forge-compendium-title {
    font-size: 16px;
    margin-left: 20px;
}
</style>
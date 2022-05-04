<template>
    <ol v-if="list.length > 0" class="directory-list">
        <li v-for="folder in list" :key="folder.id" class="directory-item folder flexcol" :class="folderSelected(folder.id)" :data-id="folder.id">
            <header class="folder-header flexrow" @click="selectItem(folder)">
                <h3>{{folder.name}}</h3>
            </header>
            <compendium-directory :hierarchy="folder.children" :entity="entity" @select="selectItem" class="subdirectory"></compendium-directory>
        </li>
    </ol>
</template>

<script>
export default {
    name: "CompendiumDirectory",
    props: {
        hierarchy: {
            type: Array,
            default() {
                return [];
            }
        },
        entity: Object
    },
    data: () => ({
    }),
    methods: {
        selectItem(item) {
            console.log("Directory Select Item", item);
            if(game.ForgeCompendiumBrowser.setting("same-name") && item.children && item.children.length == 1 && item.children[0].name == item.name) {
                const childEntry = item.children.find(c => c.name == item.name);
                console.log("Getting child entry", item, childEntry);
                this.$emit("select", childEntry || item);
            } else {
                this.$emit("select", item);
            }
        },
        folderSelected(id) {
            if (!this.entity) {
                return "";
            }
            let ids = [];
            let entity = this.entity;
            while (entity.parent) {
                ids.push(entity.id);
                entity = entity.parent;
            }

            console.log("Checking selected", this.entity, id, ids);
            return ids.includes(id) ? "active" : "";
        }
    },
    computed: {
        list() {
            return this.hierarchy.filter(f => f.type != "document");
        }
    },
    watch: {
    },
    mounted() {
    },
};
</script>

<style scoped>
.directory-list .directory-item {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.directory-list .directory-item header {
    border-left: 3px solid transparent;
    padding-left: 8px;
    cursor: pointer;
}

.directory-list .directory-item header h3 {
    margin: 4px 0px;
}

.directory-list .directory-item header:hover{
    text-shadow: 0 0 8px var(--color-shadow-primary);
}

.directory-list .directory-item.active > header {
    border-left-color: #47D18C;
}

.directory-list .directory-item .directory-item.active > header {
    border-left-width: 6px;
}

.directory-list .subdirectory {
    padding-left: 0px;
    margin-top: 0px;
}

.directory-list .subdirectory .directory-item header {
    padding-left: 16px;
    font-size: 14px;
}
</style>
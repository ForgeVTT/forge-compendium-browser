<template>
    <ol v-if="list.length > 0" class="directory-list">
        <li v-for="folder in list" :key="folder.id" class="directory-item folder flexcol" :data-id="folder.id">
            <header class="folder-header flexrow" @click="selectFolder">
                <h3><i class="fas fa-folder-open fa-fw"></i>{{folder.name}}</h3>
            </header>
            <compendium-directory :hierarchy="folder.children" @select="selectFolder" class="subdirectory"></compendium-directory>
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
        }
    },
    data: () => ({
        list: [],
    }),
    methods: {
        selectFolder(folder) {
            this.$emit("select", folder);
        }
    },
    computed: {
    },
    watch: {
    },
    mounted() {
        this.list = this.hierarchy.filter(f => f.type != "document");
        console.log("Directory", this.hierarchy, this.list);
    },
};
</script>
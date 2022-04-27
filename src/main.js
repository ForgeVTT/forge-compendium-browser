import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

const book = {
    children: [],
    type: "book",
    id: "mm",
    name: "Monster Manual",
    index() {
        return {};
    },
    data: {
        name: "mm",

    }
}
book.children.forEach(c => c.parent = book);

globalThis.game = {
    ForgeCompendiumBrowser: {
        books: [
            book
        ]
    }
};

new Vue({
  render: h => h(App),
}).$mount('#app')

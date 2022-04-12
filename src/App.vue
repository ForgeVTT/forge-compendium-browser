<template>
  <div id="app">
    <CompendiumBrowser msg="Forge Compendium Browser"/>
  </div>
</template>

<script>
import CompendiumBrowser from './components/CompendiumBrowser.vue'

export default {
  name: 'App',
  components: {
    CompendiumBrowser
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

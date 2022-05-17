<template>
  <div id="app" class="window-content">
    <CompendiumBrowser msg="Forge Compendium Browser" />
  </div>
</template>

<script>
import CompendiumBrowser from "./components/CompendiumBrowser.vue";

export default {
  name: "App",
  components: {
    CompendiumBrowser,
  },
};
</script>

<style>
@import "./fonts/fontawesome/css/all.min.css";
body {
  background-image: url(img/denim.png);
  background-repeat: repeat;
  background-size: auto;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: var(--font-primary);
  box-sizing: border-box;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  padding: 0px;
}

#app .forge-compendium-library {
  width: calc(100% - 16px);
  height: calc(100% - 16px);
}

#app .forge-compendium-library .forge-compendium-banner {
  width: calc(100% - 20px);
}

#app .forge-compendium-library .forge-compendium-book .forge-compendium-title {
  width: calc(100% - 32px);
}

.window-content {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: flex-start;
  background: url(img/parchment.jpg) repeat;
  padding: 8px;
  color: var(--color-text-dark-primary);
  overflow-y: auto;
  overflow-x: hidden;
  position: absolute;
  left: 200px;
  top: 100px;
  right: 200px;
  bottom: 100px;
  border-radius: 8px;
}
.window-content > * {
  flex: 1;
}

.flexrow {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
}
.flexcol {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: flex-start;
}
.flexrow > *,
.flexcol > * {
  flex: 1;
}
.flexrow > .flex0,
.flexcol > .flex0 {
  display: block;
  flex: 0;
}
.flexrow > .flex1,
.flexcol > .flex1 {
  flex: 1;
}
.flexrow > .flex2,
.flexcol > .flex2 {
  flex: 2;
}
.flexrow > .flex3,
.flexcol > .flex3 {
  flex: 3;
}
h1,
h2,
h3,
h4 {
  margin: 0 0 0.5rem;
  padding: 0;
  font-weight: normal;
}
h1 {
  font-size: 2em;
  border-bottom: 2px solid var(--color-underline-header);
}
h2 {
  font-size: 1.5em;
  border-bottom: 1px solid var(--color-underline-header);
}
h3 {
  font-size: 1.125em;
}
/* Links */
a {
  cursor: pointer;
}
a[href] {
  color: var(--color-text-hyperlink);
}
a:hover {
  text-shadow: 0 0 8px var(--color-shadow-primary);
}
a.entity-link,
a.content-link,
a.inline-roll {
  background: #ddd;
  padding: 1px 4px;
  border: 1px solid var(--color-border-dark-tertiary);
  border-radius: 2px;
  white-space: nowrap;
  word-break: break-all;
}
a.entity-link i,
a.content-link i,
a.inline-roll i {
  color: var(--color-text-dark-inactive);
}
a.entity-link.playing i:before,
a.content-link.playing i:before,
a.inline-roll.playing i:before {
  content: "\f0c8";
}
a.entity-link.broken,
a.content-link.broken {
  background: rgba(255, 0, 0, 0.05);
  border: 1px dashed red;
}
a.inline-roll.gmroll {
  background: #e8e8ef;
  border-color: #545469;
}
a.inline-roll.blindroll {
  background: #f5eaf5;
  border-color: #6b476b;
}

img {
  box-sizing: border-box;
  border: 1px solid var(--color-border-dark);
  border-radius: 2px;
  max-width: 100%;
}
/* Paragraph */
p {
  margin: 0.5em 0;
}
::selection {
  background: #82817d;
  color: var(--color-text-light-0);
}
/* Standard Lists */
ul,
ol {
  margin: 0.5em 0;
  padding: 0 0 0 1.5em;
}
/* Definition Lists */
dl {
  margin: 0.5em 0;
}
dt {
  font-weight: bold;
}
dd {
  padding-left: 5px;
  margin: 3px 0;
}
/* HR separators */
hr {
  border: none;
  border-top: 1px solid var(--color-border-light-primary);
  border-bottom: 1px solid var(--color-border-light-highlight);
}
/* Buttons */
button[hidden] {
  display: none;
}
/* Blockquote */
blockquote {
  margin: 0.5em 0 0.5em 10px;
  padding: 0 0 0 20px;
  border-left: 3px solid var(--color-border-light-tertiary);
  font-style: italic;
}
blockquote em {
  font-style: normal;
}
:root {
  --color-text-light-highlight: #f0f0e0;
  --color-text-light-heading: #c9c7b8;
  --color-text-light-primary: #b5b3a4;
  --color-text-dark-primary: #191813;
  --color-text-dark-secondary: #4b4a44;
  --color-text-dark-header: #23221d;
  --color-text-dark-inactive: #7a7971;
  --color-text-hyperlink: #ff6400;
  --color-text-light-0: #fff;
  --color-text-light-1: #eee;
  --color-text-light-2: #ddd;
  --color-text-light-3: #ccc;
  --color-text-light-4: #bbb;
  --color-text-light-5: #aaa;
  --color-text-light-6: #999;
  --color-text-light-7: #888;
  --color-text-dark-1: #111;
  --color-text-dark-2: #222;
  --color-text-dark-3: #444;
  --color-text-dark-4: #555;
  --color-text-dark-5: #666;
  --color-text-dark-6: #777;
  --color-border-light-1: #ddd;
  --color-border-light-2: #999;
  --color-border-dark-1: #111;
  --color-border-dark-2: #222;
  --color-border-dark-3: #333;
  --color-border-dark-4: #444;
  --color-border-dark-5: #666;
  --color-shadow-primary: #ff0000;
  --color-shadow-highlight: #ff6400;
  --color-shadow-dark: #000;
  --color-underline-inactive: #7a7971;
  --color-underline-active: #44191a;
  --color-underline-header: #782e22;
  --color-border-light-highlight: #f0f0e0;
  --color-border-light-primary: #b5b3a4;
  --color-border-light-secondary: #c9c7b8;
  --color-border-light-tertiary: #7a7971;
  --color-border-dark: #000;
  --color-border-dark-primary: #191813;
  --color-border-dark-secondary: #23221d;
  --color-border-dark-tertiary: #4b4a44;
  --color-border-highlight: #ff6400;
  --color-border-highlight-alt: #ff0000;
  --color-bg-btn-minor-inactive: #c9c7b8;
  --color-bg-btn-minor-active: #b5b3a4;
  --color-bg-option: #dad8cc;
  --z-index-canvas: 0;
  --z-index-app: 30;
  --z-index-ui: 60;
  --z-index-window: 100;
  --sidebar-width: 300px;
  --sidebar-header-height: 32px;
  --sidebar-item-height: 48px;
  --hotbar-height: 52px;
  --hotbar-width: 578px;
  --macro-size: 50px;
  --players-width: 200px;
  --form-field-height: 26px;
  --font-primary: "Signika", sans-serif;
  --font-mono: monospace;
  --font-size-11: 0.6875rem;
  --font-size-12: 0.75rem;
  --font-size-13: 0.8125rem;
  --font-size-14: 0.875rem;
  --font-size-16: 1rem;
  --font-size-18: 1.125rem;
  --font-size-20: 1.25rem;
  --font-size-24: 1.5rem;
  --font-size-28: 1.75rem;
  --line-height-12: 0.75rem;
  --line-height-16: 1rem;
  --line-height-20: 1.25rem;
  --line-height-30: 1.875rem;
}
/* ----------------------------------------- */
/*  Fonts                                    */
/* ----------------------------------------- */
@font-face {
  font-family: "Signika";
  src: url("fonts/signika/signika-regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: "Signika";
  src: url("fonts/signika/signika-bold.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: "Modesto Condensed";
  font-style: normal;
  font-weight: 400;
  src: url("fonts/modesto-condensed/modesto-condensed.woff2") format("woff2");
}
@font-face {
  font-family: "Modesto Condensed";
  font-style: normal;
  font-weight: 700;
  src: url("fonts/modesto-condensed/modesto-condensed-bold.woff2")
    format("woff2");
}

/* ----------------------------------------- */
/* Scrollbar
/* ----------------------------------------- */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  box-shadow: 0 0 1px #999 inset;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb {
  outline: none;
  border-radius: 3px;
  background: #782e22;
  border: 1px solid var(--color-border-highlight);
}
:root {
  scrollbar-width: thin;
  scrollbar-color: #782e22 #111;
}
</style>

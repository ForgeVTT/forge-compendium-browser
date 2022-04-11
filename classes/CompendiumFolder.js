import { ForgeCompendiumBrowser, log, setting, i18n } from '../main.js';

export class CompendiumBook {
    constructor(data) {
        this.data = data;
    }

    get id() {
        return this.data.id;
    }

    get label() {
        return this.data.label;
    }

    get img() {
        return this.data.img;
    }

    get type() {
        return "folder";
    }

    get children() {
        return this.hierarchy.children;
    }
}
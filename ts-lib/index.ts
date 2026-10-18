import abText from "ab-text";

import Table from "./Table.js";
import lang_EN from "./languages/en.spkTables.ts";
import lang_PL from "./languages/pl.spkTables.ts";

class spkTables_Class {
    #debug: boolean;

    get debug(): boolean {
        return this.#debug;
    }

    get Table(): typeof Table {
        return Table;
    }


    constructor() {
        this.#debug = false;

        abText.add('en.spkTables', lang_EN);
        abText.add('pl.spkTables', lang_PL);
    }

    setDebug(debug: boolean): void {
        this.#debug = debug;
    }
}
const spkTables = new spkTables_Class();
export default spkTables;
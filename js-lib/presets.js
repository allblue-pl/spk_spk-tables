'use strict';

import js0 from "js0";

// import Table from "./Table.js";

class presets_Class {
    get apiTableArgs() { return js0.fn(
    js0.TPreset, () => {
        return js0.Preset({
            table: js0.Preset({
                filter: 'string',
                orderColumnName: 'string',
                orderColumnDesc: 'boolean',
                offset: [ 'int', js0.TNull ],
                limit: [ 'int', js0.Null ],
            }),
            custom: js0.TRawObject,
        });
    })}

    get apiTableInfo() { return js0.fn(
    js0.TPreset, () => {
        return js0.Preset({
            columns: this.tableInfo_Columns,
        });
    })}

    get tableInfo() { return js0.fn(
    js0.TPreset, () => {
        const Table = require('./Table.js');

        return js0.Preset({
            columns: js0.Iterable(this.tableInfo_Column),
            apiUri: [ 'string', js0.Null, js0.Default(null) ],
            fn: [ 'function', js0.Null, js0.Default(null) ],
            orderBy: js0.Preset({
                columnName: [ 'string', js0.Null ],
                reverse: [ 'boolean', js0.Default(false) ],
            }),
            hiddenColumnNames: [ js0.Iterable('string'), js0.Default([]) ],
            showInstantLoading: [ 'boolean', js0.Default(false) ],
        });
    })}

    get tableInfo_Column() { return js0.fn(
    js0.TPreset, () => {
        const Table = require('./Table.js');

        return js0.Preset({
            name: 'string',
            refColumnName: [ 'string', js0.Null, 'symbol', js0.Default(Table.NotSet) ],
            header: 'string',
            class: [ 'string', js0.Default('') ],
            style: [ 'string', js0.Default('') ],
            textStyle: [ 'string', js0.Default('') ],
            orderBy: [ js0.Preset({
                priority: [ 'number', js0.Default(0) ],
                reverse: [ 'boolean', js0.Default(false) ],
            }), js0.Null, js0.Default(null) ],
            filter: [ 'boolean', js0.Default(true), ],
        });
    })}

    get tableInfo_Columns() { return js0.fn(
    js0.TArrayItems, () => {
        return js0.ArrayItems(this.tableInfo_Column);
    })}

    get tableRow() { return js0.fn(
    js0.TArgType, () => {
        return Array;
    })}

    get tableRows() { return js0.fn(
    js0.TArrayItems, () => {
        return js0.ArrayItems(this.tableRow);
    })}

    get refreshResult() { return js0.fn(
    js0.TPreset, () => {
        return js0.Preset({
            data: [ js0.Preset({
                table: js0.ArrayItems(Array),
            }, true), js0.Null ],
            error: [ 'string', js0.Null ],
        });
    })}

    constructor() { return js0.fn(arguments,
    '', () => {
        
    })}
}
export default presets = new presets_Class();
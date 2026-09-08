import { ts0, type TS0RawObject, type TS0RawValue } from "@allblue/ts0";
import { Layout } from "spocky";
import type { TableRefreshResult, TableRefreshResultData } from "spk-tables_presets";


export type ColRefs = {[columnName: string]: number};
export type ColumnOrderInfo = {
    colRef: number,
    priority: number,
    reverse: boolean,
};

export type Fns_ApiFields = () => TS0RawObject;
export type Fns_CustomFilter = () => {[filterName: string]: TS0RawObject};
export type Fns_RowsFilter = (rows: Array<TableRow>, colRefs: ColRefs) => Array<TableRow>;
export type Fns_RowHref = (row: TableRow, colRefs: ColRefs) => string;

export type Listeners_OnApiResult = (data: TableRefreshResultData, apiFields: TS0RawObject) => void;
export type Listeners_OnClick = (row: TableRow, colRefs: ColRefs, rowIndex: number) => void;
export type Listeners_OnColumnButtonClick = (row: TableRow, col: TableColumn, 
        rowIndex: number, colIndex: number, colRefs: ColRefs) => void;
export type Listeners_OnRefresh = (rows: Array<TableRow>, colRefs: ColRefs) => void;
export type Listeners_OnRowSelected = (selected: TS0RawValue, row: TableRow, 
        colRefs: ColRefs, rowIndex: number) => boolean;
export type Listeners_OnSearch = (filter: string) => string;
export type Listeners_OnSort = (rows: Array<TableRow>, colRefs: ColRefs) => void;

export type TableColumn_Base = {
    class: string,
    show: boolean,
    value: TS0RawValue,
    html: string|null,
    button: {
        show: boolean,
        href: string,
        btnClass: string,
        iClass: string,
        text: string,
    },
};
export type TableColumn = TableColumn_Base & {
    layout: null|Layout,
};
export type TableColumn_Field = TableColumn_Base & {
    hasLayout: boolean,
};
export const presets_TableColumn = ts0.TPreset({
    class: "string",
    show: "boolean",
    value: ts0.TRawValue,
    html: "string",
    button: ts0.TPreset({
        show: "boolean",
        href: "string",
        btnClass: "string",
        iClass: "string",
        text: "string",
    }),

    layout: [ Layout, ts0.TNull ],
})

export type TableRow_Base = {
    href: string|null,
    class: string,
    style: string,
    selected: boolean,
}
export type TableRow = TableRow_Base & {
    order: number,
    cols: Array<TableColumn>,
}
export type TableRow_Field = TableRow_Base & {
    cols: Array<TableColumn_Field>,
}
export const presets_TableRow = ts0.TPreset({
    order: "number",
    cols: ts0.TArray(presets_TableColumn),
});

export type TableRefreshFn = (apiFields: TS0RawObject) => Promise<TableRefreshResult>;
import spkTables from "./ts-lib/index.ts";
import type { ColRefs } from "./ts-lib/presets.ts";
import type { Fns_ApiFields, Fns_CustomFilter, Fns_RowsFilter, Fns_RowHref } from 
        "./ts-lib/presets.ts";
import { presets_TableRow } from "./ts-lib/presets.ts";
import type { Listeners_OnApiResult, Listeners_OnClick, Listeners_OnColumnButtonClick,
        Listeners_OnRefresh, Listeners_OnRowSelected, Listeners_OnSearch,
        Listeners_OnSort } from "./ts-lib/presets.ts";
import type { TableColumn, TableRow, TableRefreshFn, } from 
        "./ts-lib/presets.ts";
import { presets_ApiTableArgs, presets_ApiTableInfo, presets_TableColumnValue } from "spk-tables_presets";
import type { TableArgs, TableColumnValue, TableInfo, TableRefreshResultData, TableRefreshResult } from "spk-tables_presets";

export default spkTables;
export { presets_ApiTableArgs, presets_ApiTableInfo, presets_TableColumnValue,
        presets_TableRow };
export type { ColRefs, };
export type { Fns_ApiFields, Fns_CustomFilter, Fns_RowsFilter, Fns_RowHref };
export type { Listeners_OnApiResult, Listeners_OnClick, Listeners_OnColumnButtonClick,
        Listeners_OnRefresh, Listeners_OnRowSelected, Listeners_OnSearch,
        Listeners_OnSort };
export type { TableArgs, TableColumn, TableColumnValue, TableInfo, TableRow, TableRefreshFn, TableRefreshResult,
        TableRefreshResultData };
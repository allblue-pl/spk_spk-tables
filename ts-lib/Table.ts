import abStrings from "ab-strings";
import abText from "ab-text";
import { Holder, Layout, Module } from "spocky";
import webABApi from "web-ab-api";
import type { Messages } from "spk-messages";
import { type ColumnOrderInfo, type Fns_ApiFields, type Fns_CustomFilter, type Fns_RowHref, type Fns_RowsFilter, type Listeners_OnApiResult, type Listeners_OnClick, type Listeners_OnColumnButtonClick, type Listeners_OnRefresh, type Listeners_OnRowSelected, type Listeners_OnSearch, type Listeners_OnSort, type TableRefreshFn, type TableColumn, type TableColumn_Field, type TableRow, type TableRow_Field, presets_TableColumn } from "./presets.ts";
import { presets_TableRefreshResult, presets_TableRefreshResultData, presets_TableInfo, presets_TableColumnValue, } from "spk-tables_presets"
import type { TableRefreshResult, TableRefreshResultData, TableArgs, TableColumnValue, TableInfo, TableInfo_Column, TableInfo_Column_Parsed, TableInfo_Parsed, } from "spk-tables_presets";
import ts0, { ts0Assert, ts0Helper, type TS0NotSet, type TS0RawObject, type TS0RawValue } from "@allblue/ts0";
import TableLayout from "../$layouts/TableLayout.ts";

export default class Table extends Module {
    #msgs: Messages;
    #info: TableInfo_Parsed;
    #refreshFn: (TableRefreshFn)|null;
    #columnNames: Array<string>;
    #columnRefs: {[columnName: string]: number};
    #columnsOrder: Array<ColumnOrderInfo>;

    #dynamic: boolean;

    #rows: Array<TableRow>;
    #rows_Current: Array<TableRow>;
    #rows_Fields: Array<TableRow_Field>;
    #rows_Fields_Index: number;

    #rows_RefreshQueueCount: number;

    #noSort: boolean;
    #selectable: boolean;
    #selectable_ShowSelectAll: boolean;
    #selectable_SelectedOnTop: boolean;
    #sortable: boolean;

    #l: Layout;

    #filter: {
        value: string,
        current: string,
        timeoutId: number|null,
    };
    #limit: {
        start: number,
        current: number,
        step: number,
    };

    #fns_ApiFields: Fns_ApiFields|null;
    #fns_CustomFilterFns: {[filterName: string]: Fns_CustomFilter};
    #fns_RowsFilter: Fns_RowsFilter|null;
    #fns_RowHref: Fns_RowHref|null;

    #listeners_OnApiResult: Listeners_OnApiResult|null;
    #listeners_OnClick: Listeners_OnClick|null;
    #listeners_OnColumnButtonClick: Listeners_OnColumnButtonClick|null;
    #listeners_OnRefresh: Listeners_OnRefresh|null;
    #listeners_OnRowSelected: Listeners_OnRowSelected|null;
    #listeners_OnSearch: Listeners_OnSearch|null;
    #listeners_OnSort: Listeners_OnSort|null;


    get columnRefs(): {[columnName: string]: number} {
        return this.#columnRefs;
    }

    get isSelectable(): boolean {
        return this.#selectable;
    }

    get l(): Layout {
        return this.#l;
    }

    get layout(): Layout {
        return this.#l;
    }

    constructor(msgs: Messages, tableInfo: TableInfo, 
            refreshFn: TableRefreshFn|null = null) { 
        super();

        this.#info = ts0.assertType(ts0Helper.copyRawObject(tableInfo),
                presets_TableInfo) as TableInfo_Parsed;
        this.#refreshFn = refreshFn;

        for (let column of this.#info.columns) {
            if (column.refColumnName === undefined)
                column.refColumnName = column.name;
        }

        this.#msgs = msgs;

        this.#columnNames = [];
        this.#columnRefs = this.#createColumnRefs({});
        this.#columnsOrder = [];

        this.#dynamic = false;

        this.#rows = [];
        this.#rows_Current = [];
        this.#rows_Fields = [];
        this.#rows_Fields_Index = 0;

        this.#rows_RefreshQueueCount = 0;

        this.#noSort = false;
        this.#selectable = false;
        this.#selectable_ShowSelectAll = true;
        this.#selectable_SelectedOnTop = false;
        this.#sortable = true;

        this.#filter = {
            value: '',
            current: '',
            timeoutId: null
        };
        this.#limit = {
            start: 50,
            current: 50,
            step: 100,
        };
        this.#fns_RowsFilter = null;

        this.#fns_ApiFields = null;
        this.#fns_CustomFilterFns = {};
        this.#fns_RowHref = null;

        this.#listeners_OnApiResult = null;
        this.#listeners_OnClick = null;
        this.#listeners_OnColumnButtonClick = null;
        this.#listeners_OnRefresh = null;
        this.#listeners_OnRowSelected = null;
        this.#listeners_OnSearch = null;
        this.#listeners_OnSort = null;

        this.#l = new TableLayout();

        /* Why is it needed? */
        // this.#l.$onDisplay((active) => {
            // if (active) {
            //     if (this.#rows_Fields.length > 0)
            //         this.#rows_UpdateFields(this.#rows_Fields, true);
            // } else {
            //     this.#rows_Fields_Index++;
            //     this.#l.$fields.table.rows = [];
            // }
        // });

        this.#createFields();
        this.#createElems();
        this.#parseInfo();

        this.$view = this.#l;
    }

    addCustomFilter(filterName: string, filterFieldsFn: Fns_CustomFilter): Table {
        if (filterName in this.#fns_CustomFilterFns)
            throw new Error(`Filter '${filterName}' already exists.`);

        this.#fns_CustomFilterFns[filterName] = filterFieldsFn;
        return this;
    }

    addHiddenColumns(hiddenColumnNames: Array<string>): void {
        hiddenColumnNames = this.#info.hiddenColumnNames.concat(hiddenColumnNames);        
        this.setHiddenColumns(hiddenColumnNames);
    }

    getSelectedRows(): Array<{[columnName: string]: TableColumnValue}> {
        let rows_Selected: Array<{[columnName: string]: TableColumnValue}> = [];
        for (let row of this.#rows_Current) {
            if (row.selected) {
                let row_Selected: {[columnName: string]: TableColumnValue} = {};
                for (let i = 0; i < row.cols.length; i++)
                    row_Selected[this.#columnNames[i]] = row.cols[i].value;

                rows_Selected.push(row_Selected);
            }
        }

        return rows_Selected;
    }

    getTableArgs(): TableArgs {
        return {
            table: {
                filter: this.#filter.value.substring(0, Math.min(
                        this.#filter.value.length, 128)),
                orderColumnName: this.#info.orderBy.columnName,
                orderColumnDesc: this.#info.orderBy.reverse,
                offset: null,
                limit: null,
            },
            custom: this.#getCustomFilterInfos(),
        }
    }

    getTableInfo(): { columns: Array<TableInfo_Column> } {
        return {
            columns: this.#info.columns,
        };
    }

    refresh(): void {
        this.#limit.current = this.#limit.start;        

        this.#rows_Refresh(false);
    }

    refreshRow(index: number): void {
        this.#rows_Fields[index] = this.#rows_UpdateFields_ParseRow(
            this.#rows_Current[index]);
        this.#l.$fields.table.rows(index, this.#rows_Fields[index]);
    }

    refreshAllRows(): void {
        if (!this.#noSort)
            this.#rows = this.#rows_Sort(this.#rows);
        else
            this.#rows = this.#rows_NoSort(this.#rows);

        this.#rows_Current = this.#rows_Filter(this.#rows);
        this.#rows_Update_Async(this.#rows_Current)
            .then(() => {
                this.#msgs.hideLoading();
            })
            .catch((e) => {
                console.error(e);

                this.#msgs.showMessage_Failure(abText.$('spkTables.Error'), 
                        e.toString());
                this.#msgs.hideLoading();
            });
    }

    removeHiddenColumns(hiddenColumnNames: Array<string>): void {
        hiddenColumnNames = this.#info.hiddenColumnNames.filter((el) => {
            return hiddenColumnNames.indexOf(el) < 0;
        });
        this.setHiddenColumns(hiddenColumnNames);
    }

    setApiFields(apiFieldsFn: Fns_ApiFields): Table {
        this.#fns_ApiFields = apiFieldsFn;

        return this;
    }

    setDynamic(dynamic: boolean): Table {
        this.#dynamic = dynamic;

        return this;
    }

    setFilterText(filterValue: string): Table {
        this.#l.$elems.filter.value = filterValue;
        this.#filter.value = filterValue;

        return this;
    }

    setHiddenColumns(hiddenColumnNames: Array<string>): Table {
        for (let colName of hiddenColumnNames) {
            if (!this.#columnNames.includes(colName))
                throw new Error(`Column '${colName}' does not exist in table.`);
        }

        this.#info.hiddenColumnNames = hiddenColumnNames;

        for (let i = 0; i < this.#columnNames.length; i++) {
            this.#l.$fields.table.headers(i).show = 
                    !hiddenColumnNames.includes(this.#columnNames[i]);
        }

        for (let i = 0; i < this.#rows.length; i++) {
            for (let j = 0; j < this.#columnNames.length; j++) {
                this.#l.$fields.table.rows(i).cols(j).show = 
                        !hiddenColumnNames.includes(this.#columnNames[j]);
            }
        }

        return this;
    }

    setLimit(start: number, step: number): Table {
        this.#limit = {
            start: start,
            current: start,
            step: step,
        };

        return this;
    }

    setNoSort(noSort: boolean): Table {
        this.#noSort = noSort;

        return this;
    }

    setOnApiResult(onApiResultFn: Listeners_OnApiResult): Table {
        this.#listeners_OnApiResult = onApiResultFn;

        return this;
    }    

    setOnColumnButtonClick(onColumnButtonClickFn: Listeners_OnColumnButtonClick): Table {
        this.#listeners_OnColumnButtonClick = onColumnButtonClickFn;

        return this;
    }

    setOnRefresh(onTableRefreshFn: Listeners_OnRefresh): Table {
        this.#listeners_OnRefresh = onTableRefreshFn;

        return this;
    }

    setOnRowSelected(onRowSelectedFn: Listeners_OnRowSelected): Table {
        this.#listeners_OnRowSelected = onRowSelectedFn;

        return this;
    }

    setOnSearch(onSearchFn: Listeners_OnSearch): Table {
        this.#listeners_OnSearch = onSearchFn;

        return this;
    }

    setOnSort(onSortFn: Listeners_OnSort): Table {
        this.#listeners_OnSort = onSortFn;

        return this;
    }

    // setOnRefreshRow(onRefreshRowFn)
    // {
    //     js0.args(arguments, 'function');

    //     this.#listeners_OnRefreshRow = onRefreshRowFn;

    //     return this;
    // }

    setOnRowClick(onClickFn: Listeners_OnClick, rowHrefFn: Fns_RowHref|null = null): Table {
        this.#listeners_OnClick = onClickFn;        
        this.#fns_RowHref = rowHrefFn;

        for (let i = 0; i < this.#rows_Current.length; i++) {
            this.#l.$fields.rows(i).href = rowHrefFn === null ? 
                    '' : rowHrefFn(this.#rows_Current[i], this.#columnRefs);
        }

        return this;
    }

    setOrderBy(columnName: string, reverse: boolean = false): Table {
        this.#info.orderBy.columnName = columnName
        this.#info.orderBy.reverse = reverse;

        return this;
    }

    setRowsFilter(rowsFilterFn: Fns_RowsFilter): Table {
        this.#fns_RowsFilter = rowsFilterFn;

        return this;
    }

    setSelectable(selectable: boolean): Table {
        this.#selectable = selectable;
        this.#l.$fields.table.selectable = selectable;

        return this;
    }

    setSelectable_SelectedOnTop(selectedOnTop: boolean): Table {
        this.#selectable_SelectedOnTop = selectedOnTop;

        return this;
    }

    setSelectable_ShowSelectAll(showSelectAll: boolean): Table {
        this.#selectable_ShowSelectAll = showSelectAll;
        this.#l.$fields.table.selectable_ShowSelectAll = this.#selectable && 
                showSelectAll;

        return this;
    }

    setShowSearch(showSearch: boolean): Table {
        this.#l.$fields.table.showSearch = showSearch;

        return this;
    }

    setSortable(sortable: boolean): Table {
        this.#sortable = sortable;

        return this;
    }

    setTitle(title: string): Table {
        this.#l.$fields.Title = title;

        return this;
    }

    update(tableData: Array<Array<TableColumnValue>>|TS0NotSet = ts0.notSet): void {
        this.#msgs.showLoading('', this.#info.showInstantLoading);

        if (tableData === ts0.notSet) {
            tableData = [];
            for (let row of this.#rows) {
                let tableData_Col = [];
                for (let col of row.cols)
                    tableData_Col.push(col.value);
                tableData.push(tableData_Col);
            }
        }

        let rows = this.#parseResultRows(tableData);

        if (this.#noSort) {
            this.#info.orderBy.columnName = null;
            this.#rows = this.#rows_NoSort(rows);
        } else
            this.#rows = this.#rows_Sort(rows);

        this.#rows_Current = this.#rows_Filter(this.#rows);
        this.#rows_Update_Async(this.#rows_Current)
            .then(() => {
                this.#msgs.hideLoading();
            })
            .catch((e) => {
                console.error(e);

                this.#msgs.showMessage_Failure(abText.$('spkTables.Error'), 
                        e.toString());
                this.#msgs.hideLoading();
            });
    }


    #createColumnRefs(columnRefs_: {[columnName: string]: number}): 
            {[columnName: string]: number} {
        let columnRefs = ts0Helper.copyRawObject(columnRefs_);
        return new Proxy(columnRefs, {
            get: (target: {[columnName: string]: number}, prop: string) => {
                if (!(prop in target))
                    throw new Error(`Column '${prop}' does not exist in table.`);

                return target[prop];
            },
        }) as {[columnName: string]: number};
    }

    #createElems(): void {
        this.#createElems_ColumnButtons();
        this.#createElems_Filter();
        this.#createElems_Header();
        this.#createElems_LoadMore();
        this.#createElems_Rows();
        this.#createElems_Selectable();
        this.#createElems_ColumnLayouts();
    }

    #createElems_ColumnButtons(): void {
        this.#l.$elems.columnButton((elem: Element, keys: Array<TS0RawValue>) => {
            elem.addEventListener('click', (evt) => {
                evt.stopPropagation();
                evt.preventDefault();

                let row = this.#rows_Current[keys[0] as number];
                let col = row.cols[keys[1] as number];

                if (this.#listeners_OnColumnButtonClick !== null) {
                    this.#listeners_OnColumnButtonClick(row, col, 
                        keys[0] as number, keys[1] as number, this.columnRefs);
                }
            });
        });
    }

    #createElems_Filter(): void {
        let updateFilter = (evt: Event) => {
            let filterValue = this.#l.$elems.filter.value;
            if (this.#listeners_OnSearch !== null)
                filterValue = this.#listeners_OnSearch(filterValue);

            this.#filter.value = filterValue;

            /* Cancel timeout if filter changed. */
            if (this.#filter.timeoutId !== null) {
                this.#msgs.hideLoading();
                clearTimeout(this.#filter.timeoutId);
            }

            this.#filter.timeoutId = setTimeout(() => {
                this.#msgs.showLoading('', this.#info.showInstantLoading);

                if (this.#filter.current === this.#filter.value) {
                    this.#msgs.hideLoading();
                    return;
                }

                this.#limit.current = this.#limit.start;

                this.#filter.current = this.#filter.value;

                if (this.#dynamic)
                    this.#rows_Refresh(false);
                else {
                    this.#rows_Current = this.#rows_Filter(this.#rows);
                    this.#rows_Update_Async(this.#rows_Current)
                        .then(() => {
                            this.#filter.timeoutId = null;
                            this.#msgs.hideLoading();
                        })
                        .catch((e) => {
                            console.error(e);

                            this.#msgs.showMessage_Failure(
                                    abText.$('spkTables.Error'), e.toString());
                            this.#msgs.hideLoading();
                            console.error(e);
                        });
                }
            }, 300);
        };

        this.#l.$elems.filter.addEventListener('change', updateFilter);
        this.#l.$elems.filter.addEventListener('keyup', updateFilter);
        this.#l.$elems.filter.addEventListener('keydown', (evt: KeyboardEvent) => {
            if (evt.key === "Enter")
                evt.preventDefault();
        });
    }

    #createElems_Header(): void {
        this.#l.$elems.header((elem: Element, keys: Array<TS0RawValue>) => {
            elem.addEventListener('click', (evt) => {
                evt.preventDefault();

                if (!this.#sortable)
                    return;


                let columnName = this.#columnNames[keys[0] as number];
                if (this.#info.orderBy.columnName === columnName)
                    this.#info.orderBy.reverse = !this.#info.orderBy.reverse
                else {
                    this.#info.orderBy.columnName = columnName
                    this.#info.orderBy.reverse = false;
                }

                this.#limit.current = this.#limit.start;

                if (this.#dynamic)
                    this.#rows_Refresh(false);
                else {
                    this.#rows = this.#rows_Sort(this.#rows);
                    this.#rows_Current = this.#rows_Filter(this.#rows);

                    this.#msgs.showLoading('', this.#info.showInstantLoading);
                    this.#rows_Update_Async(this.#rows_Current)
                        .then(() => {
                            this.#msgs.hideLoading();
                        })
                        .catch((e) => {
                            console.error(e);

                            this.#msgs.showMessage_Failure(
                                    abText.$('spkTables.Error'), e.toString());
                            this.#msgs.hideLoading();
                        });
                }
            });
        })
    }

    #createElems_ColumnLayouts(): void {
        this.#l.$holders.colLayout((holder: Holder, keys: Array<TS0RawValue>) => {
            let row = this.#rows_Current[keys[0] as number];
            let col = row.cols[keys[1] as number];

            if (col.layout !== null) {
                holder.$view = col.layout;
            }
        });
    }

    #createElems_LoadMore(): void {
        this.#l.$elems.loadMore.addEventListener('click', (evt: Event) => {
            evt.preventDefault();

            this.#limit.current += this.#limit.step;

            if (this.#dynamic)
                this.#rows_Refresh(true, false);
            else {
                this.#msgs.showLoading('', this.#info.showInstantLoading);
                this.#rows_Update_Async(this.#rows_Current, false)
                    .then(() => {
                        this.#msgs.hideLoading();
                    })
                    .catch((err) => {
                        console.error(err);

                        this.#msgs.showMessage_Failure(abText.$('spkTables.Error'), 
                                err.toString());
                        this.#msgs.hideLoading();
                    });

            }
        });
    }

    #createElems_Rows(): void {
        this.#l.$elems.row((elem: Element, keys: Array<TS0RawValue>) => {
            elem.addEventListener('click', (evt) => {
                if (this.#listeners_OnClick === null)
                    return;

                evt.preventDefault();

                this.#listeners_OnClick(this.#rows_Current[keys[0] as number], 
                        this.columnRefs, keys[0] as number);
            })
        });
    }

    #createElems_Selectable(): void {
        let selectAll = (val: boolean) => {
            if (!this.#selectable_ShowSelectAll)
                return;

            this.#l.$elems.selectable_TableCheckbox.checked = val;

            for (let i = 0; i < this.#l.$fields.table.rows().$size; i++) {
                this.#rows_Current[i].selected = val;
                this.#l.$fields.table.rows(i).selected = val;
            }
        }

        this.#l.$elems.selectable_TableCheckbox.addEventListener('click', 
                (evt: Event) => {
            evt.stopPropagation();

            selectAll(this.#l.$elems.selectable_TableCheckbox.checked);
        });

        this.#l.$elems.selectable_TableCheckboxHolder.addEventListener('click', 
                (evt: Event) => {
            evt.preventDefault();
            evt.stopPropagation();

            selectAll(!this.#l.$elems.selectable_TableCheckbox.checked);            
        });

        this.#l.$elems.selectable_RowCheckboxHolder((elem: Element, keys: Array<TS0RawValue>) => {
            elem.addEventListener('click', (evt) => {
                evt.preventDefault();
                evt.stopPropagation();

                let selected = !this.#l.$fields.table.rows(keys[0]).selected;
                let row = this.#rows_Current[keys[0] as number];

                if (this.#listeners_OnRowSelected) {
                    if (!this.#listeners_OnRowSelected(selected, row, this.columnRefs, 
                            keys[0] as number))
                        return;
                }

                row.selected = selected;
                this.#l.$fields.table.rows(keys[0]).selected = selected as boolean;
                        
                if (!selected)
                    this.#l.$elems.selectable_TableCheckbox.checked = false;

                if (this.#selectable_SelectedOnTop)
                    this.refreshAllRows();
            });
        });
    }

    #createFields(): void {
        this.#l.$fields.table.selectable_ShowSelectAll = this.#selectable_ShowSelectAll;
        this.#l.$fields.table.trClass = '';
        this.#l.$fields.text = (text: string) => {
            return abText.$('spkTables.' + text);
        }
    }

    #getApiFields(update = false): TS0RawObject {
        /* Fields */
        let fields: TS0RawObject = {};

        let tableArgs = this.getTableArgs();
        if (this.#dynamic) {
            tableArgs.table.offset = update ? this.#rows_Current.length : 0;
            tableArgs.table.limit = this.#limit.current - (update ? this.#rows_Current.length : 0);
        }

        fields.tableInfo = this.getTableInfo();
        fields.tableArgs = tableArgs;

        if (this.#fns_ApiFields !== null) {
            let apiFields = this.#fns_ApiFields();
            for (let fieldName in apiFields)
                fields[fieldName] = apiFields[fieldName];
        }

        return fields;
    }

    #getCustomFilterInfos(): {[filterName: string]: TS0RawObject} {
        let filterInfos: {[filterName: string]: TS0RawObject} = {};
        for (var filterName in this.#fns_CustomFilterFns)
            filterInfos[filterName] = this.#fns_CustomFilterFns[filterName]();

        return filterInfos;
    }

    #parseInfo(): void {
        this.#columnNames = this.#info.columns.map((item) => { return item.name });
        let columnRefs: {[columnName: string]: number} = {};
        for (let i = 0; i < this.#columnNames.length; i++)
            columnRefs[this.#columnNames[i]] = i;
        this.#columnRefs = this.#createColumnRefs(columnRefs);

        this.#columnsOrder = [];
        for (let col of this.#info.columns) {
            let orderByInfo = col.orderBy;
            if (orderByInfo === null)
                continue;

            this.#columnsOrder.push({
                colRef: this.#columnRefs[col.name],
                priority: orderByInfo.priority,
                reverse: orderByInfo.reverse,
            });
        }
        this.#columnsOrder.sort((a, b) => {
            return b.priority - a.priority;
        });

        /* Table Fields */
        for (let col of this.#info.columns) {
            this.#l.$fields.table.headers().$push({
                title: col.header,
                show: !this.#info.hiddenColumnNames.includes(col.name),
                caretDown: false,
                caretUp: false,
                class: col.class,
                style: col.style,
                textStyle: col.textStyle,
            });
        }
    }

    #parseResultRows(resultRows: Array<Array<TableColumnValue>>): Array<TableRow> {
        let rows = [];
        for (let i = 0; i < resultRows.length; i++) {
            let cols: Array<TableColumn> = [];
            for (let j = 0; j < resultRows[i].length; j++) {
                cols.push({
                    class: '',
                    show: !this.#info.hiddenColumnNames.includes(this.#columnNames[j]),
                    value: resultRows[i][j],
                    html: String(resultRows[i][j]),
                    button: {
                        show: false,
                        btnClass: '',
                        iClass: '',
                        text: '',
                    },
                    layout: null,
                });
            }

            let row: TableRow = {
                order: i,
                href: null,
                class: '',
                cols: cols,
                style: this.#listeners_OnClick === null ? '' : 'cursor: pointer;',
                selected: false,
            };

            row.href = this.#fns_RowHref === null ? null : this.#fns_RowHref(row, 
                    this.#columnRefs);

            rows.push(row);
        }

        if (this.#listeners_OnRefresh !== null)
            this.#listeners_OnRefresh(rows, this.#columnRefs);

        return rows;
    }

    #rows_Filter(rows: Array<TableRow>): Array<TableRow> {
        if (this.#fns_RowsFilter !== null)
            rows = this.#fns_RowsFilter(rows, this.columnRefs);

        if (this.#dynamic)
            return rows;

        if (this.#filter.value === '')
            return rows;

        let filterString = abStrings.escapeRegExpChars(
                this.#rows_Filter_FormatString(this.#filter.value));

        let regexp = new RegExp('.*' + filterString + '.*');

        let fRows = [];
        for (let i = 0; i < rows.length; i++) {
            if (this.#selectable_SelectedOnTop) {
                if (rows[i].selected) {
                    fRows.push(rows[i]);
                    continue;
                }
            }

            for (let j = 0; j < rows[i].cols.length; j++) {
                if (!this.#info.columns[j].filter)
                    continue;

                let colString = this.#rows_Filter_FormatString(
                        String(rows[i].cols[j].value));

                if (colString.match(regexp)) {
                    fRows.push(rows[i]);
                    break;
                }
            }
        }

        return fRows;
    }

    #rows_Filter_FormatString(str: string): string {
        return abStrings.escapeLangChars(str.toLowerCase());
    }

    #rows_Sort(rows: Array<TableRow>): Array<TableRow> {
        if (this.#dynamic)
            return rows;

        if (this.#info.orderBy.columnName === null)
            return rows;

        if (!(this.#info.orderBy.columnName in this.#columnRefs)) {
            throw new Error(`Order by column '${this.#info.orderBy.columnName}'` +
                ` does not exist.`);
        }
        
        let columnIndex = this.#columnRefs[this.#info.orderBy.columnName];

        rows = rows.sort((a, b) => {
            let result = 0;
            if (this.#selectable_SelectedOnTop) {
                if (a.selected && !b.selected)
                    result = -1;
                else if (!a.selected && b.selected)
                    result = 1;
            }
            if (result !== 0)
                return result;

            result = this.#rows_Sort_Column(a, b, columnIndex,
                    this.#info.orderBy.reverse);

            if (result !== 0)
                return result;

            for (let i = 0; i < this.#columnsOrder.length; i++) {
                let orderBy = this.#columnsOrder[i];

                if (orderBy.colRef === columnIndex)
                    continue;

                result = this.#rows_Sort_Column(a, b, orderBy.colRef, orderBy.reverse);

                if (result !== 0)
                    return result;
            }

            return 0;
        });

        if (this.#listeners_OnSort !== null)
            this.#listeners_OnSort(rows, this.#columnRefs);

        return rows;
    }

    #rows_Sort_Column(a: TableRow, b: TableRow, columnIndex: number, reverse: boolean): number {
        let a_value = a.cols[columnIndex].value;
        let b_value = b.cols[columnIndex].value;

        if (a_value === null)
            return b_value === null ? 0 : (!reverse ? -1 : 1);
        if (b_value === null)
            return (!reverse ? 1 : -1);

        /* BigInt */
        if (typeof(a_value) === 'bigint' || typeof(b_value) === 'bigint') {
            if (b_value > a_value)
                return -1;
            if (a_value > a_value)
                return 1;

            return 0;
        }

        /* Number */
        if (!isNaN(parseFloat(a_value as string)) && isFinite(a_value as number) &&
                !isNaN(parseFloat(b_value as string)) && isFinite(b_value as number)) {
            if (reverse)
                return (b_value as number) - (a_value as number);
            else
                return (a_value as number) - (b_value as number);
        }

        /* Boolean */
        if (typeof a_value === 'boolean' && typeof b_value === 'boolean') {
            if (a_value === b_value)
                return 0;

            if (reverse)
                return a_value ? 1 : -1;
            else
                return a_value ? -1 : 1;
        }

        /* String / Other */
        a_value = a_value + '';
        b_value = b_value + '';

        if (reverse)
            return -a_value.localeCompare(b_value);
        else
            return a_value.localeCompare(b_value);
    }

    #rows_Update_Async(rows: Array<TableRow>, clear: boolean = true): Promise<void> {
        return new Promise((resolve, reject) => {
            /* Header */
            let orderBy_ColumnName = this.#info.orderBy.columnName;
            if (orderBy_ColumnName === null) {
                for (let i = 0; i < this.#l.$fields.table.headers().$size; i++) {
                    this.#l.$fields.table.headers(i).caretDown = false;
                    this.#l.$fields.table.headers(i).caretUp = false;
                }
            } else {
                let orderBy_ColumnIndex = this.#columnRefs[orderBy_ColumnName];
                for (let i = 0; i < this.#l.$fields.table.headers().$size; i++) {
                    if (i !== orderBy_ColumnIndex) {
                        this.#l.$fields.table.headers(i).caretDown = false;
                        this.#l.$fields.table.headers(i).caretUp = false;
                    } else {
                        this.#l.$fields.table.headers(i).caretDown = !this.#info.orderBy.reverse;
                        this.#l.$fields.table.headers(i).caretUp = this.#info.orderBy.reverse;
                    }
                }
            }

            // if (clearAll)
            //     this.#l.$fields.table.rows = [];
            /* / Header */

            /* Rows */
            let tRows;
            if (this.#dynamic)
                tRows = rows;
            else
                tRows = rows.slice(0, this.#limit.current);

            this.#l.$fields.table = {
                // rows: tRows,
                isEmpty: rows.length === 0,
                showLoadMore: this.#dynamic ? 
                    (tRows.length >= this.#limit.current) :
                    (this.#rows_Current.length > this.#limit.current),
                colsLength: tRows.length === 0 ? 0 : tRows[0].cols.length,
                loading: true,
            };

            this.#rows_UpdateFields(tRows, clear);

            resolve();
            
            // rows = rows.slice(0, 150);

            // let m1 = js0.TimeSpan.MarkStart('Test', 'A');
            // let rowI = 0;
            // for (let i = 0; i < tRows.length; i += 1) {
            //     setTimeout(() => {
            //         this.#l.$fields.table.rows().$push(tRows[rowI]);
            //         rowI++;

            //         if (rowI >= tRows.length) {
            //             m1.end();
            //             console.log(js0.TimeSpan.GetInstance('Test').getDiffs());
            //             resolve();
            //         }

            //         // ts.markStart('Test ' + rowI);
            //         // this.#l.$fields.table.rows().$add(rowI, rows[rowI]);
            //         // rowI++;
            //         // ts.markEnd('Test ' + rowI);

            //         // if (rowI === rows.length) {
            //         //     console.log(ts.getDiffs());
            //         //     console.log(js0.TimeSpan.GetInstance('ListField').getDiffs());
                        
            //         //     resolve();
            //         // }
            //     }, 0);
            // }
        });
    }

    #rows_UpdateFields(rows: Array<TableRow>, clear: boolean = true): void {
        if (clear)
            this.#l.$fields.table.rows = [];

        let startFrom = clear ? 0 : this.#rows_Fields.length;

        this.#rows_Fields = this.#rows_UpdateFields_ParseRows(rows);
        this.#rows_Fields_Index++;

        let rowFieldsIndex = this.#rows_Fields_Index;
        let rowI = startFrom;

        let updateRows = () => {
            if (this.#rows_Fields_Index > rowFieldsIndex)
                return;

            // this.#l.$fields.table.rows().$push(this.#rows_Fields[rowI]);

            for (let i = 0; i < 10 && rowI < this.#rows_Fields.length; i++) {
                this.#l.$fields.table.rows().$push(this.#rows_Fields[rowI]);
                rowI++;
            }

            // rowI++;
            if (rowI >= this.#rows_Fields.length) {
                this.#l.$fields.table.loading = false;
                return;
            }

            setTimeout(() => {
                updateRows();
            }, 100);
        };

        /* Remove 'clear' check and change 'this.#l.$fields.table.rows = ' to 
         * $pushArr when it will exist. */
        if (clear) {
            rowI = Math.min(this.#rows_Fields.length, 50);
            let rows_Fields_Part = this.#rows_Fields.slice(0, rowI);
            this.#l.$fields.table.rows = rows_Fields_Part;
        }

        // for (let i = 0; i < Math.min(this.#rows_Fields.length, 50); i++) {
        //     this.#l.$fields.table.rows().$push(this.#rows_Fields[rowI]);
        //     rowI++;
        // }

        if (rowI >= this.#rows_Fields.length) {
            this.#l.$fields.table.loading = false;
            return;
        } else {
            setTimeout(() => {
                updateRows();
            }, 100);
        }
    }

    #rows_UpdateFields_ParseRow(row: TableRow): TableRow_Field {
        let fCols: Array<TableColumn_Field> = [];
        for (let col of row.cols) {
            fCols.push({
                class: col.class,
                show: col.show,
                value: col.value,
                html: col.html,
                button: {
                    btnClass: col.button.btnClass,
                    iClass: col.button.iClass,
                    show: col.button.show,
                    text: col.button.text,
                },
                hasLayout: col.layout !== null,
            });
        }

        return {
            href: row.href,
            class: row.class,
            cols: fCols,
            style: row.style,
            selected: row.selected,
        };
    }

    #rows_UpdateFields_ParseRows(rows: Array<TableRow>): Array<TableRow_Field> {
        let fRows = [];
        for (let row of rows)
            fRows.push(this.#rows_UpdateFields_ParseRow(row));

        return fRows;
    }

    #rows_Refresh(update = false, clearAll = true): void {
        this.#rows_RefreshQueueCount++;
        update = this.#dynamic ? update : false;

        let apiFields = this.#getApiFields(update);

        this.#msgs.showLoading('', this.#info.showInstantLoading);

        // setTimeout(() => {
        if (this.#refreshFn !== null) {
            this.#refreshFn(apiFields)
                .then((result_) => {
                    let result = ts0.assertType(result_, presets_TableRefreshResult) as TableRefreshResult;

                    this.#rows_RefreshQueueCount--;
                    if (this.#rows_RefreshQueueCount > 0)
                        return;

                    if (result.error === null) {
                        let resultData = result.data;
                        ts0Assert(resultData !== null, `'result.data' cannot be null when result.error is null.`);

                        this.#rows_Refresh_Process_Async(update, clearAll, resultData, apiFields)
                            .then(() => {
                                this.#msgs.hideLoading();
                            })
                            .catch((e) => {
                                console.error(e);

                                this.#msgs.showMessage_Failure(
                                        abText.$('spkTables.Error'), e.toString());
                                this.#msgs.hideLoading();
                            });
                    } else {
                        this.#msgs.showMessage_Failure(abText.$('spkTables.Error'),
                                result.error);
                        this.#msgs.hideLoading();
                    }
                })
                .catch((err) => {
                    console.error(err);

                    this.#msgs.hideLoading();
                    this.#msgs.showMessage_Failure(abText.$('spkTables.Error'),
                            err.toString());
                });
        } else if (this.#info.apiUri !== null) {
            webABApi.json(this.#info.apiUri, apiFields, (result) => {
                this.#rows_RefreshQueueCount--;
                if (this.#rows_RefreshQueueCount > 0)
                    return;

                if (result.isSuccess()) {
                    let resultData = ts0.assertType(result.data, 
                            presets_TableRefreshResultData, `Wrong result data format`) as 
                            TableRefreshResultData;

                    this.#rows_Refresh_Process_Async(update, clearAll, resultData, 
                            apiFields)
                        .then(() => {
                            this.#msgs.hideLoading();
                        })
                        .catch((e) => {
                            console.error(e);

                            this.#msgs.showMessage_Failure(
                                    abText.$('spkTables.Error'), 
                                    e.toString());
                            this.#msgs.hideLoading();
                        });
                } else {
                    // this.rows_Update(this.rows);
    
                    this.#msgs.showMessage_Failure(abText.$('spkTables.Error'),
                            result.data.message);
                }
    
                // this.$layout.$elems.each('select', function(elem) {
                //     elem.checked = false;
                // });
    
                this.#msgs.hideLoading();
            });
        } else
            throw new Error('No data source set.');
        // }, 5000);
    }

    async #rows_Refresh_Process_Async(update: boolean, clearAll: boolean, 
            data: TableRefreshResultData, apiFields: TS0RawObject): Promise<void> {
        if (!('table' in data)) {
            console.error('Table refresh result:', data);
            throw new Error('No `table` in data.');
        }

        if (this.#listeners_OnApiResult !== null)
            this.#listeners_OnApiResult(data, apiFields);

        let tableData = ts0.assertType<Array<Array<TableColumnValue>>>(data.table, 
                ts0.TArray(ts0.TArray(presets_TableColumnValue)));
        let rows_ApiResult = this.#parseResultRows(tableData);
            
        if (update) {
            this.#rows = this.#rows.concat(rows_ApiResult);                    
            this.#rows_Current = this.#rows;
        } else {
            if (this.#noSort) {
                this.#info.orderBy.columnName = null;
                this.#rows = this.#rows_NoSort(rows_ApiResult);
            } else
                this.#rows = this.#rows_Sort(rows_ApiResult);

            this.#rows_Current = this.#rows_Filter(this.#rows);
        }

        await this.#rows_Update_Async(this.#rows_Current, clearAll);
    }

    #rows_NoSort(rows: Array<TableRow>): Array<TableRow> {
        return rows.sort((a, b) => {
            if (this.#selectable_SelectedOnTop) {
                let result = 0;

                if (a.selected && !b.selected)
                    result = -1;
                if (!a.selected && b.selected)
                    result = 1;

                if (result !== 0)
                    return result;
            }

            return a.order - b.order;
        });
    }
}
'use strict';

const
    abStrings = require('ab-strings'),
    js0 = require('js0'),
    spkMessages = require('spk-messages'),
    spocky = require('spocky'),
    webABApi = require('web-ab-api'),

    $layouts = require('./$layouts'),
    spkTables = require('.')
;

export default class Table extends spocky.Module
{

    get columnRefs() {
        return this._columnRefs;
    }

    get layout() {
        return this.l;
    }

    constructor(msgs, tableInfo)
    { super();
        js0.args(arguments, spkMessages.Messages, js0.RawObject);

        tableInfo = js0.copyObject(tableInfo);

        js0.typeE(tableInfo, js0.Preset({
            columns: js0.Iterable(js0.Preset({
                name: 'string',
                refColumnName: [ 'string', js0.Null, 'symbol', js0.Default(Table.NotSet) ],
                header: 'string',
                class: [ 'string', js0.Default('') ],
                style: [ 'string', js0.Default('') ],
                textStyle: [ 'string', js0.Default('') ],
                orderBy: [ js0.Preset({
                    priority: [ 'number', js0.Default(0) ],
                    reverse: [ 'boolean', js0.Default(false) ],
                }), js0.Default({ priority: 0, reverse: false }) ],
                filter: [ 'boolean', js0.Default(true), ],
            })),
            apiUri: [ 'string', js0.Null, js0.Default(null) ],
            fn: [ 'function', js0.Null, js0.Default(null) ],
            orderBy: js0.Preset({
                columnName: [ 'string', js0.Null ],
                reverse: [ 'boolean', js0.Default(false) ],
            }),
            hiddenColumnNames: [ js0.Iterable('string'), js0.Default([]) ],
        }));

        for (let column of tableInfo.columns) {
            if (column.refColumnName === Table.NotSet)
                column.refColumnName = column.name;
        }

        this.msgs = msgs;

        this._info = tableInfo;

        this._columnNames = [];
        this._columnRefs = {};
        this._columnsOrder = [];

        this._dynamic = false;

        this._rows = [];
        this._rows_Current = [];
        this._rows_Fields = [];
        this._rows_Fields_Index = 0;

        this._noSort = false;

        this._filter = {
            value: '',
            current: '',
            timeoutId: null
        };
        this._limit = {
            start: 50,
            current: 50,
            step: 100,
        };
        this._rowsFilterFn = null;

        this._fns_ApiFields = null;
        this._fns_RowHref = null;

        this._listeners_OnApiResult = null;
        this._listeners_OnClick = null;
        this._listeners_OnRefresh = null;
        this._listeners_OnSearch = null;
        this._listeners_OnSort = null;

        this.l = new $layouts.Table();
        this.l.$onDisplay((active) => {
            if (active) {
                if (this._rows_Fields.length > 0)
                    this._rows_UpdateFields(this._rows_Fields, true);
            } else {
                this._rows_Fields_Index++;
                this.l.$fields.table.rows = [];
            }
        });

        this._createFields();
        this._createElems();
        this._parseInfo();

        this.$view = this.l;
    }

    addHiddenColumns(hiddenColumnNames)
    {
        js0.args(arguments, Array);

        hiddenColumnNames = this._info.hiddenColumnNames.concat(hiddenColumnNames);        
        this.setHiddenColumns(hiddenColumnNames);
    }

    getSelectedRows()
    {
        let rows_Selected = [];
        for (let row of this._rows_Current) {
            if (row.selected) {
                let row_Selected = {};
                for (let i = 0; i < row.cols.length; i++)
                    row_Selected[this._columnNames[i]] = row.cols[i].value;

                rows_Selected.push(row_Selected);
            }
        }

        return rows_Selected;
    }

    getTableArgs()
    {
        let tableArgs = {};

        tableArgs.table = {
            filter: this._filter.value,
            orderColumnName: this._info.orderBy.columnName,
            orderColumnDesc: this._info.orderBy.reverse,
        };

        // tableArgs.custom = this._getCustomFilterInfos();

        return tableArgs;
    }

    getTableInfo()
    {
        return {
            columns: this._info.columns,
            orderBy: this._info.orderBy,
        };
    }

    refresh()
    {
        this._limit.current = this._limit.start;        

        this._rows_Refresh(false);
    }

    removeHiddenColumns(hiddenColumnNames)
    {
        js0.args(arguments, Array);

        hiddenColumnNames = this._info.hiddenColumnNames.filter((el) => {
            return hiddenColumnNames.indexOf(el) < 0;
        });
        this.setHiddenColumns(hiddenColumnNames);
    }

    setApiFields(apiFieldsFn)
    {
        js0.args(arguments, 'function');

        this._fns_ApiFields = apiFieldsFn;

        return this;
    }

    setDynamic(dynamic)
    {
        js0.args(arguments, 'boolean');

        this._dynamic = dynamic;

        return this;
    }

    setHiddenColumns(hiddenColumnNames)
    {
        js0.args(arguments, js0.Iterable('string'));

        for (let colName of hiddenColumnNames) {
            if (!this._columnNames.includes(colName))
                throw new Error(`Column '${colName}' does not exist in table.`);
        }

        this._info.hiddenColumnNames = hiddenColumnNames;

        for (let i = 0; i < this._columnNames.length; i++) {
            this.l.$fields.table.headers(i).show = 
                    !hiddenColumnNames.includes(this._columnNames[i]);
        }

        for (let i = 0; i < this._rows.length; i++) {
            for (let j = 0; j < this._columnNames.length; j++) {
                this.l.$fields.table.rows(i).cols(j).show = 
                        !hiddenColumnNames.includes(this._columnNames[j]);
            }
        }

        return this;
    }

    setLimit(start, step)
    {
        js0.args(arguments, 'number', 'number');

        this._limit = {
            start: start,
            current: start,
            step: step,
        };

        return this;
    }

    setNoSort(noSort)
    {
        js0.args(arguments, 'boolean');

        this._noSort = noSort;

        return this;
    }

    setOnApiResult(onApiResultFn)
    {
        js0.args(arguments, 'function');

        this._listeners_OnApiResult = onApiResultFn;

        return this;
    }    

    setOnRefresh(onRefreshFn)
    {
        js0.args(arguments, 'function');

        this._listeners_OnRefresh = onRefreshFn;

        return this;
    }

    setOnSearch(onSearchFn)
    {
        js0.args(arguments, 'function');

        this._listeners_OnSearch = onSearchFn;

        return this;
    }

    setOnSort(onSortFn)
    {
        js0.args(arguments, 'function');

        this._listeners_OnSort = onSortFn;

        return this;
    }

    // setOnRefreshRow(onRefreshRowFn)
    // {
    //     js0.args(arguments, 'function');

    //     this._listeners_OnRefreshRow = onRefreshRowFn;

    //     return this;
    // }

    setOnRowClick(onClickFn, rowHrefFn = null)
    {
        js0.args(arguments, [ 'function', js0.Null ], [ 'function', js0.Default ]);

        this._listeners_OnClick = onClickFn;        
        this._fns_RowHref = rowHrefFn;

        for (let i = 0; i < this._rows_Current.length; i++) {
            this.l.$fields.rows(i).href = rowHrefFn === null ? 
                    '' : rowHrefFn(this._rows_Current[i], this._columnRefs);
        }

        return this;
    }

    setOrderBy(columnName, reverse = false)
    {
        js0.args(arguments, 'string', [ 'boolean', js0.Default ]);

        this._info.orderBy.columnName = columnName
        this._info.orderBy.reverse = reverse;

        return this;
    }

    setRowsFilter(rowsFilterFn)
    {
        js0.args(arguments, [ 'function', js0.Null ]);

        this._rowsFilterFn = rowsFilterFn;

        return this;
    }

    setSelectable(selectable)
    {
        this.l.$fields.table.selectable = selectable ? true : false;

        return this;
    }

    setShowSearch(showSearch)
    {
        this.l.$fields.table.showSearch = showSearch;

        return this;
    }

    setTitle(title)
    {
        js0.args(arguments, [ 'string', js0.Null ]);

        this.l.$fields.Title = title;

        return this;
    }

    update(tableData = js0.NotSet)
    {
        this.msgs.showLoading('');

        let rows = tableData === js0.NotSet ? 
                this._rows : this._parseResultRows(tableData);

        if (this._noSort) {
            this._info.orderBy.columnName = null;
            this._rows = this._rows_Sort(rows);
        } else
            this._rows = rows;

        this._rows_Current = this._rows_Filter(this._rows);
        this._rows_Update_Async(this._rows_Current)
            .then(() => {
                this.msgs.hideLoading();
            })
            .catch((e) => {
                console.error(e);

                this.msgs.showMessage_Failure(e.toString());
                this.msgs.hideLoading();
            });
    }


    _createElems()
    {
        this._createElems_Filter();
        this._createElems_Header();
        this._createElems_LoadMore();
        this._createElems_Rows();
        this._createElems_Selectable();
    }

    _createElems_Filter()
    {
        let updateFilter = (evt) => {
            let filterValue = this.l.$elems.filter.value;
            if (this._listeners_OnSearch !== null)
                filterValue = this._listeners_OnSearch(filterValue);

            this._filter.value = filterValue;

            /* Cancel timeout if filter changed. */
            if (this._filter.timeoutId !== null) {
                this.msgs.hideLoading();
                clearTimeout(this._filter.timeoutId);
            }

            this._filter.timeoutId = setTimeout(() => {
                this.msgs.showLoading('');

                if (this._filter.current === this._filter.value) {
                    this.msgs.hideLoading();
                    return;
                }

                this._limit.current = this._limit.start;

                this._filter.current = this._filter.value;

                if (this._dynamic)
                    this._rows_Refresh(false);
                else {
                    this._rows_Current = this._rows_Filter(this._rows);
                    this._rows_Update_Async(this._rows_Current)
                        .then(() => {
                            this._filter.timeoutId = null;
                            this.msgs.hideLoading();
                        })
                        .catch((e) => {
                            console.error(e);

                            this.msgs.showMessage_Failure(e.toString());
                            this.msgs.hideLoading();
                            console.error(e);
                        });
                }
            }, 300);
        };

        this.l.$elems.filter.addEventListener('change', updateFilter);
        this.l.$elems.filter.addEventListener('keyup', updateFilter);
        this.l.$elems.filter.addEventListener('keydown', (evt) => {
            if (evt.keyCode === 13)
                evt.preventDefault();
        });
    }

    _createElems_Header()
    {
        this.l.$elems.header((elem, keys) => {
            elem.addEventListener('click', (evt) => {
                evt.preventDefault();

                let columnName = this._columnNames[keys[0]];
                if (this._info.orderBy.columnName === columnName)
                    this._info.orderBy.reverse = !this._info.orderBy.reverse
                else {
                    this._info.orderBy.columnName = columnName
                    this._info.orderBy.reverse = false;
                }

                this._limit.current = this._limit.start;

                if (this._dynamic)
                    this._rows_Refresh(false);
                else {
                    this._rows = this._rows_Sort(this._rows);
                    this._rows_Current = this._rows_Filter(this._rows);

                    this.msgs.showLoading('');
                    this._rows_Update_Async(this._rows_Current)
                        .then(() => {
                            this.msgs.hideLoading();
                        })
                        .catch((e) => {
                            console.error(e);

                            this.msgs.showMessage_Failure(e.toString());
                            this.msgs.hideLoading();
                        });
                }
            });
        })
    }

    _createElems_LoadMore()
    {
        this.l.$elems.loadMore.addEventListener('click', (evt) => {
            evt.preventDefault();

            this._limit.current += this._limit.step;

            if (this._dynamic)
                this._rows_Refresh(true, false);
            else {
                this.msgs.showLoading('');
                this._rows_Update_Async(this._rows_Current, false)
                    .then(() => {
                        this.msgs.hideLoading();
                    })
                    .catch((e) => {
                        console.error(e);

                        this.msgs.showMessage_Failure(e.toString());
                        this.msgs.hideLoading();
                    });

            }
        });
    }

    _createElems_Rows()
    {
        this.l.$elems.row((elem, keys) => {
            elem.addEventListener('click', (evt) => {
                if (this._listeners_OnClick === null)
                    return;

                evt.preventDefault();

                this._listeners_OnClick(this._rows_Current[keys[0]], this.columnRefs);
            })
        });
    }

    _createElems_Selectable()
    {
        let selectAll = (val) => {
            this.l.$elems.selectable_TableCheckbox.checked = val;

            for (let i = 0; i < this.l.$fields.table.rows().$size; i++) {
                this._rows_Current[i].selected = val;
                this.l.$fields.table.rows(i).selected = val;
            }
        }

        this.l.$elems.selectable_TableCheckbox.addEventListener('click', (evt) => {
            evt.stopPropagation();

            selectAll(evt.target.checked);
        });

        this.l.$elems.selectable_TableCheckboxHolder.addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            selectAll(!this.l.$elems.selectable_TableCheckbox.checked);            
        });

        this.l.$elems.selectable_RowCheckboxHolder((elem, keys) => {
            elem.addEventListener('click', (evt) => {
                evt.preventDefault();
                evt.stopPropagation();

                let val = !this.l.$fields.table.rows(keys[0]).selected;

                this._rows_Current[keys[0]].selected = val;
                this.l.$fields.table.rows(keys[0]).selected = val;
                        
                if (!val)
                    this.l.$elems.selectable_TableCheckbox.checked = false;
            });
        });
    }

    _createFields()
    {
        this.l.$fields.table.trClass = '';
        this.l.$fields.text = (text) => {
            return spkTables.text(text);
        }
    }

    _getFields(update = false)
    {
        /* Fields */
        let fields = {};

        let tableArgs = this.getTableArgs();
        if (this._dynamic) {
            tableArgs.table.offset = update ? this._rows_Current.length : 0;
            tableArgs.table.limit = this._limit.current - (update ? this._rows_Current.length : 0);
        }

        fields.tableInfo = {
            columns: this._info.columns,
            orderBy: this._info.orderBy,
        };
        fields.tableArgs = tableArgs;

        if (this._fns_ApiFields !== null) {
            let apiFields = this._fns_ApiFields();
            for (let fieldName in apiFields)
                fields[fieldName] = apiFields[fieldName];
        }

        return fields;
    }

    _parseInfo()
    {
        this._columnNames = this._info.columns.map((item) => { return item.name });
        this._columnRefs = {};
        for (let i = 0; i < this._columnNames.length; i++)
            this._columnRefs[this._columnNames[i]] = i;

        this._columnsOrder = [];
        for (let col of this._info.columns) {
            let orderByInfo = col.orderBy;
            if (orderByInfo === null)
                continue;

            this._columnsOrder.push({
                colRef: this._columnRefs[col.name],
                priority: orderByInfo.priority,
                reverse: orderByInfo.reverse,
            });
        }
        this._columnsOrder.sort((a, b) => {
            return b.priority - a.priority;
        });

        /* Table Fields */
        for (let col of this._info.columns) {
            this.l.$fields.table.headers().$push({
                title: col.header,
                show: !this._info.hiddenColumnNames.includes(col.name),
                caretDown: false,
                caretUp: false,
                class: col.class,
                style: col.style,
                textStyle: col.textStyle,
            });
        }
    }

    _parseResultRows(resultRows)
    {
        let rows = [];
        for (let i = 0; i < resultRows.length; i++) {
            let cols = [];
            for (let j = 0; j < resultRows[i].length; j++) {
                cols.push({
                    class: '',
                    show: !this._info.hiddenColumnNames.includes(this._columnNames[j]),
                    value: resultRows[i][j],
                    html: resultRows[i][j],
                });
            }

            let row = {
                href: null,
                class: '',
                cols: cols,
                style: this._listeners_OnClick === null ? '' : 'cursor: pointer',
                selected: false,
            };

            row.href = this._fns_RowHref === null ? null : this._fns_RowHref(row, 
                    this._columnRefs);

            rows.push(row);
        }

        if (this._listeners_OnRefresh !== null)
            this._listeners_OnRefresh(rows, this._columnRefs);

        return rows;
    }

    _rows_Filter(rows)
    {
        if (this._rowsFilterFn !== null) {
            rows = this._rowsFilterFn(rows, this.columnRefs);
            if (!js0.type(rows, Array)) {
                throw new Error(`'RowsFilterFn' must return an array.`);
            }
        }

        if (this._dynamic)
            return rows;

        if (this._filter.value === '')
            return rows;

        let filterString = abStrings.escapeRegExpChars(
                this._rows_Filter_FormatString(this._filter.value));

        let regexp = new RegExp('.*' + filterString + '.*');

        let fRows = [];
        for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < rows[i].cols.length; j++) {
                let colString = this._rows_Filter_FormatString(
                        String(rows[i].cols[j].value));

                if (colString.match(regexp)) {
                    fRows.push(rows[i]);
                    break;
                }
            }
        }

        return fRows;
    }

    _rows_Filter_FormatString(str)
    {
        return abStrings.escapeLangChars(str.toLowerCase());
    }

    _rows_Sort(rows)
    {
        if (this._dynamic)
            return rows;

        if (this._info.orderBy.columnName === null)
            return rows;

        if (!(this._info.orderBy.columnName in this._columnRefs)) {
            throw new Error(`Order by column '${this._info.orderBy.columnName}'` +
                ` does not exist.`);
        }
        
        let columnIndex = this._columnRefs[this._info.orderBy.columnName];

        rows = rows.sort((a, b) => {
            let result = this._rows_Sort_Column(a, b, columnIndex,
                    this._info.orderBy.reverse);

            if (result !== 0)
                return result;

            for (let i = 0; i < this._columnsOrder.length; i++) {
                let orderBy = this._columnsOrder[i];

                if (orderBy.columnRef === columnIndex)
                    continue;

                result = this._rows_Sort_Column(a, b, orderBy.colRef, orderBy.reverse);

                if (result !== 0)
                    return result;
            }

            return 0;
        });

        if (this._listeners_OnSort !== null)
            this._listeners_OnSort(rows, this._columnRefs);

        return rows;
    }

    _rows_Sort_Column(a, b, column_index, reverse)
    {
        let a_value = a.cols[column_index].value;
        let b_value = b.cols[column_index].value;

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
        if (!isNaN(parseFloat(a_value)) && isFinite(a_value) &&
                !isNaN(parseFloat(b_value)) && isFinite(b_value)) {
            if (reverse)
                return b_value - a_value;
            else
                return a_value - b_value;
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

    _rows_Update_Async(rows, clear = true)
    {
        return new Promise((resolve, reject) => {
            /* Header */
            let orderBy_ColumnIndex = this._columnRefs[this._info.orderBy.columnName];
            for (let i = 0; i < this.l.$fields.table.headers().$size; i++) {
                if (i !== orderBy_ColumnIndex) {
                    this.l.$fields.table.headers(i).caretDown = false;
                    this.l.$fields.table.headers(i).caretUp = false;
                } else {
                    this.l.$fields.table.headers(i).caretDown = !this._info.orderBy.reverse;
                    this.l.$fields.table.headers(i).caretUp = this._info.orderBy.reverse;
                }
            }

            // if (clearAll)
            //     this.l.$fields.table.rows = [];
            /* / Header */

            /* Rows */
            let tRows;
            if (this._dynamic)
                tRows = rows;
            else
                tRows = rows.slice(0, this._limit.current);

            this.l.$fields.table = {
                // rows: tRows,
                isEmpty: rows.length === 0,
                showLoadMore: this._dynamic ? 
                    (tRows.length >= this._limit.current) :
                    (this._rows_Current.length > this._limit.current),
                colsLength: tRows.length === 0 ? 0 : tRows[0].cols.length,
                loading: true,
            };

            this._rows_UpdateFields(tRows, clear);

            resolve();
            
            // rows = rows.slice(0, 150);

            // let m1 = js0.TimeSpan.MarkStart('Test', 'A');
            // let rowI = 0;
            // for (let i = 0; i < tRows.length; i += 1) {
            //     setTimeout(() => {
            //         this.l.$fields.table.rows().$push(tRows[rowI]);
            //         rowI++;

            //         if (rowI >= tRows.length) {
            //             m1.end();
            //             console.log(js0.TimeSpan.GetInstance('Test').getDiffs());
            //             resolve();
            //         }

            //         // ts.markStart('Test ' + rowI);
            //         // this.l.$fields.table.rows().$add(rowI, rows[rowI]);
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

    _rows_UpdateFields(rows, clear = true)
    {
        if (clear)
            this.l.$fields.table.rows = [];

        let startFrom = clear ? 0 : this._rows_Fields.length;

        this._rows_Fields = rows;
        this._rows_Fields_Index++;

        let rowFieldsIndex = this._rows_Fields_Index;
        let rowI = startFrom;

        let updateRows = () => {
            if (this._rows_Fields_Index > rowFieldsIndex)
                return;

            // this.l.$fields.table.rows().$push(this._rows_Fields[rowI]);

            for (let i = 0; i < Math.min(this._rows_Fields.length, 10); i++) {
                this.l.$fields.table.rows().$push(this._rows_Fields[rowI]);
                rowI++;
            }

            // rowI++;
            if (rowI >= this._rows_Fields.length) {
                this.l.$fields.table.loading = false;
                return;
            }

            setTimeout(() => {
                updateRows();
            }, 100);
        };

        rowI = Math.min(this._rows_Fields.length, 50);
        let rows_Fields_Part = this._rows_Fields.slice(0, rowI);
        this.l.$fields.table.rows = rows_Fields_Part;

        // for (let i = 0; i < Math.min(this._rows_Fields.length, 50); i++) {
        //     this.l.$fields.table.rows().$push(this._rows_Fields[rowI]);
        //     rowI++;
        // }

        if (rowI >= this._rows_Fields.length) {
            this.l.$fields.table.loading = false;
            return;
        } else {
            setTimeout(() => {
                updateRows();
            }, 100);
        }
    }

    _rows_Refresh(update = false, clearAll = true)
    {
        update = this._dynamic ? update : false;

        let fields = this._getFields(update);

        this.msgs.showLoading('');

        if (this._info.fn !== null) {
            this._info.fn(fields)
                .then((result) => {
                    if (result.error === null) {
                        this._rows_Refresh_Process_Async(update, clearAll, result.data, fields)
                            .then(() => {
                                this.msgs.hideLoading();
                            })
                            .catch((e) => {
                                console.error(e);

                                this.msgs.showMessage_Failure(e.toString());
                                this.msgs.hideLoading();
                            });
                    } else {
                        this.msgs.showMessage_Failure(result.error);
                        this.msgs.hideLoading();
                    }
                })
                .catch((e) => {
                    console.error(e);

                    this.msgs.hideLoading();
                    this.msgs.showMessage_Failure(e.toString());
                });
        } else if (this._info.apiUri !== null) {
            webABApi.json(this._info.apiUri, fields, (result) => {
                if (result.isSuccess()) {
                    this._rows_Refresh_Process_Async(update, clearAll, result.data, fields)
                        .then(() => {
                            this.msgs.hideLoading();
                        })
                        .catch((e) => {
                            console.error(e);

                            this.msgs.showMessage_Failure(e);
                            this.msgs.hideLoading();
                        });
                } else {
                    // this.rows_Update(this.rows);
    
                    this.msgs.showMessage_Failure(result.data.message);
                }
    
                // this.$layout.$elems.each('select', function(elem) {
                //     elem.checked = false;
                // });
    
                this.msgs.hideLoading();
            });
        } else
            throw new Error('No data source set.');
    }

    async _rows_Refresh_Process_Async(update, clearAll, data, apiFields)
    {
        if (!('table' in data)) {
            console.error('Table refresh result:', data);
            throw new Error('No `table` in data.');
        }

        if (this._listeners_OnApiResult !== null)
            this._listeners_OnApiResult(data, apiFields);

        let rows_ApiResult = this._parseResultRows(data.table);
            
        if (update) {
            this._rows = this._rows.concat(rows_ApiResult);                    
            this._rows_Current = this._rows;
        } else {
            if (this._noSort) {
                this._info.orderBy.columnName = null;
                this._rows = rows_ApiResult;
            } else
                this._rows = this._rows_Sort(rows_ApiResult);

            this._rows_Current = this._rows_Filter(this._rows);
        }

        return await this._rows_Update_Async(this._rows_Current, clearAll);
    }

}

Table.NotSet = Symbol('spkTables_NotSet');
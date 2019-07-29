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
        js0.args(arguments, spkMessages.Messages, js0.Preset({
            columns: js0.Iterable(js0.Preset({
                name: 'string',
                header: 'string',
                orderBy: [ js0.Preset({
                    priority: 'number',
                    reverse: [ 'boolean', js0.Default(false) ],
                }), js0.Default({ priority: 0, reverse: false }) ],
            })),
            apiUri: [ 'string', js0.Null ],
            orderBy: js0.Preset({
                columnName: [ 'string', js0.Null ],
                reverse: [ 'boolean', js0.Default(false) ],
            }),
            hiddenColumnNames: [ js0.Iterable('string'), js0.Default([]) ],
        }));

        this.msgs = msgs;

        this._info = tableInfo;

        this._columnNames = [];
        this._columnRefs = {};
        this._columnsOrder = [];

        this._dynamic = false;

        this._rows = [];
        this._rows_Current = [];

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

        this._fns_ApiFields = null;
        this._fns_RowHref = null;

        this._listeners_OnApiResult = null;
        this._listeners_OnClick = null;
        this._listeners_OnRefresh = null;

        this.l = new $layouts.Table();

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

    refresh()
    {
        this._limit.current = this._limit.start;        

        this._rows_Refresh(false);
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

    // setOnRefreshRow(onRefreshRowFn)
    // {
    //     js0.args(arguments, 'function');

    //     this._listeners_OnRefreshRow = onRefreshRowFn;

    //     return this;
    // }

    setOnRowClick(onClickFn, rowHrefFn = null)
    {
        js0.args(arguments, 'function', [ 'function', js0.Default ]);

        this._listeners_OnClick = onClickFn;        
        this._fns_RowHref = rowHrefFn;
        
        for (let i = 0; i < this._rows.length; i++) {
            this.l.$fields.rows(i).href = rowHrefFn === null ? 
                    '' : rowHrefFn(this._rows[i], this._columnRefs);
        }

        return this;
    }

    setSelectable(selectable)
    {
        this.l.$fields.table.selectable = selectable ? true : false;

        return this;
    }

    setShowSearch(showSearch)
    {
        this.l.$fields.table.showSearch = true;

        return this;
    }

    update(tableData)
    {
        let rows = this._parseResultRows(tableData);

        this._rows = this._rows_Sort(rows);
        this._rows_Update(this._rows_Filter(this._rows));
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
            this._filter.value = this.l.$elems.filter.value;

            /* Cancel timeout if filter changed. */
            if (this._filter.timeoutId !== null) {
                this.msgs.hideLoading();
                clearTimeout(this._filter.timeoutId);
            }

            this._filter.timeoutId = setTimeout(() => {
                this.msgs.showLoading();

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
                    this._rows_Update(this._rows_Current);

                    this._filter.timeoutId = null;

                    this.msgs.hideLoading();
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

                    this._rows_Update(this._rows_Current);
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
            else
                this._rows_Update(this._rows_Current, false);
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
        this.l.$fields.text = (text) => {
            if (!(text in spkTables.texts))
                return `#${text}#`;

            return spkTables.texts[text];
        }
    }

    _getFields(update = false)
    {
        /* Fields */
        let fields = {};

        let tableArgs = this._getTableArgs();
        if (this._dynamic) {
            tableArgs.table.offset = update ? this._rows_Current.length : 0;
            tableArgs.table.limit = this._limit.current - (update ? this._rows_Current.length : 0);
        }

        fields.tableArgs = tableArgs;

        if (this._fns_ApiFields !== null) {
            let apiFields = this._fns_ApiFields();
            for (let fieldName in apiFields)
                fields[fieldName] = apiFields[fieldName];
        }

        return fields;
    }

    _getTableArgs()
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
                class: '',
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

        let columnIndex = this._columnRefs[this._info.orderBy.columnName];

        return rows.sort((a, b) => {
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
    }

    _rows_Sort_Column(a, b, column_index, reverse)
    {
        let a_value = a.cols[column_index].value;
        let b_value = b.cols[column_index].value;

        if (a_value === null)
            return b_value === null ? 0 : (!reverse ? -1 : 1);
        if (b_value === null)
            return (!reverse ? 1 : -1);

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

    _rows_Update(rows, clearAll = true)
    {
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

        setTimeout(() => {
            /* Rows */
            let tRows;
            if (this._dynamic)
                tRows = rows;
            else
                tRows = rows.slice(0, this._limit.current);

            this.l.$fields.table = {
                rows: tRows,
                isEmpty: rows.length === 0,
                showLoadMore: rows.length >= this._limit.current,
                colsLength: tRows.length === 0 ? 0 : tRows[0].cols.length,
            };
            /* / Rows */ 
        }, 10);
    }

    _rows_Refresh(update = false, clearAll = true)
    {
        update = this._dynamic ? update : false;

        let fields = this._getFields(update);

        this.msgs.showLoading();

        webABApi.json(this._info.apiUri, fields, (result) => {
            if (result.isSuccess()) {
                if (!('table' in result.data)) {
                    console.error('Table refresh result:', result.data);
                    throw new Error('No `table` in result from: ' + 
                            this._info.apiUri);
                }

                if (this._listeners_OnApiResult !== null)
                    this._listeners_OnApiResult(result.data);

                let rows_ApiResult = this._parseResultRows(result.data.table);
                    
                if (update) {
                    this._rows = this._rows.concat(rows_ApiResult);                    
                    this._rows_Current = this._rows;
                } else {
                    this._rows = this._rows_Sort(rows_ApiResult);
                    this._rows_Current = this._rows_Filter(this._rows);
                }

                this._rows_Update(this._rows_Current, clearAll);
            } else {
                // this.rows_Update(this.rows);

                this.msgs.showMessage_Failure(result.data.message);
            }

            // this.$layout.$elems.each('select', function(elem) {
            //     elem.checked = false;
            // });

            this.msgs.hideLoading();
        });
    }

}
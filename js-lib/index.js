'use strict';

const
    js0 = require('js0'),
    spkMessages = require('spk-messages'),
    spocky = require('spocky'),
    webABApi = require('web-ab-api'),

    $layouts = require('./$layouts')
;

export class Table extends spocky.Module
{

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
            apiUri: 'string',
            orderBy: js0.Preset({
                columnName: 'string',
                reverse: [ 'boolean', js0.Default(false) ],
            }),
            hiddenColumnNames: [ js0.Iterable('string'), js0.Default([]) ],
        }));

        this.msgs = msgs;

        this._info = tableInfo;

        this._columnNames = [];
        this._columnIndexes = {};
        this._columnsOrder = [];

        this._rows = [];
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

        this._rowHrefFn = null;

        this._listeners_OnApiResult = null;
        this._listeners_OnRefresh = null;

        this.l = new $layouts.Table();

        this._parseInfo();

        this.$view = this.l;
    }

    refresh(update = false)
    {
        update = this.dynamic ? update : false;

        this.msgs.showLoading();

        let fields = this._getFields(update);

        webABApi.json(this._info.apiUri, fields, (result) => {
            if (result.isSuccess()) {
                if (!('table' in result.data)) {
                    console.error('Table refresh result:', result.data);
                    throw new Error('No `table` in result from: ' + 
                            this._info.apiUri);
                }

                if (this._listeners_OnApiResult !== null)
                    this._listeners_OnApiResult(result.data);

                let rows = this._parseResultRows(result.data.table);

                if (update) {
                    this._rows = this.rows.concat(rows);
                    this.rows_Append(rows);
                } else {
                    this._rows = this._rows_Sort(rows);
                    this._rows_Update(this._rows_Filter(this._rows));
                }
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

    setHiddenColumns(hiddenColumnNames)
    {
        js0.args(arguments, js0.Iterable('string'));

        for (let colName in hiddenColumnNames) {
            if (!this.columnNames.includes(colName))
                throw new Error(`Column 'colName' does not exist in table.`);
        }

        this._info.hiddenColumns = hiddenColumns;

        for (let i = 0; i < this._columnNames.length; i++) {
            this.l.$fields.table.headers(i).show = 
                    hiddenColumnNames.includes(this._columnNames[i]);
        }

        for (let i = 0; i < this._rows.length; i++) {
            for (let j = 0; j < this._columnNames.length; j++) {
                this.l.$fields.rows(i).cols(j).show = 
                        hiddenColumnNames.includes(this._columnNames[j]);
            }
        }
    }

    setOnClick(onClickFn)
    {
        js0.args(arguments, 'function');

        this._listeners_OnClick = onClickFn;
        for (let i = 0; i < this._rows.length; i++)

    }

    setRowHref(rowHrefFn)
    {
        js0.args(arguments, 'function');

        this._rowHrefFn = rowHrefFn;
        this.
    }


    _getFields(update = false)
    {
        /* Fields */
        let fields = {};

        let tableArgs = this._getTableArgs();
        if (this.dynamic) {
            tableArgs.table.offset = update ? this._rows.length : 0;
            tableArgs.table.limit = this._limit.current - (update ? this.rows.length : 0);
        }

        fields.tableArgs = tableArgs;

        for (let fieldName in this._apiFields)
            fields[fieldName] = this._apiFields[fieldName];

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
        this._columnIndexes = {};
        for (let i = 0; i < this._columnNames.length; i++)
            this._columnIndexes[this._columnNames[i]] = i;

        this._columnsOrder = [];
        for (let col of this._info.columns) {
            var orderByInfo = col.orderBy;
            if (orderByInfo === null)
                continue;

            this._columnsOrder.push([ this._columnIndexes[col.name], 
                    orderByInfo[1], orderByInfo[0] ]);
        }

        /* Table Fields */
        for (let col of this._info.columns) {
            this.l.$fields.table.headers().$push({
                title: col.header,
                show: !this._info.hiddenColumnNames.includes(col.name),
                caretDown: false,
                caretUp: false,
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
                    show: !this._info.hiddenColumnNames.includes(this._columnNames[j]),
                    value: resultRows[i][j],
                    html: resultRows[i][j],
                });
            }

            rows.push({
                href: null,
                class: '',
                cols: cols
            });
        }

        if (this._listeners_OnRefresh !== null) {
            let columns = {};
            let i = 0;
            for (let columnName in this._info.columns) {
                columns[columnName] = i;
                i++;
            }

            this._listeners_OnRefresh(rows, columns);
        }

        return rows;
    }

    _rows_Filter(rows)
    {
        if (this._dynamic)
            return rows;

        if (this._filter.value === '')
            return rows;

        var filter_string = this._rows_Filter_FormatString(this.filter.value);

        var regexp = new RegExp('.*' + filter_string + '.*');

        var fRows = [];
        for (var i = 0; i < rows.length; i++) {
            for (var j = 0; j < rows[i].cols.length; j++) {
                var col_string = this._rows_Filter_FormatString(
                        String(rows[i].cols[j].value));

                if (col_string.match(regexp)) {
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

        let columnIndex = this._columnIndexes[this._info.orderBy.columnName];

        return rows.sort((a, b) => {
            let result = this._rows_Sort_Column(a, b, columnIndex,
                    this._info.orderBy.reverse);

            if (result !== 0)
                return result;

            for (let i = 0; i < this._columnsOrder.length; i++) {
                let orderBy = this._columnsOrder[i];

                if (orderBy.columnName === columnIndex)
                    continue;

                result = this._rows_Sort_Column(a, b, orderBy.columnName, orderBy.reverse);

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

    _rows_Update(rows)
    {
        var tRows;
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
    }

}
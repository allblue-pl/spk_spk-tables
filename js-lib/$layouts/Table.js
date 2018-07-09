'use strict';

const
    spocky = require('spocky')
;

export default class Table extends spocky.Layout {

    static get Content() {
        return [["div",{"_show":["table.showSearch"],"class":["search"]},["form",{"class":["form-inline"]},["div",{"class":["form-group"]},["div",{"class":["input-group"]},["div",{"class":["input-group-addon"]},["i",{"class":["fa fa-search"]}]],["input",{"_elem":["filter"],"placeholder":["{{eText('SPKTables:search_Placeholder')}}"],"type":["text"],"class":["form-control"]}]]]]],["div",{"_hide":["table.showSearch"]},["span",{}," "]],["_",{"_holder":["beforeTable"]}],["div",{"_show":["table.isEmpty"],"class":["table_empty"]},"{{eText('SPKTables:tableEmpty')}}"],["div",{"_hide":["table.isEmpty"],"class":["table-responsive browse_table"]},["table",{"class":["table"]},["thead",{},["tr",{"class":["header"]},["th",{"_repeat":["table.headers:header"],"_show":["header.show"],"class":["text-nowrap"]},["a",{"_elem":["header"],"href":[]},"$header.title"]," ",["i",{"_show":["header.caretDown"],"class":["fa fa-caret-down"]}],["i",{"_show":["header.caretUp"],"class":["fa fa-caret-up"]}]]]],["tbody",{},["tr",{"_repeat":["table.rows:row"],"_elem":["row"],"class":["$table.trClass"," ","$row.class"]},["td",{"_repeat":["row.cols:col"],"_show":["col.show"]},["a",{"_show":["row.href"],"href":["$row.href"]},["span",{"_field":["col.html"]}]],["div",{"_hide":["row.href"]},["span",{"_field":["col.html"]}]]]],["tr",{"_show":["table.showLoadMore"],"class":["e-load-more"]},["td",{"_elem":["loadMore"],"colspan":["$table.colsLength"],"class":["clickable"],"style":["text-align: center;"]},["a",{"href":["#"],"style":["font-size: 18pt; padding-top: 20px;"]},"{{eText('SPKTables:loadMore')}}\r\n                         ",["i",{"class":["fa fa-caret-down"],"aria-hidden":["true"]}]]]]]]],["div",{"class":["mg-clear"]}],["div",{"_holder":["afterTable"]}]];
    }


    constructor()
    {
        super(Table.Content);
    }

}

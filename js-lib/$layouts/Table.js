'use strict';

const
    spocky = require('spocky')
;

export default class Table extends spocky.Layout {

    static get Content() {
        return [["div",{"_show":["table.showSearch"],"class":["search col-lg-3 col-sm-6 p-0 mb-4"]},["form",{},["div",{"class":["input-group"]},["div",{"class":["input-group-prepend"]},["div",{"class":["input-group-text"]},["i",{"class":["fa fa-search"]}]]],["input",{"_elem":["filter"],"placeholder":["$text('search_Placeholder')"],"type":["text"],"class":["form-control"]}]]]],["_",{"_holder":["beforeTable"]}],["div",{"_show":["table.isEmpty"],"class":["table_empty"]},"$text('tableEmpty')"],["div",{"_hide":["table.isEmpty"],"class":["table-responsive browse_table"]},["table",{"class":["table"]},["thead",{},["tr",{"class":["header"]},["th",{"_repeat":["table.headers:header"],"_show":["header.show"],"class":["text-nowrap ","$header.class"]},["a",{"_elem":["header"],"href":[]},["span",{"_field":["header.title"]}]]," ",["i",{"_show":["header.caretDown"],"class":["fa fa-caret-down"]}],["i",{"_show":["header.caretUp"],"class":["fa fa-caret-up"]}]]]],["tbody",{},["tr",{"_repeat":["table.rows:row"],"_elem":["row"],"class":["$table.trClass"," ","$row.class"],"style":["$row.style"]},["td",{"_repeat":["row.cols:col"],"_show":["col.show"],"class":["$col.class"]},["a",{"_show":["row.href"],"href":["$row.href"]},["span",{"_field":["col.html"]}]],["div",{"_hide":["row.href"]},["span",{"_field":["col.html"]}]]]],["tr",{"_show":["table.showLoadMore"],"class":["e-load-more"]},["td",{"_elem":["loadMore"],"colspan":["$table.colsLength"],"class":["clickable"],"style":["text-align: center;"]},["a",{"href":["#"],"style":["font-size: 18pt; padding-top: 20px;"]},"$text('loadMore')","\r\n                         ",["i",{"class":["fa fa-caret-down"],"aria-hidden":["true"]}]]]]]]],["div",{"class":["mg-clear"]}],["div",{"_holder":["afterTable"]}]];
    }


    constructor()
    {
        super(Table.Content);
    }

}

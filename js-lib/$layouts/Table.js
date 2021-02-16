'use strict';

const
    spocky = require('spocky')
;

export default class Table extends spocky.Layout {

    static get Content() {
        return [["div",{"_show":["table.showSearch"],"class":["search col-lg-3 col-sm-6 p-0"]},["form",{},["div",{"class":["input-group"]},["div",{"class":["input-group-prepend"]},["div",{"class":["input-group-text"]},["i",{"class":["fa fa-search"]}]]],["input",{"_elem":["filter"],"placeholder":["$text('search_Placeholder')"],"type":["text"],"class":["form-control"]}]]]],["$",{"_holder":["beforeTable"]}],["div",{"_show":["table.isEmpty"],"class":["table_empty pb-5"]},"$text('tableEmpty')"],["div",{"_hide":["table.isEmpty"],"class":["table-responsive browse_table"]},["table",{"class":["table"]},["thead",{},["tr",{"class":["header"]},["th",{"_elem":["selectable_TableCheckboxHolder"],"_show":["table.selectable"]},["input",{"_elem":["selectable_TableCheckbox"],"type":["checkbox"]}]],["th",{"_repeat":["table.headers:header"],"_elem":["header"],"_show":["header.show"],"class":["text-nowrap ","$header.class"],"style":["$header.style"]},["a",{"href":[""]},["span",{"style":["$header.textStyle"],"_field":["header.title"]}]]," ",["i",{"_show":["header.caretDown"],"class":["fa fa-caret-down"]}],["i",{"_show":["header.caretUp"],"class":["fa fa-caret-up"]}]]]],["tbody",{},["tr",{"_repeat":["table.rows:row"],"_elem":["row"],"class":["$table.trClass"," ","$row.class"],"style":["$row.style"]},["td",{"_elem":["selectable_RowCheckboxHolder"],"_show":["table.selectable"]},["input",{"_show":["row.selected"],"type":["checkbox"],"checked":[""]}],["input",{"_hide":["row.selected"],"type":["checkbox"]}]],["td",{"_repeat":["row.cols:col"],"_show":["col.show"],"class":["$col.class"]},["a",{"_show":["row.href"],"href":["$row.href"]},["span",{"_field":["col.html"]}]],["div",{"_hide":["row.href"]},["span",{"_field":["col.html"]}]]]],["tr",{"_show":["table.showLoadMore"],"class":["e-load-more"]},["td",{"_elem":["loadMore"],"colspan":["$table.colsLength"],"class":["clickable"],"style":["text-align: center;"]},["a",{"href":["#"],"class":["btn btn-outline-secondary mt-3 w-100"]},"$text('loadMore')","\r\n                         ",["i",{"class":["fa fa-caret-down"],"aria-hidden":["true"]}]]]]]]],["div",{"class":["mg-clear"]}],["div",{"_holder":["afterTable"]}]];
    }


    constructor()
    {
        super(Table.Content);
    }

}

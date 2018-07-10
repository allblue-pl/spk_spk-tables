'use strict';

const
    abStrings = require('ab-strings'),
    js0 = require('js0'),
    spkMessages = require('spk-messages'),
    spocky = require('spocky'),
    webABApi = require('web-ab-api'),

    $layouts = require('./$layouts')
;

class spkTables_Class
{

    get Table() {
        return require('./Table');
    }

    get texts() {
        return this._texts;
    }

    setTexts(texts)
    {
        this._texts = texts;
    }

    constructor()
    {
        this._texts = {};
    }

}
export default spkTables = new spkTables_Class();
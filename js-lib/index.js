'use strict';

const
    abStrings = require('ab-strings'),
    abText = require('ab-text'),
    js0 = require('js0'),
    spkMessages = require('spk-messages'),
    spocky = require('spocky'),
    webABApi = require('web-ab-api'),

    $layouts = require('./$layouts')
;

class spkTables_Class {

    get presets() {
        return require('./presets.js');
    }

    get Table() {
        return require('./Table.js');
    }


    constructor()
    {
        abText.add('en.spkTables', require('./languages/en.spkTables.js'));
        abText.add('pl.spkTables', require('./languages/pl.spkTables.js'));
    }

}
export default spkTables = new spkTables_Class();
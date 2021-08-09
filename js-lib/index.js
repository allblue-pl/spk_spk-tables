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


    constructor()
    {
        this._textFn = (text) => {
            return this._texts[text];
        };  
        this._texts = {
            Error: 'Error',
        };
    }

    setTextFn(textFn)
    {
        js0.args(arguments, 'function');

        this._textFn = textFn;
    }

    text(text)
    {
        js0.args(arguments, 'string');

        return this._textFn(text);
    }

}
export default spkTables = new spkTables_Class();
/*
 *  This file is part of the OpenLink YouID
 *
 *  Copyright (C) 2015-2020 OpenLink Software
 *
 *  This project is free software; you can redistribute it and/or modify it
 *  under the terms of the GNU General Public License as published by the
 *  Free Software Foundation; only version 2 of the License, dated June 1991.
 *
 *  This program is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 *  General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 *
 */


function loadBinaryFile(file)
{
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) {
      resolve(e.target.result);
    };
    reader.onerror = function(e) {
       reject('Error: '+ e.type);
    };
    reader.readAsBinaryString(file);
  });
}


function create_UUID(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}

function sanitize_str(str) {
  str = str || '';
  return str.replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#39;');
}

var DOM = {};

DOM.qSel = (sel) => { return document.querySelector(sel); };
DOM.qSelAll = (sel) => { return document.querySelectorAll(sel); };
DOM.iSel = (id) => { return document.getElementById(id); };
DOM.qShow = (sel) => { DOM.qSel(sel).classList.remove('hidden'); };
DOM.qHide = (sel) => { DOM.qSel(sel).classList.add('hidden'); };
DOM.Show = (el) => { el.classList.remove('hidden'); };
DOM.Hide = (el) => { el.classList.add('hidden'); };

DOM.ready = (fn) => {
  // If we're early to the party
  document.addEventListener("DOMContentLoaded", fn);
  // If late; I mean on time.
  if (document.readyState === "interactive" || document.readyState === "complete" ) {
    fn();
  }
}
DOM.qShowAll = (sel) => { 
  var lst = DOM.qSelAll(sel); 
  for(var i of lst) {
    i.classList.remove('hidden');
  }
};
DOM.qHideAll = (sel) => { 
  var lst = DOM.qSelAll(sel); 
  for(var i of lst) {
    i.classList.add('hidden');
  }
};

DOM.qGetValue = function (sel)
  {
    return DOM.qSel(sel).value;
  };
DOM.qSetValue = function (sel, val)
  {
    DOM.qSel(sel).value = val;
  };

DOM.iGetValue = function (sel)
  {
    return DOM.iSel(sel).value;
  };
DOM.iSetValue = function (sel, val)
  {
    DOM.iSel(sel).value = val;
  };
DOM.htmlToElement = (html) => {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
  }

DOM.htmlToElements = (html) => {
    var template = document.createElement('template');
    template.innerHTML = html;
    return template.content.childNodes;
  }

function debounce(callback, wait) {
    let timeout;
    return (...args) => {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => callback.apply(context, args), wait);
    };
}



/*
 *  This file is part of the OpenLink Personal Assistant
 *
 *  Copyright (C) 2015-2023 OpenLink Software
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


var $ = Dom7;
var app;
var c_main;

const app_url = new URL(window.location.href)
const pcallback = app_url.origin + app_url.pathname;
const authCode =
    app_url.searchParams.get("code") ||
    // FIXME: Temporarily handle both auth code and implicit flow.
    // Should be either removed or refactored.
    app_url.searchParams.get("access_token");




var solidClient = solidClientAuthentication.default;


function extractIdp(url, data)
{
  try {
    const u = new URL(url);
    const state = u.searchParams.get("state");
    const session = JSON.parse(data['solidClientAuthenticationUser:'+state]);
    if (session && session.sessionId) {
      const session_data = JSON.parse(data['solidClientAuthenticationUser:'+session.sessionId]);
      if (session_data && session_data.issuer) 
        return session_data.issuer;
    }
  } catch (e) {
    console.log(e);
  }
  return null;
}


DOM.ready(() => { init(); })

async function init()
{
  var authData = null;
  var oidc_saved_tokens = null;
  const storage = (window.localStorage) ? window.localStorage : window.sessionStorage


  if (authCode) {
    authData = {url: location.href}

    for(var i=0; i < storage.length; i++) {
      var key = storage.key(i);
      if (key.startsWith('issuerConfig:') || key.startsWith('solidClientAuthenticationUser:') || key.startsWith('oidc.'))
         authData[key] = storage.getItem(key);
    }
    storage.setItem('oidc_code', btoa(JSON.stringify(authData)));

  } else {
    //restore Session
    oidc_saved_tokens = storage.getItem('oidc_saved_tokens');
    if (oidc_saved_tokens) {
      try {
        const oidc_code = storage.getItem('oidc_code');
        authData = JSON.parse(atob(oidc_code));

        for(var key in authData) {
          if (key.startsWith('issuerConfig:') || key.startsWith('solidClientAuthenticationUser:') || key.startsWith('oidc.'))
            storage.setItem(key, authData[key]);
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  if (authData)
    try {
      var options = {url:authData.url, restorePreviousSession: true};
      if (oidc_saved_tokens)
        options['tokens'] = JSON.parse(oidc_saved_tokens);

      const ret = await solidClient.handleIncomingRedirect(options);
      if (ret && ret.tokens) {
          storage.setItem('oidc_saved_tokens', JSON.stringify(ret.tokens));
      }
    } 
    catch(e) {
      console.log(e);
    }
  

  app = new Framework7({
    name: 'ChatBot', // App name
    theme: 'ios', // Automatic theme detection
    el: '#app', // App root element
    autoDarkTheme: true,
    darkMode: 'auto',

    routes: routes,

    navbar: {
      hideOnPageScroll: true,
    },
    smartSelect: {
      closeOnSelect: true,
      scrollToSelectedItem: true,
    },
    input: {
      scrollIntoViewOnFocus: true,
      scrollIntoViewOnCentered: true,
    }

  });

  app.temperature = 0.2;
  app.top_p = 0.5;
  app.isNative = app_url.protocol.startsWith('file:');

  c_main = new ChatMain(app, solidClient, pcallback);

  app.on('smartSelectOpened', ()=>{
    sendToiOS({cmd:'smartSelectOpened'})
  })

  app.on('popoverOpened', (el)=>{
    if (el.el.id === 'popover-settings') {

      const v = app.smartSelect.create({
        el: '#ss_model',
        view: Dom7('#l_model'),
        openIn: 'popover'
      })

      app.range.create({
        el:'#range_temp',
        value: app.temperature,
        on: {
          change: (el) => {
            const v = el.getValue();
            if (el.el.id === 'range_temp')
              DOM.iSel('v_temp').value = v.toFixed(2);
          }
        }
      });
      app.range.create({
        el:'#range_topp',
        value: app.top_p,
        on: {
          change: (el) => {
            const v = el.getValue();
            if (el.el.id === 'range_topp')
              DOM.iSel('v_topp').value = v.toFixed(2);
          }
        }
      });
    
    }
  })

  app.on('panelOpened', (el) => {
    if (el.el.id === 'left_panel') {
      try {
        const debouncedSearch = debounce((ev) => {
          c_main.execSearch(ev.query);
        }, 1000);

        const localSearch = c_main.isLocalSearch();
        let v = app.searchbar.get('.searchbar');
        if (v) {
          if ((localSearch && v.params.customSearch)
              || (!localSearch && !v.params.customSearch)) 
            {
              v.clear();
              v.disable();
              v.destroy();
              v = null;
            }
        }

        if (!v) {
          let params = {
            el: '.searchbar',
            on: {
              enable: function () {
                console.log('Searchbar enabled')
              },
              search: function (ev) {
                if (ev.params.customSearch)
                  debouncedSearch(ev);
              },
              clear: function (ev) {
                console.log('call clear');
                if (ev.params.customSearch)
                  c_main.clearSearch();
              },
              disable: function (ev) {
                console.log('call clear');
                if (ev.params.customSearch)
                  c_main.clearSearch();
              }
            }
          };

          if (localSearch) {
            params['searchContainer'] = '.search-list';
            params['searchIn'] = '.topic_item';
            params['customSearch'] = false;
          } else {
            params['customSearch'] = true;
          }
        
          v = app.searchbar.create(params);
        }
  
      } catch(___) {}
    }
  })

  app.on('popoverClosed', (el)=>{
    if (el.el.id === 'popover-settings') {

      app.temperature = app.range.getValue('#range_temp');
      app.top_p = app.range.getValue('#range_topp');
      if (app.chat) {
        app.chat.setTemperature(app.temperature);
        app.chat.setTop_p(app.top_p);
      }
    }
  })


  document.onclick = (ev) => {
    const n = ev.target;
    if (n.nodeName === 'A') {
      if (n.href && n.hostname != app_url.hostname) {
        ev.stopImmediatePropagation();
        if (app.isNative)
          sendToiOS({cmd:'open_url', url:n.href})
        else
          window.open(n.href);
        return false;
      }
    }
  };

}

function sendToiOS(cmd)
{
  if (app.isNative)
    window.webkit.messageHandlers.iOSNative.postMessage(cmd);
}

function setCallback(url)
{
}

function stored_api_key(v)
{
  if (!v)
    return;
    
  if (c_main)
    c_main.chat.set_api_key(v);
}


function handle_callback(url_str, ver)
{
    try {
        const url = new URL(url_str);
        const authCode =
            url.searchParams.get("code") ||
            url.searchParams.get("access_token");

        handle_authCode(authCode, url_str, ver);
    } catch(e) {
        console.log(e);
    }
}


async function handle_authCode(authCode, url, ver)
{
    var authData = null;
    const storage = (window.localStorage) ? window.localStorage : window.sessionStorage
    
    
    if (authCode) {
        authData = {url}
        
        for(var i=0; i < storage.length; i++) {
            var key = storage.key(i);
            if (key.startsWith('issuerConfig:') || key.startsWith('solidClientAuthenticationUser:') || key.startsWith('oidc.'))
                authData[key] = storage.getItem(key);
        }
        storage.setItem('oidc_code', btoa(JSON.stringify(authData)));
    }
    
    if (authData)
        try {
            var options = {url:authData.url, restorePreviousSession: true};
            const ret = await solidClient.handleIncomingRedirect(options);
            if (ret && ret.tokens)
                    storage.setItem('oidc_saved_tokens', JSON.stringify(ret.tokens));
            
        } catch(e) {
            console.log(e);
        }

    if (ver && app.isNative) {
      const oldVer = storage.getItem('ios_app_ver') || '0';
      if (oldVer !== ver) {
        storage.setItem('ios_app_ver', ver);
        location.reload();
      }
    }

}

//
//  YouID for iOS
//
//  Copyright (C) 2011-2021 OpenLink Software.
//  All Rights Reserved.
//
//  The copyright above and this notice must be preserved in all
//  copies of this source code.  The copyright above does not
//  evidence any actual or intended publication of this source code.
//
//  This is unpublished proprietary trade secret of OpenLink Software.
//  This source code may not be copied, disclosed, distributed, demonstrated
//  or licensed except as authorized by OpenLink Software.
//

var $ = Dom7;
var app;
var c_main;

const purl = new URL(window.location.href)
const app_hostname = purl.hostname;
const purl_hash = purl.hash;
const pcallback = purl.origin + purl.pathname;
const authCode =
    purl.searchParams.get("code") ||
    // FIXME: Temporarily handle both auth code and implicit flow.
    // Should be either removed or refactored.
    purl.searchParams.get("access_token");




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

      const session = solidClient.getDefaultSession();
    } catch(e) {
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

  c_main = new ChatMain(app, solidClient, pcallback);

  app.on('smartSelectOpened', ()=>{
    sendToiOS({cmd:'smartSelectOpened'})
  })


//  function sendToiOS(cmd)
//  {
//    window.webkit.messageHandlers.iOSNative.postMessage(cmd);
//  }

  document.onclick = (ev) => {
    const n = ev.target;
    if (n.nodeName === 'A') {
      if (n.hostname != app_hostname) {
        ev.preventDefault();
        window.open(n.href);
      }
    }
  };

  $(document).on('click', 'a', function (e) {
    const n = e.target;
    if (n.nodeName === 'A') {
      if (n.hostname != app_hostname) {
        //??console.log('link clicked==== '+n.href);
        e.preventDefault();
        window.open(n.href);
      }
    }
  });

}

function setCallback(url)
{
    
}

function handle_callback(url_str)
{
    try {
        const url = new URL(url_str);
        const authCode =
            url.searchParams.get("code") ||
            url.searchParams.get("access_token");

        handle_authCode(authCode, url_str);
    } catch(e) {
        console.log(e);
    }
}


async function handle_authCode(authCode, url)
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
            
            const session = solidClient.getDefaultSession();
            console.log(session);
        } catch(e) {
            console.log(e);
        }
}

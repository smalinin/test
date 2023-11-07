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


class ChatMain {
  constructor(app, solidClient, callback) {
    this.app = app;
    this.app_url = new URL(location.href);
    this.solidClient = solidClient;
    this.callback = callback;
    this.ui = new ChatUI({view:this});
    this.chat = new Chat({httpServer, wsServer, view:this});

    if (this.app.isNative)
      this.sendToiOS({cmd:'get_api_key'});

    app.chat = this.chat;

    const k = localStorage.getItem("api_key");
    if (k)
      this.chat.set_api_key(k);


    const session = this.session = this.solidClient.getDefaultSession();
    if (session.info.isLoggedIn) {
      this.onLogin();
    }


    session.onLogin(()=> {
      this.onLogin();
    })

    session.onLogout(()=> {
      this.onLogout();
    })

    DOM.iSel("reload")
      .onclick = () => {
        this.reload();
      };

    DOM.iSel("login")
      .onclick = () => {
        this.login();
      };
    
    DOM.iSel("btn-logout")
      .onclick = () => {
        this.app.popover.close('.popover-user');
        this.logout();
      };

    DOM.iSel("btn-new")
      .onclick = () => {
        this.new_chat();
    };


    DOM.iSel("btn-send")
      .onclick = async () => {
        const el = DOM.iSel('s_req');
        const text = el.innerText;
        const rc = await this.send_req(text);
        if (rc)
          el.innerText = '';
    };

    DOM.iSel("fab-continue")
      .onclick = () => {
        this.send_continue();
      };

      DOM.iSel("fab-stop")
      .onclick = () => {
        this.send_stop();
    };

    DOM.iSel("panel-menu")
      .onclick = () => {
        this.panel_menu();
    };
 
    DOM.qSel('select#c_model')
      .onchange = (e) => {
        const el = e.target.querySelector('option:checked');
        const v = el.value;
        const text = el.innerText;
        if (text) {
          this.chat.setModel(text, false);
          DOM.qSel('span#subtitle').innerText = text;
        }
      }
      
    DOM.iSel('api-lock')
      .onclick = () => {
        this.api_key();
    };

    DOM.iSel('share')
      .onclick = () => {
        this.share();
    };

    DOM.iSel('audio_enable')
      .onchange = (e) => {
        console.log(e.target.checked);
      } 

//////////////////////////////////////////////////////
  }

  onLogin()
  {
    this.chat.onLogin();
  }

  onLogout()
  {
    this.chat.onLogout();
  }



  login()
  {
    if (this.app.isNative)
      this.sendToiOS({cmd:'login'})
    else
      this.solidClient.login({oidcIssuer:httpServer, 
                            redirectUrl: this.callback, 
                            tokenType: "Bearer",
                            clientName:"OpenLink Personal Assistant"});
  }

  async logout()
  {
    const storage = (window.localStorage) ? window.localStorage : window.sessionStorage
    storage.removeItem("oidc_saved_tokens");
    await this.solidClient.logout();
  }

  reload()
  {
    window.location.reload();
  }

  async send_req(text)
  {
    return await this.chat.ws_sendMessage(text);
  }

  send_continue()
  {
    return this.chat.ws_Continue();
  }

  send_stop()
  {
    return this.chat.ws_Stop();
  }

  new_chat()
  {
    this.ui.new_conversation();
  }

  panel_menu()
  {
    this.ui.openLeftPanel();
  }

  api_key()
  {
    this.ui.api_key();
  }

  share()
  {
    const url = this.chat.getSharedLink();
    if (!url) {
      this.showNotification({title:'Info', text:'Not LoggedIn'});
      return;
    }
    
    if (this.app.isNative)
      this.sendToiOS({cmd:'share', url})
    else
      this.ui.share();
  }

  sendToiOS(cmd)
  {
    window.webkit.messageHandlers.iOSNative.postMessage(cmd);
  }


  setData(_data)
  {
  }


}


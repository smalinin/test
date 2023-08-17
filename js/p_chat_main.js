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


function showNotice(s) 
{
  alert(s);
}


class ChatMain {
  constructor(app, solidClient, callback) {
    this.app = app;
    this.solidClient = solidClient;
    this.callback = callback;
    const chat = this.chat = new Chat({httpServer, wsServer, view:this});
    this.ui = new ChatUI({view:this});

    const session = this.session = this.solidClient.getDefaultSession();
    if (session.info.isLoggedIn) {
//??--      DOM.qSel('#myid').innerText = 'LoggedIn: '+session.info.webId;
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
        window.location.reload();
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
        this.app.popover.close('.popover-req');
        const el = DOM.iSel('c_req');
        const text = el.value;
        const rc = await this.send_req(text);
        if (rc)
          el.value = '';
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
          const model = e.target.parentNode.querySelector('span#model');
          if (model) {
            model.innerText = text;
            this.chat.setModel(text, false);
            DOM.qSel('span#subtitle').innerText = text;
          }
        }
      }
      
    DOM.iSel("btn-api-key")
      .onclick = () => {
        this.api_key();
    };



//////////////////////////////////////////////////////

/***

    DOM.qSel('#btn-install')
      .onclick = () => {
        sendToiOS({cmd:'install'})
      };

    DOM.qSel('#btn-ca-install')
      .onclick = () => {
        sendToiOS({cmd:'ca-install'})
      };

    DOM.qSel('#btn-view')
      .onclick = () => {
        sendToiOS({cmd:'view_card'})
      };

    DOM.qSel('#btn-zip')
      .onclick = () => {
        sendToiOS({cmd:'download_zip'})
      };

    DOM.qSel('#b_copy_n_text')
      .onclick = () => {
        navigator.clipboard.writeText(DOM.iSel('text-n-text').value);
      };

    DOM.qSel('#b_copy_n_ttl')
      .onclick = () => {
        navigator.clipboard.writeText(DOM.iSel('text-n-ttl').value);
      };
    DOM.qSel('#b_copy_n_jsonld')
      .onclick = () => {
        navigator.clipboard.writeText(DOM.iSel('text-n-jsonld').value);
      };
    DOM.qSel('#b_copy_n_rdfxml')
      .onclick = () => {
        navigator.clipboard.writeText(DOM.iSel('text-n-rdfxml').value);
      };
    DOM.qSel('#b_copy_i_ttl')
      .onclick = () => {
        navigator.clipboard.writeText(DOM.iSel('text-i-ttl').value);
      };
    DOM.qSel('#b_copy_i_jsonld')
      .onclick = () => {
        navigator.clipboard.writeText(DOM.iSel('text-i-jsonld').value);
      };
    DOM.qSel('#b_copy_i_rdfxml')
      .onclick = () => {
        navigator.clipboard.writeText(DOM.iSel('text-i-rdfxml').value);
      };
    DOM.qSel('#b_copy_i_fp')
      .onclick = () => {
        navigator.clipboard.writeText(DOM.iSel('text-i-fp').value);
      };
    DOM.qSel('#b_copy_i_ni')
      .onclick = () => {
        navigator.clipboard.writeText(DOM.iSel('text-i-ni').value);
      };
    DOM.qSel('#b_copy_i_di')
      .onclick = () => {
        navigator.clipboard.writeText(DOM.iSel('text-i-di').value);
      };
***/
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
    this.solidClient.login({oidcIssuer:httpServer, 
                            redirectUrl: this.callback, 
                            tokenType: "Bearer",
                            clientName:"ChatBot"});
  }

  async logout()
  {
    await this.solidClient.logout();
  }

  async send_req(text)
  {
    return this.chat.ws_sendMessage(text);
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



  setData(_data)
  {
/***
    this.certPEM = _certPEM;
    this.card_url = _card_url;
    try {
      _relations = JSON.parse(_data);
    } catch(e) {}
***/
/**
    try {
      if (_card_url && _card_url.length > 0)
        DOM.qShow('#block-view');

      if (_filename && _filename.length > 0)
        DOM.qShow('#block-install');

      if (_ca_filename && _ca_filename.length > 0)
        DOM.qShow('#block-ca-install');

      if (_zip_fname && _zip_fname.length > 0)
        DOM.qShow('#block-zip');

      if (_onlyText == 1) {
        DOM.qHide('#block-announce');
        DOM.qHide('#n-ttl');
        DOM.qHide('#n-jsonld');
        DOM.qHide('#n-rdfxml');
        DOM.qHide('#i-jsonld');
        DOM.qHide('#i-rdfxml');
        DOM.qHide('#i-fp');
        DOM.qHide('#i-ni');
        DOM.qHide('#i-di');
      }

      this.certData = parse_cert(_certPEM);

      var webid = this.certData.webid;

      if (webid && (webid.startsWith('bitcoin:') || webid.startsWith('ethereum:'))) {
          DOM.qHide('#n-ttl');
          DOM.qHide('#n-jsonld');
          DOM.qHide('#n-rdfxml');
          DOM.qHide('#i-ttl');
          DOM.qHide('#i-jsonld');
          DOM.qHide('#i-rdfxml');
      }



      DOM.iSel('text-n-text').value = _certTXT;

      var {ttl, jsonld, rdfxml} = genManualUploads(null, this.certData, _relations);
      if (_onlyText != 1) 
      {
        if (ttl && jsonld && rdfxml) {
          DOM.iSel('text-n-ttl').value = '## Turtle Start ##\n'+ttl+'\n## Turtle End ##\n';
          DOM.iSel('text-n-jsonld').value = '## JSON-LD Start ##\n'+jsonld+'\n## JSON-LD End ##\n';
          DOM.iSel('text-n-rdfxml').value = '## RDF-XML Start ##\n'+rdfxml+'\n## RDF-XML End ##\n';

          DOM.iSel('text-i-ttl').value = '<!-- start rdf-turtle profile 1 -->\n<script type="text/turtle">\n'
                                     +ttl
                                    +'\n</script>\n';
          DOM.iSel('text-i-jsonld').value = '<!-- start json-ld profile 2 -->\n<script type="application/ld+json">\n'
                                       +jsonld
                                       +'\n</script>\n';
          DOM.iSel('text-i-rdfxml').value = '<!-- start rdf/xml profile 3 -->\n<script type="application/rdf+xml">\n'
                                       +rdfxml
                                       +'\n</script>\n';
        }
        else {
          DOM.qHide('#n-ttl');
          DOM.qHide('#n-jsonld');
          DOM.qHide('#n-rdfxml');
          DOM.qHide('#i-ttl');
          DOM.qHide('#i-jsonld');
          DOM.qHide('#i-rdfxml');
        }
      }

      DOM.iSel('text-i-fp').value = this.certData.fingerprint_tab;
      DOM.iSel('text-i-ni').value = this.certData.fingerprint_ni_tab;
      DOM.iSel('text-i-di').value = this.certData.fingerprint_di_tab;

    } catch (e) {
      console.log(e);
    }
***/
  }


}


class ChatUI {
  constructor({view}) {
    this.view = view;
  }

  timeSince(date) 
  {
      let now = new Date().getTime();
      let seconds = (now / 1000) - date;
      let interval = seconds / 31536000;
      if (interval > 1) {
          return Math.floor(interval) + 'y';
      }
      interval = seconds / 2592000;
      if (interval > 1) {
          return Math.floor(interval) + 'M';
      }
      interval = seconds / 86400;
      if (interval > 1) {
          return Math.floor(interval) + 'd';
      }
      interval = seconds / 3600;
      if (interval > 1) {
          return Math.floor(interval) + 'h';
      }
      interval = seconds / 60;
      if (interval > 1) {
          return Math.floor(interval) + 'm';
      }
      return Math.floor(seconds) + 's';
  }

  /***
    list 

[
    {
        "chat_id": "system-chat-help",
        "title": "VirtuosoHelp",
        "ts": 1687293687,
        "role": "system",
        "model": "gpt-4"
    },
    {
        "chat_id": "system-virtuoso-support-bot-with-fine-tunning-and-plugin-support-9",
        "title": "Virtuoso Support Agent",
        "ts": 1691162946,
        "role": "system",
        "model": "gpt-4"
    },
    {
        "chat_id": "b23d7e47052508932d18596aa5006e0a",
        "title": "b23d7e47052508932d18596aa5006e0a",
        "ts": 1690417714,
        "model": "gpt-4",
        "role": "user"
    }
]
  ***/
  updateListTopics(list)
  {
    if (!list)
      return;

    let html = [];
    for(const v of list) {
      const text = v.title ?? v.chat_id;
      const is_system = v.chat_id.startsWith('system-') ;
      const more = v.ts ? this.timeSince(v.ts) : '';
      if (is_system) {
        html.push(
          `<li class="swipeout">`
         +`  <div class="item-content">`
         +`    <div class="item-inner">`
         +`      <div class="item-title">${text}</div>`
         +`    </div>`
         +`  </div>`
         +`</li>`)
      }
      else {
        const title = `${text} <span class="timestamp">(${more})</span>`;
        html.push(
          `<li class="swipeout">`
         +`  <div class="item-content swipeout-content">`
         +`    <div class="item-inner">`
         +`      <div class="item-title">${title}</div>`
         +`    </div>`
         +`  </div>`
         +`  <div class="swipeout-actions-right" chat_id="${v.chat_id}">`
         +`    <a class="color-green chat_edit">Edit</a>`
         +`    <a class="color-red chat_del">Delete</a>`
         +`  </div>`
         +`</li>`)
      }
    }
    DOM.qSel('#list_topics ul').innerHTML = html.join('');
  }
}

class Chat {
  constructor({httpServer, wsServer, view}) 
  {
    this.view = view;
    this.solidClient = solidClientAuthentication.default;
    this.httpServer = httpServer;
    this.wsServer = wsServer;
    this.session = null;
    this.sessionId = null;
    this.loggedIn = false;
    this.webSocket = null;
    this.helloSent = false;
    this.currentModel = 'gpt-4';
    this.enabledCallbacks = null;


    this.currentChatId = null;
    this.lastChatId = null;
    this.resume_chat_id = null;
    this.receivingMessage = null;
    this.curConversation = [];
    this.curChats = [];
  }

  showNotice(s)
  {
    alert(s);
  }

  showMessage(text)
  {
    console.log('Chat msg: '+text);
  }

/****
        session.onLogin(function() {
            loggedIn = (session && session.info && session.info.isLoggedIn);
            updateLoginState();
            if (session.info.webId != null)
                showNotice ('Logged as ' + session.info.webId);
        });
****/


  
  async onLogin()
  {
    this.session = this.solidClient.getDefaultSession();
    this.loggedIn = this.session.info.isLoggedIn;
    if (!this.loggedIn) {
      this.webId = null;
      this.sessionId = null;
    }
    else {
      this.webId = this.session.info.webId;
      this.sessionId = this.session.info.sessionId;
      await this.updateLoginState();
    } 
  }

  async onLogout()
  {
    this.session = null;
    this.loggedIn = false;
    this.webId = null;
  }


  async updateLoginState() 
  {
    if (!this.loggedIn)
      return;

//??    console.log('AppState#updateLoginState: loggedIn:', this.loggedIn);

//??      loginButton.classList.toggle('hidden', loggedIn)
//??      logoutButton.classList.toggle('hidden', !loggedIn)

    if (this.resume_char_id) {
      const chat_id = await resumeAsNew(resume_char_id);
      await loadConversation(chat_id);
    }
    await this.initSidebar();
    //?? initFunctions();
    this.ws_Init();
  }


  async chatAuthenticate (currentChatId) 
  {
//??    if (!currentChatId)
//??      return;

    try {
      const url = new URL('/chat/api/chatAuthenticate', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('session_id', this.sessionId);
//??--      params.append('netid', this.webId);

      if (currentChatId)
        params.append('chat_id', currentChatId);

      url.search = params.toString();
      const resp = await this.solidClient.fetch (url.toString());
      if (!resp.ok) {
        this.showNotice ('Can not authenticate chat session' + resp.statusText);
        //await this.authLogout(); //???? fixme ====????
        return false;
      }
    } catch (e) {
        console.log('Error:' + e);
        this.showNotice('Can not authenticate ' + e);
        //await this.authLogout(); //???? fixme ====????
        return false;
    }
    return true;
  }


  async getCurrentChatId()
  {
    /* here we should current chat if new */
    if (!this.loggedIn)
      return null;

    try {
      const url = new URL('/chat/api/getTopic', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('session_id', this.sessionId);
      url.search = params.toString();
      const resp = await this.solidClient.fetch (url.toString());
      if (resp.status === 200) {
        let chat = await resp.json();
        /*console.log('resp:' + JSON.stringify(chat));*/
        const chat_id = chat['chat_id'];
        const title = chat['title'];
//??     addSidebarItem (chat_id, title, 'now', lastChatId);
        return {chat_id, title}; //    this.currentChatId = chat_id;
//??    updateShareLink();
      } else {
        this.showNotice ('Can not retrieve chatId ' + resp.statusText);
      }
    } catch (e) {
      console.log('Error:' + e);
      this.showNotice('Can not getTopic ' + e);
    }
    return null;
  }


/***==================================
============================***********/


  ws_Init()
  {
    if (!this.loggedIn)
      return;

    let url = new URL(this.wsServer);
    let params = new URLSearchParams(url.search);
    params.append('sessionId', this.sessioId);
    url.search = params.toString();
    
    console.log('ws_Init = '+url);

    this.webSocket = new WebSocket(url.toString());
    this.webSocket.onopen = (e) => {this.ws_onOpen(e) }
    this.webSocket.onmessage = (e) => { this.ws_onMessage(e) }
    this.webSocket.onerror = (e) => { this.ws_onError(e) }
    this.webSocket.onclose = (e) => {this.ws_onClose(e) }
  }

/**
  ws_Reconnect(url)
  {
    this.ws_Init();
//??    $('.reconnect').hide();
//??    $('.message_input').prop('disabled', false);
//??    $('.send_message').show();
  }
**/

  ws_Continue()
  {
    console.log('ws_onContinue = '+ev);
    if (thisloggedIn && this.webSocket) {
      let request = { type: 'system', 
                      question: 'continue', 
                      netid: this.webId, 
                      chat_id: this.currentChatId, 
                      model: this.currentModel, 
                      call: this.enabledCallbacks };
      this.webSocket.send(JSON.stringify(request));
    }
//??    $('.continue_wrapper').hide();
  }


//??
  async ws_onOpen(ev)
  {
    console.log('ws_onOpen = '+JSON.stringify(ev));
    const rc = await this.chatAuthenticate (this.currentChatId); // used also to sent currentChatId 
    if (!rc) {
//????TODO add call Logout here
      return;
    }
    if (!this.webSocket)
      return;

    if (!this.helloSent) { // send init message e.g. Init or something else to cause Chat bot to answer 
      //console.log ('onOpen currentChatId:'+currentChatId);
      if (this.currentChatId)
        this.loadConversation(this.currentChatId);
      this.helloSent = true;
    }
  }

  ws_onMessage(ev)
  {
    console.log('ws_onMessage = '+JSON.stringify(ev));
//??            $('.spinner').hide();
    const text = ev.data;
//??    var $messages, message;
//??    $messages = $('.messages');
    if (text.trim() === '[DONE]' || text.trim() === '[LENGTH]') {
        // make target
//??        if (receivingMessage) 
//??            receivingMessage.find('a').attr('target','_blank');

        if (text.trim() === '[LENGTH]') {
//??            $('.continue_wrapper').show();
        } else { /* [DONE] */
//??            receivingMessage = null;
//??            markdown_content.html('');
//??            $('.continue_wrapper').hide();
        }
//??        $messages.animate({ scrollTop: $messages.prop('scrollHeight') }, 300);
        if (this.currentChatId)
            getCurrentChatId();

    } 
    else if (!this.receivingMessage) { //??
      this.receivingMessage = text;
      console.log('start= '+this.receivingMessage);
/***
        $('.message_input').val('');
        message = new Message({
                              text: text,
                              message_side: 'right',
                              currentAnswer: null
        });
        message.draw();
        receivingMessage = message.currentAnswer;
        $messages.animate({ scrollTop: $messages.prop('scrollHeight') }, 300);
**/
    } else {
      this.receivingMessage += text;
      console.log('cont= '+ this.receivingMessage)
/***
        markdown_content.append(text);
        let html = md.render(markdown_content.text());
        receivingMessage.html(html);
        if (-1 != text.indexOf('\n'))
            $messages.animate({ scrollTop: $messages.prop('scrollHeight') }, 300);
**/
    }
//??  $('.spinner').hide();
  } 

  ws_onError(ev)
  {
    console.log('ws_onError = '+JSON.stringify(ev));
//??            sendMessage ('Error connecting to the server.', 'right');
    this.showMessage('Error connecting to the server.');
//??--            $('.spinner').hide();
//??--            $('.message_input').prop('disabled', true);
    this.webSocket.close();
    this.webSocket = null;
  }

  ws_onClose(ev)
  {
    console.log('ws_onClose = '+JSON.stringify(ev));
//??            sendMessage ('Connection to the server closed.', 'right');
    this.showMessage ('Connection to the server closed.');
//??--            $('.send_message').hide();
//??--            $('.spinner').hide();
//??--            $('.reconnect').show();
//??--            $('.message_input').prop('disabled', true);
  }


  ws_sendMessage(text)
  {
//++
    console.log('ws_sendMessage = '+text);
    if (this.loggedIn) {
      if (!this.webSocket) {
        this.ws_Init();
//??TODO need wait, when auth was finished or etc
      }

       let request = { type: 'user', 
                       question: text, 
                       netid: this.webId, 
                       chat_id: this.currentChatId, 
                       model: this.currentModel, 
                       call: this.enabledCallbacks };
//??        sendMessage(text, 'left');
        if (text.trim() === '')
            return;
//??    $('.spinner').show();
        return this.webSocket.send(JSON.stringify(request));
    }
    else {
     this.showNotice ('Not logged in');
     return;
    }
  }


  async initSidebar() 
  {
//??    setModel(currentModel);
    /* pre-defined */
//??    addSidebarItem ('chat-new', 'New Chat', '');
    /* user chats */
    await this.loadChats ();
    /* init plink copy */
/***
    $('.share-btn').click(function (e) {
        e.preventDefault();
        var $temp = $("<input>");
        $("body").append($temp);
        $temp.val($(this).attr('href')).select();
        document.execCommand('copy');
        $temp.remove();
        showNotice('Permalink to the chat copied.');
    });
***/
  }

  async loadChats() 
  {
    try {
      let url = new URL('/chat/api/listChats', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('session_id', this.sessionId);
/***
        if (chatDebug) {
            params.append('netid', 'http://localhost:8890/dataspace/person/imitko#this');
        } else {
            params.append('netid', this.session.info.webId);
        }
***/
//??--      params.append('netid', this.session.info.webId);
      url.search = params.toString();
      const resp = await this.solidClient.fetch (url.toString());
      if (resp.status === 200) {
        let chats = await resp.json();
//??
        console.log(chats); //???
        for(const v of chats) {
          const title = v.title ?? v.chat_id;
          let more = '';
          const ts = v.ts;
          if (!this.currentChatId && v.chat_id.indexOf('system-') === -1)
            this.currentChatId = this.lastChatId = v.chat_id;
//          if (v.ts)
//            more = timeSince(v.ts);
//          addSideBarItem(v.chat_it, title, more);
        }
        this.view.ui.updateListTopics(chats);
/***
            chats.forEach (function (item) {
                const chat_id = item['chat_id'];
                let title = (item['title'] != null ? item['title'] : item['chat_id']);
                let more = '';
                const ts = item['ts'];
                if (null == currentChatId && -1 == chat_id.indexOf('chat-'))
                  currentChatId = lastChatId = chat_id;
                if (null != ts)
                  more = ' <span class="timestamp">(' + timeSince(ts) + ')</span>';  
                addSidebarItem (chat_id, title, more);
            });
***/
            /*console.log ('currentChatId:'+currentChatId);*/
      } else {
        this.showNotice ('Loading chats failed: ' + resp.statusText);
        await this.checkLoggedIn(resp.status);
      }
    } catch (e) {
        this.showNotice('Loading chats failed: ' + e);
    }
    return;
  }

  async checkLoggedIn(status) 
  {
    if (status === 401 || status === 403) {
      await this.soledClient.logout();
      this.onLogout();
    }
  }


  async loadConversation(chat_id)
  {
//??            var $messages = $('.messages');
    let url = new URL('/chat/api/chatTopic', this.httpServer);
    let params = new URLSearchParams(url.search);
    params.append('session_id', this.sessionId);
    params.append('chat_id', chat_id);
//??    $messages.empty();
    try {
      url.search = params.toString();
      const resp = await this.solidClient.fetch (url.toString());
      if (resp.status === 200) {
        let list = await resp.json();
console.log('========Chat======== '+chat_id)
console.log(list);
        this.curConversation = list;
        let lastMessage = null;
        for(const v of list) {
          if (v.role === 'user') {
            lastMessage = null;
            this.setModel(v.model ?? 'gpt-4');
          } 
          else if (v.role === 'assistant') {
            if (this.lastMessage === null) {
              lastMessage = v.text;
            } else {
              lastMessage += v.text;
            }
          }
        }
/***
            list.forEach (function (item) {
                let role = item['role'];
                let text = item['text'];
                if ('user' === role) {
                    sendMessage (text, 'left', false);
                    lastMessage = null;
                    model = item['model'];
                } else if ('assistant' === role) {
                    if (null == lastMessage) {
                        markdown_content.html('');
                        markdown_content.append (text);
                        lastMessage = sendMessage (text, 'right', false);
                    } else {
                        markdown_content.append(text);
                        let html = md.render(markdown_content.text());
                        lastMessage.html(html);
                    }
                }

            });
***/
//??            markdown_content.html('');
        this.receivingMessage = null;
        console.log ('loadConversation#model:'+this.currentModel+' chat_id:'+chat_id);
        this.currentChatId = chat_id;
//??            setModel (model);
//??            updateShareLink();
//??            $messages.animate({ scrollTop: $messages.prop('scrollHeight') }, 300); 
      } else
        this.showNotice ('Conversation failed to load failed: ' + resp.statusText);
    } catch (e) {
      this.showNotice('Loading conversation failed: ' + e);
    }
    return;
  }


//??TODO
  continueSession()
  {
    let url = new URL(window.location.href);
    let params = new URLSearchParams(url.search);
    let chat_id = params.get('chat_id');
    params.delete('chat_id');
    params.append ('resume_chat_id', chat_id);
    url.search = params.toString();
    solidClientAuthentication.login({
         oidcIssuer: httpServer,
         redirectUrl: url.toString(),
         tokenType: "Bearer",
         clientName: "OpenLink CoPilot"
    });
  }

//???TODO
  async selectSession(id)
  {
//??    $('#slide-submenu').closest('.list-group').fadeOut('slide',function(){
//??        $('.mini-submenu').fadeIn();
//??    });
//??    $('.messages').empty();
    if (-1 == id.indexOf ("chat-"))
      await this.loadConversation (id);
    if (0 == id.indexOf ("chat-") && this.webSocket) {
      let request = { type: 'user', 
                      question: null, 
                      netid: this.webId, 
                      chat_id: id, 
                      model: this.currentModel, 
                      call: null };
      this.currentChatId = null;
      this.webSocket.send(JSON.stringify(request));
//??      $('.spinner').show();
    }
  }

  
//???TODO
  async resumeAsNew(chat_id)
  {
    let url = new URL('/chat/api/createTopic', this.httpServer);
    let params = new URLSearchParams(url.search);
    params.append('session_id', this.session.info.sessionId);
    params.append('netid', this.session.info.webId);
    params.append('chat_id', chat_id);
    url.search = params.toString();
    try {
        const resp = await this.solidClient.fetch (url.toString());
        if (resp.status === 200) {
            let chat = await resp.json();
            let title = chat['title'];
            this.currentChatId = chat['chat_id'];
            this.helloSent = true;
        } else
            this.showNotice ('Resuming chat failed: ' + resp.statusText);
    } catch (e) {
        this.showNotice('Resuming chat failed: ' + e);
    }
  }

  setModel(text)
  {
    if (!text)
      return;
//??    $('#oai-model span.model').text(text.toUpperCase());
    this.currentModel = text;
  }

/***
  async initFunctionList() 
  {
      var funcList = $('#available-functions');
      funcList.empty();
      enabledCallbacks = null;
      try {
          let url = new URL('/chat/api/listFunctions', httpServer);
          let params = new URLSearchParams(url.search);
          params.append('chat_id', currentChatId != null ? currentChatId : plink);
          url.search = params.toString();
          const resp = await fetch (url.toString());
          if (resp.status === 200) {
              let funcs = await resp.json();
              console.log('initFunctionList:'+currentChatId);
              funcs.forEach (function (item) {
                 const fn = item['function'];
                 const title = item['title'];
                 const sel = item['selected'];
                 if (sel) {
                     if (null == enabledCallbacks)
                       enabledCallbacks = new Array();  
                     enabledCallbacks.push (fn);
                 }
                 let li = $('<li><input type="checkbox"/><label></label></li>'); 
                 li.children('input').attr('id', fn);
                 li.children('input').checked = sel;
                 li.children('label').attr('for', fn);
                 li.children('label').html(title);
                 funcList.append (li);
              });
          } else
              showNotice ('Loading helper functions failed: ' + resp.statusText);
      } catch (e) {
          showNotice('Loading helper functions failed: ' + e);
      }
      if (null != enabledCallbacks && enabledCallbacks.length)
          $('#fn-count').html(`[${enabledCallbacks.length}]`);
      $('#btn-fn-save').on('click', function() {
          enabledCallbacks = new Array();
          $('#available-functions > li input').each(function () { 
              if (this.checked) {
                  enabledCallbacks.push (this.id);
              }
          });
          console.log(JSON.stringify(enabledCallbacks));
          if (!enabledCallbacks.length) {
              $('#fn-count').html('');
            enabledCallbacks = null;
          } else {
              $('#fn-count').html(`[${enabledCallbacks.length}]`);
          }
          $('.bd-modal-fn-sel').modal('hide');
      });
      $('.bd-modal-fn-sel').on('hide.bs.modal', function (e) {
           $('#available-functions > li input').each (function () {
               if (enabledCallbacks == null || -1 == enabledCallbacks.indexOf(this.id))
                   this.checked = false; 
           });
      });
      $('.bd-modal-fn-sel').on('show.bs.modal', function (e) {
           $('#available-functions > li input').each (function () {
               if (enabledCallbacks != null && -1 != enabledCallbacks.indexOf(this.id))
                 this.checked = true;
           });
      });
      $('#function-btn').tooltip();
  }

***/

/**
        async function confirmItem ($btn, approve) {
            var $item = $btn.parent();
            var id = $item.attr('id');
            var action = $('#item-action').val();

            if (approve === 'confirm') {
                let url = new URL('/chat/api/chatTopic', httpServer);
                let params = new URLSearchParams(url.search);
                params.append('session_id', session.info.sessionId);
                params.append('chat_id', id);
                url.search = params.toString();
                if (action === 'delete') {
                    try {
                        resp = await solidClient.fetch(url.toString(), { method:'DELETE' })
                        if (resp.status != 204) {
                            showNotice('Delete failed: ' + resp.statusText);
                        } else {
                            $('#'+id).hide(); /// contrary to logic we just hide to keep DOM consistent 
                            if (currentChatId === id) {
                                $('.messages').empty();
                                currentChatId = null;
                            }
                        }
                    } catch (e) {
                        showNotice('Delete failed: ' + e);
                    }
                }
                else if (action === 'edit') {
                    var text = $item.children('.list-item-edit').val();
                    $item.children('.list-item-text').text(text);
                    try {
                        resp = await solidClient.fetch(url.toString(), { method:'POST', body: JSON.stringify ({title: text, model: currentModel}) })
                        if (!resp.ok || resp.status != 200) {
                            showNotice('Edit failed: ' + resp.statusText);
                        }
                    } catch (e) {
                        showNotice('Edit failed: ' + e);
                    }
                }
            }

            $('#item-action').val('');

            $item.children('.btn-confirm').hide();
            $item.children('.btn-cancel').hide();
            $item.children('.list-item-edit').hide();

            $item.children('.btn-edit').show();
            $item.children('.btn-delete').show();
            $item.children('.list-item-text').show();
        }
***/

}

/**********
options.tokens = null
storeSessionId = e2cf
codeVerifier = fd086...
iis = null
->>getClient()
  storedClientId = 57163...
  return


-1 needUpdate for BearerToken  ???
parameter=> stored_tokens  

=> CryptoKey
*********/
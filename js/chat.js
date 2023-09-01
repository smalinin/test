
class ChatUI {
  constructor({view}) {
    this.view = view;
    this.last_item_role = null;
    this.last_item_text = '';
    this.last_item_id = null;
    this.last_item_func = null;
    this.chat_list = DOM.qSel('#conversation');
    this.main_content = DOM.qSel('div#main');
    this.notification = null;
    this.preloader = null;

    const self = this;

    this.md = markdownit({
      html:         true,
      xhtmlOut:     true,
      breaks:       true,
      langPrefix:   'language-',  // CSS language prefix for fenced blocks. Can be
                              // useful for external highlighters.
      linkify:      true,        // Autoconvert URL-like text to links

      typographer:  false,

  // Double + single quotes replacement pairs, when typographer enabled,
  // and smartquotes on. Could be either a String or an Array.
  //
  // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
  // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
      quotes: '“”‘’',

      highlight: function (str, lang) {
         if (lang && hljs.getLanguage(lang)) {
           try {
             return '<pre class="hljs"><code>' +
                       hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                    '</code></pre>';
           } catch (__) {}
         }
         return '<pre class="hljs"><code>' + self.md.utils.escapeHtml(str) + '</code></pre>';
       }
     });

     this.defaultRender = this.md.renderer.rules.link_open || function(tokens, idx, options, env, self_) {
      return self_.renderToken(tokens, idx, options);
    };     

     this.md.renderer.rules.link_open = function (tokens, idx, options, env, self_) {
      // If you are sure other plugins can't add `target` - drop check below
      var aIndex = tokens[idx].attrIndex('class');
    
      if (aIndex < 0) {
        tokens[idx].attrPush(['class', 'external']); // add new attribute
      } else {
        tokens[idx].attrs[aIndex][1] = 'external';    // replace value of existing attr
      }
    
      // pass token to default renderer.
      return self.defaultRender(tokens, idx, options, env, self_);
    };
  }


  getLastLine()
  {
    if (this.last_item_text) {
      let lastBreak = this.last_item_text.lastIndexOf ('\n');
      return lastBreak != -1 ? '\n' + this.last_item_text.substring(lastBreak) : '';
    }
    else
      return '';
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



  openLeftPanel()
  {
    this.view.app.panel.open('#left_panel');
    const cur_chat = this.view.chat.currentChatId;
    if (cur_chat) {
      const topic = DOM.qSel(`#list_topics li[chat_id="${cur_chat}"]`);
      if (topic) 
      topic.scrollIntoView();
    }
  }

  _gen_topic_html(is_system, chat_id, title, more, cur_chat)
  {
    let html = '';
    const add_class = chat_id === cur_chat ? 'cur_topic':'';

    if (is_system) {
      html = 
      `<li class="swipeout ${add_class}"  chat_id="${chat_id}" is_system="${is_system?1:0}">`
     +`  <div class="item-content">`
     +`    <div class="item-inner">`
     +`      <div class="item-title topic_title">${title}</div>`
     +`    </div>`
     +`  </div>`
     +`</li>`
    }
    else {
      const text = `<span class="topic_item">${title} </span><span class="timestamp" style="font-size:8px">(${more})</span>`;
      html = 
        `<li class="swipeout ${add_class}"  chat_id="${chat_id}" is_system="${is_system?1:0}" title="${title}">`
       +`  <div class="item-content swipeout-content">`
       +`    <div class="item-inner">`
       +`      <div class="item-title topic_title">${text}</div> <a href="#${chat_id}"/>`
       +`    </div>`
       +`  </div>`
       +`  <div class="swipeout-actions-right" >`
       +`    <a class="color-green chat_edit">Edit</a>`
       +`    <a class="color-red chat_del">Delete</a>`
       +`  </div>`
       +`</li>`
    }
    return html;
  }

  _set_topic_handler(el)
  {
    let item = el.querySelector('.item-title');
    item.onclick = (e) => {
      const listItem = e.target.closest('li.swipeout');
      const chat_id = listItem.attributes['chat_id'];
      const is_system = listItem.attributes['is_system'];
      if (chat_id) {
         this.showProgress();
         this.view.app.panel.close('#left_panel');
         const id = chat_id.value;

         if (id.startsWith('system-')){
          this.chat_list.innerHTML = '';
          this.last_item_role = null;
          this.last_item_text = '';
          this.last_item_id = 0;
         } 

         this.view.chat.selectSession(id, is_system.value);
      }
    }

    item = el.querySelector('.chat_edit');
    if (item)
      item.onclick = (e) => {
        const listItem = e.target.closest('li.swipeout');
        const chat_id = listItem.attributes['chat_id'];
        const is_system = listItem.attributes['is_system'].value;
      
        if (chat_id && is_system==='0') {
          const id = chat_id.value;
          const text = listItem.attributes['title'].value;

          const dlg = this.view.app.dialog.prompt('Rename topic to', 'Info', (name) => {
            this.view.chat.updateTopic('rename', id, name)
            dlg.close();
          }, 
          () => {
            dlg.close();
          },text);
        }
      }


    item = el.querySelector('.chat_del');
    if (item)
      item.onclick = (e) => {
        const listItem = e.target.closest('li.swipeout');
        const chat_id = listItem.attributes['chat_id'];
        const is_system = listItem.attributes['is_system'].value;
        
        if (chat_id && is_system==='0') {
          const id = chat_id.value;
          const text = listItem.attributes['title'].value;

          const dlg = this.view.app.dialog.confirm(`Do you want remove topic "${text}"`, 'Info', () => {
            this.view.chat.updateTopic('delete', id)
            dlg.close();
          });
        }
      }
  }


  updateListTopics(list, cur_chat)
  {
    if (!list)
      return;

    const el_topics = DOM.qSel('#list_topics ul');
    el_topics.innerHTML = '';

    for(const v of list) 
    {
      const text = v.title ?? v.chat_id;
      const is_system = v.role !== 'user';
      const more = v.ts ? this.timeSince(v.ts) : '';

      let html = this._gen_topic_html(is_system, v.chat_id, text, more, cur_chat);

      const el = DOM.htmlToElement(html);
      el_topics.appendChild(el); 
      this._set_topic_handler(el);
    }

    const el = el_topics.querySelector('li[chat_id = "'+cur_chat+'"]');
    if (el)
      el.scrollIntoView();
  }


  addNewTopic(chat_id, title, lastChatId)
  {
    let topic = DOM.qSel('#list_topics li.cur_topic');
    if (topic) 
      topic.classList.remove('cur_topic');

    const text = title ?? chat_id;
    let html = this._gen_topic_html(false, chat_id, text, 'now', chat_id);
    const el = DOM.htmlToElement(html);
    const last = DOM.qSel('#list_topics ul li[chat_id="'+lastChatId+'"]');

    if (last && lastChatId) {
      const parent = last.parentNode;
      parent.insertBefore(el, last);
    }
    else {
      DOM.qSel('#list_topics ul').appendChild(el);
    }

    this._set_topic_handler(el);
  }


  updateConversation(list, cur_chat)
  {
    if (!list)
      return;

    this.last_item_role = null;
    this.last_item_text = '';
    this.last_item_id = null;
    this.last_item_func = null;

    let id = 0;
    
    this.chat_list.innerHTML = '';

    let topic = DOM.qSel('#list_topics li.cur_topic');
    if (topic) 
      topic.classList.remove('cur_topic');

    topic = DOM.qSel(`#list_topics li[chat_id="${cur_chat}"]`);
    if (topic) {
      topic.classList.add('cur_topic');
      topic.scrollIntoView();
    }

    for(const v of list) {
      if (v.role !== this.last_item_role) {

        if (this.last_item_role === 'user' || v.role === 'user')   
          this._append_block_title(v.role);

        this.last_item_text = '';
        id++;

        if (v.role === 'user') {
          this.append_question(v.text, id);
          this.last_item_text = v.text;
        } 
        else if (v.func || v.role === 'function') {
          this.append_ai_func(v, id);
          this.last_item_text = '';
          this.last_item_id = id;
          v.role = 'function';
          this.last_item_func = {func:v.func, func_args:v.func_args, func_title:v.func_title};
        }
        else if (v.text) {
          this.append_ai(v.text, id);
          this.last_item_text = v.text;
          this.last_item_id = id;
        }
      }
      else   //update last item
      {
        if (v.text) {
          const text = this.last_item_text + v.text;
          if (v.role === 'user') {
            this.update_question(text, id);
          } else if (v.role === 'function') {
            this.update_ai_func(text, id);
          } else {
            this.update_ai(text, id);
          }

          this.last_item_text = text;
          this.last_item_id = id;
        }
      }

      this.last_item_role = v.role;
    }
    this.update_copy_handlers();
  }


  update_copy_handlers()
  {
    var lst = DOM.qSelAll('.code_header button#copy_code');
    for(var el of lst) {
      el.onclick = (e) => {
        var block = e.target.closest('div.chat_code');
        var code = block.querySelector('div.code_block');
        if (code) {
          navigator.clipboard.writeText(code.textContent).then(() => {
              const btn = e.target.closest('#copy_code');
              const copied = block.querySelector("#copied");
              DOM.Hide(btn);
              DOM.Show(copied);

              setTimeout(() => { 
                  DOM.Hide(copied);
                  DOM.Show(btn);
               }, 2000);
            }, 
            () => { /* failed */ });
        }
      }
    }
  }


  new_conversation()
  {
    this.chat_list.innerHTML = '';
    this.last_item_role = null;
    this.last_item_text = '';
    this.last_item_id = 0;
    this.view.chat.selectSession('system-new', "1");
  }


  new_message(text)
  {
    if (!text)
      return;

    const id = this.last_item_id + 1;
    const html = `<div class="block block-strong medium-inset" style="color: red;" id="item_${id}">`
          +   text
          +`</div>`;

    const el = DOM.htmlToElement(html);

    this.chat_list.appendChild(el); 
    this._update_scroll(disable_scroll);

    this.last_item_text = '';
    this.last_item_id = id;
  }


  new_question(text, disable_scroll)
  {
    if (!text)
      return;
    
    if (this.last_item_role !== 'user')
      this._append_block_title('user');

    const id = this.last_item_id + 1;

    this.append_question(text, id, disable_scroll);

    this.last_item_text = '';
    this.last_item_id = id;
    this.last_item_role = 'user';
  }


  sys_answer(text, disable_scroll)
  {
    if (!text)
      return;

    let id = this.last_item_id;
    let new_item = false;

    if (this.last_item_role === 'user' || !this.last_item_role ) {
      this._append_block_title('assistant');

      id++;
      new_item = true;
      this.last_item_text = '';
    } 
    else if (this.last_item_role === 'assistant' && this.last_item_func) {
      id++;
      new_item = true;
      this.last_item_text = '';
    }

    this.last_item_text += text;
    this.last_item_id = id;
    this.last_item_role = 'assistant';
    this.last_item_func = null;

    if (new_item)
      this.append_ai(this.last_item_text, id);
    else
      this.update_ai(this.last_item_text, id);
  }


  sys_func_answer(func, disable_scroll)
  {
    if (!func)
      return;

    let id = this.last_item_id;
    let new_item = false;

    if (this.last_item_role === 'user' || !this.last_item_role) {

      this._append_block_title('assistant');
      id++;
      new_item = true;
      this.last_item_text = '';
    }
    else if (this.last_item_role === 'assistant') {
      id++;
    }

    this.last_item_text = '';
    this.last_item_id = id;
    this.last_item_role = 'assistant';
    this.last_item_func = {func:func.func, func_args:func.func_args, func_title:func.func_title};

    this.append_ai_func(func, id);
  }

  sys_func_result_answer(text, disable_scroll)
  {
    if (!text || !this.last_item_func)
      return;

    let id = this.last_item_id;
    let new_item = false;

    if (this.last_item_role === 'user' || !this.last_item_role) {

      this._append_block_title('assistant');
      id++;
      new_item = true;
      this.last_item_text = '';
    }

    this.last_item_text = text;

    this.update_ai_func(text, id);
  }


  append_question(text, id, disable_scroll)
  {
    if (!text)
      return;

//    var s = this._create_question_html(DOMPurify.sanitize(this.md.render(str)), sid);
    const html = this.md.render(text);
    const s = this._create_question_html(html, id);
    const el = DOM.htmlToElement(s);

    this.chat_list.appendChild(el); 
    this._update_scroll(disable_scroll);

  }

  update_question(text, id, disable_scroll)
  {
    if (!text)
      return;

    const html = this.md.render(text);
    this._update_block(html, id);
    this._update_scroll(disable_scroll);
  }


  append_ai(text, id, disable_scroll)
  {
    if (!text)
      return;
   
    const html = this._create_ai_html(text);
    const html_block = this._create_answer_html(html, id);
    const el = DOM.htmlToElement(html_block);

    this.chat_list.appendChild(el); 
    this._update_scroll(disable_scroll);
  }

  update_ai(text, id, disable_scroll)
  {
    if (!text)
      return;
   
    const html = this._create_ai_html(text);
    this._update_block(html, id);
    this._update_scroll(disable_scroll);
  }


  append_ai_func(func, id, disable_scroll)
  {
    if (!func)
      return;
   
    const html = this._create_ai_func_html(func);
    const html_block = this._create_answer_html(html, id);
    const el = DOM.htmlToElement(html_block);

    this.chat_list.appendChild(el); 
    this._update_scroll(disable_scroll);
  }


  update_ai_func(text, id, disable_scroll)
  {
    if (!text || !this.last_item_func)
      return;
   
    const html = this._create_ai_func_html(this.last_item_func, text);
    this._update_block(html, id);
    this._update_scroll(disable_scroll);
  }


  _append_block_title(role)
  {
    const title = (role === 'user') ? '<i class="icon f7-icons">person</i>' : '<i class="icon f7-icons"> <img src="./images/chat.png"> </i>';

    const el = DOM.htmlToElement(`<div class="block-title">${title}</div>`);
    this.chat_list.appendChild(el); 
  }


  _update_block(html, id)
  {
    const content = DOM.qSel(`div#item_${id}`);
    if (content)
      content.innerHTML = html;
  }


  _create_question_html(html, id)
  {
    return `<div class="block block-strong medium-inset markdn-body" id="item_${id}">`
          +   html
          +`</div>`;
  }


  _update_scroll(disable_scroll)
  {
    if (disable_scroll)
      return;

    const v = this.main_content.scrollHeight
    this.main_content.scrollTo(1,v);
  }


  _create_answer_html(html, id) 
  {
    const v = 
           `<div class="block block-strong medium-inset markdn-body" id="item_${id}">`
          +   html
          +`</div>`;

    return v;
  }


  _create_ai_html(str)
  {
    var block = [];
    var lst = this._parse_answer(str);

    for(const i of lst) {
      if (i.type === 'c') // text
//        block.push( this._create_code_block_html(DOMPurify.sanitize(this.md.render(i.str))) ) 
        block.push( this._create_code_block_html(this.md.render(i.str)) ) 
      else
        block.push( this._create_text_block_html(this.md.render(i.str)) ) 
    }
  
    return block.join('\n');
  }


  _create_ai_func_html(v, result)
  {
    const title = `Function: <strong>${v.func_title}</strong>(<em>${v.func}</em>)`;
    const text = 
           ' ***`Arguments:`***\n'
          +'```json\n'+v.func_args+'\n```';

    let text_result = '';
    if (result) {
      text_result = 
        '\n ***`Results:`***\n'
       +'```json '+result+'\n```';
    }

    const html = 
             '<div class="list accordion-list">\n'
            +' <ul style="padding-left:0px">\n'
            +'  <li class="accordion-item">\n'
            +'    <a href="" class="item-link item-content" style="padding-left:5px">\n'
            +'      <div class="item-inner">\n'
            +`        <div class="item-title">${title}</div>\n`
            +'      </div>\n'
            +'    </a>\n'
            +`    <div class="accordion-item-content">${this.md.render(text+text_result)}</div>\n`
            +'  </li>\n'
            +' </ul>\n'
            +'</div>'
    return html;
  }


  _create_text_block_html(str)
  {
    return str;
  }


  _create_code_block_html(str)
  {
    var v = 
     `<div class="chat_code">
        <div class="code_header">
           <span id="copied" class="hidden">Copied!&nbsp;&nbsp;</span>
           <button id="copy_code"><i class="icon f7-icons" style="font-size: 20px;">doc_on_clipboard</i>&nbsp;Copy code</button>
        </div>
        <div class="code_block">${str}</div>
      </div>`
    return v;                              
  }


  _parse_answer(str) 
  {
    var ret = [];
    var pos = 0;
    while(true) {
      var i = str.indexOf('```', pos);
      if (i == -1) {
        ret.push({type:'t', str: str.substring(pos)});
        break;
      }
      else {
        ret.push({type:'t', str: str.substring(pos, i)});
        pos = i;
        i = str.indexOf("```", i+3);
        if (i == -1) {
          ret.push({type:'c', str: str.substring(pos)});
          break;
        }
        else {
          ret.push({type:'c', str: str.substring(pos, i+3)});
          pos = i + 3;
        }
      }
    }
    return ret;
  }


  _create_funcs_html(list)
  {
    let html = [];
    for(const v of list) {
      let s =
             `<li>`
            +`  <label class="item-checkbox item-checkbox-icon-start item-content">`
            +`    <input type="checkbox" value="${v.function}" id="${v.function}" ${v.selected?'checked':''}/>`
            +`    <i class="icon icon-checkbox"></i>`
            +`    <div class="item-inner">`
            +`      <div class="item-title">${v.title}</div>`
            +`    </div>`
            +`  </label>`
            +`</li>`;
       html.push(s);
    }
    return html.join('\n');
  }

  initFuncsList(list)
  {
    const el = DOM.qSel('ul#funcs-list');
    el.innerHTML = this._create_funcs_html(list);
  }

  updateFuncsList(list)
  {
    const el = DOM.qSel('ul#funcs-list');
    el.innerHTML = this._create_funcs_html(list);
  }

  getFuncsList()
  {
    let rc = [];
    const lst = DOM.qSelAll('ul#funcs-list li input');
    for(const v of lst) {
      if (v.checked)
        rc.push(v.value);
    }
    return rc;
  }

  showNotification({title, subtitle, text})
  {
    if (this.notification) {
      this.notification.close();
      this.notification.destroy()
      this.notification = null;
    }
            
    let opt = {closeTimeout: 5000, closeButton: true, icon:`<i class="f7-icons">exclamationmark_bubble</i>`};

    if (title) 
      opt.title = title;
    if (subtitle)
      opt.subtitle = subtitle;
    if (text)
      opt.text = text;
     
    this.notification = this.view.app.notification.create(opt);
    this.notification.open();
  }

//Preloader
//Progress Bar
  showPreloader(text)
  {
    if (this.preloader)
      this.preloader.destroy();

    this.preloader = this.view.app.dialog.preloader(text);

    const openCustomPreloader = () => {
      $f7.dialog.preloader('My text...');
      setTimeout(function () {
        $f7.dialog.close();
      }, 3000);
    }
  }

  closePreloader()
  {
    if (this.preloader) {
      this.preloader.destroy();
      this.preloader = null;
    }
  }

  closeAllDialogs()
  {
    this.closePreloader();
//??    if (this.notification) {
//??      this.notification.destroy()
//??      this.notification = null;
//??    }
  }

  showProgress()
  {
     this.view.app.progressbar.show('multi');
  }

  hideProgress()
  {
     this.view.app.progressbar.hide();
  }

  onLogin(webId)
  {
    if (webId) {
      this.showNotification({title:'Info', text:'Logged as ' + webId});

      try {
        DOM.qHide('#login');
        DOM.qShow('#uid_menu')
        DOM.iSel('netid').innerHTML = `<a href="${webId}" target="_blank" class="external">${webId}</a>`

        DOM.qShow('a#api-lock');

      } catch(e) {
        console.log(e);
      }
    }
  }

  onLogout()
  {
    try {
      this.view.ui.hideProgress();
      this.view.ui.closeAllDialogs();
      DOM.qShow('#login');
      DOM.qHide('#uid_menu')
      DOM.iSel('netid').innerHTML = '';

      DOM.qHide('a#api-lock');

    } catch(e) {
      console.log(e);
    }
  }


  setModel(text)
  {
    const el = DOM.qSel(`select#c_model option[value="${text}"]`);
    if (el) {
      el.selected=true;
      DOM.qSel('select#c_model').onchange({target:DOM.qSel('select#c_model')});
    }
    DOM.qSel('span#subtitle').innerText = text;
  }


  api_key()
  {
    if (!this.view.chat.apiKeyRequired) {
      this.showNotification({title:'Info', text:'API Key is already set on this system.'});
      return;
    }

    const defVal = (this.view.chat.apiKey || 'OpenAI key...');

    const dialog = this.view.app.dialog.create({
            title: 'Info',
            text: 'Enter your OpenAI API key',
            closeByBackdropClick: true,
            destroyOnClose: true,
            content: `<div class="dialog-input-field input"><input type="text" class="dialog-input" value="${defVal}"></div>`,
            buttons: [
              {
                text: 'Remove',
                color: null
              }, {
                text: 'Set',
                strong: true,
              }],
            onClick: (dialog, index) => {
                const newVal = dialog.$el.find('.dialog-input').val().trim();
                if (index ===0) {
                  //remove Val
                  this.view.chat.apiKey = null;
                  if (this.view.chat.apiKeyRequired)
                    this.set_api_lock();
                  else
                    this.set_api_unlock();
                 
                  dialog.close();
                }
                else if (index === 1) {
                  //set Val
                  this.view.chat.apiKey = newVal;
                  this.set_api_unlock();
                  dialog.close();
                }
              }
        }).open();
  }


  set_api_lock()
  {
    const el = DOM.qSel('a#api-lock i');   //('i#api-lock');
    if (el)
      el.innerHTML = 'lock';
  }


  set_api_unlock()
  {
    const el = DOM.qSel('a#api-lock i');   //('i#api-lock');
    if (el)
      el.innerHTML = 'lock_open';
  }


  show_api_key_dlg()
  {
    DOM.qSel('#api-lock').click();
  }


  share()
  {
    const url = this.view.chat.getSharedLink();
    if (url) {
      this.showNotification({title:'Info', text:'Permalink was copied to clipboard'});
      navigator.clipboard.writeText(url);
    } else {
      this.showNotification({title:'Info', text:'Not LoggedIn'});
    }
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
    this.defModel = 'gpt-4';
    this.currentModel = 'gpt-4';
    this.temperature = 0.2;
    this.top_p = 0.5;

    this.setTemperature(this.temperature);
    this.setTop_p(this.top_p);

    this.funcsList = [];
    this.apiKey = null;
    this.apiKeyRequired = true;

    this.currentChatId = null;
    this.lastChatId = null;
    this.resume_chat_id = null;
    this.receivingMessage = null;
    this.curConversation = [];
    this.curChats = [];
  }


  showMessage(text)
  {
    this.view.ui.new_message(text);
  }


  getSharedLink()
  {
    if (this.currentChatId) {
      let url = new URL('/chat/', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('chat_id', this.currentChatId);
      url.search = params.toString();
      return url.toString();
    } else {
      return null;
    }
  }

    
  getEnableCallbacks() 
  {
    return this.view.ui.getFuncsList();
  }


  async onLogin()
  {
    try {
      this.session = this.solidClient.getDefaultSession();
      this.loggedIn = this.session.info.isLoggedIn;
      if (!this.loggedIn) {
        this.webId = null;
        this.sessionId = null;
      }
      else {
        this.webId = this.session.info.webId;
        this.sessionId = this.session.info.sessionId;

        const rc = await this.getTopic();
        if (rc && rc.error) {
          await this.view.logout();
          return;
        } 
        else if (rc && rc.chat_id) {
           this.currentChatId = rc.chat_id
        }

        await this.updateLoginState();
        this.view.ui.onLogin(this.webId);
      } 
    } catch (e) {
      console.log(e);
    }
  }

  async onLogout()
  {
    this.session = null;
    this.loggedIn = false;
    this.webId = null;
    this.view.ui.onLogout();
  }


  async updateLoginState() 
  {
    if (!this.loggedIn)
      return;
    
    this.view.ui.showProgress();
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
    if (!this.currentChatId)
      return false;

    try {
      const url = new URL('/chat/api/chatAuthenticate', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('session_id', this.sessionId);

      if (currentChatId)
        params.append('chat_id', currentChatId);

      url.search = params.toString();
      const resp = await this.solidClient.fetch (url.toString());
      if (!resp.ok) {
        this.view.ui.showNotification({title:'Error', text:'Can not authenticate chat session' + resp.statusText});
        return false;
      }

      const obj = await resp.json();
      this.apiKeyRequired = obj.apiKeyRequired

      if (this.apiKeyRequired) {
        this.view.ui.set_api_lock();
        this.view.ui.show_api_key_dlg();
      } else
        this.view.ui.set_api_unlock();

    } catch (e) {
        this.view.ui.showNotification({title:'Error', text:'Can not authenticate ' + e});
        return false;
    }
    return true;
  }


  async getCurrentChatId()
  {
    const rc = await this.getTopic();
    if (!rc)
      return null;

    if (rc.error) {
       this.view.ui.showNotification({title:'Error', text:rc.error});
       return null;
    } 
    else {
      this.view.ui.addNewTopic(rc.chat_id, rc.title, this.lastChatId);
      this.currentChatId = rc.chat_id;
      if (rc.funcs)
        this.view.ui.updateFuncsList(rc.funcs)
      this.setTemperature(rc.temperature);
      this.setTop_p(rc.top_p);
      return rc;
    }
  }

  async getTopic()
  {
    // here we should current chat if new 
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
        const chat_id = chat['chat_id'];
        const title = chat['title'];
        let rc = {chat_id, title};

        if (chat.funcs)
           rc['funcs'] = chat.funcs;

        if (chat.temperature)
          rc['temperature'] = chat.temperature;

        if (chat.top_p)
          rc['top_p'] = chat.top_p;

        return rc;
      } else {
        return {error:'Can not retrieve chatId ' + resp.statusText}
      }
    } catch (e) {
      return {error:'Can not getTopic ' + e};
    }
  }


  async updateTopic(action, chat_id, name)
  {
    // here we should current chat if new 
    if (!this.loggedIn)
      return null;

    try {
      const url = new URL('/chat/api/chatTopic', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('session_id', this.sessionId);
      params.append('chat_id', chat_id);
      url.search = params.toString();
      if (action === 'delete') {
        this.solidClient.fetch (url.toString(), { method:'DELETE' })
          .then((resp) => {
            if (resp.status !== 204) {
              this.view.ui.showNotification({title:'Error', text:'Delete failed: ' + resp.statusText});
              return;
            } else {
              if (chat_id === this.currentChatId)
                this.currentChatId = null;
    
                this.loadChats()
                  .then((rc) => {
                    if (rc && this.currentChatId)
                      this.loadConversation(this.currentChatId);
                  })
            }
          })
      }
      else if (action === 'rename' && name) {
        const resp = await this.solidClient.fetch (url.toString(), { method:'POST', body: JSON.stringify ({title: name, model: this.currentModel}) });
        if (!resp.ok && resp.status !== 200) {
          this.view.ui.showNotification({title:'Error', text:'Rename failed: ' + resp.statusText});
          return;
        }
        this.loadChats();
      }
    } catch (e) {
      if (action === 'delete') {
        this.view.ui.showNotification({title:'Error', text:'Delete failed: ' + e});
      } else if (action === 'rename') {
        this.view.ui.showNotification({title:'Error', text:'Rename failed: ' + e});
      }
    }
  }



/***==================================
============================***********/


  ws_Init()
  {
    if (!this.loggedIn)
      return;

    let url = new URL(this.wsServer);
    let params = new URLSearchParams(url.search);
    params.append('sessionId', this.sessionId);
    url.search = params.toString();
    
    console.log('ws_Init = '+url);

    this.webSocket = new WebSocket(url.toString());
    this.webSocket.onopen = (e) => {this.ws_onOpen(e) }
    this.webSocket.onmessage = (e) => { this.ws_onMessage(e) }
    this.webSocket.onerror = (e) => { this.ws_onError(e) }
    this.webSocket.onclose = (e) => {this.ws_onClose(e) }
  }

  ws_Reconnect()
  {
    this.ws_Init();
//??    $('.reconnect').hide();
//??    $('.message_input').prop('disabled', false);
//??    $('.send_message').show();
  }



  ws_Continue()
  {
    if (!this.loggedIn || !this.webSocket)
      return;

    const lastLine = this.view.ui.getLastLine();
    let request = { type: 'system', 
                    question: 'continue'+lastLine, 
                    chat_id: this.currentChatId,
                    apiKey: this.apiKey, 
                    call: this.getEnableCallbacks(),
                    model: this.currentModel,
                    temperature: this.temperature,
                    top_p: this.top_p  
                  };

    this.webSocket.send(JSON.stringify(request));
    DOM.qHide('#fab-continue');
  }


  ws_Stop()
  {
    if (!this.loggedIn)
      return;

    let url = new URL('/chat/api/chatControl', this.httpServer);
    let params = new URLSearchParams(url.search);
    params.append('session_id', this.sessionId);
    url.search = params.toString();
    try {
        this.solidClient.fetch (url.toString());
        DOM.qHide('#fab-stop')
    } catch (e) {
      this.view.ui.showNotification({title:'Error', text:'Stop failed: ' + e});
    }
  }


//??
  async ws_onOpen(ev)
  {
    //??console.log('ws_onOpen = '+JSON.stringify(ev));
    const rc = await this.chatAuthenticate (this.currentChatId); // used also to sent currentChatId 
    if (!rc) {
      this.view.logout();
      return;
    }
    if (!this.webSocket) {
      this.view.logout();
      return;
    }

    if (!this.helloSent) { // send init message e.g. Init or something else to cause Chat bot to answer 
      //console.log ('onOpen currentChatId:'+currentChatId);
      if (this.currentChatId)
        await this.loadConversation(this.currentChatId);
      this.helloSent = true;
    }
  }

  ws_onMessage(ev)
  {
    const obj = JSON.parse(ev.data);
    const text = obj.data;
    const kind = obj.kind;

    if (kind === 'function') {
      const func = JSON.parse (text);
      DOM.qShow('#fab-stop');
      this.view.ui.sys_func_answer(func);
    }
    else if (kind === 'function_response') {
      this.view.ui.sys_func_result_answer(text);
    }
    else if (text.trim() === '[DONE]' || text.trim() === '[LENGTH]') 
    {
      this.view.ui.hideProgress();

      if (text.trim() === '[LENGTH]') {
          DOM.qShow('#fab-continue');
      } 
      else { /// [DONE] 
          DOM.qHide('#fab-continue');
      }
      
      if (!this.currentChatId) {
        this.getCurrentChatId().then((rc) => {
          if (rc.chat_id) {
            this.lastChatId = rc.chat_id;
          }
        });
      }

      DOM.qHide('#fab-stop');
      this.view.ui.update_copy_handlers();
    }
    else {
      DOM.qShow('#fab-stop');
      this.view.ui.sys_answer(text);
    } 
  } 

  ws_onError(ev)
  {
    this.showMessage('Error connecting to the server. '+JSON.stringify(ev));
//??--            $('.spinner').hide();
//??--            $('.message_input').prop('disabled', true);
    this.webSocket.close();
    this.webSocket = null;
  }

  ws_onClose(ev)
  {
    this.showMessage ('Connection to the server closed. '+JSON.stringify(ev));
    this.view.logout();
//??--            $('.send_message').hide();
//??--            $('.spinner').hide();
//??--            $('.reconnect').show();
//??--            $('.message_input').prop('disabled', true);
  }


  async ws_sendMessage(text)
  {
    if (this.loggedIn) {
      try {
        const rc = await this.getTopic();
        if (rc && rc.error) {
          this.view.logout();
          this.view.ui.showNotification({title:'Error', text:'Not logged in'});
          return false;
        }
      } catch(e) {
        console.log(e);
      }
  
      if (text.trim() === '' || !this.webSocket)
          return false;

      const request = { type: 'user', 
                       question: text, 
                       chat_id: this.currentChatId, 
                       model: this.currentModel, 
                       apiKey: this.apiKey,
                       call: this.getEnableCallbacks(),
                       temperature: this.temperature,
                       top_p: this.top_p
                       };

      this.view.ui.showProgress();
      this.view.ui.new_question(text);
      DOM.qHide('#fab-continue');
      this.webSocket.send(JSON.stringify(request));
      return true;
    }
    else {
     this.view.ui.showNotification({title:'Error', text:'Not logged in'});
     return false;
    }
  }


  async initSidebar() 
  {
    this.setModel(this.currentModel, true);
    /* user chats */
    await this.loadChats ();
    /* init plink copy */
  }

  async loadChats() 
  {
    try {
      this.lastChatId = null;

      let url = new URL('/chat/api/listChats', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('session_id', this.sessionId);
      url.search = params.toString();
      const resp = await this.solidClient.fetch (url.toString());
      if (resp.status === 200) {
        let chats = await resp.json();

        for(const v of chats) {
          if (!this.currentChatId && v.role === 'user')
            this.currentChatId = this.lastChatId = v.chat_id;
        }

        this.view.ui.updateListTopics(chats, this.currentChatId);
        return true;
      } 
      else {
        this.view.ui.showNotification({title:'Error', text:'Loading chats failed: ' + resp.statusText});
        await this.checkLoggedIn(resp.status);
        return false;
      }
    } catch (e) {
        this.view.ui.showNotification({title:'Error', text:'Loading chats failed: ' + e});
        return false;
    }
    return false;
  }

  async checkLoggedIn(status) 
  {
    if (status === 401 || status === 403) {
      this.view.logout();
    }
  }


  async loadConversation(chat_id)
  {
    try {
      if (!this.loggedIn) {
        this.view.ui.showNotification({title:'Info', text:'Session was disconnected'})
        this.view.logout();
        return false;
      }
  
      let url = new URL('/chat/api/chatTopic', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('session_id', this.sessionId);
      params.append('chat_id', chat_id);

      url.search = params.toString();
      const resp = await this.solidClient.fetch (url.toString());
      if (resp.status === 200) {
        let list = await resp.json();
        this.curConversation = list;

        for(const v of list) {
          if (v.role === 'user')
            this.setModel(v.model ?? this.defModel, true);
            this.setTemperature(v.temperature);
            this.setTop_p(v.top_p);
        }

        this.view.ui.updateConversation(list, chat_id);
        this.receivingMessage = null;
        this.currentChatId = chat_id;
        this.initFunctionList();
      } 
      else {
        this.view.ui.showNotification({title:'Error', text:'Conversation failed to load failed: ' + resp.statusText});
        await this.checkLoggedIn(resp.status);
        return false;
      }
    } 
    catch (e) {
      this.view.ui.showNotification({title:'Error', text:'Loading conversation failed: ' + e});
      this.view.logout();
      return false;
    } 
    finally {
      this.view.ui.hideProgress();
    }
    return true;
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


  selectSession(id, is_system)
  {
    if (id.startsWith('system-') && is_system === '1') {
      if (this.webSocket) {
        let request = { type: 'user', 
                        question: null, 
                        chat_id: id, 
                        model: this.currentModel,
                        apiKey: this.apiKey, 
                        call: null,
                        temperature: this.temperature,
                        top_p: this.top_p
                      };
        this.currentChatId = null;
        this.webSocket.send(JSON.stringify(request));
      }

    }
    else {
      this.loadConversation (id);
    }
  }

  
//???TODO
  async resumeAsNew(chat_id)
  {
    let url = new URL('/chat/api/createTopic', this.httpServer);
    let params = new URLSearchParams(url.search);
    params.append('session_id', this.session.info.sessionId);
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
            this.view.ui.showNotification({title:'Error', text:'Resuming chat failed: ' + resp.statusText});
    } catch (e) {
        this.view.ui.showNotification({title:'Error', text:'Resuming chat failed: ' + e});
    }
  }


  setModel(v, update_ui)
  {
    const text = v || this.defModel; 
    
    this.currentModel = text;

    if (update_ui)
      this.view.ui.setModel(this.currentModel);
  }

  setTemperature(val)
  {
    const v = val || 0.2;
    this.temperature = v;
  }

  setTop_p(val)
  {
    const v = val || 0.5;
    this.top_p = v;
  }


  async initFunctionList() 
  {
    try {
      let url = new URL('/chat/api/listFunctions', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('chat_id', this.currentChatId); //?? != null ? currentChatId : plink);
      url.search = params.toString();
      const resp = await fetch (url.toString());
      if (resp.status === 200) {
          let list = await resp.json();
//??--          console.log('initFunctionList:'+currentChatId);
          this.funcsList = list;
          this.view.ui.initFuncsList(list)
      } else
          this.view.ui.showNotification({title:'Error', text:'Loading helper functions failed: ' + resp.statusText});
    } catch(e) {
      console.log(e);
    }
  }



}


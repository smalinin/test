
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

  _gen_topic_html(item, cur_chat)
  {
    const title = item.title ?? item.chat_id;
    const role = item.role || 'user';
    const ts = item.ts ? this.timeSince(item.ts) : 'now';
    const chat_id = item.chat_id;
    const add_class = chat_id === cur_chat ? 'cur_topic':'';
    const fine_tune = item.fine_tune || '';
    const model = item.model || '';

    let html = '';

      html = 
        `<li class="swipeout ${add_class}" chat_id="${chat_id}" role="${role}" title="${title}" model="${model}" fine_tune="${fine_tune}">`
       +`  <div class="item-content swipeout-content">`
       +`    <div class="item-inner">`
       +`      <div class="item-title topic_title"> `
       +`        <span class="topic_item">${title} </span> `
       +`        <span class="timestamp" style="font-size:8px">(${ts})</span>`
       +`      </div> `
       +`    </div>`
       +`  </div>`
       +`  <div class="swipeout-actions-right" >`
       +`    <a class="color-green chat_edit">Edit</a>`
       +`    <a class="color-red chat_del">Delete</a>`
       +`  </div>`
       +`</li>`

    return html;
  }

  _set_topic_handler(el)
  {
    let item = el.querySelector('.item-title');
    item.onclick = (e) => {
      const listItem = e.target.closest('li.swipeout');
      const chat_id = listItem.attributes['chat_id'];
      const role = listItem.attributes['role'];
      const model = listItem.attributes['model'];
      const fine_tune = listItem.attributes['fine_tune'];

      if (chat_id) {
         this.showProgress();
         this.view.app.panel.close('#left_panel');

         if (role.value === 'system'){
          this.chat_list.innerHTML = '';
          this.last_item_role = null;
          this.last_item_text = '';
          this.last_item_id = 0;
         } 

         this.view.chat.selectSession(chat_id.value, role.value, model.value, fine_tune.value);
      }
    }

    item = el.querySelector('.chat_edit');
    if (item)
      item.onclick = (e) => {
        const listItem = e.target.closest('li.swipeout');
        const chat_id = listItem.attributes['chat_id'];
        const role = listItem.attributes['role'].value;
      
        if (chat_id && role!=='system') {
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
        const role = listItem.attributes['role'].value;
        
        if (chat_id && role!=='system') {
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
      let html = this._gen_topic_html(v, cur_chat);

      const el = DOM.htmlToElement(html);
      el_topics.appendChild(el); 
      this._set_topic_handler(el);
    }

    const el = el_topics.querySelector('li[chat_id = "'+cur_chat+'"]');
    if (el)
      el.scrollIntoView();
  }


  addNewTopic(item, lastChatId)
  {
    let topic = DOM.qSel('#list_topics li.cur_topic');
    if (topic) 
      topic.classList.remove('cur_topic');

    let html = this._gen_topic_html(item, item.chat_id);
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

        if (this.last_item_role === 'user' || v.role === 'user' || !v.last_item_role)   
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
    this.view.chat.selectSession('system-new', 'system');
  }


  new_message(text, disable_scroll)
  {
    if (!text)
      return;

    const id = this.last_item_id + 1;
    const html = `<div class="block block-strong medium-inset" style="color: red; word-wrap: break-word;" id="item_${id}">`
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

  _create_ftune_html(v)
  {
    const title = v.title ? v.title : v.chat_id;
    const id = v.chat_id;
    const ts = v.ts ? this.timeSince(v.ts) : '';
    const model = v.model || '';
    const role = v.role || '';
    let s =
        `<li>`
        +`  <div class="item-content">`
        +`    <div class="item-inner">`
        +`      <div class="item-text ftune_title" chat_id="${id}" model="${model}" role="${role}">`
        +`        <span class="topic_item ftune_item">${title}</span>`
        +`      </div>`
        +`      <span class="timestamp" style="font-size:8px">(${ts})</span>`;             
        +`    </div>`
        +`  </div>`
        +`</li>`;
        return s;
  }


  setFineTune(id)
  {
    let ftune_item = DOM.qSel('#ftune-list li.cur_topic');
    if (ftune_item)
      ftune_item.classList.remove('cur_topic');

    const item = DOM.qSel(`#ftune-list div.item-text[chat_id="${id}"]`);  
    if (item) {
      ftune_item =item.closest('li');
      if (ftune_item)
        ftune_item.classList.add('cur_topic')
    }
  }

  _set_ftune_handler(el)
  {
    let item = el.querySelector('.item-text');
    item.onclick = (e) => {
      const chat_id = item.attributes['chat_id'];
      const model_attr = item.attributes['model'];
      if (chat_id) {
        this.showProgress();
         
        const id = chat_id.value;
        const model = model_attr.value;

        if (id.startsWith('system-')) {
          this.chat_list.innerHTML = '';
          this.last_item_role = null;
          this.last_item_text = '';
          this.last_item_id = 0;

          this.view.app.popover.close('#popover-ftune');
          this.view.chat.selectFineTune(id, model);
        } 
      }
    }
  }

  initFuneTune(list)
  {
    const el_list = DOM.qSel('ul#ftune-list');

    for(const v of list) {
      const html = this._create_ftune_html(v);
      const el = DOM.htmlToElement(html);
      el_list.appendChild(el);
      this._set_ftune_handler(el);
    }
  }

  initModels(list, def)
  {
    if (!list)
      return;

    def = def ? def.toLowerCase() : def;

    try {
      let html = [];
      for(const v of list) {
        let opt_val = v.id.toLowerCase();
        let sel = def && opt_val === def ? 'selected' : '' 
        html.push(`<option value="${opt_val}" ${sel} >${v.name.toUpperCase()}</option>`);
      }
      
      const sel = DOM.qSel('select#c_model');
      sel.innerHTML = html.join('\n');

    } catch(__) {}
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
    DOM.qSel('span#subtitle').innerText = text.toUpperCase();
    try {
      const ss = this.view.app.smartSelect.get('#ss_model');
      ss.setValue(text.toLowerCase());
    } catch(__) {}
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
                  
                  if (this.view.app.isNative)
                    this.view.sendToiOS({cmd:'del_api_key'})
                    
                  if (this.view.chat.apiKeyRequired)
                    this.set_api_lock();
                  else
                    this.set_api_unlock();
                 
                  dialog.close();
                }
                else if (index === 1) {
                  //set Val
                  this.view.chat.apiKey = newVal;

                  if (this.view.app.isNative)
                    this.view.sendToiOS({cmd:'set_api_key', val:newVal})
                  
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


  async share()
  {
    const url = await this.view.chat.getSharedLink();
    if (url) {
      this.showNotification({title:'Info', text:'Permalink was copied to clipboard'});
      navigator.clipboard.writeText(url);
    } else {
      this.showNotification({title:'Info', text:'Not LoggedIn'});
    }
  }

  applySearchResult(query, list) 
  {
    if (query && query.length === 0) {
       this.clearSearchResult();
       return;
    }
    if (list) {
      if (list.length > 0) {
        $('.searchbar-not-found').hide();
        $('.searchbar-found').show();

        let id_set = {};
        for(const i of list) 
          id_set[i.chat_id] = 1;

        const topics = DOM.qSelAll('#list_topics li')
        for(let el of topics) {
          const chat_id = el.attributes['chat_id'].value;
          if (id_set[chat_id])
            el.classList.remove('hidden-by-searchbar');
          else
            el.classList.add('hidden-by-searchbar');
        }
      }
      else {
        //set not found
        $('.searchbar-not-found').show();
        $('.searchbar-found').hide();
      }
    }
  }

  clearSearch() 
  {
    $('.searchbar-not-found').hide();
    $('.searchbar-found').show();
    const topics = DOM.qSelAll('#list_topics li')
    for(let el of topics) {
      el.classList.remove('hidden-by-searchbar');
    }
    
  }

}


class AudioRec {
  constructor({chat, view})
  {
    this.chat = chat;
    this.view = view;
    this.mediaRec = null;
    this.recordingTimeout = null;
    this.chunks = [];

    this.mime = 'audio/wav';
    const types = [
        "audio/mp3",
        "audio/m4a",
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
        "audio/flac",
        "audio/mpeg",
        "audio/mpga",
        "audio/wav",
    ];

    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            this.mime = type;
            break;
        }
    }
   
    console.log ('MediaRecorder.isTypeSupported:', this.mime);

    DOM.iSel('audio-start')
    .onclick = () => {
      this.startRecording()
    }

    DOM.iSel('audio-stop')
    .onclick = () => {
      this.stopRecording()
    }

  }


  startRecording()
  {
    if (!this.mediaRec)
      return;

    this.mediaRec.start(1000);
    this.recordingTimeout = setTimeout(() => this.stopRecording(), 5000);
  }

  stopRecording()
  {
    if (!this.mediaRec)
      return;

    this.mediaRec.stop();
  }


  audioDisable()
  {
    if (this.mediaRec) {
      if (this.mediaRec.state === 'recording') {
          this.mediaRec.stop();
      }
      this.mediaRec.stream.getTracks().forEach(track => track.stop());
      this.mediaRec = null;
    }

    DOM.qHide('#audio-start');
    DOM.qHide('#audio-stop');
  }

  async audioEnable()
  {
    if (this.mediaRec)
      return;

    if (navigator.mediaDevices.getUserMedia) {
        const constraints = { audio: true };

        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          this.onSuccess(stream);
          
        } catch(e) {
          this.onError(e);
          return false;
        }

        DOM.qShow('#audio-start');
        return true;
    } else {
        console.log('getUserMedia not supported on your browser!');
        return false;
    }
  }

  detectSound() 
  {
    /* sound detection */
    const audioContext = new AudioContext();
    const audioStreamSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.minDecibels = -50;
    analyser.fftSize = 256;
    audioStreamSource.connect(analyser);
    const bufferLength = analyser.frequencyBinCount;
    const domainData = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(domainData);

    for (let i = 0; i < bufferLength; i++) {
        if (domainData[i] > 0 && null != this.recodingTimeout) {
            clearTimeout(this.recodingTimeout);
            this.recodingTimeout = setTimeout(() => this.stopRecording(), 5000);
            break;
        }
    }
    window.requestAnimationFrame(() => this.detectSound());
  }

  onError(err)
  {
    this.showNotification({title:'Error', text:'Error occured: ' + err});
  }

  onSuccess(stream)
  {
    this.chunks = [];

    const options = {
        audioBitsPerSecond: 128000,
        mimeType: this.mime,
    };
    this.mediaRec = new MediaRecorder(stream, options);

    /* sound detection */
    const audioContext = new AudioContext();
    const audioStreamSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.minDecibels = -50;
    analyser.fftSize = 256;
    audioStreamSource.connect(analyser);
    const bufferLength = analyser.frequencyBinCount;
    const domainData = new Uint8Array(bufferLength);

    const detectSound = () => {
        analyser.getByteFrequencyData(domainData);
        for (let i = 0; i < bufferLength; i++) {
            if (domainData[i] > 0 && null != this.recodingTimeout) {
                clearTimeout(this.recodingTimeout);
                this.recodingTimeout = setTimeout(() => this.stopRecording(), 5000);
                break;
            }
        }
        window.requestAnimationFrame(detectSound);
    }

    window.requestAnimationFrame(detectSound);
    /* end sound detection */

    this.mediaRec.onstart = (e)=> {
      DOM.qHide('#audio-start');
      DOM.qShow('#audio-stop');
    }

    this.mediaRec.onstop = (e) => {
        clearTimeout(this.recodingTimeout);
        this.recodingTimeout = null;
        DOM.qShow('#audio-start');
        DOM.qHide('#audio-stop');
        const blob = new Blob(this.chunks, { 'type' : this.mime });
        this.chunks = [];
        this.view.chat.voice2text(blob, this.mime);
    }

    this.mediaRec.ondataavailable = (e) => {
        this.chunks.push(e.data);
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
    this.fine_tune = null;
    this.defModels = [ 
          'gpt-4',
          'gpt-4-0613', 
          'gpt-4-0314', 
          'gpt-3.5-turbo', 
          'gpt-3.5-turbo-16k', 
          'gpt-3.5-turbo-16k-0613', 
          'gpt-3.5-turbo-0613', 
          'gpt-3.5-turbo-0301'
        ];

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


  async init() 
  {
    await this.initFineTune();
    await this.initModels()    
    await this.initFunctionList();
  }


  showMessage(text)
  {
    this.view.ui.new_message(text);
  }

  showNotice(params)
  {
    this.view.ui.showNotification(params);
  }

  set_api_key(v)
  {
    if (!v)
      return;
      
    this.apiKey = v;
    this.view.ui.set_api_unlock();
  }
    
  async enableAudio(v)
  {
    if (v) {  //enable
      if (this.audioRec)
        return;
      
        this.audioRec = new AudioRec({chat: this, view: this.view});
        let rc = false;

        try {
          rc = await this.audioRec.audioEnable();
        } catch(e) {
          rc = false;
        }

        if (!rc) {
          this.audioRec.audioDisable();
          this.audioRec = null;
          this.showNotice({title:'Error', text:'Could not enable audio recording'});
          return false;
        }
    } 
    else {  //disable
      if (this.audioRec) {
        this.audioRec.audioDisable();
        this.audioRec = null;
      }
    }
    return true;
  }  

  async execSearch(query)
  {
    if (query && query.length > 0) {
      try {
        this.view.ui.showProgress();
        const url = new URL('/chat/api/searchChats', this.httpServer);
        let params = new URLSearchParams(url.search);
        params.append('query', query);
        url.search = params.toString();
        const rc = await this.solidClient.fetch(url.toString());
        if (rc.ok) {
          const list = await rc.json();
          this.view.ui.applySearchResult(query, list);
        } else {
          this.showNotice({title:'Error', text:'Filtering chats failed: ' + rc.statusText});
        }
      } catch(e) {
        this.showNotice({title:'Error', text:'Filtering chats failed: ' + e.toString()});
      } finally {
        this.view.ui.hideProgress();
      }
    }
  }

  async clearSearch(query)
  {
    this.view.ui.clearSearch();
  }

  async voice2text(blob, mime)
  {
    if (this.apiKeyRequired && !this.apiKey) {
      this.showNotice({title:'Error', text:'Must login and enter API Key in order to get voice transcription'});
      return;
    }

    let url = new URL('/chat/api/voice2text', this.httpServer);
    const formData  = new FormData();
    formData.append('format', mime);
    formData.append('apiKey', this.apiKey);
    formData.append('data', blob);
    this.view.ui.showProgress();
    try {
        const resp = await fetch (url.toString(), 
                                   { method: 'POST', 
                                     body: formData
                                   });
        if (resp.ok) {
            let jt = await resp.json();
            let text = jt.text;
            if (text.length) {
              this.ws_sendMessage(text);
            } else {
              this.showNotice({title:'Error', text:'Recording cannot be transcribed.'});
            }
        } else {
          this.showNotice({title:'Error', text:'Can not access voice transcription service ' + resp.statusText});
        }
    } catch (e) {
      this.showNotice({title:'Error', text:'Can not access voice transcription service ' + e.message});
    } finally {
      this.view.ui.hideProgress();
    }
  }


  async getSharedLink()
  {
    try {
      let url = new URL('/chat/api/listChats', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('chat_id', this.currentChatId);
      url.search = params.toString();
      const resp = await this.solidClient.fetch(url.toString());
      if (resp.status === 200 && resp.ok) {
        const share_id = await resp.text();
        let link = new URL(document.location);
        link.search = 'chat_id='+share_id;
        return link.toString();
      }
    } catch (e) {
      this.showNotice({title:'Error', text:'Can not get PermaLink: ' + e.message});
    }
    return null;
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

    if (this.resume_char_id) {
      const chat_id = await resumeAsNew(resume_char_id);
      await loadConversation(chat_id);
    }
    await this.initSidebar();
    await this.initFunctionList();
    this.ws_Init();
  }


  async chatAuthenticate (currentChatId) 
  {
    try {
      const url = new URL('/chat/api/chatAuthenticate', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('session_id', this.sessionId);

      if (currentChatId)
        params.append('chat_id', currentChatId);

      url.search = params.toString();
      const resp = await this.solidClient.fetch (url.toString());
      if (!resp.ok) {
        this.showNotice({title:'Error', text:'Can not authenticate chat session' + resp.statusText});
        return false;
      }

      const obj = await resp.json();
      this.apiKeyRequired = obj.apiKeyRequired

      if (this.apiKeyRequired) {
        if (!this.apiKey || (this.apiKey && !this.apiKey.startsWith('sk-'))) {
          this.view.ui.set_api_lock();
          this.view.ui.show_api_key_dlg();
        }
      } else
        this.view.ui.set_api_unlock();

    } catch (e) {
      this.showNotice({title:'Error', text:'Can not authenticate ' + e.message});
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
      this.showNotice({title:'Error', text:rc.error});
       return null;
    } 
    else {
      this.view.ui.addNewTopic(rc, this.lastChatId);
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
      return {error:'Can not getTopic ' + e.message};
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
        const resp = await this.solidClient.fetch (url.toString(), { method:'DELETE'});
        if (resp.ok) {
          if (resp.status !== 204) {
            this.showNotice({title:'Error', text:'Delete failed: ' + resp.statusText});
            return;
          }

          if (chat_id === this.currentChatId)
            this.currentChatId = null;
    
          const rc = await this.loadChats();
          if (rc && this.currentChatId)
            this.loadConversation(this.currentChatId);
        }
      }
      else if (action === 'rename' && name) {
        const resp = await this.solidClient.fetch (url.toString(), { method:'POST', body: JSON.stringify ({title: name, model: this.currentModel}) });
        if (!resp.ok && resp.status !== 200) {
          this.showNotice({title:'Error', text:'Rename failed: ' + resp.statusText});
          return;
        }
        this.loadChats();
      }
    } catch (e) {
      if (action === 'delete') {
        this.showNotice({title:'Error', text:'Delete failed: ' + e.message});
      } else if (action === 'rename') {
        this.showNotice({title:'Error', text:'Rename failed: ' + e.message});
      }
    }
  }


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
    //??todo
  }


  ws_Continue()
  {
    if (!this.loggedIn || !this.webSocket)
      return;

    const lastLine = this.view.ui.getLastLine();
    this.sendPrompt('continue'+lastLine, 'system');
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
      this.showNotice({title:'Error', text:'Stop failed: ' + e.message});
    }
  }


  async ws_onOpen(ev)
  {
    const rc = await this.chatAuthenticate (this.currentChatId); // used also to sent currentChatId 
    if (!rc) {
      this.view.logout();
      return;
    }
    if (!this.webSocket) {
      this.view.logout();
      return;
    }

    try {
      if (!this.helloSent) { // send init message e.g. Init or something else to cause Chat bot to answer 
        //console.log ('onOpen currentChatId:'+currentChatId);
        if (this.currentChatId)
          await this.loadConversation(this.currentChatId);
        this.helloSent = true;
      }
    } finally {
      this.view.ui.hideProgress();
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
    this.view.ui.hideProgress();
    this.webSocket.close();
    this.webSocket = null;
  }

  ws_onClose(ev)
  {
    this.showMessage ('Connection to the server closed. '+JSON.stringify(ev));
    this.view.logout();
    this.view.ui.hideProgress();
  }


  async ws_sendMessage(text)
  {
    if (this.loggedIn) {
      try {
        const rc = await this.getTopic();
        if (rc && rc.error) {
          this.view.logout();
          this.showNotice({title:'Error', text:'Not logged in'});
          return false;
        }
      } catch(e) {
        console.log(e);
      }
  
      if (text.trim() === '' || !this.webSocket)
          return false;

      this.view.ui.showProgress();
      this.view.ui.new_question(text);
      DOM.qHide('#fab-continue');

      this.sendPrompt(text)
      return true;
    }
    else {
      this.showNotice({title:'Error', text:'Not logged in'});
     return false;
    }
  }


  async initSidebar() 
  {
    this.setModel(this.currentModel, true);
    await this.initFineTune();
    await this.initModels()    
    /* user chats */
    await this.loadChats ();
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
        let model = '';
        let fine_tune = '';

        for(const v of chats) {
          if (!this.currentChatId && v.role === 'user') {
            this.currentChatId = this.lastChatId = v.chat_id;
            model = v.model;
            fine_tune = v.fine_tune;
          }
        }

        this.view.ui.updateListTopics(chats, this.currentChatId);
        this.setModel(model, true);
        this.setFineTune(fine_tune, true);
        return true;
      } 
      else {
        this.showNotice({title:'Error', text:'Loading chats failed: ' + resp.statusText});
        await this.checkLoggedIn(resp.status);
        return false;
      }
    } catch (e) {
      this.showNotice({title:'Error', text:'Loading chats failed: ' + e.message});
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
        this.showNotice({title:'Info', text:'Session was disconnected'})
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
        let fine_tune = null;
        this.curConversation = list;

        for(const v of list) {
          if (v.role === 'user')
            this.setModel(v.model, true);
            this.setTemperature(v.temperature);
            this.setTop_p(v.top_p);
            fine_tune = v.fine_tune;
        }

        this.view.ui.updateConversation(list, chat_id);
        this.receivingMessage = null;
        this.currentChatId = chat_id;
        this.setFineTune(fine_tune);
        this.initFunctionList();
      } 
      else {
        this.showNotice({title:'Error', text:'Conversation failed to load failed: ' + resp.statusText});
        await this.checkLoggedIn(resp.status);
        return false;
      }
    } 
    catch (e) {
      this.showNotice({title:'Error', text:'Loading conversation failed: ' + e.message});
      this.view.logout();
      return false;
    } 
    finally {
      this.view.ui.hideProgress();
    }
    return true;
  }


  selectSession(id, role, model, fine_tune)
  {
    if (id.startsWith('system-') && role === 'system') {
      if (this.webSocket) {
        this.currentChatId = null;

        this.setModel(model, true);
        this.setFineTune(fine_tune, true);

        this.sendPrompt(null, 'user', id, null);
      }
    }
    else {
      this.setModel(model, true);
      this.setFineTune(fine_tune, true);
   
      this.loadConversation (id);
    }
  }

  sendPrompt(text, role = 'user', chat_id = this.currentChatId, call_funcs = this.getEnableCallbacks())
  {
    const request = { type: role, 
                  question: text, 
                   chat_id: chat_id, 
                     model: this.currentModel, 
                    apiKey: this.apiKey,
                      call: call_funcs,
               temperature: this.temperature,
                     top_p: this.top_p
               };
  
    this.webSocket.send(JSON.stringify(request));
  }

  selectFineTune(id, model)
  {
    this.setFineTune(id, true);
    if (id.startsWith('system-') && this.webSocket) {
      this.currentChatId = null;
      this.setModel(model, true);
      this.sendPrompt(null, 'user', id, null);
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
        this.showNotice({title:'Error', text:'Resuming chat failed: ' + resp.statusText});
    } catch (e) {
      this.showNotice({title:'Error', text:'Resuming chat failed: ' + e.message});
    }
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
       clientName: "OpenLink Personal Assistant"
    });
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

  setFineTune(val, update_ui)
  {
    this.fine_tune = val;
    if (update_ui)
      this.view.ui.setFineTune(this.fine_tune);
  }


  async initFunctionList() 
  {
    try {
      let url = new URL('/chat/api/listFunctions', this.httpServer);
      let params = new URLSearchParams(url.search);
      params.append('chat_id', this.currentChatId); 
      url.search = params.toString();
      const resp = await fetch (url.toString());
      if (resp.status === 200) {
          let list = await resp.json();
          this.funcsList = list;
          this.view.ui.initFuncsList(list)
      } else
      this.showNotice({title:'Error', text:'Loading helper functions failed: ' + resp.statusText});
    } catch(e) {
      console.log(e);
    }
  }


  async initFineTune() 
  {
    try {
      let url = new URL('/chat/api/listFineTune', this.httpServer);
      const resp = await fetch (url.toString());
      if (resp.status === 200) {
          let list = await resp.json();
          this.view.ui.initFuneTune(list)
      } else
        this.showNotice({title:'Error', text:'Loading pre-defined prompts failed: ' + resp.statusText});
    } catch(e) {
      console.log('Loading pre-defined prompts failed: '+e);
    }
  }

  async initModels() 
  {
    try {
      let url = new URL('/chat/api/getModels', this.httpServer);
      const resp = await fetch (url.toString());
      if (resp.status === 200) {
          let list = await resp.json();
          this.view.ui.initModels(list, this.defModel);
          return;
      }
    } catch(e) {
      console.log('Loading pre-defined prompts failed: '+e);
    }
    /* use def model's list */
    let models = [];
    for(const v of this.defModels)
      models.push({id:v, name:v});

    this.view.ui.initModels(models);
  }



}


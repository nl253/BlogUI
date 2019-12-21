import React, {Component} from 'react';
import ReactDOM from 'react-dom';

import {lexer, parser, Renderer, setOptions} from 'marked';
import {Spinner, Toast, ToastBody, ToastHeader} from 'reactstrap';
import {basename, dirname, join} from 'path-browserify';
import 'highlight.js/styles/default.css';

import './index.scss';
import bannedWords from './bannedWords.json';
import * as serviceWorker from './serviceWorker';
import {countSent, countWords, fmtHeading, getTimeToReadInMin} from './utils';

setOptions({
  renderer: new Renderer(),
  highlight: function(code) {
    return require('highlight.js').highlightAuto(code).value;
  },
  pedantic: false,
  gfm: true,
  breaks: false,
  sanitize: false,
  smartLists: true,
  smartypants: true,
  xhtml: false,
});

/**
 * @param {string} s
 * @param {RegExp} re
 * @param {number} [group]
 * @return {string[]}
 */
const findAllMatches = (s, re, group = 0) => {
  const matches = [];
  let m;
  do {
    m = re.exec(s);
    if (m) {
      matches.push(m[group]);
    }
  } while (m);
  return matches;
};

class App extends Component {
  constructor(props) {
    super(props);
    this.bannedWords = new Set(bannedWords);
    this.REGEX_FILE_END = /\.(m(ark)?d(own)?|x?html?)$/i;
    this.year = new Date(Date.now()).getFullYear().toString();
    this.pendingRequests = {
      postText: [],
      sentiment: [],
      places: [],
      organizations: [],
      topics: [],
      people: [],
    };

    this.dictCache = {};
    this.postCache = {};
    this.state = {
      sentiment: null,
      places: [],
      organizations: [],
      topics: [],
      people: [],
      toastVisible: false,
      root: null,
      category: null,
      tmpWord: null,
      word: null,
      definition: null,
      post: null,
      postText: '',
      loading: [],
    };
    this.init();
  }

  /**
   * @param {string} path
   * @return {boolean}
   */
  isFile(path) { return path.search(this.REGEX_FILE_END) >= 0; }

  closeDefinition() {
    this.setState({ word: null, definition: null });
  }

  async init() {
    this.begin('root');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_ROOT}/trees/master?recursive=1`, {
        mode: 'cors',
        headers: {
          Authorization: process.env.REACT_APP_AUTHORIZATION,
        }
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.body));
      }
      const json = await res.json();
      this.setState({
        root: {
          ...json,
          tree: json.tree.filter(n => basename(n.path).indexOf('.') < 0 || this.isFile(n.path)).map(n => ({...n, path: `/${n.path}`})),
        }
      });
      const path = window.location.pathname;
      if (this.isFile(path)) {
        this.absPost(path);
      } else {
        this.absCategory(path);
      }
    } catch (e) {
      console.error(e);
    }
    this.end('root');
  }

  /**
   * @return {string}
   */
  get parentCategory() {
    return this.state.category === '/' ? '/' : dirname(this.state.category);
  }

  /**
   * @return {string[]}
   */
  get parentPosts() {
    if (this.state.category === '/') {
      return [];
    }
    const cat = this.parentCategory;
    return this.state.root.tree
      .filter(node => node.type === 'blob' && basename(node.path)[0] !== '.' && dirname(node.path) === cat)
      .map(node => basename(node.path))
      .sort();
  }

  /**
   * @return {string[]}
   */
  get parentCategories() {
    if (this.state.category === '/') {
      return [];
    }
    const cat = this.parentCategory;
    return this.state.root.tree
      .filter(node => node.type === 'tree' && basename(node.path)[0] !== '.' && dirname(node.path) === cat)
      .map(node => basename(node.path))
      .sort();
  }

  /**
   * @return {string[]}
   */
  get posts() {
    return this.state.root.tree
      .filter(node => node.type === 'blob' && basename(node.path)[0] !== '.' && this.isFile(node.path) && dirname(node.path) === this.state.category)
      .map(node => basename(node.path))
      .sort();
  }

  /**
   * @return {string[]}
   */
  get categories() {
    return this.state.root.tree
      .filter(node => node.type === 'tree' && basename(node.path)[0] !== '.' && dirname(node.path) === this.state.category)
      .map(node => basename(node.path))
      .sort();
  }

  /**
   * @param {string} post
   */
  async absPost(post) {
    if (this.state.category === dirname(post) && this.state.post === basename(post)) {
      return;
    }
    this.pendingRequests.postText.forEach(r => r.abort());
    this.pendingRequests.postText = [];
    this.begin('postText');
    window.history.pushState({}, `post ${basename(post)}`, post);
    this.setState({
      category: dirname(post),
      post: basename(post),
      postText: '',
    });
    const maybeCached = this.postCache[post];
    if (maybeCached === undefined) {
      const postBlob = this.state.root.tree.find(node => node.type === 'blob' && node.path === post);
      if (postBlob) {
        const controller = new AbortController();
        this.pendingRequests.postText = this.pendingRequests.postText.concat([controller]);
        try {
          const res = await fetch(
            `${process.env.REACT_APP_API_ROOT}/blobs/${(postBlob.sha)}`, {
              mode: 'cors',
              signal: controller.signal,
              headers: {
                Authorization: process.env.REACT_APP_AUTHORIZATION,
                Accept: 'application/json, *',
              },
            });
          if (!res.ok) {
            throw new Error(JSON.stringify(res.body));
          }
          const json = await res.json();
          const markdown = json.encoding === 'base64'
            ? atob(json.content)
            : json.content;
          const tokens = lexer(markdown);
          const postText = parser(tokens);
          this.postCache[post] = {...(this.postCache[post] || {}), postText};
          this.setState({postText});
        } catch (e) {
          console.log(e);
        } finally {
          controller.abort();
          this.pendingRequests.postText = this.pendingRequests.postText.filter(r => r !== controller);
        }
      } else {
        console.warn(`could not find blob for post ${post}`);
      }
    } else {
      this.setState({postText: maybeCached.postText});
    }
    this.end('postText');
    if (this.state.postText) {
      this.callNaturalApi('sentiment', null);
      for (const type of ['topics', 'people', 'places', 'organizations']) {
        this.callCompromiseApi(type, []);
      }
      this.makePostWordsClickable();
      this.registerDefinitionsOnWordClick();
      this.fixImgSrc();
    }
  }

  makePostWordsClickable() {
    for (const p of document.querySelectorAll('#post-text p, #post-text li')) {
      for (const w of new Set(findAllMatches(p.innerText, /([a-zA-Z]{2,})/g))) {
        if (!this.bannedWords.has(w)) {
          p.innerHTML = p.innerHTML.replace(new RegExp('\\b' + w + '\\b', 'g'), `<button class="word">${w}</button>`);
        }
      }
    }
  }

  registerDefinitionsOnWordClick() {
    for (const node of document.querySelectorAll('#post-text p .word, #post-text li .word')) {
      node.addEventListener('click', () => this.tryDefine(node.innerText));
    }
  }

  fixImgSrc() {
    for (const img of document.querySelectorAll('img[src]')) {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http')) {
        img.setAttribute('src', join(process.env.REACT_APP_ASSETS_ROOT, this.state.category.substr(1), src));
      }
    }
  }

  /**
   * @param {string} what
   */
  begin(what) {
    this.state.loading.push(what);
  }

  /**
   * @param {string} what
   */
  end(what) {
    for (let i = 0; i < this.state.loading.length; i++) {
      if (this.state.loading[i] === what) {
        this.state.loading.splice(i, 1);
        return;
      }
    }
  }

  /**
   * @param {string} category
   */
  absCategory(category) {
    if (this.state.category === category) {
      return;
    } else if (category === '') {
      this.absCategory('/');
    } else if (category.length > 1 && category.endsWith('/')) {
      this.absCategory(category.replace(/\/$/, ''));
    } else {
      window.history.pushState(undefined, `category ${basename(category)}`, category);
      this.setState({ category });
    }
  }

  /**
   * @param {string} word
   */
  async tryDefine(word) {
    console.log(`defining ${word}`);
    this.begin('word');
    let definition = this.dictCache[word];
    if (definition === undefined) {
      try {
        const res = await fetch(`${process.env.REACT_APP_NLP_API_ROOT}/lookup?code=${process.env.REACT_APP_NLP_AUTHORIZATION}`, {
          mode: 'cors',
          body: JSON.stringify({word}),
          method: 'post',
          headers: {
            Accept: 'application/json, *',
            'Content-Type': 'application/json',
          }
        });
        if (!res.ok) {
          throw new Error(JSON.stringify(res.body));
        }
        definition = (await res.json()).definition;
        this.dictCache[word] = definition;
      } catch (e) {
        console.log(e.message);
        this.dictCache[word] = null;
      }
    }
    if (definition !== undefined) {
      this.setState({definition, word});
      for (const p of document.querySelectorAll('.toast > .toast-body')) {
        for (const w of new Set(findAllMatches(p.innerText, /([a-zA-Z]{2,})/g))) {
          if (!this.bannedWords.has(w)) {
            p.innerHTML = p.innerHTML.replace(new RegExp('\\b' + w + '\\b', 'g'), `<button class="word">${w}</button>`);
          }
        }
      }
      for (const node of document.querySelectorAll('.toast > .toast-body .word')) {
        node.addEventListener('click', () => this.tryDefine(node.innerText));
      }
    }
    this.end('word');
  };

  /**
   * @param {string} type
   * @return {Promise<void>}
   */
  async callCompromiseApi(type, zero = []) {
    this.setState({ [type]:  zero});
    this.pendingRequests[type].forEach(r => r.abort());
    this.pendingRequests[type] = [];
    this.begin(type);
    const maybeCached = this.postCache[this.state.post];
    if (maybeCached === undefined) {
      const controller = new AbortController();
      try {
        const res = await fetch(
          `${process.env.REACT_APP_NLP_API_ROOT}/compromise?code=${process.env.REACT_APP_NLP_AUTHORIZATION}`,
          {
            mode: 'cors',
            signal: controller.signal,
            body: JSON.stringify({text: [...document.getElementById('post-text').querySelectorAll('p')].map(p => p.innerText).join('\n').slice(0, 10000), type}),
            method: 'post',
            headers: {
              Accept: 'application/json, *',
              'Content-Type': 'application/json',
            },
          });
        if (!res.ok) {
          throw new Error(JSON.stringify(res.body));
        }
        const json = await res.json();
        const newValue = [
          ...(new Set(json.filter(
            w => w.length > 2 && w.search(/^[a-z 0-9.,&]+$/i) >= 0)))];
        this.setState({
          [type]: newValue,
        });
        this.postCache[this.state.post] = {
          ...(this.postCache[this.state.post] || {}), [type]: newValue,
        };
      } catch (e) {
        this.postCache[this.state.post] = null;
        console.error(e);
      } finally {
        controller.abort();
        this.pendingRequests[type] = this.pendingRequests[type].filter(r => r !== controller);
      }
    } else if (maybeCached !== null) {
      this.setState({[type]: maybeCached[type]});
    }
    this.end(type);
  }

  /**
   * @param {string} action
   * @return {Promise<void>}
   */
  async callNaturalApi(action, zero = null) {
    this.setState({ [action]: zero });
    this.pendingRequests[action].forEach(r => r.abort());
    this.pendingRequests[action] = [];
    this.begin(action);
    const maybeCached = this.postCache[this.state.post];
    if (maybeCached === undefined) {
      const controller = new AbortController();
      try {
        const res = await fetch(`${process.env.REACT_APP_NLP_API_ROOT}/natural?code=${process.env.REACT_APP_NLP_AUTHORIZATION}`, {
          mode: 'cors',
          signal: controller.signal,
          body: JSON.stringify({text: [...document.getElementById('post-text').querySelectorAll('p')].map(p => p.innerText).join('\n').slice(0, 10000), action}),
          method: 'post',
          headers: {
            Accept: 'application/json, *',
            'Content-Type': 'application/json',
          }
        });
        if (!res.ok) {
          throw new Error(JSON.stringify(res.body));
        }
        const newValue = await res.json();
        this.setState({ [action]: newValue });
        this.postCache[this.state.post] = { ...(this.postCache[this.state.post] || {}), [action]: newValue };
      } catch (e) {
        console.error(e);
        this.postCache[this.state.post] = null;
      } finally {
        controller.abort();
        this.pendingRequests[action] = this.pendingRequests[action].filter(r => r !== controller);
      }
    } else if (maybeCached !== zero) {
      this.setState({ [action]: maybeCached[action] });
    }
    this.end(action);
  }

  /**
   * @param {string} item
   * @return {boolean}
   */
  didLoad(...item) {
    return item.reduce((prev, focus) => prev && this.state.loading.indexOf(focus) < 0, true);
  }

  /**
   * @returns {*}
   */
  render() {
    return (
      this.didLoad('root') &&
      <div>
        <Toast isOpen={!!this.state.definition}
               style={{position: 'fixed', zIndex: 99, bottom: '10px', left: '10px'}}
               transition={{exit: false, timeout: 10, enter: true, appear: true}}
               onClick={this.closeDefinition.bind(this)}>
          <ToastHeader>{this.state.word}</ToastHeader>
          <ToastBody>{this.state.definition}</ToastBody>
        </Toast>
        <main className="container-fluid mt-0 mt-xl-5 mt-lg-5 mt-md-0 mt-sm-0 d-flex no-gutters flex-column flex-xl-row flex-lg-row flex-md-row flex-sm-column" style={{minHeight: '84vh'}}>
          <section className="col-xl-2 col-lg-2 d-none d-xl-block d-lg-block d-md-none d-sm-none">
            {this.parentCategories.length > 0 && (
              this.parentCategory.length === 1 ?
                (
                  <div>
                    <h1 className="text-center mx-auto display-4">Blog</h1>
                    <hr style={{maxWidth: '75%'}}/>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-center mx-auto">
                      {fmtHeading(basename(this.parentCategory))}
                    </h2>
                    <hr/>
                  </div>
                )
            )}
            {this.parentCategories.length > 0 && (
              <nav>
                {this.parentCategories.map((c, idx) =>
                  <button onClick={() => this.absCategory(join(this.parentCategory, c))}
                          key={idx}
                          className={`d-block btn mx-auto w-75 btn-${this.state.category.substr(1) === c ? 'warning' : 'link'}`}>
                    {fmtHeading(c)}
                  </button>
                )}
              </nav>
            )}
            {this.parentPosts.length > 0 && (
              <div>
                {this.parentCategories.length > 0 && <hr style={{maxWidth: '75%'}}/>}
                <h3 className="text-center mt-3 mx-auto">Posts</h3>
                <nav>
                  {this.parentPosts.map((post, idx) =>
                    <button onClick={() => this.absPost(join(this.parentCategory, post))}
                            key={idx}
                            className={`d-block btn mx-auto w-75 btn-${this.state.post === post ? 'light' : 'link'}`}>
                      {fmtHeading(post)}
                    </button>
                  )}
                </nav>
              </div>
            )}
          </section>
          <section className="col-xl-2 col-lg-2 col-md-3 col-sm-12 my-4 my-xl-0 my-lg-0 my-md-4 my-sm-4">
            <div className="text-center col mx-auto">
              {this.state.category === '/'
                ?
                (
                  <div>
                    <h1 className="text-center mx-auto display-4">Blog</h1>
                    <hr style={{maxWidth: '75%'}}/>
                  </div>
                )
                : (
                  <div>
                    <h2>{fmtHeading(basename(this.state.category))}</h2>
                    <button className="btn btn-light d-block w-50 mx-auto border"
                            onClick={() => this.absCategory(this.parentCategory)}>
                      Back
                    </button>
                  </div>
                )
              }
            </div>
            <div>
              {this.categories.length > 0 && (
                <nav>
                  {this.categories.map((c, idx) =>
                    <button onClick={() => this.absCategory(join(this.state.category, c))}
                            key={idx}
                            className='d-block btn mx-auto w-75 btn-link'>
                      {fmtHeading(c)}
                    </button>
                  )}
                </nav>
              )}
              {this.posts.length > 0 && (
                <div>
                  {this.categories.length > 0 && <hr style={{maxWidth: '75%'}}/>}
                  <h3 className="text-center mt-3 mx-auto">Posts</h3>
                  <nav>
                    {this.posts.map((post, idx) =>
                      <button onClick={() => this.absPost(join(this.state.category, post))}
                              key={idx}
                              className={`d-block btn w-75 mx-auto btn-${this.state.post === post ? 'warning' : 'link'}`}>
                        {fmtHeading(post)}
                      </button>
                    )}
                  </nav>
                </div>
              )}
            </div>
          </section>
          {this.didLoad('postText') && this.state.postText
            ? (
              <section className="col-xl col-lg col-md-9 col-sm-12 container-fluid row justify-content-around">
                <div className={`col-xl-3 col-lg-3 d-md-none d-sm-none`}/>
                <section className={`col-xl-6 col-8-lg col-12-md col-12-sm`}>
                  <div id="post-text"
                       dangerouslySetInnerHTML={{__html: this.state.postText}}
                       className="my-4 my-xl-0 my-lg-0 my-md-4 my-sm-4"/>
                </section>
                <div className={`col-xl-1 col-lg-1 d-md-none d-sm-none`}/>

                <section className={`col-xl-1 col-lg-1 d-none d-xl-block d-lg-block d-md-none d-sm-none`}>
                  <h3>Info</h3>
                  <p className="mb-1">{getTimeToReadInMin(this.state.postText)} min read</p>
                  <p className="mb-1">{countWords(this.state.postText)} words</p>
                  <p>{countSent(this.state.postText)} sentences</p>
                  <div>
                    {['topics', 'people', 'places', 'organizations'].filter(type => this.state[type] && this.state[type].length > 0)
                      .map((type, typeIdx) => (
                        <div key={typeIdx}>
                          <h4>{type.substr(0, 1).toUpperCase()}{type.substr(1)}</h4>
                          <ul style={{listStyleType: 'none', padding: 0, margin: 0}}>
                            {this.state[type].map((t, tIdx) => (
                              <li key={tIdx}>
                                <p style={{fontVariantCaps: 'all-petite-caps'}}>{t}</p>
                              </li>
                            ))}
                          </ul>
                        </div>))}

                    {this.state.sentiment && (
                      <div>
                        <h4>Sentiment</h4>
                        <p style={{fontVariantCaps: 'all-petite-caps'}}>
                          {this.state.sentiment.toFixed(3)}
                        </p>
                      </div>)}
                  </div>
                </section>
                <div className={`col-xl-1 col-lg-1 d-md-none d-sm-none`}/>
              </section>
            )
            : (
              <div className="mx-auto my-auto">
                <Spinner style={{ width: '3rem', height: '3rem' }} />
              </div>
            )}
        </main>
        <footer className="py-4 bg-light d-none d-xl-block d-lg-block d-md-block d-sm-block border-top mt-xl-3 mt-1 mt-lg-3 mt-md-1 mt-sm-1">
          <div className="mx-auto mt-2 mb-4" style={{maxWidth: '370px'}}>
              <span className="mr-3">
                <a href="https://www.linkedin.com/in/norbert-logiewa"
                   className="btn btn-sm btn-secondary"
                   style={{minWidth: '80px'}}>
                  LinkedIn
                </a>
              </span>
            <span className="mr-3">
                <a href="https://github.com/nl253"
                   className="btn btn-sm btn-secondary"
                   style={{minWidth: '80px'}}>
                  GitHub
                </a>
              </span>
            <span className="mr-3">
                <a href="https://docs.google.com/document/d/1I94ZHc_75a2ivyjcDXjESIrGYPmJUriTm3xmEkcwaeI/edit?usp=sharing"
                   className="btn btn-sm btn-secondary"
                   style={{minWidth: '80px'}}>
                  CV
                </a>
              </span>
            <span>
                <a href="https://portfolio-nl.herokuapp.com"
                   className="btn btn-sm btn-secondary"
                   style={{minWidth: '80px'}}>
                  Portfolio
                </a>
              </span>
          </div>
          <p className="text-center mx-auto">Copyright &copy; Norbert Logiewa {this.year}</p>
        </footer>
      </div>
    );
  }
}

ReactDOM.render(<App/>, document.getElementById('root'));
serviceWorker.unregister();

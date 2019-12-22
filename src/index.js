import React, {Component} from 'react';
import ReactDOM from 'react-dom';

import {Spinner, Toast, ToastBody, ToastHeader} from 'reactstrap';
import {basename, dirname, join} from 'path-browserify';
import { author } from '../package.json';

import './index.scss';
import bannedWords from './bannedWords.json';
import * as serviceWorker from './serviceWorker';
import {
  findAllMatches,
  countSent,
  countWords,
  fmtHeading,
  getTimeToReadInMin,
  isFile,
} from './utils';
import {
  define,
  getPostHTML,
  callCompromiseApi,
  callNaturalApi,
  getBlogData,
} from './api';


class App extends Component {
  constructor(props) {
    super(props);
    this.bannedWords = new Set(bannedWords);
    this.author = author;
    this.year = new Date(Date.now()).getFullYear().toString();
    this.naturalApiRequests = ['sentiment'];
    this.compromiseApiRequests = [
      'places',
      'organizations',
      'topics',
      'people',
    ];
    this.cache = {
      categories: {},
      posts: {},
      trees: undefined,
      blobs: undefined,
    };
    this.state = {
      _root: null,
      category: null,
      word: null,
      definition: null,
      post: null,
      postText: '',
      _loading: ['_root'],
      ...Object.fromEntries(this.naturalApiRequests.map(e => [e, null])),
      ...Object.fromEntries(this.compromiseApiRequests.map(e => [e, []])),
    };
    this.init();
  }

  async init() {
    try {
      this.setState({
        _root: await getBlogData(),
      });
      const path = window.location.pathname;
      if (isFile(path)) {
        this.absPost(path);
      } else {
        this.absCategory(path);
      }
    } catch (e) {
      console.error(e);
    }
    this.endLoading('_root');
  }

  /**
   * @return {Object<{path: string, url: string, sha: string}>}
   */
  get trees() {
    if (this.cache.trees !== undefined) {
      return this.cache.trees;
    }
    const trees = Object.fromEntries(
      this.state._root.tree
        .filter(node => node.type === 'tree')
        .sort((a, b) => basename(a.path).localeCompare(basename(b.path)))
        .map(node => ([node.path, node])));
    this.cache.trees = trees;
    return trees;
  }

  /**
   * @return {Object<{path: string, url: string, sha: string}>}
   */
  get blobs() {
    if (this.cache.blobs !== undefined) {
      return this.cache.blobs;
    }
    const blobs = Object.fromEntries(this.state._root.tree
      .filter(node => node.type === 'blob')
      .sort((a, b) => basename(a.path).localeCompare(basename(b.path)))
      .map(o => [o.path, o]));
    this.cache.blobs = blobs;
    return blobs;
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
    return Object
      .values(this.blobs)
      .filter(node => dirname(node.path) === cat)
      .map(node => basename(node.path));
  }

  /**
   * @return {string[]}
   */
  get parentCategories() {
    if (this.state.category === '/') {
      return [];
    }
    const cat = this.parentCategory;
    return Object
      .values(this.trees)
      .filter(node => dirname(node.path) === cat)
      .map(node => basename(node.path));
  }

  /**
   * @return {string[]}
   */
  get posts() {
    const cat = this.state.category;
    const maybeCache = this.cache.posts[cat];
    if (maybeCache !== undefined) {
      return maybeCache;
    }
    const posts = Object.entries(this.blobs)
      .filter(([path, _node]) => dirname(path) === cat)
      .map(([path, _node]) => basename(path));
    this.cache.posts[cat] = posts;
    return posts;
  }

  /**
   * @return {string[]}
   */
  get categories() {
    const cat = this.state.category;
    const maybeCache = this.cache.categories[cat];
    if (maybeCache !== undefined) {
      return maybeCache;
    }
    const categories = Object
      .entries(this.trees)
      .filter(([path, _node]) => dirname(path) === cat)
      .map(([path, _node]) => basename(path));
    this.cache.categories[cat] = categories;
    return categories;
  }

  /**
   * @param {string} post
   */
  async absPost(post) {
    if (this.state.category === dirname(post) && this.state.post === basename(post)) {
      return;
    }
    this.beginLoading('postText');
    window.history.pushState({}, `post ${basename(post)}`, post);
    this.setState({
      category: dirname(post),
      post: basename(post),
      postText: '',
    });
    const postBlob = this.blobs[post];
    if (!postBlob) {
      console.warn(`could not find blob for post ${post}`);
      return;
    }
    try {
      const postText = await getPostHTML(postBlob.sha);
      this.setState({postText});
      this.endLoading('postText');
      if (this.state.postText) {
        const p = Promise.all([
          ...this.naturalApiRequests.map(async (type) => {
            this.setState({[type]: null});
            this.beginLoading(type);
            this.setState({
              [type]: await callNaturalApi(this.state.post, this.state.category, this.getPostBody(), type),
            });
            this.endLoading(type);
          }),
          ...this.compromiseApiRequests.map(async (type) => {
            this.setState({[type]: []});
            this.beginLoading(type);
            this.setState({
              [type]: await callCompromiseApi(this.state.post, this.state.category, this.getPostBody(), type),
            });
            this.endLoading(type);
          })
        ]);
        this.makeClickable('#post-text p, #post-text li');
        this.registerDefinitionsOnWordClick('#post-text p .word, #post-text li .word');
        this.fixImgSrc();
        await p;
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * @param {string} selector
   */
  makeClickable(selector) {
    const nodes = document.querySelectorAll(selector);
    for (const n of nodes) {
      for (const child of n.childNodes) {
        if (child.nodeName === '#text') {
          const matches = findAllMatches(child.nodeValue, /([a-zA-Z]{2,})/g);
          for (const w of new Set(matches)) {
            if (!this.bannedWords.has(w)) {
              n.innerHTML = n.innerHTML.replace(new RegExp('\\b' + w + '\\b', 'g'), `<button class="word">${w}</button>`);
            }
          }
        }
      }
    }
  }

  /**
   * @param {string} selector
   */
  registerDefinitionsOnWordClick(selector) {
    for (const node of document.querySelectorAll(selector)) {
      node.addEventListener('click', async () => {
        const word = node.innerText;
        try {
          const definition = await define(word);
          if (definition) {
            this.setState({ word, definition });
            this.makeClickable('.toast > .toast-body');
            this.registerDefinitionsOnWordClick('.toast > .toast-body .word');
          }
        } catch (e) {
          console.error(e);
        } finally {
          this.endLoading('word');
        }
      });
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
  beginLoading(what) {
    this.setState({_loading: [...this.state._loading, what]});
  }

  /**
   * @param {string} what
   */
  endLoading(what) {
    this.setState(({ _loading }) => {
      for (let i = 0; i < _loading.length; i++) {
        if (_loading[i] === what) {
          return {
            _loading: _loading.slice(0, i).concat(_loading.slice(i + 1)),
          };
        }
      }
    });
  }

  /**
   * @param {string} item
   * @return {boolean}
   */
  didLoad(...item) {
    return item.reduce((prev, focus) => prev && this.state._loading.indexOf(focus) < 0, true);
  }

  /**
   * @param {string} category
   */
  absCategory(category) {
    if (this.state.category !== category) {
      if (category === '') {
        this.absCategory('/');
      } else if (category.length > 1 && category.endsWith('/')) {
        this.absCategory(category.replace(/\/$/, ''));
      } else {
        window.history.pushState(undefined, `category ${basename(category)}`, category);
        this.setState({ category });
      }
    }
  }

  /**
   * @return {string}
   */
  getPostBody(slice = true) {
    const s = [...document.getElementById('post-text').querySelectorAll('p')].map(p => p.innerText).join('\n');
    return slice ? s.slice(0, 10000) : s;
  }

  /**
   * @returns {*}
   */
  render() {
    return (
      this.didLoad('_root') &&
      <div>
        <Toast isOpen={!!this.state.definition}
               className="d-sm-none d-md-none d-lg-block d-xl-block"
               style={{position: 'fixed', zIndex: 99, bottom: '10px', left: '10px'}}
               transition={{exit: false, timeout: 10, enter: true, appear: true}}
               onClick={() => this.setState({word: null, definition: null})}>
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
          {this.didLoad('postText') && this.state.postText && (
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
                  {this.compromiseApiRequests
                    .filter(type => !!this.state[type] && this.state[type].length > 0)
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

                  {this.naturalApiRequests
                    .filter(type => !!this.state[type])
                    .map((type, typeIdx) => (
                      <div key={typeIdx}>
                        <h4>{type.substr(0, 1).toUpperCase()}{type.substr(1)}</h4>
                        <p style={{fontVariantCaps: 'all-petite-caps'}}>{this.state[type].toFixed(2)}</p>
                      </div>))}
                </div>
              </section>
              <div className={`col-xl-1 col-lg-1 d-md-none d-sm-none`}/>
            </section>
          )}
          {!this.didLoad('postText') && (
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
          <p className="text-center mx-auto">Copyright &copy; {this.author.name} {this.year}</p>
        </footer>
      </div>
    );
  }
}

ReactDOM.render(<App/>, document.getElementById('root'));
serviceWorker.unregister();

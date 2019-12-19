import React, {Component} from 'react';
import ReactDOM from 'react-dom';

import {basename, dirname, join} from 'path-browserify';
import {lexer, parser, Renderer, setOptions} from 'marked';
import 'highlight.js/styles/default.css';

import './index.scss';
import * as serviceWorker from './serviceWorker';
import {countSent, countWords, fmtHeading, getTimeToReadInMin} from './utils';

// Set options
// `highlight` example uses `highlight.js`
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
  xhtml: false
});

class App extends Component {
  constructor(props) {
    super(props);
    this.headers = {
      Authorization: process.env.REACT_APP_AUTHORIZATION,
    };
    this.REGEX_FILE_END = /\.(m(ark)?d(own)?|x?html?)$/i;
    this.apiRoot = process.env.REACT_APP_API_ROOT;
    this.assetsRoot = process.env.REACT_APP_ASSETS_ROOT;
    this.year = new Date(Date.now()).getFullYear().toString();
    this.postTextCache = new Map();
    this.state = {
      root: null,
      category: null,
      post: null,
      postText: '',
      loading: ['root'],
    };
    this.dirname = dirname;
    this.basename = basename;
    this.init();
  }

  /**
   * @param {string} path
   * @return {boolean}
   */
  isFile(path) { return path.search(this.REGEX_FILE_END) >= 0; }

  async init() {
    try {
      const res = await fetch(`${this.apiRoot}/trees/master?recursive=1`, { mode: 'cors', headers: this.headers });
      const json = await res.json();
      this.setState({
        root: {
          ...json,
          tree: json.tree.filter(n => basename(n.path).indexOf('.') < 0 || n.path.search(this.REGEX_FILE_END) >= 0).map(n => ({...n, path: `/${n.path}`})),
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
    this.setState(({ loading }) => ({ loading: loading.filter(l => l !== 'root') }));
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
    window.history.pushState({}, `post ${basename(post)}`, post);
    this.setState({category: dirname(post), post: basename(post), postText: ''});
    const maybeCached = this.postTextCache.get(post);
    if (maybeCached === undefined) {
      this.setState(({loading}) => ({loading: loading.concat(['postText'])}));
      const postBlob = this.state.root.tree.find(
        node => node.type === 'blob' && node.path === post);
      if (postBlob) {
        const res = await fetch(`${this.apiRoot}/blobs/${(postBlob.sha)}`,
          {mode: 'cors', headers: this.headers});
        const json = await res.json();
        const markdown = json.encoding === 'base64'
          ? atob(json.content)
          : json.content;
        const tokens = lexer(markdown);
        const html = parser(tokens);
        this.postTextCache.set(post, html);
        this.setState(({loading}) => ({
          postText: html,
          loading: loading.filter(l => l !== 'postText'),
        }));
        document
          .querySelectorAll('img[src]')
          .forEach(node => {
            node.setAttribute('src', `${this.assetsRoot}${this.state.category}/${node.getAttribute('src')}`);
          });
      }
    } else {
      this.setState({ postText: maybeCached });
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
   * @returns {*}
   */
  render() {
    return (
      !this.state.loading.some(l => l === 'root') &&
      <div>
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
          {!this.state.loading.some(l => l === 'postText') && (
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
              </section>
              <div className={`col-xl-1 col-lg-1 d-md-none d-sm-none`}/>
            </section>
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

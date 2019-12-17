import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import * as serviceWorker from './serviceWorker';
import { isFile, splitDirsFiles } from './pathUtils';
import { join, basename, dirname } from 'path-browserify';
import {
  randStep,
  fmtHeading,
  countSent,
  countWords,
  getTimeToReadInMin,
} from './utils';

const BASE_URL = 'blog-api-nl.herokuapp.com/posts';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      parentCategory: '',
      parentCategories: [],
      parentPosts: [],
      category: '',
      posts: [],
      postCache: {},
      categories: [],
      categoryCache: {},
      post: '',
      postTextCache: {},
      postText: '',
    };
    this.year = new Date(Date.now()).getFullYear().toString();
    this.absCategory = this.absCategory.bind(this);
    this.absPost = this.absPost.bind(this);
    this.relCategory = this.relCategory.bind(this);
    this.relPost = this.relPost.bind(this);
    if (window.location.pathname !== '' && isFile(window.location.pathname)) {
      const postPath = window.location.pathname;
      this.absCategory(dirname(window.location.pathname));
      this.absPost(postPath);
    } else {
      this.absCategory(window.location.pathname === '' ? '/' : window.location.pathname);
    }
  }

  /**
   * @param {number} num
   */
  static postLoadProgress(num = 0) {
    const postArea = document.getElementById('post-text');
    if (postArea) {
      postArea.innerHTML = `<progress max="100" value="${num}" class="mx-auto d-block w-50" style="margin-top: 10vw"/>`;
    }
  }

  /**
   * @param {string} postPath
   */
  absPost(postPath) {
    if (postPath === this.state.post) return;
    window.history.pushState({}, `post ${basename(postPath)}`, postPath);
    if (this.state.postTextCache[postPath]) {
      this.setState((state, _props) => ({
        post: postPath,
        postText: state.postTextCache[postPath],
      }));
      return;
    }

    const job = (async () => {
      const res = await fetch(`https://${join(BASE_URL, postPath)}`, {mode: 'cors'});
      const json = await res.json();
      return json.data;
    })();

    // "realistically" loading progress bar (purely visual)
    const step1 = randStep(15, 60);
    App.postLoadProgress(step1);
    const minWait = 35;
    setTimeout(() => {
      App.postLoadProgress(step1 + randStep(15, 30));
      setTimeout(() => {
        App.postLoadProgress(100);
        setTimeout(async () => {
          const postText = await job;
          this.state.postTextCache[postPath] = postText;
          this.setState({post: postPath, postText});
        }, randStep(minWait, 65));
      }, randStep(minWait, 65))
    }, randStep(minWait, 65));
  }

  /**
   * @param {string} categoryPath
   * @returns {Promise<void>}
   */
  async absCategory(categoryPath) {
    if (categoryPath === this.state.category) {
      return;
    } else if (categoryPath === '') {
      categoryPath = '/';
    } else if (categoryPath.length > 1 && categoryPath.endsWith('/')) {
      categoryPath = categoryPath.replace(/\/$/, '');
    }

    window.history.pushState(undefined, `category ${basename(categoryPath)}`, categoryPath);

    if (this.state.categoryCache[categoryPath] !== undefined) {
      this.setState((state, _props) => ({
        category: categoryPath,
        categories: state.categoryCache[categoryPath],
        posts: state.postCache[categoryPath],
      }));
    } else {
      const res = await fetch(`https://${join(BASE_URL, categoryPath)}`, {mode: 'cors'});
      const json = await res.json();
      const { files, dirs } = splitDirsFiles(json.nodes);
      this.setState({category: categoryPath, categories: dirs, posts: files});
      this.state.postCache[categoryPath] = files;
      this.state.categoryCache[categoryPath] = dirs;
    }

    if (categoryPath === '/') {
      this.setState({
        parentCategories: [],
        parentPosts: [],
        parentCategory: '',
      });
      return;
    }

    const parentCategory = dirname(categoryPath);

    if (this.state.categoryCache[parentCategory] === undefined) {
      const res = await fetch(`https://${join(BASE_URL, parentCategory)}`, {mode: 'cors'});
      const json = await res.json();
      const {files, dirs} = splitDirsFiles(json.nodes);
      this.setState({parentCategory, parentCategories: dirs, parentPosts: files});
      this.state.categoryCache[parentCategory] = dirs;
      this.state.postCache[parentCategory] = files;
    } else {
      this.setState((state, _props) => ({
        parentCategory,
        parentCategories: state.categoryCache[parentCategory],
        parentPosts: state.postCache[parentCategory],
      }));
    }
  }

  /**
   * @param {string} post
   */
  relPost(post) {
    this.absPost(join(this.state.category, post));
  }

  /**
   * @param {string} category
   */
  relCategory(category) {
    this.absCategory(join(this.state.category, category));
  }

  /**
   * @returns {*}
   */
  render() {
    return (
      <div>
        <main className="container-fluid mt-0 mt-xl-5 mt-lg-5 mt-md-0 mt-sm-0 d-flex no-gutters flex-column flex-xl-row flex-lg-row flex-md-row flex-sm-column" style={{minHeight: '84vh'}}>
          <section className="col-xl-2 col-lg-2 d-none d-xl-block d-lg-block d-md-none d-sm-none">
            {this.state.parentCategories.length > 0
              ? this.state.parentCategory.length > 1 ?
                (
                  <div>
                    <h2 className="text-center mx-auto">
                      {fmtHeading(basename(this.state.parentCategory))}
                    </h2>
                    <hr/>
                  </div>
                )
                :
                (
                  <div>
                    <h1 className="text-center mx-auto display-4">Blog</h1>
                    <hr style={{maxWidth: '75%'}}/>
                  </div>
                )
              : false
            }
            {this.state.parentCategories.length > 0 && (
              <nav>
                {this.state.parentCategories.sort().map((c, idx) =>
                  <button onClick={() => this.relCategory(join('..', c))}
                          key={idx}
                          className={`d-block btn mx-auto w-75 ${this.state.category.endsWith(c) ? 'btn-warning' : 'btn-link'}`}>
                    {fmtHeading(c)}
                  </button>
                )}
              </nav>
            )}
            {this.state.parentCategories.length > 0 && this.state.parentPosts.length > 0 && <hr style={{maxWidth: '75%'}}/>}
            {this.state.parentPosts.length > 0 && (
              <div>
                <h3 className="text-center mt-3 mx-auto">Posts</h3>
                <nav>
                  {this.state.parentPosts.sort().map((post, idx) =>
                    <button onClick={() => this.relPost(post)}
                            key={idx}
                            className={`d-block btn mx-auto w-75 ${this.state.post.endsWith(post) ? 'btn-light' : 'btn-link'}`}>
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
                : <h2>{fmtHeading(basename(this.state.category))}</h2>
              }
            </div>
            {this.state.category !== '/' && (
              <button className="btn btn-light d-block w-50 mx-auto border"
                      onClick={() => this.absCategory(this.state.parentCategory)}>
                Back
              </button>
            )}
            {this.state.categories.length > 0 && (
              <nav>
                {this.state.categories.sort().map((c, idx) =>
                  <button onClick={() => this.relCategory(c)}
                          key={idx}
                          className='d-block btn mx-auto w-75 btn-link'>
                    {fmtHeading(c)}
                  </button>
                )}
              </nav>
            )}
            {this.state.categories > 0 && this.state.posts.length > 0 && <hr style={{maxWidth: '75%'}}/>}
            {this.state.posts.length > 0 && (
              <div>
                <h3 className="text-center mt-3 mx-auto">Posts</h3>
                <nav>
                  {this.state.posts.sort().map((post, idx) =>
                    <button onClick={() => this.relPost(post)}
                            key={idx}
                            className={`d-block btn w-75 mx-auto ${this.state.post.endsWith(post) ? 'btn-warning' : 'btn-link'}`}>
                      {fmtHeading(post)}
                    </button>
                  )}
                </nav>
              </div>
            )}
          </section>
          {this.state.postText && (
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

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();

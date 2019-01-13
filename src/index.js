/**
 * Case 1: Relative change of category.
 *  - press on a link
 * Case 2: Absolute change of category.
 *  - load a page
 * Case 3: Relative change of post.
 *  - press on a link
 * Case 4: Absolute change of post.
 *  - load a page
 */

import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import * as serviceWorker from './serviceWorker';
import {basename, dirname, isFile, join, splitDirsFiles} from './pathUtils';
import {randStep, fmtHeading} from './utils';

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
      // noinspection JSIgnoredPromiseFromCall
      this.absCategory(window.location.pathname === '' ? '/' : window.location.pathname);
    }
  }

  static postLoadProgress(num = 0) {
    const postArea = document.getElementById('post-text');
    if (postArea) {
      postArea.innerHTML = `
      <progress max="100" value="${num}" class="mx-auto d-block w-50" style="margin-top: 10vw"/>`;
    }
  }

  async absPost(postPath) {
    if (postPath === this.state.post) return;
    window.history.pushState({}, `post ${basename(postPath)}`, postPath);
    if (this.state.postTextCache[postPath]) {
      return this.setState((state, props) => ({
        post: postPath,
        postText: state.postTextCache[postPath],
      }));
    }

    const postTextP = fetch('https://' + join('blog-nl-api.herokuapp.com/api/posts', postPath), {mode: 'cors'})
        .then(res => res.json())
        .then(json => json.data);

    // "realistically" loading progress bar (purely visual)
    const step1 = randStep(15, 60);
    App.postLoadProgress(step1);
    const minWait = 35;
    return setTimeout(() => {
      App.postLoadProgress(step1 + randStep(15, 30));
      return setTimeout(() => {
        App.postLoadProgress(100);
        return setTimeout(async () => {
          const postText = await postTextP;
          this.state.postTextCache[postPath] = postText;
          this.setState({post: postPath, postText});
        }, randStep(minWait, 65));
      }, randStep(minWait, 65))
    }, randStep(minWait, 65));
  }

  async absCategory(categoryPath) {
    if (categoryPath === this.state.category) return;
    else if (categoryPath === '') categoryPath = '/';
    else if (categoryPath.length > 1 && categoryPath.endsWith('/')) {
      categoryPath = categoryPath.replace(/\/$/, '');
    }

    window.history.pushState(undefined, `category ${basename(categoryPath)}`, categoryPath);

    // try cache
    if (this.state.categoryCache[categoryPath] !== undefined) {
      this.setState((state, props) => ({
        category: categoryPath,
        categories: state.categoryCache[categoryPath],
        posts: state.postCache[categoryPath],
      }));
    } else {
      fetch(`https://${join('blog-nl-api.herokuapp.com/api/posts', categoryPath)}`, {mode: 'cors'})
          .then(res => res.json())
          .then(json => splitDirsFiles(json.nodes))
          .then(({files, dirs}) => {
            this.setState({category: categoryPath, categories: dirs, posts: files});
            this.state.postCache[categoryPath] = files;
            this.state.categoryCache[categoryPath] = dirs;
          });
    }

    if (categoryPath === '/') {
      return this.setState({
        parentCategories: [],
        parentPosts: [],
        parentCategory: '',
      });
    }

    const parentCategory = dirname(categoryPath);

    // try cache
    return this.state.categoryCache[parentCategory] === undefined
        ? fetch(`https://${join('blog-nl-api.herokuapp.com/api/posts', parentCategory)}`, {mode: 'cors'})
            .then(res => res.json())
            .then(json => splitDirsFiles(json.nodes))
            .then(({files, dirs}) => {
              this.setState({parentCategory, parentCategories: dirs, parentPosts: files});
              this.state.categoryCache[parentCategory] = dirs;
              this.state.postCache[parentCategory] = files;
            })
        : this.setState((state, props) => ({
          parentCategory,
          parentCategories: state.categoryCache[parentCategory],
          parentPosts: state.postCache[parentCategory],
        }));
  }

  async relPost(post) {
    return this.absPost(join(this.state.category, post));
  }

  async relCategory(category) {
    return this.absCategory(join(this.state.category, category));
  }

  render() {
    return (
        <div>
          <header className="bg-light border-bottom py-xl-2 py-lg-2 py-md-1 py-sm-1">
            <button onMouseOver={() => {
              const el = document.querySelector('header > button');
              // el.classList.add('text-warning');
              el.style.textShadow = '0 0 8px darkgrey';
            }} onMouseOut={() => {
              const el = document.querySelector('header > button');
              // el.classList.remove('text-warning');
              el.style.textShadow = 'inherit';
            }} onClick={() => this.absCategory('/')} className="d-block mx-auto my-0 p-0 h1 btn" style={{fontSize: '2.6rem'}}>
              Blog
            </button>
          </header>
          <main className="container-fluid mt-0 mt-xl-5 mt-lg-5 mt-md-0 mt-sm-0 d-flex no-gutters flex-column flex-xl-row flex-lg-row flex-md-row flex-sm-column" style={{minHeight: '75vh'}}>
            <section className="col-xl-2 col-lg-2 d-none d-xl-block d-lg-block d-md-none d-sm-none">
              {this.state.parentCategories.length > 0
                  ? this.state.parentCategory.length > 1 ?
                      (
                          <div>
                            <h2 className="text-center">{fmtHeading(basename(this.state.parentCategory))}</h2>
                            <hr/>
                          </div>
                      )
                      : <h2 className="text-center">Category</h2>
                  : false
              }
              {this.state.parentCategories.length > 0 && (
                  <nav>
                    {this.state.parentCategories.map((c, idx) =>
                        <button onClick={() => this.relCategory(join('..', c))} key={idx} className={`d-block btn mx-auto w-75 ${this.state.category.endsWith(c) ? 'btn-warning' : 'btn-link'}`}>
                          {fmtHeading(c)}
                        </button>
                    )}
                  </nav>
              )}
              {this.state.parentCategories.length > 0 && this.state.parentPosts.length > 0 && <hr style={{maxWidth: '75%'}}/>}
              {this.state.parentPosts.length > 0 && (
                  <div>
                    <h2 className="text-center mt-3">Posts</h2>
                    <nav>
                      {this.state.parentPosts.map((post, idx) =>
                          <button onClick={() => this.relPost(post)} key={idx} className={`d-block btn mx-auto w-75 ${this.state.post.endsWith(post) ? 'btn-light' : 'btn-link'}`}>
                            {fmtHeading(post)}
                          </button>
                      )}
                    </nav>
                  </div>
              )}
            </section>
            <section className="col-xl-2 col-lg-2 col-md-3 col-sm-12 my-4 my-xl-0 my-lg-0 my-md-4 my-sm-4">
              <h2 className="text-center col">
                {this.state.category === '/'
                    ? 'Category'
                    : fmtHeading(basename(this.state.category))
                }
              </h2>
              {this.state.category !== '/' && (
                  <button className="btn btn-light d-block w-50 mx-auto" onClick={() => this.absCategory(this.state.parentCategory)}>
                    Back
                  </button>
              )}
              {this.state.categories.length > 0 && (
                  <nav>
                    {this.state.categories.map((c, idx) =>
                        <button onClick={() => this.relCategory(c)} key={idx}
                                className='d-block btn mx-auto w-75 btn-link'>
                          {fmtHeading(c)}
                        </button>
                    )}
                  </nav>
              )}
              {this.state.categories > 0 && this.state.posts.length > 0 && <hr style={{maxWidth: '75%'}}/>}
              {this.state.posts.length > 0 && (
                  <div>
                    <h2 className="text-center mt-3">Posts</h2>
                    <nav>
                      {this.state.posts.map((post, idx) =>
                          <button onClick={() => this.relPost(post)} key={idx} className={`d-block btn w-75 mx-auto ${this.state.post.endsWith(post) ? 'btn-warning' : 'btn-link'}`}>
                            {fmtHeading(post)}
                          </button>
                      )}
                    </nav>
                  </div>
              )}
            </section>
            <section className="col-xl col-lg col-md-9 col-sm-12">
              <div id="post-text" dangerouslySetInnerHTML={{__html: this.state.postText}} className="my-4 my-xl-0 my-lg-0 my-md-4 my-sm-4"/>
            </section>
            {this.state.postText ?
                (
                    <section className="col-xl-1 col-lg-1 d-none d-xl-block d-lg-block d-md-none d-sm-none mx-xl-3 mx-lg-2">
                      <h3>Info</h3>
                      <p className="mb-1">{Math.ceil(this.state.postText.length / 650)} min read</p>
                      <p className="mb-1">{this.state.postText.split(/( |\r\n|\n|\r|\t)+/).length} words</p>
                      <p>{this.state.postText.match(/\.(\s+|\s*$)|\S{8,}[ \t]*(\n|\r\n|\r){2,}/gm).length} sentences</p>
                    </section>
                )
                : <div className="col-xl-1 col-lg-1 d-none d-xl-block d-lg-block d-md-none d-sm-none"/>
            }
          </main>
          <footer className="py-4 bg-light d-none d-xl-block d-lg-block d-md-none d-sm-none border-top mt-xl-3 mt-1 mt-lg-3 mt-md-1 mt-sm-1">
            <div className="row mx-auto mt-2 mb-4" style={{maxWidth: '360px'}}>
              <div className="col"><a href="https://www.linkedin.com/in/norbert-logiewa" className="btn btn-sm btn-secondary">LinkedIn</a></div>
              <div className="col"><a href="https://github.com/nl253" className="btn btn-sm btn-secondary">GitHub</a></div>
              <div className="col"><a href="https://docs.google.com/document/d/1I94ZHc_75a2ivyjcDXjESIrGYPmJUriTm3xmEkcwaeI/edit?usp=sharing" className="btn btn-sm btn-secondary">CV</a></div>
              <div className="col"><a href="https://portfolio-nl.herokuapp.com" className="btn btn-sm btn-secondary">Portfolio</a></div>
            </div>
            <p className="text-center">Copyright &copy; Norbert Logiewa {this.year}</p>
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

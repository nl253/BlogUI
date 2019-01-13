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
          <header className="container-fluid bg-light"
                  style={{padding: '0 19vw'}}>
            <button onMouseOver={() => {
              const el = document.querySelector('header > button');
              // el.classList.add('text-warning');
              el.style.textShadow = '0 0 8px darkgrey';
            }} onMouseOut={() => {
              const el = document.querySelector('header > button');
              // el.classList.remove('text-warning');
              el.style.textShadow = 'inherit';
            }} onClick={() => this.absCategory('/')} className="d-block mx-auto h1 btn btn-lg" style={{fontSize: '3rem'}}>
              Blog
            </button>
          </header>
          <main className="container-fluid mt-0 mt-xl-5 mt-lg-5 mt-md-0 mt-sm-0 d-flex no-gutters flex-column flex-xl-row flex-lg-row flex-md-column flex-sm-column" style={{minHeight: '75vh'}}>
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
                        <button onClick={() => this.relCategory(join('..', c))} key={idx} className={`d-block btn mx-auto ${this.state.category.endsWith(c) ? 'btn-warning' : 'btn-link'}`}>
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
                          <button onClick={() => this.relPost(post)} key={idx} className={`d-block btn mx-auto ${this.state.post.endsWith(post) ? 'btn-light' : 'btn-link'}`}>
                            {fmtHeading(post)}
                          </button>
                      )}
                    </nav>
                  </div>
              )}
            </section>
            {this.state.category !== '/' && (
                <div className="col-xl-1 col-lg-1 col d-xl-block d-lg-block d-md-block d-sm-block mt-2 mt-xl-5 mt-lg-5 mt-md-2 mt-sm-2" style={{flexBasis: '50px'}}>
                  <button className="btn mx-auto d-block" onClick={() => this.absCategory(this.state.parentCategory)} style={{fontSize: '50px', color: 'darkgrey'}}>
                    🡄
                  </button>
                </div>
            )}
            <section className="col-xl-2 col-lg-2 col-md-12 col-sm-12 mb-4 mb-xl-0 mb-lg-0 mb-sm-4 mb-md-4">
              <h2 className="text-center col">
                {this.state.category === '/'
                    ? 'Category'
                    : <div>{fmtHeading(basename(this.state.category))}<br/><hr/></div> }
              </h2>
              {this.state.categories.length > 0 && (
                  <nav>
                    {this.state.categories.map((c, idx) =>
                        <button onClick={() => this.relCategory(c)} key={idx}
                                className='d-block btn mx-auto btn-link'>
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
                          <button onClick={() => this.relPost(post)} key={idx} className={`d-block btn mx-auto ${this.state.post.endsWith(post) ? 'btn-warning' : 'btn-link'}`}>
                            {fmtHeading(post)}
                          </button>
                      )}
                    </nav>
                  </div>
              )}
            </section>
            <section className="col-xl col-lg col-md-12 col-sm-12">
              <div id="post-text" dangerouslySetInnerHTML={{__html: this.state.postText}}/>
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
          <hr style={{maxWidth: '75vw'}}/>
          <footer className="text-center pb-4">
            Copyright &copy; Norbert Logiewa {this.year}
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

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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      categories: [],
      category: '',
      posts: [],
      post: '',
      postText: '',
    };
    this._fileEndRegex = /\.[^.]{2,7}\s*$/;
    this._dirnameRegex = /(.*)\/[^/]+$/;
    this._relativeRegex = /^\.\//;
    this._basenameRegex = /\/([^/]*)$/;
    this._headingDelimRegex = /[-_]/g;
    this._redundantSlashRegex = /\/{2,}|\/\.\//;
    this.dirname = this.dirname.bind(this);
    this.basename = this.basename.bind(this);
    this.isFile = this.isFile.bind(this);
    this.isDir = this.isDir.bind(this);
    this.join = this.join.bind(this);
    this.absCategory = this.absCategory.bind(this);
    this.absPost = this.absPost.bind(this);
    this.relCategory = this.relCategory.bind(this);
    this.relPost = this.relPost.bind(this);
    if (window.location.pathname.match(this._fileEndRegex)) {
      // noinspection JSIgnoredPromiseFromCall
      this.absCategory(this.dirname(window.location.pathname));
      // noinspection JSIgnoredPromiseFromCall
      this.absPost(window.location.pathname);
    } else {
      // noinspection JSIgnoredPromiseFromCall
      this.absCategory(window.location.pathname);
    }
  }

  dirname(path) {
    console.log(`running dirname on "${path}" ...`);
    if (path === '/') return path;
    else {
      const match = this._dirnameRegex.exec(path);
      return match[1];
    }
  }

  basename(path) {
    return this._basenameRegex.exec(path)[1];
  }

  isFile(path) {
    return path.match(this._fileEndRegex);
  }

  isDir(path) {
    return !this.isFile(path);
  }

  join(...pathParts) {
    return pathParts.join('/')
        .replace(this._relativeRegex, this.state.category + '/')
        .replace(this._redundantSlashRegex, '/');
  }

  fmtHeading(heading) {
    return heading.replace(this._headingDelimRegex, ' ')
        .split(' ')
        .map(word => word.length < 3 ? word : word[0].toUpperCase() + word.slice(1))
        .join(' ').replace(this._fileEndRegex, '');
  }

  postLoadProgress(num) {
    const postArea = document.getElementById('post-text');
    if (!postArea) return;
    postArea.innerHTML = `
      <progress max="100" value="${num}" class="mx-auto d-block w-50" style="margin-top: 10vw"/>
    `;
  }

  randStep() {
    return Math.round(Math.random() * 40);
  }

  async absPost(postPath) {
    if (postPath === this.state.post) return;
    window.history.pushState({}, `post ${this.basename(postPath)}`, postPath);
    const p1 = this.randStep();
    this.postLoadProgress(p1);
    const url = 'https://' + this.join('blog-nl-api.herokuapp.com/api/posts', postPath);
    const postTextProm = fetch(url, {mode: 'cors'})
          .then(res => res.json())
          .then(json => json.data);
    return setTimeout(() => {
      const p2 = p1 + this.randStep();
      this.postLoadProgress(p2);
      return setTimeout(() => {
        this.postLoadProgress(100);
        return setTimeout(async () => this.setState({
          post: postPath,
          postText: await postTextProm,
        }), 35 + this.randStep());
      }, 35 + this.randStep())
    }, 35 + this.randStep());
  }

  async absCategory(categoryPath) {
    if (categoryPath === this.state.category) {
      return;
    } else if (categoryPath === '') {
      categoryPath = '/';
    } else if (categoryPath.length > 0 && categoryPath.endsWith('/')) {
      categoryPath = categoryPath.replace(/\/$/, '');
    }
    window.history.pushState({}, `category ${this.basename(categoryPath)}`, categoryPath);
    if (categoryPath === '') categoryPath = '/';
    const url = 'https://' + this.join('blog-nl-api.herokuapp.com/api/posts', categoryPath);
    console.warn(url);
    const nodes = await fetch(url, {mode: 'cors'})
        .then(res => res.json())
        .then(json => json.nodes);
    this.setState({
      category: categoryPath,
      categories: nodes.filter(this.isDir),
      posts: nodes.filter(this.isFile),
    });
  }

  async relPost(post) {
    return this.absPost(this.join('.', post));
  }

  async relCategory(category) {
    return this.absCategory(this.join('.', category));
  }

  render() {
    return (
        <div>
          <header className="container-fluid bg-light"
                  style={{padding: '5px 19vw'}}>
            <button onMouseOver={() => document.querySelector('header > button').style.borderBottom = '2px solid #c83ec8'} onMouseOut={() => document.querySelector('header > button').style.borderBottom = 'none'} onClick={() => this.absCategory('/')} className="d-block mx-auto h1 btn btn-lg" style={{fontSize: '2rem'}}>
              Blog
            </button>
          </header>
          <main className="container-fluid column mt-5 row"
                style={{minHeight: '75vh'}}>
            <div className="col-2"/>
            <section className="col-2">
              {this.state.category !== '/' && this.state.category !== '' &&
                <button className="d-block btn btn-light btn-sm mx-auto mb-4"
                        onClick={() => this.absCategory(this.dirname(this.state.category))}
                        style={{maxWidth: '100px'}}><i className="fas fa-arrow-left mr-2"/>Back</button>}
              <h2 className="text-center col">
                {this.state.category === '/' || this.state.category === ''
                    ? 'Categories'
                    : <div>{this.fmtHeading(this.basename(this.state.category))}<br/><hr/></div> }
              </h2>
              {this.state.categories.length > 0 && (
                  <nav>
                    {this.state.categories.map((category, idx) =>
                        <button onClick={() => this.relCategory(category)} key={idx}
                                className="d-block btn btn-link mx-auto">
                          {this.fmtHeading(category)}
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
                          <button onClick={() => this.relPost(post)} key={idx} className="d-block btn btn-link mx-auto">
                            {this.fmtHeading(post)}
                          </button>
                      )}
                    </nav>
                  </div>
              )}
            </section>
            <section className="col-6">
              {this.state.category !== '/' && this.state.category.split('/').filter(part => part.length > 0).length > 1 &&
              <nav aria-label="breadcrumb" className="bg-white">
                <ol className="breadcrumb bg-light">
                  {
                    (
                        this.state.category.endsWith('/') && this.state.category.length > 0
                            ? this.state.category.replace(/\/$/, '')
                            : this.state.category
                    ).split('/').map((part, idx) => <li key={idx} className="breadcrumb-item"><a className="h6">{part}</a></li>)
                  }
                </ol>
              </nav>
              }
              <div id="post-text" dangerouslySetInnerHTML={{__html: this.state.postText}}/>
            </section>
            <div className="col-2"/>
          </main>
          <hr style={{maxWidth: '75vw'}}/>
          <footer className="text-center pb-4">
            Copyright &copy; Norbert Logiewa {new Date(Date.now()).getFullYear()
              .toString()}
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

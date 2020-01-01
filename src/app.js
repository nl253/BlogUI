/* eslint-disable no-console */
import React, { Component } from 'react';

import { Spinner } from 'reactstrap';
import { basename, dirname, join } from 'path-browserify';

import bannedWords from './bannedWords';
import {
  callCompromiseApi,
  callNaturalApi,
  define,
  getBlogData,
  getPostHTML,
} from './api';
import { findAllMatches, isFile, isObjectEmpty } from './utils';

import Footer from './footer';
import WordDefinition from './wordDefinition';
import NLPInfo from './NLPInfo';
import Title from './title';
import TitleMiddle from './titleMiddle';
import ParentCategories from './parentCategories';
import Categories from './categories';
import ParentPosts from './parentPosts';
import Posts from './posts';

export default class App extends Component {
  constructor(props) {
    super(props);
    this.bannedWords = new Set(bannedWords);
    this.author = 'Norbert Logiewa';
    this.naturalApiRequests = ['sentiment'];
    this.compromiseApiRequests = [
      'places', 'organizations', 'topics', 'people',
    ];
    this.state = {
      data: {
        trees: {},
        blobs: {},
      },
      category: '/',
      word: null,
      definition: null,
      post: null,
      postText: '',
      _loading: [],
      ...Object.fromEntries(this.naturalApiRequests.map((e) => [e, null])),
      ...Object.fromEntries(this.compromiseApiRequests.map((e) => [e, []])),
    };
    this.clearDefinition = this.clearDefinition.bind(this);
    this.absCategory = this.absCategory.bind(this);
    this.absPost = this.absPost.bind(this);
  }

  /**
   * @returns {Promise<void>}
   */
  async componentDidMount() {
    this.beginLoading('data');
    try {
      this.setState({
        data: await getBlogData(),
      });
      const path = window.location.pathname;
      if (isFile(path)) {
        this.absPost(path);
      } else if (path === '/') {
        const postNames = Object.keys(this.state.data.blobs);
        let randPost;
        do {
          randPost = postNames[Math.floor(Math.random() * postNames.length)];
        } while ([...randPost].filter((s) => s === '/').length > 2);
        console.warn(`opening random post ${randPost}`);
        this.absPost(randPost);
      } else {
        this.absCategory(path);
      }
    } catch (e) {
      console.error(e);
    }
    this.endLoading('data');
    window.onpopstate = async ({ state: { category, post } }) => {
      if (post) {
        await this.absPost(post, false);
      }
      if (category) {
        await this.absCategory(category, false);
      }
    };
  }

  /**
   * @returns {string}
   */
  get parentCategory() {
    const { category } = this.state;
    return category === '/' ? '/' : dirname(category);
  }

  /**
   * @returns {string[]}
   */
  get parentPosts() {
    const { state: { category, data: { blobs } }, parentCategory } = this;
    if (category === '/') {
      return [];
    }
    const cat = parentCategory;
    return Object
      .keys(blobs)
      .filter((path) => dirname(path) === cat)
      .map((path) => basename(path));
  }

  /**
   * @returns {string[]}
   */
  get parentCategories() {
    const { state: { category, data: { trees } } } = this;
    if (category === '/') {
      return [];
    }
    const cat = this.parentCategory;
    return Object
      .keys(trees)
      .filter((path) => dirname(path) === cat)
      .map((path) => basename(path));
  }

  /**
   * @returns {string[]}
   */
  get posts() {
    const { state: { category, data: { blobs } } } = this;
    return Object
      .keys(blobs)
      .filter((path) => dirname(path) === category)
      .map((path) => basename(path));
  }

  /**
   * @returns {string[]}
   */
  get categories() {
    const { state: { category, data: { trees } } } = this;
    return Object
      .keys(trees)
      .filter((path) => dirname(path) === category)
      .map((path) => basename(path));
  }

  /**
   * @param {string} newPost
   * @param {boolean} [saveHistory]
   * @returns {Promise<void>}
   */
  async absPost(newPost, saveHistory = true) {
    const { state: { category, post, data: { blobs } } } = this;
    if (category === dirname(newPost) && post === basename(newPost)) {
      return;
    }
    this.beginLoading('postText');
    if (saveHistory) {
      window.history.pushState({ post: newPost, category }, `Blog - post "${basename(newPost)}"`, newPost);
    }
    this.setState({
      category: dirname(newPost),
      post: basename(newPost),
      postText: '',
    });
    try {
      const postText = await getPostHTML(blobs[newPost]);
      this.setState({ postText });
      this.endLoading('postText');
      if (this.state.postText) {
        await this.initPostText(App.getPostBody());
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * @param {string} postBody
   * @returns {Promise<void>}
   */
  async initPostText(postBody) {
    for (const type of this.naturalApiRequests.concat(this.compromiseApiRequests)) {
      this.beginLoading(type);
    }
    for (const type of this.compromiseApiRequests) {
      this.setState({ [type]: [] });
    }
    for (const type of this.naturalApiRequests) {
      this.setState({ [type]: null });
    }
    const p = Promise.all([
      ...this.naturalApiRequests.map(async (type) => {
        const { post: p2, category } = this.state;
        try {
          const newState = await callNaturalApi(p2, category, postBody, type);
          if (newState) {
            this.setState({
              // eslint-disable-next-line react/no-access-state-in-setstate
              [type]: newState,
            });
          }
          // eslint-disable-next-line no-empty
        } catch (e) {} finally {
          this.endLoading(type);
        }
      }),
      ...this.compromiseApiRequests.map(async (type) => {
        const { post: p2, category } = this.state;
        try {
          const newState = await callCompromiseApi(p2, category, postBody, type);
          if (newState && newState.length > 0) {
            this.setState({
              // eslint-disable-next-line react/no-access-state-in-setstate
              [type]: newState,
            });
          }
          // eslint-disable-next-line no-empty
        } catch (e) {} finally {
          this.endLoading(type);
        }
      }),
    ]);
    this.makeClickable('#post-text p, #post-text li');
    this.registerDefinitionsOnWordClick('#post-text p .word, #post-text li .word');
    this.fixImgSrc();
    await p;
  }

  /**
   * @param {string} selector
   */
  makeClickable(selector) {
    const nodes = document.querySelectorAll(selector);
    for (const n of nodes) {
      for (const child of n.childNodes) {
        if (child.nodeName === '#text') {
          const matches = findAllMatches(child.nodeValue, /([a-z]{2,})/gi);
          for (const w of new Set(matches)) {
            if (!this.bannedWords.has(w)) {
              const regExp = new RegExp(`\\b${w}\\b`, 'gi');
              const replaceValue = `<button class="word">${w}</button>`;
              n.innerHTML = n.innerHTML.replace(regExp, replaceValue);
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
          this.setState({ word, definition: 'definition not found' });
        } finally {
          this.endLoading('word');
        }
      });
    }
  }

  fixImgSrc() {
    const { state: { category } } = this;
    for (const img of document.querySelectorAll('img[src]')) {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http')) {
        const value = join(process.env.REACT_APP_ASSETS_ROOT, category.substr(1), src);
        img.setAttribute('src', value);
      }
    }
  }

  /**
   * @param {string} what
   */
  beginLoading(what) {
    this.setState(({ _loading }) => ({ _loading: [..._loading, what] }));
  }

  /**
   * @param {string} what
   */
  endLoading(what) {
    this.setState(({ _loading }) => {
      for (let i = 0; i < _loading.length; i += 1) {
        if (_loading[i] === what) {
          return {
            _loading: _loading.slice(0, i).concat(_loading.slice(i + 1)),
          };
        }
      }
      return {};
    });
  }

  /**
   * @param {string} item
   * @returns {boolean}
   */
  didLoad(...item) {
    const { _loading } = this.state;
    return item.reduce((prev, focus) => prev && _loading.indexOf(focus) < 0, true);
  }

  /**
   * @param {string} newCategory
   * @param {boolean} [saveHistory]
   */
  absCategory(newCategory, saveHistory = true) {
    const { state: { category, post } } = this;
    if (category !== newCategory) {
      if (newCategory === '') {
        this.absCategory('/');
      } else if (newCategory.length > 1 && newCategory.endsWith('/')) {
        this.absCategory(newCategory.replace(/\/$/, ''));
      } else {
        const title = `Blog - category "${basename(newCategory)}"`;
        if (saveHistory) {
          window.history.pushState({ category: newCategory, post }, title, newCategory);
        }
        this.setState({ category: newCategory });
      }
    }
  }

  /**
   * @param {boolean} [slice]
   * @returns {string}
   */
  static getPostBody(slice = true) {
    const s = [...document.getElementById('post-text').querySelectorAll('p')].map((p) => p.innerText).join('\n');
    return slice ? s.slice(0, 10000) : s;
  }

  clearDefinition() {
    this.setState({ word: null, definition: null });
  }

  /**
   * @returns {*}
   */
  render() {
    const {
      absCategory,
      absPost,
      author,
      categories,
      clearDefinition,
      compromiseApiRequests,
      didLoad,
      naturalApiRequests,
      parentCategories,
      parentCategory,
      parentPosts,
      posts,
      state,
    } = this;
    const {
      definition, category, post, word, postText, data: { trees },
    } = state;
    return (
      <div hidden={isObjectEmpty(trees)}>
        <WordDefinition
          word={word}
          definition={definition}
          clearDefinition={clearDefinition}
        />
        <main
          className="container-fluid mt-0 mt-xl-5 mt-lg-5 mt-md-0 mt-sm-0 d-flex no-gutters flex-column flex-xl-row flex-lg-row flex-md-row flex-sm-column"
          style={{ minHeight: '84vh' }}
        >
          <section
            className="col-xl-2 col-lg-2 d-xl-block d-lg-block d-md-none d-sm-none d-none"
          >
            <Title
              parentCategory={parentCategory}
              parentCategories={parentCategories}
            />
            <ParentCategories
              absCategory={absCategory}
              category={category}
              parentCategories={parentCategories}
              parentCategory={parentCategory}
            />
            <ParentPosts
              parentCategory={parentCategory}
              parentPosts={parentPosts}
              parentCategories={parentCategories}
              post={post}
              absPost={absPost}
            />
          </section>
          <section
            className="col-xl-2 col-lg-2 col-md-3 col-sm-12 my-4 my-xl-0 my-lg-0 my-md-4 my-sm-4"
          >
            <div className="text-center col mx-auto">
              <TitleMiddle
                parentCategory={parentCategory}
                category={category}
                absCategory={absCategory}
              />
            </div>
            <Categories
              absCategory={absCategory}
              category={category}
              categories={categories}
            />
            <Posts
              categories={categories}
              category={category}
              absPost={absPost}
              post={post}
              posts={posts}
            />
          </section>
          <section
            hidden={!postText}
            className="col-xl-8 col-lg-8 col-md-9 col-sm-12 container-fluid row justify-content-around"
          >
            <div className="col-xl-1 col-lg-1 d-xl-block d-lg-block d-md-none d-sm-none d-none" />
            <section className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div
                id="post-text"
                dangerouslySetInnerHTML={{ __html: postText }}
                className="my-4 my-xl-0 my-lg-0 my-md-4 my-sm-4"
              />
            </section>
            <div className="col-xl-1 col-lg-1 d-xl-block d-lg-block d-md-none d-sm-none d-none" />
            <section className="col-xl-1 col-lg-1 d-xl-block d-lg-block d-md-none d-sm-none d-none">
              <NLPInfo
                postText={postText}
                compromiseApiRequests={compromiseApiRequests}
                naturalApiRequests={naturalApiRequests}
                state={state}
              />
            </section>
            <div className="col-xl-1 col-lg-1 d-xl-block d-lg-block d-md-none d-sm-none" />
          </section>
          <div
            hidden={postText || didLoad.call(this, 'postText')}
            className="mx-auto my-auto"
          >
            <Spinner style={{ width: '3rem', height: '3rem' }} />
          </div>
        </main>
        <Footer author={author} />
      </div>
    );
  }
}

import { basename, join } from 'path-browserify';
import { parser, lexer } from 'marked';
import CACHE from 'localforage';


/**
 * @typedef Item
 * @property {string} sha
 * @property {string} path
 */

/**
 * @typedef {Item} ItemRaw
 * @property {string} url
 * @property {string} mode
 * @property {number} size
 * @property {'blob'|'tree'} type
 */

import { isDotFile, isFile } from './utils';

const MAX_FILE_SIZE = 5000;

const RUNNING_REQUESTS = {
  data: undefined,
  define: undefined,
  people: undefined,
  places: undefined,
  organizations: undefined,
  topics: undefined,
  mdToHtml: undefined,
};

/**
 * @returns {Promise<{blobs: Array<Item>, trees: Array<Item>}|null>}
 */
const getBlogData = async () => {
  const req = RUNNING_REQUESTS.data;
  if (req !== undefined) {
    req.abort();
    delete RUNNING_REQUESTS.data;
  }
  try {
    const result = await CACHE.getItem('data');
    if (result !== null) {
      return result;
    }
    throw new Error('could not get cached blog data');
  } catch (e) {
    console.error(e);
    const controller = new AbortController();
    RUNNING_REQUESTS.data = controller;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_ROOT}/trees/master?recursive=1`, {
        mode: 'cors',
        signal: controller.signal,
        headers: {
          Accept: 'application/json, *',
          Authorization: process.env.REACT_APP_AUTHORIZATION,
        },
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.body));
      }
      let { tree } = await res.json();
      tree = tree.filter((n) => !isDotFile(n.path)).map((n) => ({ ...n, path: `/${n.path}` })).sort((a, b) => basename(a.path).localeCompare(basename(b.path)));
      const result = {
        trees: Object.fromEntries(
          tree
            .filter((n) => n.type === 'tree' && basename(n.path).indexOf('.') < 0)
            .map(({ url, mode, ...rest }) => rest)
            .map(({ path, sha }) => [path, sha]),
        ),
        blobs: Object.fromEntries(
          tree
            .filter((n) => n.type === 'blob' && isFile(n.path) && n.size <= MAX_FILE_SIZE)
            .map(({
              type,
              url,
              mode,
              size,
              ...rest
            }) => rest)
            .map(({ path, sha }) => [path, sha]),
        ),
      };
      delete RUNNING_REQUESTS.data;
      await CACHE.setItem('data', result);
      return result;
    } catch (e2) {
      delete RUNNING_REQUESTS.data;
      console.error(e2);
      throw e2;
    }
  }
};

const mdToHtmlLocally = (md) => parser(lexer(md));

/**
 * @param {Array<*>} xs
 * @returns {Array<*>}
 */
const unique = (xs) => [...new Set(xs)];

/**
 * @param {string} post
 * @param {string} category
 * @param {string} postText
 * @param {'places'|'organizations'|'topics'|'people'} type
 * @returns {Promise<*>}
 */
const callCompromiseApi = async (post, category, postText, type) => {
  const req = RUNNING_REQUESTS[type];
  if (req !== undefined) {
    req.abort();
    delete RUNNING_REQUESTS[type];
  }
  const postPath = join(category, post);
  const cacheKey = `${type}::${postPath}`;
  try {
    const result = await CACHE.getItem(cacheKey);
    if (result !== null) {
      return result;
    }
    throw new Error(`could not get cached ${type} for post ${post} in category ${category}`);
  } catch (e) {
    console.warn(e);
    const controller = new AbortController();
    RUNNING_REQUESTS[type] = controller;
    try {
      const res = await fetch(
        `${process.env.REACT_APP_NLP_API_ROOT}/${type}`, {
          method: 'post',
          mode: 'cors',
          signal: controller.signal,
          body: postText,
          headers: {
            Authorization: process.env.REACT_APP_NLP_AUTHORIZATION,
            Accept: 'application/json, *',
            'Content-Type': 'application/json',
          },
        },
      );
      if (!res.ok) {
        throw new Error(JSON.stringify(res.body));
      }
      const words = await res.json();
      const regex = /^[0-9&,.a-z]{2,}$/i;
      const result = unique(words.filter((w) => w.split(/\s+/g).reduce((ok, word) => ok && word.search(regex) >= 0, true)));
      await CACHE.setItem(cacheKey, result);
      delete RUNNING_REQUESTS[type];
      return result;
    } catch (e2) {
      delete RUNNING_REQUESTS[type];
      console.error(e2);
      await CACHE.removeItem(cacheKey);
      throw e2;
    }
  }
};

/**
 * @param {string} post
 * @param {string} category
 * @param {string} postText
 * @param {'distance'|'match'|'sentiment'|'stem'|'tokenize'|'tokenizeAndStem'} action
 */
const callNaturalApi = async (post, category, postText, action) => {
  const postPath = join(category, post);
  const cacheKey = `${action}::${postPath}`;
  const req = RUNNING_REQUESTS[action];
  if (req !== undefined) {
    req.abort();
    delete RUNNING_REQUESTS[action];
  }
  try {
    const result = await CACHE.getItem(cacheKey);
    if (result !== null) {
      return result;
    }
    throw new Error(`could not get cached ${action} for post ${post} in category ${category}`);
  } catch (e) {
    console.warn(e);
    const controller = new AbortController();
    RUNNING_REQUESTS[action] = controller;
    try {
      const res = await fetch(`${process.env.REACT_APP_NLP_API_ROOT}/natural`, {
        mode: 'cors',
        signal: controller.signal,
        body: JSON.stringify({ text: postText, action }),
        method: 'post',
        headers: {
          Authorization: process.env.REACT_APP_NLP_AUTHORIZATION,
          Accept: 'application/json, *',
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.body));
      }
      const result = await res.json();
      await CACHE.setItem(cacheKey, result);
      delete RUNNING_REQUESTS[action];
      return result;
    } catch (e2) {
      console.error(e2);
      await CACHE.removeItem(cacheKey);
      delete RUNNING_REQUESTS[action];
      throw e2;
    }
  }
};

/**
 * @param {string} word
 * @returns {Promise<string>}
 */
const define = async (word) => {
  const req = RUNNING_REQUESTS.define;
  if (req !== undefined) {
    req.abort();
    delete RUNNING_REQUESTS.define;
  }
  const cacheKey = `define::${word}`;
  try {
    const result = await CACHE.getItem(cacheKey);
    if (result !== null) {
      return result;
    }
    throw new Error(`could not get cached word definition for ${word}`);
  } catch (e) {
    console.warn(e);
    const controller = new AbortController();
    RUNNING_REQUESTS.define = controller;
    try {
      const res = await fetch(`${process.env.REACT_APP_NLP_API_ROOT}/define/${word}`, {
        mode: 'cors',
        signal: controller.signal,
        headers: {
          Authorization: process.env.REACT_APP_NLP_AUTHORIZATION,
          Accept: 'text/plain, *',
        },
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.body));
      }
      const result = await res.text();
      await CACHE.setItem(cacheKey, result);
      delete RUNNING_REQUESTS.define;
      return result;
    } catch (e2) {
      console.error(e2.message);
      await CACHE.removeItem(cacheKey);
      delete RUNNING_REQUESTS.define;
      throw e2;
    }
  }
};

/**
 * @param {string} sha
 * @returns {Promise<string>}
 */
const getPostHTML = async (sha) => {
  const cacheKey = `postText::${sha}`;
  const req = RUNNING_REQUESTS.postText;
  if (req !== undefined) {
    req.abort();
    delete RUNNING_REQUESTS.postText;
  }
  try {
    const result = await CACHE.getItem(cacheKey);
    if (result !== null) {
      return result;
    }
    throw new Error(`could not get cached post HTML for post with SHA ${sha}`);
  } catch (e) {
    console.warn(e);
    const controller = new AbortController();
    RUNNING_REQUESTS.postText = controller;
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_ROOT}/blobs/${sha}`, {
          mode: 'cors',
          signal: controller.signal,
          headers: {
            Authorization: process.env.REACT_APP_AUTHORIZATION,
            Accept: 'application/json, *',
          },
        },
      );
      if (!res.ok) {
        throw new Error(JSON.stringify(res.body));
      }
      const json = await res.json();
      const markdown = json.encoding === 'base64'
        ? atob(json.content)
        : json.content;
      const result = mdToHtmlLocally(markdown);
      await CACHE.setItem(cacheKey, result);
      delete RUNNING_REQUESTS.postText;
      return result;
    } catch (e2) {
      console.error(e2);
      delete RUNNING_REQUESTS.postText;
      throw e2;
    }
  }
};

export {
  getBlogData,
  callCompromiseApi,
  callNaturalApi,
  define,
  mdToHtmlLocally,
  getPostHTML,
};

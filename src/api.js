import { basename, join } from 'path-browserify';
import { lexer, parser } from 'marked';
import CACHE from 'localforage';
import { isDotFile, isFile } from './utils';


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

const MAX_FILE_SIZE = 5000;

const RUNNING_REQUESTS = {};

/**
 * @returns {Promise<{blobs: Item[], trees: Item[]}|null>}
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
    console.debug(e);
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

// /**
//  * @param {Array<*>} xs
//  * @returns {Array<*>}
//  */
// const unique = (xs) => [...new Set(xs)];


/**
 * @param {string} post
 * @param {string} category
 * @param {string} payload
 * @param {'places'|'organizations'|'topics'|'people'|'sentiment'|'tokenize'} cmd
 * @param {string} mime
 * @returns {Promise<*>}
 */
const callNlpApi = async (post, category, payload, cmd, mime) => {
  const req = RUNNING_REQUESTS[cmd];
  if (req !== undefined) {
    req.abort();
    delete RUNNING_REQUESTS[cmd];
  }
  const postPath = join(category, post);
  const cacheKey = `${cmd}::${postPath}`;
  try {
    const result = await CACHE.getItem(cacheKey);
    if (result !== null) {
      return result;
    }
    throw new Error(`could not get cached ${cmd} for post ${post} in category ${category}`);
  } catch (e) {
    console.debug(e);
    const controller = new AbortController();
    RUNNING_REQUESTS[cmd] = controller;
    try {
      const res = await fetch(
        `${process.env.REACT_APP_NLP_API_ROOT}/${cmd}`, {
          method: 'post',
          mode: 'cors',
          signal: controller.signal,
          body: payload,
          headers: {
            Authorization: process.env.REACT_APP_NLP_AUTHORIZATION,
            Accept: 'application/json, */*',
            'Content-Type': mime,
          },
        },
      );
      if (!res.ok) {
        throw new Error(JSON.stringify(res.body));
      }
      const words = await res.json();
      const result = words;
      if (process.env.REACT_APP_DEBUG !== '1') {
        await CACHE.setItem(cacheKey, result);
      }
      delete RUNNING_REQUESTS[cmd];
      return result;
    } catch (e2) {
      delete RUNNING_REQUESTS[cmd];
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
 * @returns {Promise<number>}
 */
const getSentiment = async (post, category, postText) => {
  try {
    const tokens = await callNlpApi(post, category, JSON.stringify({ text: postText, tokenizer: 'RegexpTokenizer' }), 'tokenize', 'application/json');
    const sentiment = await callNlpApi(post, category, JSON.stringify({ tokens }), 'sentiment', 'application/json');
    if (sentiment !== 0 && !sentiment) {
      throw new Error('received invalid sentiment', sentiment);
    }
    return sentiment;
  } catch (e) {
    console.error('failed to get sentiment', e);
    throw e;
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
    console.debug(e);
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
      if (process.env.REACT_APP_DEBUG !== '1') {
        await CACHE.setItem(cacheKey, result);
      }
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
    console.debug(e);
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
      const result = parser(lexer(markdown));
      if (process.env.REACT_APP_DEBUG !== '1') {
        await CACHE.setItem(cacheKey, result);
      }
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
  callNlpApi,
  define,
  getSentiment,
  getPostHTML,
};

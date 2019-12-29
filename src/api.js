import { basename, join } from 'path-browserify';
import { parser, lexer } from 'marked';

import { isDotFile, isFile } from './utils';

const RUNNING_REQUESTS = {
  allData: undefined,
  definition: undefined,
  people: undefined,
  places: undefined,
  organizations: undefined,
  topics: undefined,
  mdToHtml: undefined,
};

const CACHE = {
  definitions: {},
  postText: {},
  people: {},
  places: {},
  organizations: {},
  topics: {},
  sentiment: {},
};

/**
 * @returns {Promise<{tree: Record<string, *>}|null>}
 */
const getBlogData = async () => {
  if (RUNNING_REQUESTS.allData !== undefined) {
    RUNNING_REQUESTS.allData.abort();
  }
  let result = null;
  const controller = new AbortController();
  try {
    const res = await fetch(`${process.env.REACT_APP_API_ROOT}/trees/master?recursive=1`, {
      mode: 'cors',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, *',
        Authorization: process.env.REACT_APP_AUTHORIZATION,
      }
    });
    if (!res.ok) {
      throw new Error(JSON.stringify(res.body));
    }
    const json = await res.json();
    result = {
      ...json,
      tree: json.tree.filter((n) => !isDotFile(n.path) && (basename(n.path).indexOf('.') < 0 || isFile(n.path))).map((n) => ({ ...n, path: `/${n.path}` })),
    };
  } catch (e) {
    console.error(e);
  } finally {
    delete RUNNING_REQUESTS.allData;
  }
  return result;
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
  if (RUNNING_REQUESTS[type] !== undefined) {
    RUNNING_REQUESTS[type].abort();
    delete RUNNING_REQUESTS[type];
  }
  const postPath = join(category, post);
  const maybeCached = CACHE[type][postPath];
  let result = null;
  if (maybeCached === undefined) {
    const controller = new AbortController();
    RUNNING_REQUESTS[type] = controller;
    try {
      const res = await fetch(
        `${process.env.REACT_APP_NLP_API_ROOT}/${type}`,
        {
          method: 'post',
          mode: 'cors',
          signal: controller.signal,
          body: postText,
          headers: {
            'Authorization': process.env.REACT_APP_NLP_AUTHORIZATION,
            'Accept': 'application/json, *',
            'Content-Type': 'application/json',
          },
        }
      );
      if (!res.ok) {
        throw new Error(JSON.stringify(res.body));
      }
      const json = await res.json();
      const regex = /^[\d &,.a-z]{2,}$/i;
      result = unique(json.filter((w) => w.search(regex) >= 0));
      CACHE[type][postPath] = result;
    } catch (e) {
      CACHE[type][postPath] = null;
      console.error(e);
    } finally {
      delete RUNNING_REQUESTS[type];
    }
  } else if (maybeCached) {
    result = maybeCached;
  }
  return result;
};

/**
 * @param {string} post
 * @param {string} category
 * @param {string} postText
 * @param {'distance'|'match'|'sentiment'|'stem'|'tokenize'|'tokenizeAndStem'} action
 */
const callNaturalApi = async (post, category, postText, action) => {
  if (RUNNING_REQUESTS[action] !== undefined) {
    RUNNING_REQUESTS[action].abort();
    delete RUNNING_REQUESTS[action];
  }
  let result = null;
  const postPath = join(category, post);
  const maybeCached = CACHE[action][postPath];
  if (maybeCached === undefined) {
    const controller = new AbortController();
    RUNNING_REQUESTS[action] = controller;
    try {
      const res = await fetch(`${process.env.REACT_APP_NLP_API_ROOT}/natural`, {
        mode: 'cors',
        signal: controller.signal,
        body: JSON.stringify({ text: postText, action }),
        method: 'post',
        headers: {
          'Authorization': process.env.REACT_APP_NLP_AUTHORIZATION,
          'Accept': 'application/json, *',
          'Content-Type': 'application/json',
        }
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.body));
      }
      result = await res.json();
      CACHE[action][postPath] = result;
    } catch (e) {
      console.error(e);
      CACHE[action][postPath] = null;
    } finally {
      delete RUNNING_REQUESTS[action];
    }
  } else if (maybeCached) {
    result = maybeCached;
  }
  return result;
};

/**
 * @param {string} word
 * @returns {Promise<string>}
 */
const define = async (word) => {
  const maybeCached = CACHE.definitions[word];
  let result = null;
  if (maybeCached === undefined) {
    const controller = new AbortController();
    RUNNING_REQUESTS.definition = controller;
    try {
      const res = await fetch(`${process.env.REACT_APP_NLP_API_ROOT}/define/${word}`, {
        mode: 'cors',
        signal: controller.signal,
        headers: {
          Authorization: process.env.REACT_APP_NLP_AUTHORIZATION,
          Accept: 'text/plain, *',
        }
      });
      if (!res.ok) {
        throw new Error(JSON.stringify(res.body));
      }
      result = await res.text();
      CACHE.definitions[word] = result;
    } catch (e) {
      console.error(e.message);
      CACHE.definitions[word] = null;
    } finally {
      delete RUNNING_REQUESTS.definition;
    }
  } else if (maybeCached) {
    result = maybeCached;
  }
  return result;
};

/**
 * @param {string} sha
 * @returns {Promise<string>}
 */
const getPostHTML = async (sha) => {
  let result = null;
  const maybeCached = CACHE.postText[sha];
  if (maybeCached === undefined) {
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
        }
      );
      if (!res.ok) {
        throw new Error(JSON.stringify(res.body));
      }
      const json = await res.json();
      const markdown = json.encoding === 'base64'
        ? atob(json.content)
        : json.content;
      result = mdToHtmlLocally(markdown);
      CACHE.postText[sha] = result;
    } catch (e) {
      console.error(e);
    } finally {
      delete RUNNING_REQUESTS.postText;
    }
  } else if (maybeCached) {
    result = maybeCached;
  }
  return result;
};

export {
  getBlogData,
  callCompromiseApi,
  callNaturalApi,
  define,
  mdToHtmlLocally,
  getPostHTML,
};

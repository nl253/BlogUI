import { basename, join } from 'path-browserify';

import { isFile } from './utils';

const RUNNING_REQUESTS = {
  allData: undefined,
  mdToHtml: undefined,
};

const CACHE = {
  postText: {},
  people: {},
  places: {},
  organizations: {},
  topics: {},
  sentiment: {},
};


/**
 * @return {Promise<{tree: Record<string, *>}|null>}
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
      tree: json.tree.filter(n => basename(n.path).indexOf('.') < 0 || isFile(n.path)).map(n => ({...n, path: `/${n.path}`})),
    };
  } catch (e) {
    console.error(e);
  } finally {
    delete RUNNING_REQUESTS.allData;
  }
  return result;
};

const mdToHtml = async (md) => {
  if (RUNNING_REQUESTS.mdToHtml !== undefined) {
    RUNNING_REQUESTS.mdToHtml.abort();
  }
  const controller = new AbortController();
  let result = null;
  try {
    RUNNING_REQUESTS.mdToHtml = controller;
    const res = await fetch(
      `${process.env.REACT_APP_NLP_API_ROOT}/mdToHtml`,
      {
        mode: 'cors',
        signal: controller.signal,
        body: md,
        method: 'post',
        headers: {
          Authorization: process.env.REACT_APP_NLP_AUTHORIZATION,
          Accept: 'text/html, text/plain, *',
          'Content-Type': 'text/plain',
        },
      });
    if (!res.ok) {
      throw new Error(JSON.stringify(res.body));
    }
    result = await res.text();
  } catch (e) {
    console.error(e);
  } finally {
    delete RUNNING_REQUESTS.mdToHtml;
  }
  return result;
};

/**
 * @param {string} post
 * @param {string} category
 * @param {string} postText
 * @param {'places'|'organizations'|'topics'|'people'} type
 * @return {Promise<*>}
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
        `${process.env.REACT_APP_NLP_API_ROOT}/compromise`,
        {
          mode: 'cors',
          signal: controller.signal,
          body: JSON.stringify({text: postText, type}),
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
      const json = await res.json();
      const newValue = [
        ...(new Set(json.filter(
          w => w.length > 2 && w.search(/^[a-z 0-9.,&]+$/i) >= 0)))];
      CACHE[type][postPath] = newValue;
      result = newValue;
    } catch (e) {
      CACHE[type][postPath] = null;
      console.error(e);
    } finally {
      delete RUNNING_REQUESTS[type];
    }
  } else if (maybeCached) {
    result = maybeCached[type];
  }
  return result;
};


export { getBlogData, mdToHtml, callCompromiseApi };

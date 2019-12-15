const REGEX_FILE_END = /\.[^.]{2,7}\s*$/;
const REGEX_DIRNAME = /\/[^/]*\/?\s*$/;
// const REGEX_RELATIVE = /^\.\//;
const REGEX_BASENAME = /\/([^/]*)\s*$/;
const REGEX_PARENT = /\/[^/]+\/\.{2}(\/|$)/g;
const REGEX_REDUNDANT_SLASH = /\/{2,}|\/(\.\/)+/;

/**
 * @param {string} path
 * @returns {string}
 */
const dirname = path => {
  if (path.length > 1 && path.endsWith('/')) {
    path = path.replace(/\/$/, '');
  }
  if (path === '/' || path === '') return '/';
  else return path.replace(REGEX_DIRNAME, '');
};

/**
 * @param {string} path
 * @returns {string}
 */
const basename = path => path === '/' || path === '' ? '/' : REGEX_BASENAME.exec(path)[1];

/**
 * @param {string} path
 * @returns {boolean}
 */
const isFile = path => !!path.match(REGEX_FILE_END);

/**
 * @param {string} path
 * @returns {boolean}
 */
const isDir = path => !isFile(path);

/**
 * @param {string[]} nodeList
 * @returns {{dirs: [], files: []}}
 */
const splitDirsFiles = nodeList => {
  const dirs = [];
  const files = [];
  for (const n of nodeList) {
    (isFile(n) ? files : dirs).push(n);
  }
  return {dirs, files};
};

/**
 * @param {...string} pathParts
 * @returns {string}
 */
const join = (...pathParts) => {
  let outcome = pathParts.filter(p => p !== '').join('/')
      // FIXME reference to state
      // .replace(REGEX_RELATIVE, this.state.category + '/')
      .replace(REGEX_PARENT, '/')
      .replace(REGEX_REDUNDANT_SLASH, '/');
  if (outcome.endsWith('/') && outcome.length > 1) {
    outcome = outcome.replace(/\/+$/, '');
  }
  return outcome;
};

export {
  basename,
  dirname,
  isDir,
  isFile,
  join,
  splitDirsFiles,
};

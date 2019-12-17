const REGEX_FILE_END = /\.[^.]{2,7}\s*$/;

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

export {
  isDir,
  isFile,
  splitDirsFiles,
};

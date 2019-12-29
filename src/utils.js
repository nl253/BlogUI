import { basename } from 'path-browserify';

const REGEX_FILE_END_MD = /\.(m(ark)?d(own)?|x?html?)$/i;
const REGEX_WORDS = /( |\r\n|\n|\r|\t)+/;
const REGEX_SENT = /\.(\s+|\s*$)|\S{8,}[\t ]*(\n|\r\n|\r){2,}/gm;
const REGEX_FILE_END = /\.[^.]{2,7}\s*$/;
const REGEX_HEADING_DELIM = /[-_]/g;

/**
 * @param {string} heading
 * @returns {string}
 */
const fmtHeading = (heading) => heading
  .replace(REGEX_HEADING_DELIM, ' ')
  .split(' ')
  .map((word) => word.length < 3 ? word : word[0].toUpperCase() + word.slice(1))
  .join(' ')
  .replace(REGEX_FILE_END, '');


/**
 * @param {string} txt
 * @returns {number}
 */
const countSent = (txt) => (txt.match(REGEX_SENT) || []).length;

/**
 * @param {string} txt
 * @returns {number}
 */
const countWords = (txt) => (txt.split(REGEX_WORDS) || []).length;

/**
 * @param {string} txt
 * @returns {number}
 */
const getTimeToReadInMin = (txt) => Math.ceil(txt.length / 650);

/**
 * @param {string} s
 * @param {RegExp} re
 * @param {number} [group]
 * @returns {string[]}
 */
const findAllMatches = (s, re, group = 0) => {
  const matches = [];
  let m;
  do {
    m = re.exec(s);
    if (m) {
      matches.push(m[group]);
    }
  } while (m);
  return matches;
};

/**
 * @param {string} path
 * @returns {boolean}
 */
const isDotFile = (path) => basename(path)[0] === '.';


/**
 * @param {string} path
 * @returns {boolean}
 */
const isFile = (path) => path.search(REGEX_FILE_END_MD) >= 0;

export {
  fmtHeading,
  countSent,
  countWords,
  getTimeToReadInMin,
  findAllMatches,
  isDotFile,
  isFile,
};

const REGEX_WORDS = /( |\r\n|\n|\r|\t)+/;
const REGEX_SENT = /\.(\s+|\s*$)|\S{8,}[ \t]*(\n|\r\n|\r){2,}/gm;
const REGEX_FILE_END = /\.[^.]{2,7}\s*$/;
const REGEX_HEADING_DELIM = /[-_]/g;

/**
 * @param {string} heading
 * @returns {string}
 */
const fmtHeading = heading => heading
  .replace(REGEX_HEADING_DELIM, ' ')
  .split(' ')
  .map(word => word.length < 3 ? word : word[0].toUpperCase() + word.slice(1))
  .join(' ').replace(REGEX_FILE_END, '');


/**
 * @param {string} txt
 * @return {number}
 */
const countSent = txt => (txt.match(REGEX_SENT) || []).length;

/**
 * @param {string} txt
 * @return {number}
 */
const countWords = txt => (txt.split(REGEX_WORDS) || []).length;

/**
 * @param {string} txt
 * @return {number}
 */
const getTimeToReadInMin = txt => Math.ceil(txt.length / 650);

export { fmtHeading, countSent, countWords, getTimeToReadInMin };

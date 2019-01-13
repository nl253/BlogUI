const _fileEndRegex = /\.[^.]{2,7}\s*$/;
const _dirnameRegex = /\/[^/]*\/?\s*$/;
const _relativeRegex = /^\.\//;
const _basenameRegex = /\/([^/]*)\s*$/;
const _parentRegex = /\/[^/]+\/\.{2}(\/|$)/g;
const _redundantSlashRegex = /\/{2,}|\/(\.\/)+/;

function dirname(path) {
  if (path.length > 1 && path.endsWith('/')) {
    path = path.replace(/\/$/, '');
  }
  if (path === '/' || path === '') return '/';
  else return path.replace(_dirnameRegex, '');
}

function basename(path) {
  return path === '/' || path === '' ? '/' : _basenameRegex.exec(path)[1];
}

function isFile(path) {
  return !!path.match(_fileEndRegex);
}

function isDir(path) {
  return !isFile(path);
}

function splitDirsFiles(nodeList) {
  const dirs = [];
  const files = [];
  for (const n of nodeList) {
    (isFile(n) ? files : dirs).push(n);
  }
  return {dirs, files};
}

function join(...pathParts) {
  let outcome = pathParts.filter(p => p !== '').join('/')
      // FIXME reference to state
      // .replace(_relativeRegex, this.state.category + '/')
      .replace(_parentRegex, '/')
      .replace(_redundantSlashRegex, '/');
  if (outcome.endsWith('/') && outcome.length > 1) {
    outcome = outcome.replace(/\/+$/, '');
  }
  return outcome;
}

export {
  basename,
  dirname,
  isDir,
  isFile,
  join,
  splitDirsFiles,
};

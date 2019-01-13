const _fileEndRegex = /\.[^.]{2,7}\s*$/;
const _headingDelimRegex = /[-_]/g;

function randStep(min = 0, max = 40) {
  return min + Math.round(Math.random() * (max - min));
}

function fmtHeading(heading) {
  return heading.replace(_headingDelimRegex, ' ')
      .split(' ')
      .map(word => word.length < 3 ? word : word[0].toUpperCase() + word.slice(1))
      .join(' ').replace(_fileEndRegex, '');
}

export {fmtHeading, randStep};

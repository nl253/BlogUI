import {join, splitDirsFiles, isFile, isDir, basename, dirname} from './pathUtils';

test('join two roots gives "/"', () => expect(join('/', '/')).toBe('/'));

test('join paths', () => expect(join('/mary', 'smith')).toBe('/mary/smith'));

test('join paths', () => expect(join('tom', 'hanks')).toBe('tom/hanks'));

test('join paths', () => expect(join('mc/', '/dc')).toBe('mc/dc'));

test('join paths', () => expect(join('amy', 'wh/')).toBe('amy/wh'));

test('join relative paths', () => expect(join('.', '.')).toBe('./.'));

test('join with trailing slash', () => expect(join('kjl/ab', '')).toBe('kjl/ab'));

test('join with trailing slash', () => expect(join('kjl/ab', '/')).toBe('kjl/ab'));

test('join relative paths', () => expect(join('some/./thing', '')).toBe('some/thing'));

test('join relative path with slash', () => expect(join('abc/././def', '/')).toBe('abc/def'));

test('join relative paths with empty string', () => expect(join('abc/././def')).toBe('abc/def'));

test('dirname with no root', () => expect(dirname('abc/def')).toBe('abc'));

test('rooted dirname', () => expect(dirname('/better/not')).toBe('/better'));

test('dirname with trailing slash', () => expect(dirname('/maybe/yes/')).toBe('/maybe'));

test('dirname on empty string', () => expect(dirname('')).toBe('/'));

test('dirname on root', () => expect(dirname('/')).toBe('/'));

test('isFile', () => expect(isFile('file.txt')).toBe(true));

test('isFile', () => expect(isFile('file')).toBe(false));

test('isFile', () => expect(isFile('my.md')).toBe(true));

test('isFile', () => expect(isFile('')).toBe(false));

test('isFile', () => expect(isFile('/')).toBe(false));

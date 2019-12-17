import { isFile } from './pathUtils';

test('isFile', () => {
  expect(isFile('file.txt')).toBe(true);
  expect(isFile('file')).toBe(false);
  expect(isFile('my.md')).toBe(true);
  expect(isFile('')).toBe(false);
  expect(isFile('/')).toBe(false);
});


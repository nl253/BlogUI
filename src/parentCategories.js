import React from 'react';
import { join } from 'path-browserify';
import { fmtHeading } from './utils';

/**
 * @param {function} absCategory
 * @param {string} category
 * @param {string[]} parentCategories
 * @param {string} parentCategory
 * @returns {*}
 */
export default function ParentCategories({
  absCategory,
  category,
  parentCategories,
  parentCategory,
}) {
  return (
    <nav hidden={parentCategories.length === 0}>
      {parentCategories.map((c) => (
        <button
          type="button"
          onClick={() => absCategory(join(parentCategory, c))}
          key={c}
          className={`d-block btn mx-auto w-75 btn-${category.substr(1) === c
            ? 'warning'
            : 'link'}`}
        >
          {fmtHeading(c)}
        </button>
      ))}
    </nav>
  );
}

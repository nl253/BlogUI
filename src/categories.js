import React from 'react';

import { join } from 'path-browserify';

import { fmtHeading } from './utils';

/**
 * @param {function} absCategory
 * @param {string[]} categories
 * @param {string} category
 * @returns {*}
 */
export default function Categories({ absCategory, categories, category }) {
  return (
    <nav hidden={categories.length === 0}>
      {categories.map((c) => (
        <button
          type="button"
          onClick={() => absCategory(join(category, c))}
          key={c}
          className="d-block btn mx-auto w-75 btn-link"
        >
          {fmtHeading(c)}
        </button>
      ))}
    </nav>
  );
}

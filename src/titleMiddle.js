import React from 'react';

import { basename } from 'path-browserify';

import { fmtHeading } from './utils';

/**
 * @param {function} absCategory
 * @param {string} category
 * @param {string} parentCategory
 * @returns {*}
 */
export default function TitleMiddle({ absCategory, category, parentCategory }) {
  return category === '/'
    ? (
      <div>
        <h1 className="text-center mx-auto display-4">Blog</h1>
        <hr style={{ maxWidth: '75%' }} />
      </div>
    )
    : (
      <div>
        <h2>{fmtHeading(basename(category))}</h2>
        <button
          type="button"
          className="btn btn-light d-block w-50 mx-auto border"
          onClick={() => absCategory(parentCategory)}
        >
          Back
        </button>
      </div>
    );
}

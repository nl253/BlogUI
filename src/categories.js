import React from 'react';

import { join } from 'path-browserify';

import { fmtHeading } from './utils';

export default ({ absCategory, categories, category }) => (
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

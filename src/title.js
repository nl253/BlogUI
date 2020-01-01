import React from 'react';

import { basename } from 'path-browserify';

import { fmtHeading } from './utils';

export default ({ parentCategory, parentCategories }) => (
  <div>
    {parentCategories.length > 0 && (
      parentCategory.length === 1
        ? (
          <div>
            <h1 className="text-center mx-auto display-4">
              Blog
            </h1>
            <hr style={{ maxWidth: '75%' }} />
          </div>
        ) : (
          <div>
            <h2 className="text-center mx-auto">
              {fmtHeading(basename(parentCategory))}
            </h2>
            <hr />
          </div>
        )
    )}
  </div>
);

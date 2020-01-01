/* eslint-disable jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions,max-len */
import React from 'react';

import { basename } from 'path-browserify';

import { fmtHeading } from './utils';

/**
 * @param {string} parentCategory
 * @param {string[]} parentCategories
 * @returns {*}
 */
export default function Title({ parentCategory, parentCategories }) {
  return (
    <div>
      {parentCategories.length > 0 && (
        parentCategory.length === 1
          ? (
            <div>
              <h1
                className="text-center mx-auto display-4"
                onClick={() => {
                  window.location.pathname = '/';
                }}
              >
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
}

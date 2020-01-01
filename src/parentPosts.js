import React from 'react';
import { join } from 'path-browserify';
import { fmtHeading } from './utils';

/**
 * @param {function} absPost
 * @param {string} parentCategory
 * @param {string[]} parentPosts
 * @param {string} post
 * @param {string[]} parentCategories
 * @returns {*}
 */
export default function ParentPosts({
  absPost,
  parentCategory,
  parentPosts,
  post,
  parentCategories,
}) {
  return (
    <div hidden={parentPosts.length === 0}>
      {parentCategories.length > 0 && <hr style={{ maxWidth: '75%' }} />}
      <h3 className="text-center mt-3 mx-auto">Posts</h3>
      <nav>
        {parentPosts.map((p) => (
          <button
            type="button"
            onClick={() => absPost(join(parentCategory, p))}
            key={p}
            className={`d-block btn mx-auto w-75 btn-${post === p
              ? 'light'
              : 'link'}`}
          >
            {fmtHeading(p)}
          </button>
        ))}
      </nav>
    </div>
  );
}

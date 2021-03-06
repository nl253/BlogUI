import React from 'react';
import { join } from 'path-browserify';
import { fmtHeading } from './utils';

/**
 * @param {function} absPost
 * @param {string[]} categories
 * @param {string} category
 * @param {string} post
 * @param {string[]} posts
 * @returns {*}
 */
export default function Posts({
  absPost,
  categories,
  category,
  post,
  posts,
}) {
  return (
    <div hidden={posts.length === 0}>
      <hr hidden={categories.length === 0} style={{ maxWidth: '75%' }} />
      <h3 className="text-center mt-3 mx-auto">Posts</h3>
      <nav>
        {posts.map((p) => (
          <button
            type="button"
            onClick={() => absPost(join(category, p))}
            key={p}
            className={`d-block btn w-75 mx-auto btn-${post === p
              ? 'warning'
              : 'link'}`}
          >
            {fmtHeading(p)}
          </button>
        ))}
      </nav>
    </div>
  );
}

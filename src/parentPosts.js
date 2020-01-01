import React from 'react';
import { join } from 'path-browserify';
import { fmtHeading } from './utils';

export default ({ absPost, parentCategory, parentPosts, post, parentCategories }) => (
  <div hidden={parentPosts.length === 0}>
    {parentCategories.length > 0 && <hr style={{ maxWidth: '75%' }} />}
    <h3 className="text-center mt-3 mx-auto">Posts</h3>
    <nav>
      {parentPosts.map((p) => (
        <button
          type="button"
          onClick={() => absPost(join(parentCategory, p))}
          key={p}
          className={`d-block btn mx-auto w-75 btn-${post === p ? 'light' : 'link'}`}
        >
          {fmtHeading(p)}
        </button>
      ))}
    </nav>
  </div>
);

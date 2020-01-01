import React from 'react';

/**
 * @param {string} heading
 * @param {string[]} items
 * @returns {*}
 */
export default ({ heading, items }) => (
  <div>
    <h4>{heading.substr(0, 1).toUpperCase()}{heading.substr(1)}
    </h4>
    <ul style={{
      listStyleType: 'none',
      padding: 0,
      margin: 0,
    }}
    >
      {items.map((t) => (
        <li key={t}>
          <p style={{ fontVariantCaps: 'all-petite-caps' }}>{t}</p>
        </li>
      ))}
    </ul>
  </div>
);

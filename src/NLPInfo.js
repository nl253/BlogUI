import React from 'react';
import { countSent, countWords, getTimeToReadInMin } from './utils';
import NLPInfoListSection from './NLPInfoListSection';

/**
 * @param {string[]} compromiseApiRequests
 * @param {string[]} naturalApiRequests
 * @param {string} postText
 * @param {*} state
 * @returns {*}
 */
export default ({ compromiseApiRequests, naturalApiRequests, postText, state }) => (
  <div>
    <h3>Info</h3>
    <p className="mb-1">{getTimeToReadInMin(postText)} min read</p>
    <p className="mb-1">{countWords(postText)} words</p>
    <p>{countSent(postText)} sentences</p>
    <div>
      {compromiseApiRequests
        .filter((type) => !!state[type] && state[type].length > 0)
        .map((type) => <NLPInfoListSection key={type} heading={type} items={state[type]} />)}

      {naturalApiRequests
        .filter((type) => !!state[type])
        .map((type) => (
          <div key={type}>
            <h4>{type.substr(0, 1).toUpperCase()}{type.substr(1)}</h4>
            <p style={{ fontVariantCaps: 'all-petite-caps' }}>{state[type].toFixed(2)}</p>
          </div>
        ))}
    </div>
  </div>
);

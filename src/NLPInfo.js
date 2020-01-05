import React from 'react';
import { countSent, countWords, getTimeToReadInMin } from './utils';
import NLPInfoListSection from './NLPInfoListSection';

/**
 * @param {number} sentiment
 * @returns {string}
 */
const estimateSentiment = (sentiment) => {
  if (sentiment === 0) {
    return 'neutral';
  }
  if (sentiment >= 0.75) {
    return 'very positive';
  }
  if (sentiment >= 0.25) {
    return 'positive';
  }
  if (sentiment <= -0.75) {
    return 'very negative';
  }
  return 'negative';
};

/**
 * @param {string[]} nlpApiReqs
 * @param {string} postText
 * @param {Record<string, *>} state
 * @returns {*}
 */
export default function NLPInfo({
  nlpApiReqs,
  postText,
  state,
}) {
  return (
    <div>
      <h3>Info</h3>
      <p className="mb-1">{getTimeToReadInMin(postText)} min read</p>
      <p className="mb-1">{countWords(postText)} words</p>
      <p>{countSent(postText)} sentences</p>
      <div>
        {nlpApiReqs
          .filter((type) => !!state[type] && Array.isArray(state[type]) && state[type].length > 0)
          .map((type) => (
            <NLPInfoListSection
              key={type}
              heading={type}
              items={state[type]}
            />
          ))}
        {state.sentiment !== null && (
          <div>
            <h4>Sentiment</h4>
            <p style={{ fontVariantCaps: 'all-petite-caps' }}>{estimateSentiment(state.sentiment)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

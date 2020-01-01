import React from 'react';
import {
  Button,
  Toast,
  ToastBody,
  ToastHeader,
} from 'reactstrap';

/**
 * @param {string} word
 * @param {string} definition
 * @param {function} clearDefinition
 * @returns {*}
 */
export default function WordDefinition({ word, definition, clearDefinition }) {
  return (
    <div hidden={!word || !definition}>
      <Toast
        className="d-sm-none d-md-none d-lg-block d-xl-block"
        style={{
          position: 'fixed',
          zIndex: 99,
          bottom: '10px',
          left: '10px',
        }}
        transition={{
          exit: false, timeout: 10, enter: true, appear: true,
        }}
      >
        <ToastHeader>{word}</ToastHeader>
        <ToastBody>{definition}</ToastBody>
        <Button
          onClick={clearDefinition}
          color="danger"
          size="sm"
          className="mx-auto d-block mt-1 mb-2"
        >
        Close
        </Button>
      </Toast>
    </div>
  );
}

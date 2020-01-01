import React from 'react';
import { Toast, ToastBody, ToastHeader } from 'reactstrap';

/**
 * @param {string} word
 * @param {string} definition
 * @param {boolean} isOpen
 * @param {function} clearDefinition
 * @returns {*}
 */
export default ({ word, definition, isOpen, clearDefinition }) => (
  <Toast
    isOpen={isOpen}
    className="d-sm-none d-md-none d-lg-block d-xl-block"
    style={{
      position: 'fixed',
      zIndex: 99,
      bottom: '10px',
      left: '10px',
    }}
    transition={{ exit: false, timeout: 10, enter: true, appear: true }}
    onClick={clearDefinition}
  >
    <ToastHeader>{word}</ToastHeader>
    <ToastBody>{definition}</ToastBody>
  </Toast>
);

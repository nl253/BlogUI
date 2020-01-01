import React from 'react';


/**
 * @param {string} author
 * @returns {*}
 */
export default function Footer({ author }) {
  return (
    <footer
      className="py-4 bg-light d-none d-xl-block d-lg-block d-md-block d-sm-block border-top mt-xl-3 mt-1 mt-lg-3 mt-md-1 mt-sm-1"
    >
      <div className="mx-auto mt-2 mb-4" style={{ maxWidth: '370px' }}>
        <span className="mr-3">
          <a
            href="https://www.linkedin.com/in/norbert-logiewa"
            className="btn btn-sm btn-secondary"
            style={{ minWidth: '80px' }}
          >
                  LinkedIn
          </a>
        </span>
        <span className="mr-3">
          <a
            href="https://github.com/nl253"
            className="btn btn-sm btn-secondary"
            style={{ minWidth: '80px' }}
          >
                  GitHub
          </a>
        </span>
        <span className="mr-3">
          <a
            href="https://docs.google.com/document/d/1I94ZHc_75a2ivyjcDXjESIrGYPmJUriTm3xmEkcwaeI/edit?usp=sharing"
            className="btn btn-sm btn-secondary"
            style={{ minWidth: '80px' }}
          >
                  CV
          </a>
        </span>
        <span>
          <a
            href="https://portfolio-nl.herokuapp.com"
            className="btn btn-sm btn-secondary"
            style={{ minWidth: '80px' }}
          >
                  Portfolio
          </a>
        </span>
      </div>
      <p
        className="text-center mx-auto"
      >Copyright &copy; {author} {new Date(Date.now()).getFullYear().toString()}
      </p>
    </footer>
  );
}

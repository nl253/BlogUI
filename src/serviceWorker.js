/**
 * @param swUrl
 * @param config
 * @returns {Promise<onupdatefound|void>}
 */
const registerValidSW = async (swUrl, config) => {
  try {
    const registration = await navigator.serviceWorker.register(swUrl);
    // eslint-disable-next-line no-return-assign
    return registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker == null) {
        return;
      }
      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          /*
           *At this point, the updated precached content has been fetched,
           *but the previous service worker will still serve the older
           *content until all client tabs are closed.
           */
          console.log('New content is available and will be used when all tabs for this page are closed. See http://bit.ly/CRA-PWA.');

          // Execute callback
          if (config && config.onUpdate) {
            config.onUpdate(registration);
          }
        } else {
          /*
           * At this point, everything has been precached.
           * It's the perfect time to display a
           * "Content is cached for offline use." message.
           */
          console.log('Content is cached for offline use.');

          // Execute callback
          if (config && config.onSuccess) {
            config.onSuccess(registration);
          }
        }
      };
    };
  } catch (error) {
    return console.error('Error during service worker registration:',
      error);
  }
};

/**
 * @param swUrl
 * @param config
 * @returns {Promise<void>}
 */
const checkValidServiceWorker = async (swUrl, config) => {
  // Check if the service worker can be found. If it can't reload the page.
  try {
    const response = await fetch(swUrl);
    // Ensure service worker exists, and that we really are getting a JS file.
    const contentType = response.headers.get('content-type');
    if (response.status === 404 || (contentType != null && contentType.indexOf('javascript') === -1)) {
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      window.location.reload();
    } else {
      await registerValidSW(swUrl, config);
    }
  } catch (e) {
    return console.log('No internet connection found. App is running in offline mode.');
  }
};

/**
 * @param config
 */
export const register = (config) => {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW.
    if (new URL(process.env.PUBLIC_URL, window.location.href).origin !== window.location.origin) {
      return;
    }

    const listener = async () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
      if (!(window.location.hostname === 'localhost'
        || window.location.hostname === '[::1]'
        || window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})){3}$/))) {
        return registerValidSW(swUrl, config);
      }

      // This is running on localhost. Let's check if a service worker still exists or not.
      checkValidServiceWorker(swUrl, config);

      /*
       * Add some additional logging to localhost, pointing developers to the
       * service worker/PWA documentation.
       */
      await navigator.serviceWorker.ready;
      console.log('This web app is being served cache-first by a service worker. To learn more, visit http://bit.ly/CRA-PWA');
    };

    window.addEventListener('load', listener);
  }
};

export const unregister = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
  }
};

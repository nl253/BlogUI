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
          console.log('New content is available and will be used when all tabs for this page are closed. See http://bit.ly/CRA-PWA.');
          if (config && config.onUpdate) {
            config.onUpdate(registration);
          }
        } else {
          console.log('Content is cached for offline use.');
          if (config && config.onSuccess) {
            config.onSuccess(registration);
          }
        }
      };
    };
  } catch (error) {
    return console.error('Error during service worker registration:', error);
  }
};

/**
 * @param swUrl
 * @param config
 * @returns {Promise<void>}
 */
const checkValidServiceWorker = async (swUrl, config) => {
  try {
    const response = await fetch(swUrl);
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
      checkValidServiceWorker(swUrl, config);
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

// How long the app lets a browser or a cookie keep something before asking again. One hour for
// everything, so a change reaches everyone within the hour (see ADR 0003).

/** The app's general cache lifetime, in seconds. */
export const cacheLifetimeSeconds = 60 * 60;

/** The `Cache-Control` header for something private to the signed-in Singer that may be cached. */
export const privateCacheControl = `private, max-age=${cacheLifetimeSeconds.toString()}`;

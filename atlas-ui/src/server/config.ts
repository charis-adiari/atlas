export const DEFAULT_API_ORIGIN = 'http://localhost:8080';

/**
 * Gets where the Atlas API lives, as read from API_PROXY_TARGET, without a trailing slash.
 */
export function getApiOrigin(): string {
  return (process.env.API_PROXY_TARGET ?? DEFAULT_API_ORIGIN).replace(/\/+$/, '');
}

/**
 * Checks whether the app is running as a production build.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Checks whether cookies must be marked Secure, so browsers only send them over HTTPS. That is the case in production.
 * COOKIE_SECURE=false turns it off for a deployment that has to run over plain HTTP, such as a local production build.
 */
export function isSecureCookieRequired(): boolean {
  const override = process.env.COOKIE_SECURE;
  return override === undefined ? isProduction() : override === 'true';
}

/**
 * Gets the origins a browser may legitimately send state-changing requests from: the ones listed in APP_ORIGINS
 * (comma separated, needed behind a reverse proxy that changes the host), or otherwise the origin of the request itself.
 */
export function getAllowedOrigins(requestOrigin: string): string[] {
  const configured = (process.env.APP_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return configured.length > 0 ? configured : [requestOrigin];
}

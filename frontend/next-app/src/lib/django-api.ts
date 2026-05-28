const DEFAULT_DJANGO_API_URL = "http://localhost:8000/api/v1";
const DEFAULT_AUTH_COOKIE_NAME = "practice_auth_token";


export function getDjangoApiBaseUrl() {
  return (
    process.env.DJANGO_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_DJANGO_API_URL
  ).replace(/\/+$/, "");
}


export function getAuthCookieName() {
  return process.env.AUTH_TOKEN_COOKIE_NAME || DEFAULT_AUTH_COOKIE_NAME;
}

const API_ROOT = 'https://make.fun/api';
const responseCache = new Map();
const pendingRequests = new Map();
const minuteStamp = () => Math.floor(Date.now() / 60000);

async function fetchCached(url, { refresh = false } = {}) {
  const prior = responseCache.get(url);
  if (!refresh && prior && prior.minute === minuteStamp()) return prior.body;
  if (pendingRequests.has(url)) return pendingRequests.get(url);
  const request = (async () => {
    const headers = {};
    if (prior?.etag) headers['If-None-Match'] = prior.etag;
    let response;
    try {
      response = await fetch(url, { method: 'GET', headers });
    } catch (error) {
      if (!prior?.etag) throw error;
      response = await fetch(url, { method: 'GET', cache: 'no-cache' });
    }
    if (response.status === 304 && prior) {
      prior.minute = minuteStamp();
      return prior.body;
    }
    if (response.status === 304) throw new Error('The API returned 304 without a cached response');
    if (!response.ok) throw new Error(`Public API returned ${response.status}`);
    const body = await response.json();
    responseCache.set(url, { body, etag: response.headers.get('etag'), minute: minuteStamp() });
    return body;
  })();
  pendingRequests.set(url, request);
  try { return await request; }
  finally { if (pendingRequests.get(url) === request) pendingRequests.delete(url); }
}

function validSegment(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
}

export async function getBounties(options) {
  return fetchCached(`${API_ROOT}/competitions?status=open&activity=times`, options);
}
export async function getBounty(slug, options) {
  if (!validSegment(slug)) throw new Error('Invalid competition slug');
  return fetchCached(`${API_ROOT}/competitions/${encodeURIComponent(slug)}`, options);
}
export async function getLeaderboard(slug, options) {
  if (!validSegment(slug)) throw new Error('Invalid competition slug');
  return fetchCached(`${API_ROOT}/competitions/${encodeURIComponent(slug)}/leaderboard`, options);
}
export async function getProfile(handle, options) {
  if (!validSegment(handle)) throw new Error('Invalid profile handle');
  return fetchCached(`${API_ROOT}/profiles/${encodeURIComponent(handle)}`, options);
}

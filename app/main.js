import { routeBoard } from './board.js';
import { element, renderState } from './render.js';

const app = document.getElementById('app');
let navigationGeneration = 0;

function currentGeneration() { return navigationGeneration; }

function parseRoute(hash) {
  const value = hash.replace(/^#/, '') || '/';
  let match = value.match(/^\/bounty\/([A-Za-z0-9][A-Za-z0-9_-]{0,79})\/leaderboard\/?$/);
  if (match) return { type: 'leaderboard', slug: match[1] };
  match = value.match(/^\/bounty\/([A-Za-z0-9][A-Za-z0-9_-]{0,79})\/?$/);
  if (match) return { type: 'bounty', slug: match[1] };
  match = value.match(/^\/u\/([A-Za-z0-9][A-Za-z0-9_-]{0,79})\/?$/);
  if (match) return { type: 'profile', handle: match[1] };
  if (value === '/' || value === '') return { type: 'board' };
  return { type: 'invalid' };
}

async function renderRoute(refresh = false) {
  const route = parseRoute(location.hash);
  const generation = ++navigationGeneration;
  window.__shotReady = false;
  document.title = 'make.fun | Competition board';
  app.replaceChildren(element('p', 'loading', 'Loading…'));
  const context = {
    generation,
    currentGeneration,
    refresh,
    navigate: (hash, force = false) => {
      if (force) {
        if (location.hash !== hash) history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
        renderRoute(true);
      } else location.hash = hash;
    },
  };
  try {
    if (route.type === 'board') return await routeBoard(app, context);
    if (route.type === 'bounty') {
      const module = await import('./bounty.js');
      if (generation === currentGeneration()) return await module.routeBounty(app, route.slug, context);
      return;
    }
    if (route.type === 'leaderboard') {
      const module = await import('./leaderboard.js');
      if (generation === currentGeneration()) return await module.routeLeaderboard(app, route.slug, context);
      return;
    }
    if (route.type === 'profile') {
      const module = await import('./profile.js');
      if (generation === currentGeneration()) return await module.routeProfile(app, route.handle, context);
      return;
    }
    renderState(app, 'This address does not match a make.fun page.', 'error');
  } catch (error) {
    if (generation !== currentGeneration()) return;
    renderState(app, `This page could not be opened. ${error.message}`, 'error');
  }
  app.querySelector('.loading')?.remove();
  if (generation === currentGeneration()) window.__shotReady = true;
}

window.addEventListener('hashchange', () => renderRoute());
renderRoute();

import { getProfile } from './api.js';
import { formatDate, formatMoney } from './format.js';
import { append, beginView, element, link, makeRefresh, renderState, safePublicUrl } from './render.js';

export async function routeProfile(container, handle, context) {
  beginView(container, 'Public profile', 'MAKER PROFILE');
  const loading = element('p', 'loading', 'Loading public profile…');
  container.append(loading);
  try {
    const response = await getProfile(handle, { refresh: context.refresh });
    if (context.generation !== context.currentGeneration()) return;
    loading.remove();
    renderProfile(container, response.profile || response, handle, context);
  } catch (error) {
    if (context.generation !== context.currentGeneration()) return;
    loading.remove();
    renderState(container, `Profile could not be loaded. ${error.message}`, 'error');
    container.append(link('#/', 'Back to board', 'text-link'));
  }
  if (context.generation === context.currentGeneration()) window.__shotReady = true;
}

function renderProfile(container, profile, handle, context) {
  document.title = `@${profile.handle || handle} | make.fun`;
  const intro = container.querySelector('.page-intro');
  intro.querySelector('h1').textContent = profile.display_name || `@${profile.handle || handle}`;
  intro.querySelector('.eyebrow').textContent = 'PUBLIC PROFILE';
  intro.append(makeRefresh(() => context.navigate(location.hash, true)));
  const hero = element('section', 'profile-hero');
  const avatarUrl = safePublicUrl(profile.avatar || profile.image);
  if (avatarUrl) {
    const avatar = element('img', 'avatar');
    avatar.alt = ''; avatar.crossOrigin = 'anonymous'; avatar.src = avatarUrl;
    hero.append(avatar);
  }
  append(hero, element('div', 'profile-identity', `@${profile.handle || handle}`));
  if (profile.bio) hero.append(element('p', 'profile-bio', profile.bio));
  if (profile.joined_at) hero.append(element('p', 'muted', `Joined ${formatDate(profile.joined_at)}`));
  const links = element('div', 'public-links');
  for (const [label, value] of [['GitHub', profile.github_url || (profile.github_login ? `https://github.com/${profile.github_login}` : null)], ['Website', profile.website || profile.url], ['Discord', profile.discord_url]]) {
    const safe = safePublicUrl(value);
    if (safe) { const anchor = link(safe, label, 'text-link'); anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; links.append(anchor); }
  }
  const walletAddress = profile.wallet?.address || profile.wallet_address;
  if (walletAddress) links.append(element('span', 'wallet-address', `Wallet ${walletAddress}`));
  if (links.childNodes.length) hero.append(links);
  const record = profile.record || {};
  const metrics = element('section', 'record-metrics');
  for (const [label, value] of [['Entered', record.competitions_entered], ['Placed', record.competitions_placed], ['Won', record.competitions_won], ['Best placement', record.best_placement], ['Prize total', record.prize_usd == null ? null : formatMoney(record.prize_usd)]]) {
    if (value !== null && value !== undefined) metrics.append(profileMetric(label, value));
  }
  const solutions = element('section', 'content-section'); solutions.append(element('h2', '', 'Solutions'));
  const items = Array.isArray(profile.solutions) ? profile.solutions : [];
  if (!items.length) solutions.append(element('p', 'muted', 'No public solutions listed.'));
  for (const solution of items) solutions.append(renderSolution(solution));
  append(container, hero, metrics, solutions, link('#/', '← All competitions', 'text-link'));
}

function profileMetric(label, value) {
  const box = element('div', 'metric'); append(box, element('span', 'metric-label', label), element('strong', 'metric-value', value)); return box;
}

function renderSolution(solution) {
  const item = element('article', 'solution-row');
  const competition = solution.competition || {};
  const slug = competition.slug;
  append(item, slug ? link(`#/bounty/${encodeURIComponent(slug)}`, competition.title || solution.title || slug, 'solution-title') : element('strong', '', solution.title || 'Competition'));
  const details = [solution.placement ? `Place ${solution.placement}` : null, solution.prize_usd != null ? formatMoney(solution.prize_usd) : null, solution.score?.display || null, solution.entered_at ? `Entered ${formatDate(solution.entered_at)}` : null].filter(Boolean);
  if (details.length) item.append(element('p', 'muted', details.join(' · ')));
  return item;
}

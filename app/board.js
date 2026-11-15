import { getBounties } from './api.js';
import { formatMoney, formatNumber, timeLeft, isAccepting } from './format.js';
import { append, beginView, element, link, makeRefresh, metric, renderState, statusBadge } from './render.js';

export async function routeBoard(container, context) {
  const { generation, currentGeneration, refresh = false } = context;
  beginView(container, 'Competition board', 'OPEN BOUNTIES');
  const loading = element('p', 'loading', 'Loading live competitions…');
  container.append(loading);
  try {
    const response = await getBounties({ refresh });
    if (generation !== currentGeneration()) return;
    loading.remove();
    renderBoard(container, Array.isArray(response) ? response : response.items || [], context);
  } catch (error) {
    if (generation !== currentGeneration()) return;
    loading.remove();
    renderState(container, `Competitions could not be loaded. ${error.message}`, 'error');
    container.append(makeRefresh(() => context.navigate('#/', true)));
  }
  if (generation === currentGeneration()) window.__shotReady = true;
}

function renderBoard(container, bounties, context) {
  const intro = container.querySelector('.page-intro');
  const actions = element('div', 'intro-actions');
  append(actions, element('span', 'live-indicator', `${formatNumber(bounties.length)} competitions`), makeRefresh(() => context.navigate('#/', true)));
  intro.append(actions);
  if (!bounties.length) {
    container.append(element('div', 'state', 'No open competitions are listed right now.'));
    return;
  }
  const controls = element('section', 'board-controls');
  const searchLabel = element('label', 'control-field', 'Search');
  const search = element('input'); search.type = 'search'; search.placeholder = 'Title, category, sponsor'; searchLabel.append(search);
  const sortLabel = element('label', 'control-field', 'Sort by');
  const sort = element('select');
  for (const [value, title] of [['api', 'Featured order'], ['deadline', 'Deadline'], ['pot', 'Live pot'], ['entries', 'Entries']]) {
    const option = element('option', '', title); option.value = value; sort.append(option);
  }
  sortLabel.append(sort);
  append(controls, searchLabel, sortLabel, element('span', 'results-count', ''));
  container.append(controls);
  const list = element('section', 'bounty-list');
  const pagination = element('div', 'pagination');
  container.append(list, pagination);
  let page = 0;
  const pageSize = 20;
  function renderRows() {
    const query = search.value.trim().toLocaleLowerCase();
    let rows = bounties.map((bounty, index) => ({ bounty, index })).filter(({ bounty }) =>
      [bounty.title, bounty.category, typeof bounty.sponsor === 'string' ? bounty.sponsor : bounty.sponsor?.name, bounty.summary].join(' ').toLocaleLowerCase().includes(query));
    if (sort.value !== 'api') rows.sort((a, b) => {
      if (sort.value === 'deadline') return sortableDate(a.bounty.deadline) - sortableDate(b.bounty.deadline);
      if (sort.value === 'pot') return sortableNumber(b.bounty.potUsd) - sortableNumber(a.bounty.potUsd);
      return sortableNumber(b.bounty.submissionCount) - sortableNumber(a.bounty.submissionCount);
    });
    const pages = Math.max(1, Math.ceil(rows.length / pageSize)); page = Math.min(page, pages - 1);
    const visible = rows.slice(page * pageSize, (page + 1) * pageSize);
    list.replaceChildren(...visible.map(({ bounty }) => renderBountyRow(bounty)));
    controls.querySelector('.results-count').textContent = `${formatNumber(rows.length)} results · page ${page + 1} of ${pages}`;
    const previous = element('button', 'quiet-button', 'Previous'); previous.disabled = page === 0; previous.addEventListener('click', () => { page--; renderRows(); });
    const next = element('button', 'quiet-button', 'Next'); next.disabled = page + 1 >= pages; next.addEventListener('click', () => { page++; renderRows(); });
    const reset = element('button', 'quiet-button', 'Reset'); reset.addEventListener('click', () => { search.value = ''; sort.value = 'api'; page = 0; renderRows(); });
    pagination.replaceChildren(previous, next, reset);
  }
  search.addEventListener('input', () => { page = 0; renderRows(); });
  sort.addEventListener('change', () => { page = 0; renderRows(); });
  renderRows();
}

function renderBountyRow(bounty) {
  const card = element('article', 'bounty-row');
  const heading = element('div', 'row-heading');
  const title = link(`#/bounty/${encodeURIComponent(bounty.slug || '')}`, bounty.title || 'Untitled competition', 'row-title');
  append(heading, title, element('span', 'category', bounty.category || 'Competition'));
  const summary = element('p', 'row-summary', bounty.summary || '');
  const stats = element('div', 'row-metrics');
  append(stats,
    metric('LIVE POT', formatMoney(bounty.potUsd), 'metric-pot'),
    metric('ENTRY FEE', bounty.entryFeeUsd == null ? 'Free' : formatMoney(bounty.entryFeeUsd)),
    metric('TIME LEFT', timeLeft(bounty.deadline)),
    metric('ENTRIES', formatNumber(bounty.submissionCount)));
  const bottom = element('div', 'row-bottom');
  append(bottom, statusBadge(bounty.deadline), element('span', 'row-deadline', isAccepting(bounty.deadline) ? `Closes ${timeLeft(bounty.deadline)}` : 'Entry period ended'));
  append(card, heading, summary, stats, bottom);
  return card;
}

function sortableDate(value) { const time = Date.parse(value); return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER; }
function sortableNumber(value) { const number = Number(value); return Number.isFinite(number) ? number : -1; }

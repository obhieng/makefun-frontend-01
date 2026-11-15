import { getLeaderboard } from './api.js';
import { formatDate, formatNumber, formatPercent } from './format.js';
import { append, beginView, element, link, makeRefresh, renderState } from './render.js';

export async function routeLeaderboard(container, slug, context) {
  beginView(container, 'Leaderboard', 'COMPETITION RESULTS');
  const loading = element('p', 'loading', 'Loading leaderboard…');
  container.append(loading);
  try {
    const result = await getLeaderboard(slug, { refresh: context.refresh });
    if (context.generation !== context.currentGeneration()) return;
    loading.remove();
    renderLeaderboard(container, result, slug, context);
  } catch (error) {
    if (context.generation !== context.currentGeneration()) return;
    loading.remove();
    renderState(container, `Leaderboard could not be loaded. ${error.message}`, 'error');
    container.append(link(`#/bounty/${encodeURIComponent(slug)}`, 'Back to competition', 'text-link'));
  }
  if (context.generation === context.currentGeneration()) window.__shotReady = true;
}

function renderLeaderboard(container, result, slug, context) {
  const competition = result.competition || {};
  const intro = container.querySelector('.page-intro');
  intro.querySelector('h1').textContent = competition.title || result.title || 'Leaderboard';
  intro.querySelector('.eyebrow').textContent = 'LEADERBOARD';
  append(intro, link(`#/bounty/${encodeURIComponent(slug)}`, 'Competition details →', 'detail-link'), makeRefresh(() => context.navigate(location.hash, true)));
  document.title = `Leaderboard | ${competition.title || result.title || 'make.fun'}`;
  const range = result.phase || {};
  const meta = element('div', 'leaderboard-meta');
  append(meta, element('span', 'phase-chip', range.title || range.key || result.view || 'Current phase'));
  if (range.starts_at || range.ends_at) meta.append(element('span', '', `${formatDate(range.starts_at)} – ${formatDate(range.ends_at)}`));
  meta.append(element('span', '', `Ranked by ${result.rank_key || result.title || 'competition score'}`));
  if (result.tie_break) meta.append(element('span', 'tie-note', `Tie-break: ${result.tie_break.title || result.tie_break.key}${result.tie_break.better === 'lower' ? ' (lower is better)' : ''}`));
  container.append(meta);
  const entries = Array.isArray(result.entries) ? result.entries : [];
  if (!entries.length) {
    const empty = element('section', 'state empty-state');
    append(empty, element('h2', '', 'No entries yet'), element('p', '', `The entry deadline is ${formatDate(competition.deadline || competition.entry_deadline || competition.closes_at)}.`), link(`#/bounty/${encodeURIComponent(slug)}`, 'Back to competition', 'text-link'));
    container.append(empty);
    return;
  }
  const columns = Array.isArray(result.columns) ? result.columns : [];
  const tableWrap = element('div', 'table-wrap');
  const table = element('table', 'leaderboard-table');
  const header = element('thead'); const row = element('tr');
  const metricColumns = requestedMetricColumns(columns);
  const scoreColumns = extraScoreColumns(columns);
  const headers = ['Rank', 'Entrant', ...metricColumns, ...scoreColumns.map(column => column.title || column.key || 'Score'), 'Valid', 'Dossier bytes'];
  for (const title of headers) row.append(element('th', '', title));
  header.append(row); table.append(header);
  const body = element('tbody'); table.append(body); tableWrap.append(table); container.append(tableWrap);
  let page = 0; const pageSize = 50;
  const pager = element('div', 'pagination'); container.append(pager);
  const count = element('p', 'results-count', `${formatNumber(entries.length)} entries · maximum ${pageSize} shown at a time`); container.append(count);
  function renderPage() {
    body.replaceChildren(...entries.slice(page * pageSize, (page + 1) * pageSize).map((entry, index) => renderLeaderboardRows(entry, page * pageSize + index, columns, metricColumns, scoreColumns)));
    const previous = element('button', 'quiet-button', 'Previous'); previous.disabled = page === 0; previous.addEventListener('click', () => { page--; renderPage(); });
    const next = element('button', 'quiet-button', 'Next'); next.disabled = (page + 1) * pageSize >= entries.length; next.addEventListener('click', () => { page++; renderPage(); });
    pager.replaceChildren(previous, element('span', 'page-count', `Page ${page + 1} of ${Math.ceil(entries.length / pageSize)}`), next);
  }
  renderPage();
}

function requestedMetricColumns(columns) {
  const names = ['Judge win rate', '90% low', '90% high'];
  return names.map((name, index) => {
    const match = columns.find(column => {
      const key = `${column.title || ''} ${column.key || ''}`.toLowerCase();
      return index === 0 ? /judge|win.?rate/.test(key) : index === 1 ? /low|lower/.test(key) : /high|upper/.test(key);
    });
    return match ? (match.title || match.key) : name;
  });
}

function extraScoreColumns(columns) {
  return columns.filter(column => {
    const key = `${column.title || ''} ${column.key || ''}`.toLowerCase();
    return !/judge|win.?rate|low|lower|high|upper/.test(key);
  }).slice(0, 2);
}

function renderLeaderboardRows(entry, index, columns, metricTitles, scoreColumns) {
  const row = element('tr');
  row.append(element('td', 'rank-cell', entry.rank ?? index + 1));
  const entrant = element('td', 'entrant-cell');
  const handle = entry.handle;
  entrant.append(handle ? link(`#/u/${encodeURIComponent(handle)}`, `@${handle}`, 'entrant-link') : element('span', '', entry.title || 'Entrant'));
  if (entry.title) entrant.append(element('span', 'entrant-title', entry.title));
  row.append(entrant);
  for (const title of metricTitles) {
    const column = columns.find(item => (item.title || item.key) === title) || null;
    const value = valueForColumn(entry, column);
    const displayed = value ?? aliasMetric(entry, title);
    row.append(element('td', '', title === 'Judge win rate' && displayed != null ? formatPercent(displayed) : displayed == null ? '—' : String(displayed)));
  }
  for (const column of scoreColumns) {
    const score = valueForColumn(entry, column);
    row.append(element('td', '', score == null ? '—' : String(score)));
  }
  row.append(element('td', '', entry.valid ?? entry.compliant ?? '—'));
  const size = entry.dossier_bytes ?? entry.dossier_size_bytes ?? entry.size_bytes ?? entry.size ?? entry.bytes;
  row.append(element('td', 'number-cell', size == null ? '—' : formatNumber(size)));
  return row;
}

function valueForColumn(entry, column) {
  if (!column) return null;
  const key = column.key;
  return entry[key] ?? entry.values?.[key] ?? entry.values?.[column.index] ?? entry.display?.[key] ?? entry.display?.[column.index] ?? null;
}

function aliasMetric(entry, title) {
  if (title === 'Judge win rate') return entry.judge_win_rate ?? entry.win_rate ?? entry.values?.judge_win_rate;
  const interval = entry.interval || entry.confidence_interval || {};
  return title === '90% low' ? interval.low ?? entry.interval_low : interval.high ?? entry.interval_high;
}

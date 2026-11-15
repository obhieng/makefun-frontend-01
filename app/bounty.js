import { getBounty } from './api.js';
import { formatDate, formatMoney, formatNumber, timeLeft } from './format.js';
import { append, beginView, element, link, makeRefresh, metric, renderState, statusBadge } from './render.js';

export async function routeBounty(container, slug, context) {
  beginView(container, 'Competition details', 'BOUNTY');
  const loading = element('p', 'loading', 'Loading competition details…');
  container.append(loading);
  try {
    const bounty = await getBounty(slug, { refresh: context.refresh });
    if (context.generation !== context.currentGeneration()) return;
    loading.remove();
    renderBounty(container, bounty, slug, context);
  } catch (error) {
    if (context.generation !== context.currentGeneration()) return;
    loading.remove();
    renderState(container, `Competition details could not be loaded. ${error.message}`, 'error');
    container.append(link('#/', 'Back to board', 'text-link'));
  }
  if (context.generation === context.currentGeneration()) window.__shotReady = true;
}

function renderBounty(container, bounty, slug, context) {
  document.title = `${bounty.title || 'Competition'} | make.fun`;
  const intro = container.querySelector('.page-intro');
  intro.querySelector('h1').textContent = bounty.title || 'Competition details';
  const sponsor = typeof bounty.sponsor === 'string' ? bounty.sponsor : bounty.sponsor?.name;
  intro.querySelector('.eyebrow').textContent = [bounty.category, sponsor].filter(Boolean).join(' · ') || 'BOUNTY';
  intro.append(makeRefresh(() => context.navigate(location.hash, true)));
  const metrics = element('section', 'hero-metrics');
  append(metrics, metric('LIVE POT', formatMoney(bounty.potUsd), 'metric-pot'),
    metric('ENTRY FEE', bounty.entryFeeUsd == null ? 'Free' : formatMoney(bounty.entryFeeUsd)),
    metric('DEADLINE', `${formatDate(bounty.deadline)} · ${timeLeft(bounty.deadline)}`),
    metric('ENTRIES', formatNumber(bounty.submissionCount)));
  const status = element('div', 'status-line'); append(status, statusBadge(bounty.deadline), element('span', 'muted', 'Live public competition data'));
  const summary = element('section', 'content-section');
  append(summary, element('h2', '', 'Overview'), element('p', 'lead-copy', bounty.summary || 'No summary provided.'));
  if (bounty.description) summary.append(renderDescription(bounty.description));
  const grid = element('div', 'detail-grid');
  const rewards = element('section', 'content-section');
  rewards.append(element('h2', '', 'Rewards'));
  rewards.append(renderRewards(bounty.rewards, bounty.potUsd));
  const dates = element('section', 'content-section'); dates.append(element('h2', '', 'Dates'));
  const datesList = element('dl', 'date-list');
  for (const [label, value] of [['Opens', bounty.opensAt || bounty.opens_at], ['Entry deadline', bounty.deadline], ['Results due', bounty.deadlines?.result_due || bounty.resultDue || bounty.result_due]]) {
    if (value) append(datesList, element('dt', '', label), element('dd', '', formatDate(value)));
  }
  dates.append(datesList);
  append(grid, rewards, dates);
  const rules = element('details', 'rules');
  append(rules, element('summary', '', 'Competition rules'), element('pre', 'rules-copy', bounty.rules || 'No additional rules were provided.'));
  const actions = element('div', 'page-actions');
  append(actions, link(`#/bounty/${encodeURIComponent(slug)}/leaderboard`, 'View leaderboard', 'primary-link'), link('#/', '← All competitions', 'text-link'));
  append(container, metrics, status, summary, grid, rules, actions);
}

function renderDescription(markdown) {
  const content = element('div', 'description');
  let paragraph = [];
  let list = null;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const block = element('p');
    appendInlineText(block, paragraph.join(' '));
    content.append(block);
    paragraph = [];
  };
  const flushList = () => {
    if (list) content.append(list);
    list = null;
  };
  for (const rawLine of String(markdown).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph(); flushList();
      const node = element(`h${heading[1].length}`);
      appendInlineText(node, heading[2]);
      content.append(node);
      continue;
    }
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (item) {
      flushParagraph();
      if (!list) list = element('ul');
      const node = element('li');
      appendInlineText(node, item[1]);
      list.append(node);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph(); flushList();
  return content;
}

function appendInlineText(parent, text) {
  const runs = String(text).split(/(`[^`]*`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
  for (const run of runs) {
    if (!run) continue;
    const strong = /^\*\*(.+)\*\*$/.exec(run);
    const emphasis = /^(?:\*(.+)\*|_(.+)_)$/.exec(run);
    const code = /^`([^`]*)`$/.exec(run);
    if (strong) parent.append(element('strong', '', strong[1]));
    else if (emphasis) parent.append(element('em', '', emphasis[1] || emphasis[2]));
    else if (code) parent.append(element('code', '', code[1]));
    else parent.append(document.createTextNode(run));
  }
}

function renderRewards(rewardsMap, potUsd) {
  const table = element('table', 'rewards-table');
  const head = element('thead'); const header = element('tr');
  append(header, element('th', '', 'Place'), element('th', '', 'Reward'));
  head.append(header);
  const body = element('tbody');
  const entries = rewardsMap && typeof rewardsMap === 'object' ? Object.entries(rewardsMap) : [];
  entries.sort((a, b) => placeNumber(a[0]) - placeNumber(b[0]));
  for (const [place, value] of entries) {
    const row = element('tr');
    append(row, element('td', '', place.match(/^\d+$/) ? `#${place}` : place), element('td', '', formatMoney(value)));
    body.append(row);
  }
  const live = element('tr', 'total-row'); append(live, element('th', '', 'Live pot'), element('th', '', formatMoney(potUsd))); body.append(live);
  append(table, head, body);
  return table;
}

function placeNumber(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

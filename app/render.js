export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

export function append(parent, ...children) {
  for (const child of children) if (child) parent.append(child);
  return parent;
}

export function link(href, text, className = '') {
  const node = element('a', className, text);
  node.href = href;
  return node;
}

export function safePublicUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const candidate = value.trim();
  if (candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.startsWith('/\\') && !candidate.includes('\\')) return candidate;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' && parsed.origin === 'https://make.fun') return parsed.href;
  } catch {}
  return null;
}

export function statusBadge(deadline) {
  const timestamp = deadline ? new Date(deadline).getTime() : NaN;
  const accepting = Number.isFinite(timestamp) && timestamp > Date.now();
  return element('span', `status ${accepting ? 'status-live' : 'status-closed'}`, accepting ? 'Accepting entries' : 'Closed for entries');
}

export function metric(label, value, emphasis = '') {
  const box = element('div', `metric ${emphasis}`);
  append(box, element('span', 'metric-label', label), element('strong', 'metric-value', value));
  return box;
}

export function beginView(container, title, kicker = 'COMPETITIONS') {
  container.replaceChildren();
  const intro = element('div', 'page-intro');
  append(intro, element('p', 'eyebrow', kicker), element('h1', '', title));
  container.append(intro);
  return intro;
}

export function renderState(container, message, kind = 'notice') {
  container.replaceChildren(element('div', `state state-${kind}`, message));
}

export function makeRefresh(onRefresh, label = 'Refresh') {
  const button = element('button', 'icon-button', '↻');
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onRefresh);
  return button;
}

export function setShotReady(generation, currentGeneration) {
  if (generation === currentGeneration()) window.__shotReady = true;
}

export function appendText(parent, tag, className, value) {
  return parent.append(element(tag, className, value));
}

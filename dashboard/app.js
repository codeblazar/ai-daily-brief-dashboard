const config = window.AI_DAILY_BRIEF_CONFIG || {};

const mockBriefResponse = {
  ok: true,
  generated: false,
  message: 'Showing local sample data.',
  manual_regenerations_remaining: 2,
  brief: {
    date: '2026-05-24',
    title: 'AI Daily Brief - Sample',
    html: `
      <hr>
      <p>title: AI Daily Brief - 2026-05-24 tags:</p>
      <ul><li>applied-ai</li></ul>
      <h1>AI Daily Brief - Sample</h1>
      <h2>Today in One Minute</h2>
      <ul>
        <li>AI product teams are focusing on practical workflow integration.</li>
        <li>Open model ecosystems continue to improve developer choice.</li>
        <li>Educators can turn current AI news into short applied classroom activities.</li>
      </ul>
      <h2>What Happened</h2>
      <p>This placeholder brief verifies the dashboard layout without touching n8n, Data Tables, or model credits.</p>
      <h2>Try This Today</h2>
      <p>Use the latest stored brief endpoint when the workflow is approved and active.</p>
    `,
    generatedAt: new Date().toISOString(),
    sourceCount: 15,
    model: 'anthropic/claude-sonnet-4.6'
  }
};

const state = {
  latestResponse: mockBriefResponse,
  historyBriefs: [],
  briefsByDate: new Map(),
  calendarMonthDate: null,
  selectedDate: null
};

const elements = {
  title: document.querySelector('#brief-title'),
  meta: document.querySelector('#brief-meta'),
  content: document.querySelector('#brief-content'),
  topStoryMedia: document.querySelector('#top-story-media'),
  topStoryImage: document.querySelector('#top-story-image'),
  calendarMonth: document.querySelector('#calendar-month'),
  calendarGrid: document.querySelector('#calendar-grid'),
  calendarPrev: document.querySelector('#calendar-prev'),
  calendarNext: document.querySelector('#calendar-next')
};

function cleanTitle(title) {
  return String(title || 'AI Daily Brief')
    .replace(/^title:\s*/i, '')
    .replace(/\s*-\s*\d{4}-\d{2}-\d{2}\s*$/i, '')
    .replace(/\s+tags:\s*$/i, '')
    .trim() || 'AI Daily Brief';
}

function isFrontmatterText(text) {
  const value = String(text || '').trim().toLowerCase();
  return value === 'applied-ai'
    || value === '- applied-ai'
    || value === 'tags:'
    || value.includes('title: ai daily brief')
    || value.includes('tags:');
}

function linkifyPlainUrls(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || parent.closest('a, code, pre, script, style')) continue;
    if (/https?:\/\/\S+/i.test(node.textContent || '')) {
      textNodes.push(node);
    }
  }

  for (const node of textNodes) {
    const fragment = document.createDocumentFragment();
    const text = node.textContent || '';
    let lastIndex = 0;

    for (const match of text.matchAll(/https?:\/\/\S+/gi)) {
      const rawUrl = match[0];
      const start = match.index ?? 0;
      const url = rawUrl.replace(/[.,;:!?)]*$/g, '');
      const trailing = rawUrl.slice(url.length);

      if (start > lastIndex) {
        fragment.append(document.createTextNode(text.slice(lastIndex, start)));
      }

      const link = document.createElement('a');
      link.href = url;
      link.textContent = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      fragment.append(link);

      if (trailing) {
        fragment.append(document.createTextNode(trailing));
      }

      lastIndex = start + rawUrl.length;
    }

    if (lastIndex < text.length) {
      fragment.append(document.createTextNode(text.slice(lastIndex)));
    }

    node.replaceWith(fragment);
  }
}

function cleanBriefHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '<p>The generated brief did not include HTML content.</p>';
  const root = template.content;

  for (const rule of root.querySelectorAll('hr')) {
    rule.remove();
  }

  const children = Array.from(root.children);

  for (const child of children) {
    const tag = child.tagName.toLowerCase();
    const text = child.textContent || '';
    if (isFrontmatterText(text)) {
      child.remove();
      continue;
    }
    break;
  }

  const firstHeading = root.querySelector('h1');
  if (firstHeading && cleanTitle(firstHeading.textContent) === 'AI Daily Brief') {
    firstHeading.remove();
  }

  for (const heading of root.querySelectorAll('h2')) {
    if (heading.textContent.trim().toLowerCase() === 'links') {
      const section = document.createElement('section');
      section.className = 'links-section';
      heading.before(section);
      section.append(heading);

      let current = section.nextSibling;
      while (current) {
        const next = current.nextSibling;
        section.append(current);
        current = next;
      }
      break;
    }
  }

  linkifyPlainUrls(root);

  return root;
}

function parseDateKey(dateKey) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3])
  };
}

function getMonthDate(dateKey) {
  const parts = parseDateKey(dateKey);
  if (!parts) return new Date();
  return new Date(parts.year, parts.monthIndex, 1);
}

function getDateKey(year, monthIndex, day) {
  return [
    year,
    String(monthIndex + 1).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-');
}

function shiftMonth(monthDate, amount) {
  return new Date(monthDate.getFullYear(), monthDate.getMonth() + amount, 1);
}

function getLatestHistoryMonth() {
  const latest = state.historyBriefs[0];
  return latest?.date ? getMonthDate(latest.date) : getMonthDate(state.selectedDate);
}

function isSameOrAfterMonth(left, right) {
  return left.getFullYear() > right.getFullYear()
    || (left.getFullYear() === right.getFullYear() && left.getMonth() >= right.getMonth());
}

function renderCalendar() {
  if (!elements.calendarMonth || !elements.calendarGrid) return;

  if (!state.calendarMonthDate) {
    state.calendarMonthDate = getLatestHistoryMonth();
  }

  const monthDate = state.calendarMonthDate;
  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;

  elements.calendarMonth.textContent = monthDate.toLocaleDateString('en-SG', {
    month: 'long',
    year: 'numeric'
  });
  elements.calendarGrid.replaceChildren();

  for (let index = 0; index < mondayOffset; index += 1) {
    const empty = document.createElement('span');
    empty.className = 'calendar-empty';
    elements.calendarGrid.append(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = getDateKey(year, monthIndex, day);
    const summary = state.briefsByDate.get(dateKey);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    button.textContent = String(day);

    if (summary) {
      button.classList.add('has-brief');
      button.title = summary.title || `AI Daily Brief ${dateKey}`;
      button.addEventListener('click', () => loadBriefFromSummary(summary));
    } else {
      button.disabled = true;
    }

    if (dateKey === state.selectedDate) {
      button.classList.add('is-selected');
      button.setAttribute('aria-current', 'date');
    }

    elements.calendarGrid.append(button);
  }

  const latestMonth = getLatestHistoryMonth();
  elements.calendarNext.disabled = isSameOrAfterMonth(monthDate, latestMonth);
}

function renderResponse(response) {
  const brief = response?.brief ?? response;

  if (!brief) {
    elements.title.textContent = 'No brief available';
    elements.meta.textContent = 'No GitHub brief has been published yet.';
    elements.content.innerHTML = '<p>No generated brief was returned.</p>';
    renderTopStoryImage(null);
    return;
  }

  state.selectedDate = brief.date || state.selectedDate;
  if (!state.calendarMonthDate && state.selectedDate) {
    state.calendarMonthDate = getMonthDate(state.selectedDate);
  }

  elements.title.textContent = cleanTitle(brief.title);
  elements.meta.textContent = [
    brief.date ? `Brief date: ${brief.date}` : '',
    brief.sourceCount ? `${brief.sourceCount} sources` : ''
  ].filter(Boolean).join(' | ');
  elements.content.replaceChildren(cleanBriefHtml(brief.html));
  renderTopStoryImage(brief);
  placeTopStoryImage();
  renderCalendar();
}

function renderTopStoryImage(brief) {
  const imageUrl = brief?.imageUrl || '';
  if (!imageUrl) {
    elements.topStoryMedia.classList.add('is-hidden');
    elements.topStoryImage.removeAttribute('src');
    elements.topStoryImage.alt = '';
    return;
  }

  elements.topStoryImage.src = imageUrl;
  elements.topStoryImage.alt = brief.imageTopic
    ? `AI Daily Brief top story image about ${brief.imageTopic}`
    : 'AI Daily Brief top story image';
  elements.topStoryMedia.classList.remove('is-hidden');
}

function placeTopStoryImage() {
  if (elements.topStoryMedia.classList.contains('is-hidden')) {
    return;
  }

  const todayHeading = Array.from(elements.content.querySelectorAll('h2'))
    .find(heading => heading.textContent.trim().toLowerCase() === 'today in one minute');

  if (!todayHeading) {
    elements.content.prepend(elements.topStoryMedia);
    return;
  }

  const firstContent = todayHeading.nextElementSibling;
  const layout = document.createElement('section');
  layout.className = 'one-minute-layout';
  const body = document.createElement('div');
  body.className = 'one-minute-body';
  const copy = document.createElement('div');
  copy.className = 'one-minute-copy';

  todayHeading.before(layout);
  layout.append(todayHeading, body);
  body.append(elements.topStoryMedia, copy);

  let current = firstContent;
  while (current) {
    const next = current.nextElementSibling;
    copy.append(current);
    if (!next || next.tagName.toLowerCase() === 'h2') {
      break;
    }
    current = next;
  }
}

function renderInitialBrief() {
  state.historyBriefs = [{
    date: mockBriefResponse.brief.date,
    title: mockBriefResponse.brief.title,
    briefUrl: '',
    imageUrl: mockBriefResponse.brief.imageUrl
  }];
  state.briefsByDate = new Map(state.historyBriefs.map(brief => [brief.date, brief]));
  renderResponse(state.latestResponse);
}

async function fetchBriefPayload(summary) {
  const briefResponse = await fetch(summary.briefUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!briefResponse.ok) {
    throw new Error(`GitHub brief returned HTTP ${briefResponse.status}`);
  }

  const brief = await briefResponse.json();
  return {
    ok: true,
    brief: {
      ...summary,
      ...brief,
      imageUrl: brief.imageUrl || summary.imageUrl,
      briefUrl: summary.briefUrl
    }
  };
}

async function loadBriefFromSummary(summary) {
  if (!summary?.briefUrl) return;

  try {
    const payload = await fetchBriefPayload(summary);
    state.latestResponse = payload;
    state.calendarMonthDate = getMonthDate(summary.date);
    renderResponse(payload);
  } catch (error) {
    elements.meta.textContent = 'Could not load that GitHub brief.';
  }
}

async function loadLatestBrief() {
  if (config.mockMode || !config.historyIndexUrl) {
    renderInitialBrief();
    return;
  }

  try {
    const indexResponse = await fetch(config.historyIndexUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!indexResponse.ok) {
      throw new Error(`GitHub history returned HTTP ${indexResponse.status}`);
    }

    const history = await indexResponse.json();
    state.historyBriefs = Array.isArray(history.briefs) ? history.briefs : [];
    state.briefsByDate = new Map(state.historyBriefs
      .filter(brief => brief.date)
      .map(brief => [brief.date, brief]));
    const latest = state.historyBriefs[0] ?? null;

    if (!latest?.briefUrl) {
      throw new Error('GitHub history did not include a latest brief URL');
    }

    const payload = await fetchBriefPayload(latest);
    state.latestResponse = payload;
    state.calendarMonthDate = getMonthDate(latest.date);
    renderResponse(payload);
  } catch (error) {
    renderInitialBrief();
    elements.meta.textContent = 'Could not load the latest GitHub brief. Showing sample content.';
  }
}

elements.calendarPrev?.addEventListener('click', () => {
  state.calendarMonthDate = shiftMonth(state.calendarMonthDate || getLatestHistoryMonth(), -1);
  renderCalendar();
});

elements.calendarNext?.addEventListener('click', () => {
  state.calendarMonthDate = shiftMonth(state.calendarMonthDate || getLatestHistoryMonth(), 1);
  renderCalendar();
});

loadLatestBrief();

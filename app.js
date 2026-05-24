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
  latestResponse: mockBriefResponse
};

const elements = {
  title: document.querySelector('#brief-title'),
  meta: document.querySelector('#brief-meta'),
  content: document.querySelector('#brief-content')
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

  return root;
}

function renderResponse(response) {
  const brief = response?.brief;

  if (!brief) {
    elements.title.textContent = 'No brief available';
    elements.meta.textContent = 'The workflow has not returned a stored brief yet.';
    elements.content.innerHTML = '<p>No generated brief was returned.</p>';
    return;
  }

  elements.title.textContent = cleanTitle(brief.title);
  elements.meta.textContent = [
    brief.date ? `Brief date: ${brief.date}` : '',
    brief.sourceCount ? `${brief.sourceCount} sources` : ''
  ].filter(Boolean).join(' | ');
  elements.content.replaceChildren(cleanBriefHtml(brief.html));
}

function renderInitialBrief() {
  renderResponse(state.latestResponse);
}

async function loadLatestBrief() {
  if (config.mockMode || !config.latestBriefUrl) {
    renderInitialBrief();
    return;
  }

  try {
    const response = await fetch(config.latestBriefUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`n8n returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    state.latestResponse = payload;
    renderResponse(payload);
  } catch (error) {
    renderInitialBrief();
    elements.meta.textContent = 'Could not load the latest stored brief. Showing sample content.';
  }
}

loadLatestBrief();

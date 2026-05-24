import { workflow, node, trigger, languageModel, newCredential, expr } from '@n8n/workflow-sdk';

const BRIEFS_TABLE_ID = 'lh1jMAPbZKOePQYO';
const SOURCES_TABLE_ID = 'qrKLwtq8qmPfJhzJ';
const RUNS_TABLE_ID = 'v0OAqZFEu8010QtJ';
const IMAGE_MODEL = 'gpt-image-1-mini';
const IMAGE_REPO_OWNER = 'codeblazar';
const IMAGE_REPO_NAME = 'ai-daily-brief-dashboard';
const IMAGE_REPO_BRANCH = 'main';

const dailySchedule = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Daily 6 AM Schedule',
    position: [240, 160],
    parameters: {
      rule: {
        interval: [
          {
            field: 'days',
            daysInterval: 1,
            triggerAtHour: 6,
            triggerAtMinute: 0
          }
        ]
      }
    }
  },
  output: [{ scheduled: true }]
});

const manualEditorTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Manual Test Trigger',
    position: [240, 680],
    parameters: {}
  },
  output: [{ editorManual: true }]
});

const prepareContext = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Run Context',
    position: [560, 300],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nconst input = $input.first()?.json ?? {};\nconst now = new Date();\nconst singapore = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));\nconst yyyy = singapore.getFullYear();\nconst mm = String(singapore.getMonth() + 1).padStart(2, '0');\nconst dd = String(singapore.getDate()).padStart(2, '0');\nconst briefDate = yyyy + '-' + mm + '-' + dd;\nconst isManual = Boolean(input.editorManual);\nreturn [{\n  json: {\n    brief_date: briefDate,\n    started_at: now.toISOString(),\n    trigger_source: isManual ? 'manual' : 'scheduled',\n    run_id: briefDate + '-' + (isManual ? 'manual' : 'scheduled') + '-' + now.getTime(),\n    model: 'anthropic/claude-sonnet-4.6',\n    image_model: 'gpt-image-1-mini'\n  }\n}];\n"
    }
  },
  output: [{
    brief_date: '2026-05-24',
    started_at: '2026-05-24T22:00:00.000Z',
    trigger_source: 'manual',
    run_id: '2026-05-24-manual-1779592800000',
    model: 'anthropic/claude-sonnet-4.6',
    image_model: IMAGE_MODEL
  }]
});

const createFeedRequests = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Create Feed Requests',
    position: [860, 160],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nconst feeds = [\n  { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml' },\n  { name: 'Google Blog AI', url: 'https://blog.google/rss/' },\n  { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss' },\n  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },\n  { name: 'LangChain', url: 'https://blog.langchain.dev/rss/' },\n  { name: 'Weights & Biases', url: 'https://wandb.ai/fully-connected/rss.xml' },\n  { name: 'DeepLearning.AI The Batch', url: 'https://www.deeplearning.ai/the-batch/feed/' },\n  { name: 'Import AI Jack Clark', url: 'https://jack-clark.net/feed/' },\n  { name: 'fast.ai', url: 'https://www.fast.ai/index.xml' },\n  { name: 'Towards Data Science', url: 'https://towardsdatascience.com/feed' },\n  { name: 'TechCrunch AI', url: 'https://techcrunch.com/tag/artificial-intelligence/feed/' },\n  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },\n  { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/' },\n  { name: 'InfoWorld AI', url: 'https://www.infoworld.com/category/machine-learning/index.rss' }\n];\nreturn feeds.map(feed => ({ json: feed }));\n"
    }
  },
  output: [{
    name: 'OpenAI News',
    url: 'https://openai.com/news/rss.xml'
  }]
});

const fetchFeedXml = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Fetch RSS Feed XML',
    position: [1160, 160],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.url }}'),
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'User-Agent', value: 'n8n-ai-daily-brief/1.0' }
        ]
      },
      options: {
        timeout: 15000,
        response: {
          responseFormat: 'text',
          outputPropertyName: 'xml',
          neverError: true
        },
        batching: {
          batch: {
            batchSize: 5,
            batchInterval: 1000
          }
        }
      }
    }
  },
  output: [{
    xml: '<rss><channel><item><title>Example</title><link>https://example.com</link></item></channel></rss>'
  }]
});

const buildPromptFromRssResponses = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Prompt From RSS Responses',
    position: [1460, 160],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nconst context = $('Prepare Run Context').first().json;\nconst requests = $('Create Feed Requests').all().map(item => item.json);\n\nfunction strip(value = '') {\n  return String(value).replace(/<!\\[CDATA\\[(.*?)\\]\\]>/gs, '$1').replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();\n}\n\nfunction tag(block, name) {\n  const match = block.match(new RegExp('<' + name + '[^>]*>([\\\\s\\\\S]*?)<\\\\/' + name + '>', 'i'));\n  return match ? strip(match[1]) : '';\n}\n\nconst items = [];\nconst failures = [];\nfor (const [index, item] of $input.all().entries()) {\n  const request = requests[index] ?? item.json;\n  const feedName = request.name ?? item.json.name ?? 'Unknown feed';\n  const xml = item.json.xml ?? item.json.data ?? item.json.body ?? '';\n  const statusCode = Number(item.json.statusCode ?? item.json.status ?? 200);\n  if (!xml || statusCode >= 400 || item.json.error) {\n    failures.push(feedName + ': RSS request failed');\n    continue;\n  }\n  const blocks = [...String(xml).matchAll(/<item[\\s\\S]*?<\\/item>|<entry[\\s\\S]*?<\\/entry>/gi)].slice(0, 3).map(match => match[0]);\n  if (blocks.length === 0) {\n    failures.push(feedName + ': no feed items found');\n    continue;\n  }\n  for (const block of blocks) {\n    const title = tag(block, 'title') || 'Untitled';\n    const link = tag(block, 'link') || (block.match(/<link[^>]*href=[\"']([^\"']+)[\"']/i)?.[1] ?? '');\n    const published = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || new Date().toISOString();\n    const guid = tag(block, 'guid') || tag(block, 'id') || link || title;\n    items.push({ title, link, source: feedName, published, guid });\n  }\n}\n\nif (items.length === 0) {\n  throw new Error('All RSS feeds failed. ' + failures.join('; '));\n}\n\nconst unique = new Map();\nfor (const item of items) {\n  const key = item.link || item.guid || item.source + ':' + item.title;\n  if (!unique.has(key)) unique.set(key, item);\n}\n\nconst selected = [...unique.values()]\n  .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())\n  .slice(0, 15)\n  .map(item => {\n    const hashSource = item.source + '|' + item.title + '|' + (item.link || item.guid);\n    let hash = 0;\n    for (let i = 0; i < hashSource.length; i++) hash = ((hash << 5) - hash + hashSource.charCodeAt(i)) | 0;\n    return { ...item, hash: String(Math.abs(hash)) };\n  });\n\nconst feedSummary = selected.map(item => '- ' + item.title + ' - ' + item.source + ' - ' + item.link).join('\\n');\nconst prompt = [\n  'You are generating a daily Artificial Intelligence briefing.',\n  '',\n  'Audience:',\n  '- IT and AI instructors',\n  '- Practitioners',\n  '',\n  'Constraints:',\n  '- 5 to 10 minute read',\n  '- Practical',\n  '- Plain English',\n  '- Markdown only',\n  '',\n  'Structure:',\n  '',\n  '---',\n  'title: AI Daily Brief - ' + context.brief_date,\n  'tags:',\n  '  - applied-ai',\n  '---',\n  '',\n  'Source material from RSS feeds, recent headlines:',\n  '',\n  feedSummary,\n  '',\n  '## Today in One Minute',\n  '(3 bullets)',\n  '',\n  '## What Happened',\n  '',\n  '## Why It Matters',\n  '',\n  '## Try This Today',\n  '',\n  '## Teaching Angle',\n  '',\n  '## Links'\n].join('\\n');\n\nreturn [{\n  json: {\n    ...context,\n    prompt,\n    source_items: selected,\n    source_count: selected.length,\n    rss_failures: failures\n  }\n}];\n"
    }
  },
  output: [{
    brief_date: '2026-05-24',
    prompt: 'You are generating a daily Artificial Intelligence briefing.',
    source_count: 15,
    source_items: [{ title: 'Example', source: 'OpenAI News', link: 'https://example.com', published: '2026-05-24', guid: 'example', hash: '123' }]
  }]
});

const openRouterModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
  version: 1,
  config: {
    name: 'OpenRouter Claude Sonnet',
    position: [1760, 420],
    parameters: {
      model: 'anthropic/claude-sonnet-4.6',
      options: {
        temperature: 0.4,
        maxTokens: 5000,
        timeout: 360000,
        maxRetries: 2
      }
    },
    credentials: { openRouterApi: newCredential('OpenRouter account (PKE)') }
  }
});

const generateBrief = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Generate Brief',
    position: [1760, 160],
    parameters: {
      promptType: 'define',
      text: expr('{{ $json.prompt }}'),
      enableStreaming: false,
      options: {
        systemMessage: 'Write concise practical briefings for AI instructors and practitioners. Return Markdown only. Preserve the requested headings.',
        maxIterations: 3,
        returnIntermediateSteps: false
      }
    },
    subnodes: { model: openRouterModel }
  },
  output: [{ output: '# AI Daily Brief\n\n## Today in One Minute\n- Example' }]
});

const markdownToHtml = node({
  type: 'n8n-nodes-base.markdown',
  version: 1,
  config: {
    name: 'Convert Markdown To HTML',
    position: [2060, 160],
    parameters: {
      mode: 'markdownToHtml',
      markdown: expr('{{ $json.output }}'),
      destinationKey: 'html',
      options: {
        openLinksInNewWindow: true,
        ghCodeBlocks: true,
        tables: true,
        simpleLineBreaks: false
      }
    }
  },
  output: [{ output: '# AI Daily Brief', html: '<h1>AI Daily Brief</h1>' }]
});

const prepareTopStoryImagePrompt = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Top Story Image Prompt',
    position: [2360, 160],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nconst context = $('Build Prompt From RSS Responses').first().json;\nconst items = context.source_items ?? [];\nconst text = items.map(item => [item.title, item.source].join(' ')).join(' ');\nconst knownTopics = ['NVIDIA', 'OpenAI', 'Google', 'Anthropic', 'Microsoft', 'Meta', 'Apple', 'Amazon', 'DeepSeek'];\nconst topic = knownTopics.find(name => new RegExp('\\\\b' + name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '\\\\b', 'i').test(text))\n  ?? (items[0]?.title ?? 'Artificial intelligence');\nconst imagePath = 'images/ai-daily-brief/' + context.brief_date + '/top-story.png';\nconst briefPath = 'briefs/ai-daily-brief/' + context.brief_date + '/brief.json';\nconst prompt = [\n  'Create a square editorial briefing image for an AI daily news dashboard.',\n  'Topic: ' + topic + '.',\n  'Use a clean, modern technology editorial style with abstract hardware, data, and research motifs.',\n  'No readable text, no fake UI, no logos, no charts with numbers, no photorealistic news claims.',\n  'Professional, sharp, high contrast, suitable beside a top story card.'\n].join(' ');\nreturn [{\n  json: {\n    ...context,\n    image_topic: topic,\n    image_prompt: prompt,\n    image_model: 'gpt-image-1-mini',\n    image_path: imagePath,\n    brief_path: briefPath\n  }\n}];\n"
    }
  },
  output: [{
    image_topic: 'NVIDIA',
    image_prompt: 'Create a square editorial briefing image for an AI daily news dashboard.',
    image_model: IMAGE_MODEL,
    image_path: 'images/ai-daily-brief/2026-05-24/top-story.png',
    brief_path: 'briefs/ai-daily-brief/2026-05-24/brief.json'
  }]
});

const generateTopStoryImage = node({
  type: '@n8n/n8n-nodes-langchain.openAi',
  version: 2.3,
  config: {
    name: 'Generate Top Story Image',
    position: [2660, 160],
    parameters: {
      resource: 'image',
      operation: 'generate',
      modelId: { __rl: true, mode: 'list', value: IMAGE_MODEL, cachedResultName: IMAGE_MODEL },
      prompt: expr('{{ $json.image_prompt }}'),
      options: {
        quality: 'medium',
        size: '1024x1024',
        binaryPropertyOutput: 'data'
      }
    },
    credentials: { openAiApi: newCredential('OpenAI') }
  },
  output: [{ image_prompt: 'Create a square editorial briefing image for an AI daily news dashboard.' }]
});

const prepareImageUpload = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Image Upload',
    position: [2960, 160],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nconst context = $('Prepare Top Story Image Prompt').first().json;\nconst current = $input.first() ?? {};\nconst baseUrl = 'https://raw.githubusercontent.com/codeblazar/ai-daily-brief-dashboard/main/';\nreturn [{\n  json: {\n    ...context,\n    image_repo_owner: 'codeblazar',\n    image_repo_name: 'ai-daily-brief-dashboard',\n    image_repo_branch: 'main',\n    image_url: baseUrl + context.image_path,\n    brief_url: baseUrl + context.brief_path,\n    history_index_path: 'briefs/ai-daily-brief/index.json',\n    history_index_url: baseUrl + 'briefs/ai-daily-brief/index.json'\n  },\n  binary: current.binary ?? {}\n}];\n"
    }
  },
  output: [{
    brief_date: '2026-05-24',
    started_at: '2026-05-24T22:00:00.000Z',
    trigger_source: 'manual',
    run_id: '2026-05-24-manual-1779592800000',
    model: 'anthropic/claude-sonnet-4.6',
    source_count: 15,
    image_path: 'images/ai-daily-brief/2026-05-24/top-story.png',
    brief_path: 'briefs/ai-daily-brief/2026-05-24/brief.json',
    image_repo_owner: IMAGE_REPO_OWNER,
    image_repo_name: IMAGE_REPO_NAME,
    image_repo_branch: IMAGE_REPO_BRANCH,
    image_url: 'https://raw.githubusercontent.com/codeblazar/ai-daily-brief-dashboard/main/images/ai-daily-brief/2026-05-24/top-story.png',
    brief_url: 'https://raw.githubusercontent.com/codeblazar/ai-daily-brief-dashboard/main/briefs/ai-daily-brief/2026-05-24/brief.json',
    history_index_path: 'briefs/ai-daily-brief/index.json',
    history_index_url: 'https://raw.githubusercontent.com/codeblazar/ai-daily-brief-dashboard/main/briefs/ai-daily-brief/index.json'
  }]
});

const uploadTopStoryImage = node({
  type: 'n8n-nodes-base.github',
  version: 1.1,
  config: {
    name: 'Upload Top Story Image To GitHub',
    position: [3260, 160],
    parameters: {
      resource: 'file',
      operation: 'create',
      authentication: 'accessToken',
      owner: { __rl: true, mode: 'name', value: IMAGE_REPO_OWNER, cachedResultName: IMAGE_REPO_OWNER },
      repository: { __rl: true, mode: 'name', value: IMAGE_REPO_NAME, cachedResultName: IMAGE_REPO_NAME },
      filePath: expr('{{ $json.image_path }}'),
      binaryData: true,
      binaryPropertyName: 'data',
      commitMessage: expr('Add AI Daily Brief top story image {{ $("Prepare Image Upload").item.json.brief_date }}'),
      additionalParameters: {
        branch: {
          branch: IMAGE_REPO_BRANCH
        }
      }
    },
    credentials: { githubApi: newCredential('GitHub') }
  },
  output: [{
    content: {
      download_url: 'https://raw.githubusercontent.com/codeblazar/ai-daily-brief-dashboard/main/images/ai-daily-brief/2026-05-24/top-story.png'
    }
  }]
});

const prepareBriefRow = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Brief Row',
    position: [3560, 160],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nconst context = $('Prepare Image Upload').first().json;\nconst generated = $('Generate Brief').first().json;\nconst converted = $('Convert Markdown To HTML').first().json;\nconst upload = $('Upload Top Story Image To GitHub').first().json ?? {};\nconst markdown = generated.output || generated.text || generated.response || '';\nconst titleMatch = markdown.match(/^#\\s+(.+)$/m) || markdown.match(/^title:\\s*(.+)$/m);\nconst now = new Date().toISOString();\nreturn [{\n  json: {\n    ...context,\n    title: titleMatch ? titleMatch[1].trim() : 'AI Daily Brief - ' + context.brief_date,\n    markdown,\n    html: converted.html || '',\n    image_url: upload.content?.download_url || context.image_url,\n    image_prompt: context.image_prompt,\n    image_topic: context.image_topic,\n    image_model: context.image_model,\n    generated_at: now,\n    finished_at: now,\n    status: 'success',\n    generation_number: 1\n  }\n}];\n"
    }
  },
  output: [{
    brief_date: '2026-05-24',
    title: 'AI Daily Brief - 2026-05-24',
    markdown: '# AI Daily Brief',
    html: '<h1>AI Daily Brief</h1>',
    generated_at: '2026-05-24T22:05:00.000Z',
    source_count: 15,
    model: 'anthropic/claude-sonnet-4.6',
    status: 'success',
    trigger_source: 'manual',
    generation_number: 1,
    image_url: '',
    image_prompt: 'Create a square editorial briefing image for an AI daily news dashboard.',
    image_topic: 'NVIDIA',
    image_model: IMAGE_MODEL
  }]
});

const prepareSourceRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Source Rows',
    position: [3560, 160],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nconst brief = $('Prepare Brief Row').first().json;\nreturn brief.source_items.map(item => ({\n  json: {\n    brief_date: brief.brief_date,\n    source: item.source,\n    title: item.title,\n    link: item.link,\n    published: item.published,\n    guid: item.guid,\n    hash: brief.brief_date + '-' + item.hash\n  }\n}));\n"
    }
  },
  output: [{
    brief_date: '2026-05-24',
    source: 'OpenAI News',
    title: 'Example',
    link: 'https://example.com',
    published: '2026-05-24',
    guid: 'example',
    hash: '2026-05-24-123'
  }]
});

const prepareBriefJsonUpload = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Brief JSON Upload',
    position: [3860, 160],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nconst brief = $('Prepare Brief Row').first().json;\nconst payload = {\n  date: brief.brief_date,\n  title: brief.title,\n  markdown: brief.markdown,\n  html: brief.html,\n  generatedAt: brief.generated_at,\n  sourceCount: brief.source_count,\n  model: brief.model,\n  imageUrl: brief.image_url,\n  imagePrompt: brief.image_prompt,\n  imageTopic: brief.image_topic,\n  imageModel: brief.image_model,\n  sources: brief.source_items ?? []\n};\nreturn [{\n  json: {\n    ...brief,\n    brief_json: JSON.stringify(payload, null, 2) + '\\n'\n  }\n}];\n"
    }
  },
  output: [{
    brief_date: '2026-05-24',
    title: 'AI Daily Brief - 2026-05-24',
    generated_at: '2026-05-24T22:05:00.000Z',
    source_count: 15,
    model: 'anthropic/claude-sonnet-4.6',
    image_url: 'https://raw.githubusercontent.com/codeblazar/ai-daily-brief-dashboard/main/images/ai-daily-brief/2026-05-24/top-story.png',
    image_topic: 'NVIDIA',
    brief_path: 'briefs/ai-daily-brief/2026-05-24/brief.json',
    brief_url: 'https://raw.githubusercontent.com/codeblazar/ai-daily-brief-dashboard/main/briefs/ai-daily-brief/2026-05-24/brief.json',
    history_index_url: 'https://raw.githubusercontent.com/codeblazar/ai-daily-brief-dashboard/main/briefs/ai-daily-brief/index.json',
    brief_json: '{}'
  }]
});

const uploadBriefJson = node({
  type: 'n8n-nodes-base.github',
  version: 1.1,
  config: {
    name: 'Upload Brief JSON To GitHub',
    position: [4160, 160],
    parameters: {
      resource: 'file',
      operation: 'create',
      authentication: 'accessToken',
      owner: { __rl: true, mode: 'name', value: IMAGE_REPO_OWNER, cachedResultName: IMAGE_REPO_OWNER },
      repository: { __rl: true, mode: 'name', value: IMAGE_REPO_NAME, cachedResultName: IMAGE_REPO_NAME },
      filePath: expr('{{ $json.brief_path }}'),
      fileContent: expr('{{ $json.brief_json }}'),
      commitMessage: expr('Add AI Daily Brief JSON {{ $json.brief_date }}'),
      additionalParameters: {
        branch: {
          branch: IMAGE_REPO_BRANCH
        }
      }
    },
    credentials: { githubApi: newCredential('GitHub') }
  },
  output: [{
    content: {
      download_url: 'https://raw.githubusercontent.com/codeblazar/ai-daily-brief-dashboard/main/briefs/ai-daily-brief/2026-05-24/brief.json'
    }
  }]
});

const fetchHistoryIndex = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Fetch History Index',
    position: [4460, 160],
    parameters: {
      method: 'GET',
      url: expr('{{ $("Prepare Brief JSON Upload").item.json.history_index_url }}'),
      options: {
        response: {
          responseFormat: 'text',
          outputPropertyName: 'index_json',
          neverError: true
        }
      }
    }
  },
  output: [{ index_json: '{ "briefs": [] }' }]
});

const prepareHistoryIndexUpload = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare History Index Upload',
    position: [4760, 160],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nconst brief = $('Prepare Brief JSON Upload').first().json;\nconst current = $input.first()?.json ?? {};\nlet parsed;\ntry {\n  parsed = JSON.parse(current.index_json || current.data || current.body || '{\"briefs\":[]}');\n} catch (error) {\n  parsed = { briefs: [] };\n}\nconst briefs = Array.isArray(parsed.briefs) ? parsed.briefs : [];\nconst summary = {\n  date: brief.brief_date,\n  title: brief.title,\n  generatedAt: brief.generated_at,\n  sourceCount: brief.source_count,\n  imageUrl: brief.image_url,\n  briefUrl: brief.brief_url,\n  imageTopic: brief.image_topic\n};\nconst nextBriefs = [summary, ...briefs.filter(item => item.date !== brief.brief_date)]\n  .sort((a, b) => String(b.date).localeCompare(String(a.date)));\nreturn [{\n  json: {\n    ...brief,\n    history_index_json: JSON.stringify({ briefs: nextBriefs }, null, 2) + '\\n'\n  }\n}];\n"
    }
  },
  output: [{
    brief_date: '2026-05-24',
    history_index_path: 'briefs/ai-daily-brief/index.json',
    history_index_json: '{ "briefs": [] }'
  }]
});

const updateHistoryIndex = node({
  type: 'n8n-nodes-base.github',
  version: 1.1,
  config: {
    name: 'Update History Index In GitHub',
    position: [5060, 160],
    parameters: {
      resource: 'file',
      operation: 'edit',
      authentication: 'accessToken',
      owner: { __rl: true, mode: 'name', value: IMAGE_REPO_OWNER, cachedResultName: IMAGE_REPO_OWNER },
      repository: { __rl: true, mode: 'name', value: IMAGE_REPO_NAME, cachedResultName: IMAGE_REPO_NAME },
      filePath: expr('{{ $json.history_index_path }}'),
      fileContent: expr('{{ $json.history_index_json }}'),
      commitMessage: expr('Update AI Daily Brief history index {{ $json.brief_date }}'),
      additionalParameters: {
        branch: {
          branch: IMAGE_REPO_BRANCH
        }
      }
    },
    credentials: { githubApi: newCredential('GitHub') }
  },
  output: [{ content: { path: 'briefs/ai-daily-brief/index.json' } }]
});

const upsertSourceRows = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Upsert Source Rows',
    position: [3860, 160],
    parameters: {
      resource: 'row',
      operation: 'upsert',
      dataTableId: { __rl: true, mode: 'id', value: SOURCES_TABLE_ID, cachedResultName: 'AI_Daily_Brief_Sources' },
      matchType: 'allConditions',
      filters: {
        conditions: [
          { keyName: 'hash', condition: 'eq', keyValue: expr('{{ $json.hash }}') }
        ]
      },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          brief_date: expr('{{ $json.brief_date }}'),
          source: expr('{{ $json.source }}'),
          title: expr('{{ $json.title }}'),
          link: expr('{{ $json.link }}'),
          published: expr('{{ $json.published }}'),
          guid: expr('{{ $json.guid }}'),
          hash: expr('{{ $json.hash }}')
        },
        matchingColumns: ['hash']
      }
    }
  },
  output: [{ id: 1 }]
});

const restoreBriefRow = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Restore Brief Row',
    position: [4160, 160],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nreturn [{ json: $('Prepare Brief Row').first().json }];\n"
    }
  },
  output: [{
    brief_date: '2026-05-24',
    title: 'AI Daily Brief - 2026-05-24',
    markdown: '# AI Daily Brief',
    html: '<h1>AI Daily Brief</h1>',
    generated_at: '2026-05-24T22:05:00.000Z',
    source_count: 15,
    model: 'anthropic/claude-sonnet-4.6',
    status: 'success',
    trigger_source: 'manual',
    generation_number: 1,
    image_url: 'https://raw.githubusercontent.com/codeblazar/ai-daily-brief-dashboard/main/images/ai-daily-brief/2026-05-24/top-story.png',
    image_prompt: 'Create a square editorial briefing image for an AI daily news dashboard.',
    image_topic: 'NVIDIA',
    image_model: IMAGE_MODEL
  }]
});

const upsertBrief = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Upsert Brief',
    position: [4460, 160],
    parameters: {
      resource: 'row',
      operation: 'upsert',
      dataTableId: { __rl: true, mode: 'id', value: BRIEFS_TABLE_ID, cachedResultName: 'AI_Daily_Briefs' },
      matchType: 'allConditions',
      filters: {
        conditions: [
          { keyName: 'brief_date', condition: 'eq', keyValue: expr('{{ $json.brief_date }}') }
        ]
      },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          brief_date: expr('{{ $json.brief_date }}'),
          title: expr('{{ $json.title }}'),
          markdown: expr('{{ $json.markdown }}'),
          html: expr('{{ $json.html }}'),
          generated_at: expr('{{ $json.generated_at }}'),
          source_count: expr('{{ $json.source_count }}'),
          model: expr('{{ $json.model }}'),
          status: expr('{{ $json.status }}'),
          trigger_source: expr('{{ $json.trigger_source }}'),
          generation_number: expr('{{ $json.generation_number }}'),
          image_url: expr('{{ $json.image_url }}'),
          image_prompt: expr('{{ $json.image_prompt }}'),
          image_topic: expr('{{ $json.image_topic }}'),
          image_model: expr('{{ $json.image_model }}')
        },
        matchingColumns: ['brief_date']
      }
    }
  },
  output: [{ id: 1 }]
});

const restoreBriefForRun = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Restore Brief For Run Log',
    position: [4760, 160],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nreturn [{ json: $('Prepare Brief Row').first().json }];\n"
    }
  },
  output: [{
    run_id: '2026-05-24-manual-1779592800000',
    brief_date: '2026-05-24',
    started_at: '2026-05-24T22:00:00.000Z',
    finished_at: '2026-05-24T22:05:00.000Z',
    status: 'success',
    trigger_source: 'manual'
  }]
});

const insertSuccessRun = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Insert Success Run',
    position: [5060, 160],
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'id', value: RUNS_TABLE_ID, cachedResultName: 'AI_Daily_Brief_Runs' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          run_id: expr('{{ $json.run_id }}'),
          brief_date: expr('{{ $json.brief_date }}'),
          started_at: expr('{{ $json.started_at }}'),
          finished_at: expr('{{ $json.finished_at }}'),
          status: 'success',
          trigger_source: expr('{{ $json.trigger_source }}'),
          error: ''
        }
      }
    }
  },
  output: [{ id: 1 }]
});

export default workflow('ai-daily-brief-generate', 'AI Daily Brief - Generate')
  .add(dailySchedule)
  .to(prepareContext)
  .to(createFeedRequests
    .to(fetchFeedXml)
    .to(buildPromptFromRssResponses)
    .to(generateBrief)
    .to(markdownToHtml)
    .to(prepareTopStoryImagePrompt)
    .to(generateTopStoryImage)
    .to(prepareImageUpload)
    .to(uploadTopStoryImage)
    .to(prepareBriefRow)
    .to(prepareBriefJsonUpload)
    .to(uploadBriefJson)
    .to(fetchHistoryIndex)
    .to(prepareHistoryIndexUpload)
    .to(updateHistoryIndex)
    .to(prepareSourceRows)
    .to(upsertSourceRows)
    .to(restoreBriefRow)
    .to(upsertBrief)
    .to(restoreBriefForRun)
    .to(insertSuccessRun))
  .add(manualEditorTrigger)
  .to(prepareContext);

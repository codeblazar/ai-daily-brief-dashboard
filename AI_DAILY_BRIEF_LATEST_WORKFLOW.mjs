import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

const BRIEFS_TABLE_ID = 'lh1jMAPbZKOePQYO';

const latestWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Latest Brief Webhook',
    position: [240, 300],
    parameters: {
      httpMethod: 'GET',
      path: 'ai-daily-brief/latest',
      authentication: 'none',
      responseMode: 'responseNode',
      options: {
        allowedOrigins: '*',
        ignoreBots: true
      }
    }
  },
  output: [{ headers: {}, query: {}, body: {}, executionMode: 'production' }]
});

const prepareToday = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Today',
    position: [540, 300],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nconst now = new Date();\nconst singapore = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));\nconst yyyy = singapore.getFullYear();\nconst mm = String(singapore.getMonth() + 1).padStart(2, '0');\nconst dd = String(singapore.getDate()).padStart(2, '0');\nreturn [{ json: { brief_date: yyyy + '-' + mm + '-' + dd } }];\n"
    }
  },
  output: [{ brief_date: '2026-05-24' }]
});

const getLatestBrief = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Get Latest Brief',
    position: [840, 300],
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: BRIEFS_TABLE_ID, cachedResultName: 'AI_Daily_Briefs' },
      matchType: 'allConditions',
      filters: {
        conditions: [
          { keyName: 'status', condition: 'eq', keyValue: 'success' }
        ]
      },
      returnAll: false,
      limit: 1,
      orderBy: true,
      orderByColumn: 'generated_at',
      orderByDirection: 'DESC'
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
    image_url: 'https://example.com/top-story.png',
    image_prompt: 'Create a square editorial briefing image for an AI daily news dashboard.',
    image_topic: 'NVIDIA',
    image_model: 'gpt-image-1-mini'
  }]
});

const prepareResponse = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Latest Response',
    position: [1440, 300],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "\nconst latest = $('Get Latest Brief').first()?.json ?? {};\nreturn [{\n  json: {\n    ok: true,\n    generated: false,\n    message: latest.brief_date ? 'Latest brief loaded.' : 'No generated brief found yet.',\n    brief: latest.brief_date ? {\n      date: latest.brief_date,\n      title: latest.title,\n      markdown: latest.markdown,\n      html: latest.html,\n      generatedAt: latest.generated_at,\n      sourceCount: latest.source_count,\n      model: latest.model,\n      imageUrl: latest.image_url,\n      imagePrompt: latest.image_prompt,\n      imageTopic: latest.image_topic,\n      imageModel: latest.image_model\n    } : null\n  }\n}];\n"
    }
  },
  output: [{ ok: true, generated: false }]
});

const respondToWebhook = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond To Webhook',
    position: [1740, 300],
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ $json }}'),
      options: {
        responseCode: 200,
        responseHeaders: {
          entries: [
            { name: 'Access-Control-Allow-Origin', value: '*' },
            { name: 'Content-Type', value: 'application/json' }
          ]
        }
      }
    }
  }
});

export default workflow('ai-daily-brief-latest', 'AI Daily Brief - Latest')
  .add(latestWebhook)
  .to(prepareToday)
  .to(getLatestBrief)
  .to(prepareResponse)
  .to(respondToWebhook);

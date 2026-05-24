# AI Daily Brief Plan

## Goal
- Build Phase 1 of the AI Daily Brief system in n8n only.
- Generate an AI briefing once per day at 6:00 AM Asia/Singapore.
- Allow manual generation from the n8n editor trigger only.
- Store the generated brief, source items, and run history in n8n Data Tables.
- Generate a 1024 x 1024 OpenAI image for the major story and store image metadata with the brief.

## Decisions
- n8n project/folder: `PKE / Codex (Mac)`.
- Workflow name: `AI Daily Brief - Generate`.
- Workflow starts inactive. Publishing requires separate approval.
- Source strategy: curated RSS feeds from `codeblazar/ai-daily-brief`.
- Model provider: OpenRouter credential `OpenRouter account (PKE)`.
- Image provider: OpenAI credential, using `gpt-image-1-mini` at `1024x1024`.
- Dashboard is later. Phase 1 no longer includes a public generate webhook.
- `https://jina.ai/` and `r.jina.ai` are noted as possible later fallbacks for readable article extraction if RSS summaries are too thin.
- Manual regeneration quota was removed. The dashboard is read-only for now.
- GitHub target repository: `codeblazar/ai-daily-brief-dashboard`.
- GitHub branch: `main`.
- Public history paths:
  - `images/ai-daily-brief/YYYY-MM-DD/top-story.png`
  - `briefs/ai-daily-brief/YYYY-MM-DD/brief.json`
  - `briefs/ai-daily-brief/index.json`

## Current State
- Phase 1 workflow created in n8n and left inactive.
- RSS fetching has been patched after the Code node failed because `fetch` is not available in this n8n Code runtime.
- Google AI Blog feed was replaced because the old Blogger RSS URL now returns a "Blog not found" page.
- The workflow now has a managed `Manual Test Trigger` for editor testing.
- Execution tests have not been run by Codex to avoid writing test rows to Data Tables and consuming OpenRouter/OpenAI credits without explicit approval.
- Phase 2 dashboard work has started locally under `dashboard/`.
- Dashboard currently uses mock mode by default and does not call n8n unless configured.
- Read-only latest brief workflow has been created in n8n and left inactive.
- The local generation workflow source has been updated to remove manual quota and public generate webhook logic, add OpenAI image generation, and upload public history artifacts to GitHub.
- The local latest workflow source has been updated to remove manual quota output and include image fields.
- n8n Data Table image columns have been added to `AI_Daily_Briefs`.
- The updated generation workflow draft has been saved to n8n and remains inactive.
- The GitHub history index file has been initialized at `briefs/ai-daily-brief/index.json`.
- The updated latest workflow draft has been saved to n8n. Its currently active version is still the older published version until publishing is explicitly approved.

## Done
- Confirmed `n8n_nuc` MCP connection works.
- Confirmed target n8n folder exists.
- Created this running project checklist.
- Created `AI_Daily_Briefs` Data Table.
- Created `AI_Daily_Brief_Sources` Data Table.
- Created `AI_Daily_Brief_Runs` Data Table.
- Created local workflow source artifact `AI_DAILY_BRIEF_WORKFLOW.mjs`.
- Validated the n8n workflow code.
- Created inactive n8n workflow `AI Daily Brief - Generate`.
- Confirmed OpenRouter credential auto-assigned to the workflow.
- Confirmed workflow is inactive and MCP-available.
- Replaced Code-node RSS fetching with n8n `HTTP Request` feed fetching plus a parser Code node.
- Replaced `https://ai.googleblog.com/feeds/posts/default` with `https://blog.google/rss/`.
- Configured `Fetch RSS Feed XML` to continue on regular output if one feed fails.
- Added `Manual Test Trigger` to the workflow source for editor testing.
- Validated and updated existing workflow `AI Daily Brief - Generate`.
- Added `image_url`, `image_prompt`, `image_topic`, and `image_model` columns to `AI_Daily_Briefs`.
- Updated local workflow source to remove `Get Today Runs`, `Evaluate Daily Limits`, and blocked generation branches.
- Updated local workflow source to add `Prepare Top Story Image Prompt` and `Generate Top Story Image`.
- Local workflow source passes `node --check`.
- n8n validation passed for the updated source with non-blocking expression inference warnings.
- Updated local latest workflow source to return `imageUrl`, `imagePrompt`, `imageTopic`, and `imageModel`.
- Local latest workflow source passes `node --check`.
- n8n validation passed for the updated latest source.
- Created GitHub repository `codeblazar/ai-daily-brief-dashboard`.
- Uploaded dashboard scaffold to `codeblazar/ai-daily-brief-dashboard`.
- Initialized `briefs/ai-daily-brief/index.json`.
- Updated `AI Daily Brief - Generate` to remove the public generate webhook.
- Updated `AI Daily Brief - Generate` to upload the top story image to `images/ai-daily-brief/YYYY-MM-DD/top-story.png`.
- Updated `AI Daily Brief - Generate` to upload daily brief JSON to `briefs/ai-daily-brief/YYYY-MM-DD/brief.json`.
- Updated `AI Daily Brief - Generate` to update `briefs/ai-daily-brief/index.json`.
- n8n validation passed for the GitHub history workflow with no warnings.
- Saved the GitHub history workflow draft to n8n on 2026-05-24.

## Next
- Confirm whether `OpenAi (Participants)` is the intended OpenAI credential for image generation if the n8n UI shows a different OpenAI credential.
- Confirm whether the n8n GitHub credential selected in the UI is the intended credential.
- Run one editor manual execution test from `Manual Test Trigger`.
- Confirm GitHub contains the generated image, daily JSON, and updated index after the manual test.
- Confirm the `AI_Daily_Briefs` row stores the public `image_url`.
- Decide whether to update the dashboard to read GitHub history artifacts instead of only the n8n latest endpoint.
- Decide whether to publish the updated `AI Daily Brief - Latest` draft so the public latest endpoint returns image fields and removes manual quota output.
- After acceptance, request separate approval to publish the workflow for the daily 6:00 AM schedule.

## Open Questions
- Confirm exact GitHub credential selection in n8n if the GitHub nodes are not already credentialed in the UI.
- Decide whether the dashboard should use GitHub Pages URLs or raw GitHub URLs for history JSON.

## Verification
- Tables exist with expected columns.
- Workflow validates before creation.
- Workflow is created inactive.
- Workflow ID: `oTZW7QzqGtQ2PUhv`.
- Workflow URL: `https://n8n-nuc.codeblazar.org/workflow/oTZW7QzqGtQ2PUhv`.
- Workflow validates after the RSS fetching patch.
- Workflow update succeeded after the RSS fetching patch.
- Updated generation workflow draft saved to n8n on 2026-05-24.
- Generation workflow remains inactive.
- OpenAI image node auto-assigned credential `OpenAi (Participants)`.
- Updated latest workflow draft saved to n8n on 2026-05-24.
- Latest workflow is active, but its active version is still the older version until publishing is explicitly approved.
- Pinned n8n test was not executed because Data Table nodes could still write rows.
- Manual execution tests remain to be run after explicit approval.
- GitHub history index exists at `https://raw.githubusercontent.com/codeblazar/ai-daily-brief-dashboard/main/briefs/ai-daily-brief/index.json`.
- Generation workflow draft version ID after history update: `990754c6-c735-4d57-b93a-e9c99827b293`.
- Generation workflow remains inactive after history update.
- n8n validation passed with no warnings before the history draft update.

## Phase 2 Dashboard
- Scope: vanilla HTML/CSS/JS static dashboard.
- Local files:
  - `dashboard/index.html`
  - `dashboard/styles.css`
  - `dashboard/app.js`
  - `dashboard/config.js`
- Dashboard capabilities implemented locally:
  - Render latest available brief HTML from a response object.
  - Load the latest stored brief from a read-only latest endpoint when mock mode is disabled.
  - Show brief title, date, generated timestamp, and source count.
  - Hide model details from the public page.
  - Read-only dashboard. No regenerate button or manual quota display.
  - Use mock data only as a fallback if the latest endpoint fails.
- Public regenerate endpoint has been removed from scope.
- Read-only latest endpoint workflow:
  - Workflow name: `AI Daily Brief - Latest`.
  - Workflow ID: `puykI9GJ1V2lCsHm`.
  - Workflow URL: `https://n8n-nuc.codeblazar.org/workflow/puykI9GJ1V2lCsHm`.
  - Local source artifact: `AI_DAILY_BRIEF_LATEST_WORKFLOW.mjs`.
  - Method: `GET`.
  - Path: `/webhook/ai-daily-brief/latest`.
  - Reads latest successful row from `AI_Daily_Briefs`.
  - Reads today's successful manual runs from `AI_Daily_Brief_Runs`.
  - Returns `ok`, `generated`, `message`, `manual_regenerations_remaining`, and `brief`.
  - Activated after explicit approval.
  - Active version ID: `f9f80f9c-17be-466e-ab2c-3e2d02da831b`.
- Dashboard config:
  - `latestBriefUrl`: `https://n8n-nuc.codeblazar.org/webhook/ai-daily-brief/latest`.
  - `mockMode`: `false`.
- Dashboard styling pass:
  - This dashboard visual language is now named `SOI style`: Republic Polytechnic green, School of Infocomm orange, white surfaces, dark grey body text, and section dividers with a thin grey line plus orange tab.
  - Restyled with a Republic Polytechnic inspired institutional look using black, white, RP green, and School of Infocomm orange.
  - Added Republic Polytechnic and School of Infocomm header treatment.
  - Changed eyebrow text to `Diploma in Applied AI and Analytics`.
  - Removed model name from visible brief metadata.
  - Simplified visible title to remove duplicate date.
  - Added frontmatter cleanup so `title`, `tags`, and `applied-ai` are not shown in the rendered brief.
  - Kept responsive layout for phone widths.
- Dashboard simplification:
  - Regenerate button removed.
  - Manual regenerations remaining display removed.
  - Latest brief loaded status box removed.
  - Dashboard is now read-only and silently loads the latest stored brief.
  - Palette changed to School of Infocomm orange `rgb(238, 134, 81)` and Republic Polytechnic green `rgb(127, 184, 69)` with black and white.
  - Metadata simplified to show created date and source count only.
  - Diploma label set to white.
  - Section heading divider uses one thin grey line above each heading with an orange tab hanging below it.
  - Horizontal rules inside generated brief HTML are removed from the rendered dashboard.
  - Links table centred and reduced one font size.
  - Body text changed to dark grey while headings and bold text remain black.
  - Hero changed to white background with `AI Daily Brief` in RP green and supporting text in dark grey.
  - Header now uses local Republic Polytechnic logo asset from Wikimedia Commons public domain source.
  - Footer centred and updated to say the brief is made using tools we teach: n8n, GitHub, VS Code, and OpenRouter models.

## Later
- Build public GitHub Pages dashboard.

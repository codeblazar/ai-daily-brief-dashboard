# Codex Handoff

## 1. Current goal
- Build Phase 1 of AI Daily Brief in n8n.
- Generate one daily brief at 6:00 AM Asia/Singapore.
- Generate a 1024 x 1024 OpenAI top story image.
- Upload public history artifacts to GitHub so the future static dashboard can show past briefs without calling n8n.

## 2. What has already been done
- Existing n8n workflow `AI Daily Brief - Generate` was updated as a draft only.
- Workflow remains inactive and unpublished.
- Public generate webhook was removed from the generation workflow.
- Manual generation is now only through `Manual Test Trigger` in the n8n editor.
- GitHub repo `codeblazar/ai-daily-brief-dashboard` exists and has the dashboard scaffold.
- GitHub history index initialized at `briefs/ai-daily-brief/index.json`.
- Workflow now uploads:
  - `images/ai-daily-brief/YYYY-MM-DD/top-story.png`
  - `briefs/ai-daily-brief/YYYY-MM-DD/brief.json`
  - updated `briefs/ai-daily-brief/index.json`
- Workflow still stores brief, source, image, and run metadata in n8n Data Tables.

## 3. Important files and folders
- `/Users/pete/Projects/n8n/AI_DAILY_BRIEF_WORKFLOW.mjs`
- `/Users/pete/Projects/n8n/AI_DAILY_BRIEF_LATEST_WORKFLOW.mjs`
- `/Users/pete/Projects/n8n/AI_DAILY_BRIEF_PLAN.md`
- `/Users/pete/Projects/n8n/CODEX_HANDOFF.md`
- `/Users/pete/Projects/n8n/dashboard/`
- GitHub repo: `https://github.com/codeblazar/ai-daily-brief-dashboard`

## 4. Key decisions made
- Target GitHub repo is `codeblazar/ai-daily-brief-dashboard`.
- Branch is `main`.
- Image path is fixed per date: `images/ai-daily-brief/YYYY-MM-DD/top-story.png`.
- Brief JSON path is fixed per date: `briefs/ai-daily-brief/YYYY-MM-DD/brief.json`.
- History index path is `briefs/ai-daily-brief/index.json`.
- Failed GitHub uploads should fail the run because downstream Data Table writes happen only after upload steps.
- Public manual regenerate endpoint is out of scope.
- Publishing or activating n8n workflows still needs explicit approval.

## 5. Current blockers or errors
- No active blocker in the saved draft.
- Manual execution has not been run yet, so GitHub upload credentials and OpenAI image output have not been runtime verified.
- If a file already exists for the same date, the GitHub `create` steps for the image or daily JSON may fail. This matches the one-run-per-day assumption.
- Need confirm in the n8n UI that the GitHub and OpenAI credentials are correctly selected if n8n does not auto-select them.

## 6. Commands already run and results
- `git status --short`
  - Result: failed because `/Users/pete/Projects/n8n` is not a git repository.
- `rg --files`
  - Result: found local workflow, plan, and dashboard files.
- `node --check AI_DAILY_BRIEF_WORKFLOW.mjs`
  - Result: passed.
- n8n `validate_workflow`
  - Result: passed with no warnings after sample output cleanup.
- n8n `update_workflow` for `oTZW7QzqGtQ2PUhv`
  - Result: succeeded, node count 25.
- n8n `get_workflow_details` for `oTZW7QzqGtQ2PUhv`
  - Result: active `false`, archived `false`, version ID `990754c6-c735-4d57-b93a-e9c99827b293`.
- GitHub `create_or_update_file` for `briefs/ai-daily-brief/index.json`
  - Result: created initial index, commit `ba4cabe34885bf9afab23644f47be74c8a6bf282`.

## 7. Next recommended steps
- Open the n8n workflow and confirm credentials on:
  - `Generate Top Story Image`
  - `Upload Top Story Image To GitHub`
  - `Upload Brief JSON To GitHub`
  - `Update History Index In GitHub`
- Run one editor test from `Manual Test Trigger`.
- Confirm GitHub receives the image, daily `brief.json`, and updated `index.json`.
- Confirm `AI_Daily_Briefs` has the public `image_url`.
- After runtime verification, decide whether to update the dashboard to read GitHub history artifacts.
- Only after approval, publish or activate the workflow for the 6:00 AM schedule.

## 8. Assumptions to preserve
- Calendar day means Asia/Singapore date.
- One successful run per day means one image and one brief JSON for that date.
- Manual trigger is for testing or explicit editor generation only.
- n8n remains the generator. GitHub becomes the public read layer for dashboard history.
- Dashboard work stays separate until Phase 1 is accepted.

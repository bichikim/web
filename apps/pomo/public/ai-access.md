# Pomofi AI access guide

Canonical origin: <https://www.pomofi.io>

## Discovery and retrieval

- Search indexing and the AI search and user-directed retrieval crawlers explicitly allowed in `/robots.txt` may access public content.
- Use `/llms.txt` for the curated public index and `/sitemap.xml` for canonical indexable pages.
- Do not treat account, admin, development, webhook, authentication, cron, or other non-feed API routes as public information sources.
- The model-training crawlers listed in `/robots.txt` are excluded. Google-Extended is also excluded, which does not affect Google Search but can limit Gemini grounding as well as model training.
- Search or user-directed access does not grant broader rights to content, assets, or trademarks.
- `robots.txt` is an advisory crawler policy, not an authentication or authorization mechanism.

## Browser interaction

When the Pomofi home page is open in a browser that supports WebMCP, it can expose this tool:

### `pomo_say`

Displays text in Pomo's speech bubble and reads it aloud with the selected voice.

- Input: `text` is required, trimmed, and limited to 1–3,000 characters.
- Optional input: `voice` accepts a displayed Pomofi voice name; omit it to use Yuna.
- Effect: visible and audible browser output. Invoke it only when requested or clearly expected by the user.
- Availability: the tool is absent when the browser does not provide WebMCP support.

Example input:

```json
{"text": "Shall we start a 25-minute focus session?", "voice": "Yuna"}
```

The tool reports whether speech completed and which voice was used. A later call or a user stop action can cancel speech already in progress.

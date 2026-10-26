# Heirloom Health server

A small Cloudflare Worker that adds four optional features to the app. **It is free by default:** the AI features use Cloudflare Workers AI, which runs open models (Whisper for speech, Gemma for reading transcripts) with a free daily allowance. No AI company keys or credit card are needed.

| Feature | Free default | Optional paid upgrade |
|---|---|---|
| **Find with AI**: reads a transcript and suggests answers | Gemma 4 on Workers AI | Claude (add `ANTHROPIC_API_KEY`), better with mixed-language speech |
| **Turn into text** with the server | Whisper large-v3-turbo on Workers AI | OpenAI (add `OPENAI_API_KEY`) |
| **Sync with family**, encrypted | Cloudflare KV | (none needed) |
| **Send feedback** from the app | Saved in Cloudflare KV | Also opened as GitHub issues (add `GITHUB_TOKEN`) |

The app can also turn recordings into text **on the phone itself** with no server at all (Menu, then Speech-to-text). Check Cloudflare's pricing page for the current free allowance; if it runs out for the day, the app falls back to the built-in word list and on-device speech-to-text.

## Privacy

- **Transcripts and recordings** go through the server to the AI provider and are not stored by this server.
- **Family sync** uploads only data encrypted on the phone (AES-GCM). The key lives in the share link after the `#`, which browsers never send to a server, so the server stores data it cannot read.
- The app asks the user for permission before it sends anything to the AI helper.

## Set it up (about 10 minutes, free)

You need a free [Cloudflare](https://dash.cloudflare.com/sign-up) account.

```bash
cd server
npm install
npx wrangler login                               # opens a browser to sign in to Cloudflare
npx wrangler kv namespace create FAMILY          # copy the id it prints into wrangler.toml
npx wrangler deploy                              # prints your server address, e.g. https://heirloom-health.<you>.workers.dev
```

Optional upgrades (each costs money per use; set a spending limit with the provider):

```bash
npx wrangler secret put ANTHROPIC_API_KEY        # Claude for reading transcripts
npx wrangler secret put OPENAI_API_KEY           # OpenAI for speech-to-text
npx wrangler secret put GITHUB_TOKEN             # fine-grained token with "Issues: write" on this repo, to file feedback as issues
```

To read feedback without GitHub: `npx wrangler kv key list --binding FAMILY --prefix feedback:` and `npx wrangler kv key get --binding FAMILY "<key>"`.

Then connect the app to it:

1. Put the address in `js/config.js`: `window.CONFIG = { apiBase: 'https://heirloom-health.<you>.workers.dev' };`
2. If your site isn't `https://doddasiddharth-debug.github.io`, add its address to `ALLOWED_ORIGINS` in `wrangler.toml` and run `npx wrangler deploy` again.
3. Raise `VERSION` in `../sw.js`, then commit and push.

## Try it on your computer

```bash
npx wrangler dev            # runs the server at http://localhost:8787
```

In another terminal, serve the app with `python3 -m http.server 8000` from the main folder, and set `apiBase` to `http://localhost:8787` while testing.

## Limits built in

- 40 AI requests per hour per visitor, 120 syncs per hour, 10 feedback messages per hour.
- Transcripts up to 8,000 characters; recordings up to 10 MB; families up to 900 KB.
- Only the websites listed in `ALLOWED_ORIGINS` can call the server.

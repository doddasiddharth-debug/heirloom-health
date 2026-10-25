# Heirloom Health server

A small Cloudflare Worker that adds three optional features to the app:

| Feature | What it uses | Rough cost |
|---|---|---|
| **Find with AI** on the website: reads a typed or dictated transcript and suggests answers | Anthropic API (Claude) | A few cents per transcript |
| **Transcribe** a recording into text, in any of the app's languages | OpenAI speech-to-text | About a cent per minute of audio |
| **Sync with family**: keep one family up to date on several phones | Cloudflare KV storage | Free tier is plenty |

Without the server, the app still works fully on each device. Check current prices on each provider's pricing page before you start.

## Privacy

- **Transcripts and recordings** go through the server to the AI provider and are not stored by this server.
- **Family sync** uploads only data encrypted on the phone (AES-GCM). The key lives in the share link after the `#`, which browsers never send to a server, so the server stores data it cannot read.
- The app asks the user for permission before it sends anything to the AI helper.

## Set it up (about 15 minutes)

You need: a free [Cloudflare](https://dash.cloudflare.com/sign-up) account, an API key from the [Anthropic Console](https://console.anthropic.com/), and, for speech-to-text, an API key from [OpenAI](https://platform.openai.com/). Set a monthly spending limit on both AI accounts.

```bash
cd server
npm install
npx wrangler login                               # opens a browser to sign in to Cloudflare
npx wrangler kv namespace create FAMILY          # copy the id it prints into wrangler.toml
npx wrangler secret put ANTHROPIC_API_KEY        # paste your Anthropic key
npx wrangler secret put OPENAI_API_KEY           # paste your OpenAI key (skip if you don't want speech-to-text)
npx wrangler deploy                              # prints your server address, e.g. https://heirloom-health.<you>.workers.dev
```

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

- 40 AI requests per hour per visitor, 120 syncs per hour.
- Transcripts up to 8,000 characters; recordings up to 10 MB; families up to 900 KB.
- Only the websites listed in `ALLOWED_ORIGINS` can call the server.

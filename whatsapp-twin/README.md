# WhatsApp Twin (for non-coders)

A helper that **learns how you chat** (length, slang, emojis) and writes replies in your style while you're away.

## Read this first: what is and isn't allowed
| Idea | Verdict |
|---|---|
| Bot taking over your **personal** WhatsApp app on your phone | Not allowed. It breaks WhatsApp's Terms, and WhatsApp **bans numbers** that do it. I did not build this. |
| Bot on the **official WhatsApp Business Cloud API** | Allowed, but it runs on a *separate* business number, not your personal chats. |
| Learning your style from chats you **export yourself** (Chat > ⋮ > Export chat > Without media) | Allowed. This is how it learns. |
| Drafts you approve before sending (default) | Safest. A copilot, not an autopilot. |

Contacts' messages are sent to Claude's API to write a reply. Tell people you use an assistant (default `disclose_assistant: true`), and don't use it for anyone who hasn't agreed.

## Safety built in (`twin/safety.py`)
Stays silent for: money/OTP/passwords, emergencies, legal and emotional topics, group chats, and anyone on your never-reply list. It blocks obscene output and limits replies per person per hour. It starts in **draft mode**.

## Setup (once)
1. Export 3-10 chats and save the `.txt` files into this folder.
2. `cp config.example.json config.json`, then put your name **exactly as it appears in the chat file**.
3. `python3 -m twin learn chat1.txt chat2.txt` shows your "style card".
4. `export ANTHROPIC_API_KEY=...` then `python3 -m twin try "lunch tomorrow?"` shows how it would reply.

## Making it better ("training")
`python3 -m twin review` shows drafts. Press Enter if good, or type what you'd have said. Corrections feed into every future reply. Re-run `learn` with new exports anytime.

## Going live (needs a Meta developer account and a business number)
Set `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_VERIFY_TOKEN`, run `python3 -m twin serve`, and point the Meta webhook to it over HTTPS. Switch to `"mode": "auto"` only after weeks of good drafts.

Tests: `python3 -m unittest discover -s tests`

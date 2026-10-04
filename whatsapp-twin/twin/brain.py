"""Builds the prompt (your style card + your most similar past replies + your corrections) and asks Claude."""
import json
import os
import re
import urllib.request

API = "https://api.anthropic.com/v1/messages"
WORD = re.compile(r"\w+")


def _similar(examples: list[dict], text: str, k: int) -> list[dict]:
    q = set(WORD.findall(text.lower()))
    def score(e):
        c = set(WORD.findall(" ".join(x["text"] for x in e["context"][-2:]).lower()))
        return len(q & c) / (len(q | c) or 1)
    return sorted(examples, key=score, reverse=True)[:k]


def build_system(name: str, style_card: str, shots: list[dict], fixes: list[dict], disclose: bool) -> str:
    def fmt(e):
        ctx = "\n".join(f"{'Me' if x['from']=='me' else 'Them'}: {x['text']}" for x in e["context"])
        return f"{ctx}\nMe: {e['reply']}"
    return (
        f"You write WhatsApp replies on behalf of {name} while they are away. "
        f"Reply exactly the way {name} would: same length, tone, slang, language mix and emojis.\n\n"
        f"STYLE CARD (measured from real messages):\n{style_card}\n\n"
        "REAL EXAMPLES of how they reply in similar situations:\n" + "\n---\n".join(fmt(e) for e in shots) +
        ("\n\nCORRECTIONS they made to earlier drafts (follow these strongly):\n" +
         "\n".join(f"- Draft: {f['draft']!r} -> They wanted: {f['better']!r}" for f in fixes) if fixes else "") +
        "\n\nRULES: Only output the reply text. Never invent facts, plans, money, locations or promises. "
        "If unsure or the message needs a real decision, reply with a short neutral line like you'll get back soon. "
        "Be polite; no obscene, abusive, or illegal content; no sharing private info. "
        + ("Do not claim to be a human if asked directly; say you're their assistant." if disclose else "")
    )


def draft_reply(cfg: dict, profile_card: str, examples: list[dict], fixes: list[dict],
                history: list[dict], new_text: str, llm=None) -> str:
    system = build_system(cfg["my_name"], profile_card, _similar(examples, new_text, cfg.get("few_shot", 8)),
                          fixes[-10:], cfg.get("disclose_assistant", True))
    convo = "\n".join(f"{'Me' if h['from']=='me' else 'Them'}: {h['text']}" for h in history[-6:])
    user = f"Recent chat:\n{convo}\n\nNew message from them: {new_text}\n\nWrite my reply."
    return (llm or _call_claude)(cfg, system, user)


def _call_claude(cfg: dict, system: str, user: str) -> str:
    req = urllib.request.Request(API, method="POST", data=json.dumps({
        "model": cfg.get("model", "claude-sonnet-5-5"), "max_tokens": 200, "system": system,
        "messages": [{"role": "user", "content": user}]}).encode(),
        headers={"content-type": "application/json", "anthropic-version": "2023-06-01",
                 "x-api-key": os.environ["ANTHROPIC_API_KEY"]})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["content"][0]["text"].strip()

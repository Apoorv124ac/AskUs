"""Receives new messages from the OFFICIAL WhatsApp Business Cloud API and replies (or drafts)."""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.request

from . import brain, store
from .safety import Guard


def send_whatsapp(cfg, to, text):
    url = f"https://graph.facebook.com/v21.0/{os.environ['WA_PHONE_NUMBER_ID']}/messages"
    body = json.dumps({"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text}}).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": f"Bearer {os.environ['WA_TOKEN']}", "Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=30).read()


def handle_message(cfg, guard, contact, text, send=send_whatsapp, llm=None):
    """Core decision logic (kept separate from HTTP so it is easy to test)."""
    if not cfg.get("away_mode", True):
        return "away_mode off"
    ok, why = guard.should_reply(contact, text)
    log = {"contact": contact, "incoming": text}
    if not ok:
        store.append_line("log.jsonl", {**log, "action": "skipped", "why": why})
        return f"skipped: {why}"
    hist = store.load("history.json", {}).get(contact, [])
    draft = brain.draft_reply(cfg, store.load("style_card.txt.json", {}).get("card", ""),
                              store.load("examples.json", []), store.read_lines("feedback.jsonl"),
                              hist, text, llm=llm)
    reply = guard.clean_output(draft)
    if reply is None:
        store.append_line("log.jsonl", {**log, "action": "blocked_unsafe_draft"})
        return "blocked: unsafe draft"
    if cfg.get("mode", "draft") == "auto":
        send(cfg, contact, reply)
        guard.record_sent(contact)
        action = "sent"
    else:
        action = "drafted"  # you approve it in `python -m twin review`
    store.append_line("log.jsonl", {**log, "action": action, "reply": reply})
    h = store.load("history.json", {})
    h.setdefault(contact, []).extend([{"from": "them", "text": text}, {"from": "me", "text": reply}])
    store.save("history.json", h)
    return f"{action}: {reply}"


def make_handler(cfg):
    guard = Guard(cfg)

    class H(BaseHTTPRequestHandler):
        def do_GET(self):  # Meta's one-time webhook verification
            from urllib.parse import urlparse, parse_qs
            q = parse_qs(urlparse(self.path).query)
            if q.get("hub.verify_token", [""])[0] == os.environ.get("WA_VERIFY_TOKEN"):
                self.send_response(200); self.end_headers()
                self.wfile.write(q.get("hub.challenge", [""])[0].encode())
            else:
                self.send_response(403); self.end_headers()

        def do_POST(self):
            data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            self.send_response(200); self.end_headers()
            for e in data.get("entry", []):
                for ch in e.get("changes", []):
                    for m in ch.get("value", {}).get("messages", []):
                        if m.get("type") == "text":
                            print(handle_message(cfg, guard, m["from"], m["text"]["body"]))
    return H


def serve(cfg, port=8080):
    print(f"Listening on :{port} (mode={cfg.get('mode','draft')})")
    HTTPServer(("", port), make_handler(cfg)).serve_forever()

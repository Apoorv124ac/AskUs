"""Guardrails. The bot stays quiet (and tells *you*) whenever a message needs a real human."""
import re
import time

# Topics where a wrong auto-reply could cost money, safety or trust -> never auto-answer.
SENSITIVE = re.compile(
    r"\b(otp|password|pin|cvv|upi|bank|account number|transfer|loan|send money|payment|"
    r"urgent|emergency|hospital|accident|police|legal|lawyer|court|"
    r"love you|break ?up|divorce|funeral|passed away)\b", re.I)
# Words the bot must never *produce* (obscene / abusive). Extend this list freely.
BLOCKED_OUT = re.compile(r"\b(fuck\w*|shit\w*|bitch\w*|asshole|bastard|porn\w*|nude\w*|sex\w*)\b", re.I)
GROUP_HINT = "@"  # group chats are skipped entirely unless you opt in


class Guard:
    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.sent: dict[str, list[float]] = {}

    def should_reply(self, contact: str, text: str, is_group: bool = False) -> tuple[bool, str]:
        c = self.cfg
        if is_group and not c.get("reply_in_groups", False):
            return False, "group chat (off by default)"
        if contact in c.get("never_reply_to", []):
            return False, "contact is on your never-reply list"
        allow = c.get("only_reply_to", [])
        if allow and contact not in allow:
            return False, "contact not on your allow-list"
        if SENSITIVE.search(text):
            return False, "sensitive topic - needs you personally"
        now = time.time()
        recent = [t for t in self.sent.get(contact, []) if now - t < 3600]
        if len(recent) >= c.get("max_replies_per_contact_per_hour", 6):
            return False, "rate limit (avoids spam-like behaviour)"
        self.sent[contact] = recent
        return True, "ok"

    def record_sent(self, contact: str):
        self.sent.setdefault(contact, []).append(time.time())

    def clean_output(self, reply: str) -> str | None:
        """Return None if the draft is unsafe, so nothing is sent."""
        if BLOCKED_OUT.search(reply) or SENSITIVE.search(reply):
            return None
        return reply.strip() or None

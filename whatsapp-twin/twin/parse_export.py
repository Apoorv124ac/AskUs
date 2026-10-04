"""Read chats exported with WhatsApp's own "Export chat" feature (Without media).

Handles the two common formats:
  Android: 12/03/2024, 21:45 - Name: message
  iPhone : [12/03/2024, 21:45:10] Name: message
"""
import re
from dataclasses import dataclass

LINE = re.compile(
    r"^\[?(?P<date>\d{1,4}[/.\-]\d{1,2}[/.\-]\d{2,4}),?\s+"
    r"(?P<time>\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\]?\s*(?:-\s)?"
    r"(?P<sender>[^:]{1,60}?):\s(?P<text>.*)$"
)
SKIP_TEXT = ("<Media omitted>", "image omitted", "video omitted", "sticker omitted",
             "audio omitted", "This message was deleted", "You deleted this message",
             "Messages and calls are end-to-end encrypted")


@dataclass
class Msg:
    sender: str
    text: str


def parse_chat(raw: str) -> list[Msg]:
    msgs: list[Msg] = []
    for line in raw.replace("‎", "").replace(" ", " ").splitlines():
        m = LINE.match(line.strip())
        if m:
            msgs.append(Msg(m["sender"].strip(), m["text"].strip()))
        elif msgs and line.strip():  # continuation of a multi-line message
            msgs[-1].text += "\n" + line.strip()
    return [x for x in msgs if x.text and not any(s in x.text for s in SKIP_TEXT)]


def build_examples(msgs: list[Msg], me: str, context_len: int = 4) -> list[dict]:
    """Pairs of (what they said -> what *you* replied) taken from real chats."""
    examples = []
    for i, m in enumerate(msgs):
        if m.sender != me or i == 0 or msgs[i - 1].sender == me:
            continue
        ctx = [{"from": "me" if x.sender == me else "them", "text": x.text}
               for x in msgs[max(0, i - context_len):i]]
        examples.append({"context": ctx, "reply": m.text})
    return examples

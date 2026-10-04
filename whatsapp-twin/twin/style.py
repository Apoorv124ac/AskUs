"""Measure *how* you write (no AI needed): length, emojis, slang, casing, punctuation."""
import re
from collections import Counter

EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿\U0001F000-\U0001F2FF]")
WORD = re.compile(r"[\w']+", re.UNICODE)
STOP = set("the a an and or to of in is it i you me my we on for at be this that so".split())


def build_profile(my_messages: list[str]) -> dict:
    n = max(len(my_messages), 1)
    words = [w.lower() for t in my_messages for w in WORD.findall(t)]
    emojis = Counter(e for t in my_messages for e in EMOJI.findall(t))
    letters = [t for t in my_messages if any(c.isalpha() for c in t)]
    starts = Counter(t.split()[0].lower() for t in my_messages if t.split())
    return {
        "messages_analyzed": len(my_messages),
        "avg_words": round(len(words) / n, 1),
        "short_reply_pct": round(100 * sum(len(t.split()) <= 4 for t in my_messages) / n),
        "all_lowercase_pct": round(100 * sum(t == t.lower() for t in letters) / max(len(letters), 1)),
        "ends_with_period_pct": round(100 * sum(t.rstrip().endswith(".") for t in my_messages) / n),
        "uses_emoji_pct": round(100 * sum(bool(EMOJI.search(t)) for t in my_messages) / n),
        "top_emojis": [e for e, _ in emojis.most_common(8)],
        "favourite_words": [w for w, _ in Counter(w for w in words if w not in STOP and len(w) > 1).most_common(15)],
        "common_openers": [w for w, _ in starts.most_common(6)],
    }


def describe(p: dict) -> str:
    """Plain-English style card that goes into the AI's instructions."""
    return (
        f"- Typical reply length: ~{p['avg_words']} words; {p['short_reply_pct']}% of replies are 4 words or fewer.\n"
        f"- Writes fully lowercase {p['all_lowercase_pct']}% of the time; ends with a full stop {p['ends_with_period_pct']}% of the time.\n"
        f"- Uses emojis in {p['uses_emoji_pct']}% of messages. Favourites: {' '.join(p['top_emojis']) or 'none'}\n"
        f"- Words/slang often used: {', '.join(p['favourite_words'])}\n"
        f"- Often starts messages with: {', '.join(p['common_openers'])}"
    )

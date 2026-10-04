import argparse
import json
import pathlib
import sys

from . import brain, store, style
from .parse_export import build_examples, parse_chat
from .safety import Guard

CFG = pathlib.Path(__file__).resolve().parent.parent / "config.json"


def cfg():
    if not CFG.exists():
        sys.exit("Copy config.example.json to config.json and put your name in it.")
    return json.loads(CFG.read_text())


def learn(a):
    c = cfg(); me = c["my_name"]; ex, mine = [], []
    for f in a.files:
        msgs = parse_chat(pathlib.Path(f).read_text(encoding="utf-8", errors="ignore"))
        ex += build_examples(msgs, me); mine += [m.text for m in msgs if m.sender == me]
    if not mine:
        sys.exit(f"No messages from '{me}' found. Check my_name matches your name in the chat file exactly.")
    p = style.build_profile(mine)
    store.save("examples.json", ex); store.save("profile.json", p)
    store.save("style_card.txt.json", {"card": style.describe(p)})
    print(f"Learned from {len(mine)} of your messages and {len(ex)} example replies.\n\n{style.describe(p)}")


def try_(a):
    c = cfg(); g = Guard(c)
    ok, why = g.should_reply("test", a.message)
    if not ok:
        return print(f"[Bot would stay silent and alert you] {why}")
    d = brain.draft_reply(c, store.load("style_card.txt.json", {}).get("card", ""), store.load("examples.json", []),
                          store.read_lines("feedback.jsonl"), [], a.message)
    print(g.clean_output(d) or "[blocked as unsafe]")


def review(a):
    """Approve/correct drafts. Every correction teaches the bot."""
    for e in [l for l in store.read_lines("log.jsonl") if l.get("action") == "drafted"][-a.n:]:
        print(f"\nThey ({e['contact']}): {e['incoming']}\nBot draft: {e['reply']}")
        s = input("Enter = good | type a better reply | s = skip: ").strip()
        if s and s != "s":
            store.append_line("feedback.jsonl", {"draft": e["reply"], "better": s})
            print("Saved. The bot will follow this next time.")


def serve(a):
    from .server import serve as run
    run(cfg(), a.port)


def main():
    ap = argparse.ArgumentParser(prog="twin"); sub = ap.add_subparsers(required=True)
    p = sub.add_parser("learn"); p.add_argument("files", nargs="+"); p.set_defaults(f=learn)
    p = sub.add_parser("try"); p.add_argument("message"); p.set_defaults(f=try_)
    p = sub.add_parser("review"); p.add_argument("-n", type=int, default=10); p.set_defaults(f=review)
    p = sub.add_parser("serve"); p.add_argument("--port", type=int, default=8080); p.set_defaults(f=serve)
    a = ap.parse_args(); a.f(a)


main()

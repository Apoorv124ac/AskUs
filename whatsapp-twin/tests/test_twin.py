import pathlib, sys, unittest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from twin.parse_export import parse_chat, build_examples
from twin.style import build_profile
from twin.safety import Guard
from twin import brain

RAW = (pathlib.Path(__file__).parent / "sample_chat.txt").read_text()


class T(unittest.TestCase):
    def test_parse_both_formats(self):
        m = parse_chat(RAW)
        self.assertEqual(len(m), 7)
        self.assertEqual(m[0].sender, "Riya")
        self.assertEqual(m[5].sender, "Sam")

    def test_examples_and_profile(self):
        m = parse_chat(RAW)
        ex = build_examples(m, "Sam")
        self.assertEqual(len(ex), 3)
        p = build_profile([x.text for x in m if x.sender == "Sam"])
        self.assertIn("😂", p["top_emojis"])
        self.assertEqual(p["uses_emoji_pct"], 100)

    def test_guard(self):
        g = Guard({"max_replies_per_contact_per_hour": 2})
        self.assertFalse(g.should_reply("a", "share your OTP")[0])
        self.assertFalse(g.should_reply("a", "hi", is_group=True)[0])
        self.assertTrue(g.should_reply("a", "lunch?")[0])
        g.record_sent("a"); g.record_sent("a")
        self.assertFalse(g.should_reply("a", "lunch?")[0])
        self.assertIsNone(g.clean_output("what the fuck"))
        self.assertEqual(g.clean_output(" ok "), "ok")

    def test_draft_uses_examples(self):
        ex = build_examples(parse_chat(RAW), "Sam")
        seen = {}
        def fake(cfg, system, user): seen["s"] = system; return "sure 👍"
        out = brain.draft_reply({"my_name": "Sam"}, "card", ex, [{"draft": "ok", "better": "sure"}],
                                [], "lunch tomorrow?", llm=fake)
        self.assertEqual(out, "sure 👍")
        self.assertIn("sounds good", seen["s"]); self.assertIn("They wanted: 'sure'", seen["s"])


if __name__ == "__main__":
    unittest.main()

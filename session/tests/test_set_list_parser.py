from django.test import SimpleTestCase

from session.set_list import parse_set_list


class ParseSetListTests(SimpleTestCase):
    def parse_one(self, line):
        items = parse_set_list(line)
        self.assertEqual(len(items), 1, f"expected 1 item from {line!r}, got {items!r}")
        return items[0]

    def test_dash_separated_key(self):
        item = self.parse_one("Way Maker - Bb")
        self.assertEqual(item["title"], "Way Maker")
        self.assertEqual(item["key"], "Bb")

    def test_en_and_em_dash_separators(self):
        self.assertEqual(self.parse_one("Way Maker – Bb")["key"], "Bb")
        self.assertEqual(self.parse_one("Same God — C#m")["key"], "C#m")

    def test_parenthesised_key(self):
        item = self.parse_one("Firm Foundation (Bb)")
        self.assertEqual(item["title"], "Firm Foundation")
        self.assertEqual(item["key"], "Bb")

    def test_parenthesised_in_key(self):
        item = self.parse_one("Great Are You Lord (in G)")
        self.assertEqual(item["title"], "Great Are You Lord")
        self.assertEqual(item["key"], "G")

    def test_in_key_suffix(self):
        item = self.parse_one("Build My Life in G")
        self.assertEqual(item["title"], "Build My Life")
        self.assertEqual(item["key"], "G")

    def test_bare_trailing_key(self):
        item = self.parse_one("Living Hope E")
        self.assertEqual(item["title"], "Living Hope")
        self.assertEqual(item["key"], "E")

    def test_bare_trailing_minor_key(self):
        item = self.parse_one("Oceans Bm")
        self.assertEqual(item["title"], "Oceans")
        self.assertEqual(item["key"], "Bm")

    def test_numbered_lines(self):
        items = parse_set_list("1. Living Hope E\n2) King of Kings D")
        self.assertEqual(items[0]["title"], "Living Hope")
        self.assertEqual(items[0]["key"], "E")
        self.assertEqual(items[1]["title"], "King of Kings")
        self.assertEqual(items[1]["key"], "D")

    def test_bulleted_lines(self):
        items = parse_set_list("- Cornerstone C\n• Anthem F#m\n* Refuge Ab")
        self.assertEqual(
            [(i["title"], i["key"]) for i in items],
            [("Cornerstone", "C"), ("Anthem", "F#m"), ("Refuge", "Ab")],
        )

    def test_minor_spelled_out(self):
        self.assertEqual(self.parse_one("Same God - C# minor")["key"], "C#m")
        self.assertEqual(self.parse_one("Yes and Amen - Db major")["key"], "Db")

    def test_unicode_accidentals(self):
        self.assertEqual(self.parse_one("Way Maker - B♭")["key"], "Bb")
        self.assertEqual(self.parse_one("Promises - F♯m")["key"], "F#m")

    def test_no_key_line_keeps_title(self):
        item = self.parse_one("Goodness of God")
        self.assertEqual(item["title"], "Goodness of God")
        self.assertIsNone(item["key"])

    def test_header_lines_are_skipped(self):
        items = parse_set_list("Sunday set:\nWay Maker - Bb")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "Way Maker")

    def test_blank_lines_are_skipped(self):
        items = parse_set_list("\nWay Maker - Bb\n\n  \nLiving Hope E\n")
        self.assertEqual(len(items), 2)

    def test_title_word_that_looks_like_key_is_not_eaten_mid_title(self):
        # 'A' mid-title must not be treated as the key
        item = self.parse_one("A Thousand Hallelujahs - G")
        self.assertEqual(item["title"], "A Thousand Hallelujahs")
        self.assertEqual(item["key"], "G")

    def test_single_word_line_is_title_not_key(self):
        # A one-word line can't be a bare key + title
        item = self.parse_one("Cornerstone")
        self.assertEqual(item["title"], "Cornerstone")
        self.assertIsNone(item["key"])

    def test_whole_whatsapp_message(self):
        text = (
            "Sunday 13th:\n"
            "1. Way Maker – Bb\n"
            "2. Goodness of God - A\n"
            "3. Same God — C#m\n"
            "4. Firm Foundation (Bb)\n"
            "5. Build My Life in G\n"
        )
        items = parse_set_list(text)
        self.assertEqual(
            [(i["title"], i["key"]) for i in items],
            [
                ("Way Maker", "Bb"),
                ("Goodness of God", "A"),
                ("Same God", "C#m"),
                ("Firm Foundation", "Bb"),
                ("Build My Life", "G"),
            ],
        )

    def test_raw_line_is_preserved(self):
        item = self.parse_one("2) King of Kings D")
        self.assertEqual(item["line"], "2) King of Kings D")

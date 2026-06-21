import unittest

from legal_query_parser import parse_legal_query_to_elasticsearch_dsl


TEST_FIELDS = ("title", "content")


class LegalQueryParserTest(unittest.TestCase):
    def parse(self, query):
        return parse_legal_query_to_elasticsearch_dsl(query, fields=TEST_FIELDS).to_dict()

    def test_example_interpretations(self):
        cases = [
            ("손해배상 과실", "손해배상 AND 과실", False),
            ("손해배상 * 과실", "손해배상 AND 과실", False),
            ("해지 + 해제", "해지 OR 해제", False),
            ("해지 | 해제", "해지 OR 해제", False),
            ("계약 ! 근로", "계약 AND (NOT 근로)", False),
            ('"채무불이행"', '"채무불이행"', False),
            ("(해지 + 해제) * 손해배상", "(해지 OR 해제) AND 손해배상", False),
            ("과실 | 고의 * 책임", "과실 OR (고의 AND 책임)", False),
            ('"국가"*"계약"', "국가 AND 계약", True),
        ]
        for query, expected_expression, expected_fallback in cases:
            with self.subTest(query=query):
                parsed = self.parse(query)
                self.assertEqual(parsed["expression"], expected_expression)
                self.assertEqual(parsed["fallback"], expected_fallback)

    def test_plus_is_or_not_required_and(self):
        parsed = self.parse("해지 + 해제")
        bool_query = parsed["dsl"]["bool"]
        self.assertIn("should", bool_query)
        self.assertNotIn("must", bool_query)
        self.assertEqual(bool_query["minimum_should_match"], 1)
        self.assertEqual(bool_query["should"][0]["multi_match"]["query"], "해지")
        self.assertEqual(bool_query["should"][1]["multi_match"]["query"], "해제")

    def test_implicit_space_is_and(self):
        parsed = self.parse("손해배상 과실")
        bool_query = parsed["dsl"]["bool"]
        self.assertEqual(
            [item["multi_match"]["query"] for item in bool_query["must"]],
            ["손해배상", "과실"],
        )

    def test_not_becomes_must_not_inside_and(self):
        parsed = self.parse("계약 ! 근로")
        bool_query = parsed["dsl"]["bool"]
        self.assertEqual(bool_query["must"][0]["multi_match"]["query"], "계약")
        self.assertEqual(bool_query["must_not"][0]["multi_match"]["query"], "근로")

    def test_exact_phrase_uses_phrase_query(self):
        parsed = self.parse('"채무불이행"')
        multi_match = parsed["dsl"]["multi_match"]
        self.assertEqual(multi_match["query"], "채무불이행")
        self.assertEqual(multi_match["type"], "phrase")

    def test_precedence_not_and_or(self):
        parsed = self.parse("과실 | 고의 * 책임")
        should = parsed["dsl"]["bool"]["should"]
        self.assertEqual(should[0]["multi_match"]["query"], "과실")
        nested_and = should[1]["bool"]["must"]
        self.assertEqual(
            [item["multi_match"]["query"] for item in nested_and],
            ["고의", "책임"],
        )

    def test_malformed_parentheses_fallback_without_exception(self):
        parsed = self.parse("(계약 + 해제")
        self.assertTrue(parsed["fallback"])
        self.assertEqual(parsed["expression"], "계약 AND 해제")

    def test_duplicate_operators_are_tolerated(self):
        parsed = self.parse("계약 && 해제")
        self.assertFalse(parsed["fallback"])
        self.assertEqual(parsed["expression"], "계약 AND 해제")


if __name__ == "__main__":
    unittest.main()

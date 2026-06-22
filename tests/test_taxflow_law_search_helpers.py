import unittest

from run_taxflow import (
    build_query_variants,
    normalize_law_search_text,
    sort_law_results,
)


class TaxFlowLawSearchHelpersTest(unittest.TestCase):
    def test_normalizes_symbols_and_basic_typos(self):
        self.assertEqual(
            normalize_law_search_text("지방셰법§7조"),
            "지방세법 제7조",
        )

    def test_expands_local_tax_law_alias_inside_query(self):
        variants = build_query_variants("지특법 감면", "법령")
        self.assertIn("지방세특례제한법 감면", variants)

    def test_expands_seoul_district_ordinance_query(self):
        variants = build_query_variants("강남구 세 감면 조례", "조례")
        self.assertIn("서울특별시 강남구 세 감면 조례", variants)

    def test_sorts_exact_current_law_before_history_and_partial_matches(self):
        results = [
            {"title": "지방세법 시행령", "statusCode": "현행", "sourceDate": "2026-01-01"},
            {"title": "지방세법", "statusCode": "연혁", "sourceDate": "2020-01-01"},
            {"title": "지방세법", "statusCode": "현행", "sourceDate": "2026-01-01"},
        ]
        sorted_results = sort_law_results(results, "지방세법", "law")
        self.assertEqual(sorted_results[0]["title"], "지방세법")
        self.assertEqual(sorted_results[0]["statusCode"], "현행")


if __name__ == "__main__":
    unittest.main()

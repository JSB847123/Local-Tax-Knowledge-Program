import unittest
from unittest.mock import patch
from xml.etree import ElementTree as ET

from run_taxflow import (
    build_query_variants,
    map_law_record,
    normalize_law_search_text,
    search_law_target,
    sort_law_results,
    target_search_attempts,
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

    def test_law_keyword_search_tries_body_before_title(self):
        attempts = target_search_attempts("law", "대도시 중과")
        self.assertEqual(attempts[0]["params"], {"query": "대도시 중과", "search": "2"})
        self.assertEqual(attempts[1]["params"], {"query": "대도시 중과"})

    def test_law_title_search_tries_title_before_body(self):
        attempts = target_search_attempts("law", "지방세법")
        self.assertEqual(attempts[0]["params"], {"query": "지방세법"})
        self.assertEqual(attempts[1]["params"], {"query": "지방세법", "search": "2"})

    def test_law_search_combines_body_results_and_prioritizes_local_tax_laws(self):
        def fake_request(params):
            if params.get("search") == "2":
                return ET.fromstring(
                    """
                    <LawSearch>
                      <law>
                        <법령일련번호>1</법령일련번호>
                        <법령명한글>도로법</법령명한글>
                        <현행연혁코드>현행</현행연혁코드>
                        <시행일자>20260603</시행일자>
                        <법령구분명>법률</법령구분명>
                        <소관부처명>국토교통부</소관부처명>
                      </law>
                      <law>
                        <법령일련번호>2</법령일련번호>
                        <법령명한글>지방세법</법령명한글>
                        <현행연혁코드>현행</현행연혁코드>
                        <시행일자>20260424</시행일자>
                        <법령구분명>법률</법령구분명>
                        <소관부처명>행정안전부</소관부처명>
                      </law>
                    </LawSearch>
                    """
                )
            return ET.fromstring(
                """
                <LawSearch>
                  <law>
                    <법령일련번호>3</법령일련번호>
                    <법령명한글>대도시권 광역교통 관리에 관한 특별법</법령명한글>
                    <현행연혁코드>현행</현행연혁코드>
                    <시행일자>20260603</시행일자>
                    <법령구분명>법률</법령구분명>
                    <소관부처명>국토교통부</소관부처명>
                  </law>
                </LawSearch>
                """
            )

        with patch("run_taxflow.request_law_xml", side_effect=fake_request):
            results = search_law_target("secret", "대도시 중과", "law", 5)

        self.assertEqual(results[0]["title"], "지방세법")
        self.assertIn("본문검색", results[0]["matchedQuery"])
        self.assertEqual({item["title"] for item in results}, {
            "지방세법",
            "도로법",
            "대도시권 광역교통 관리에 관한 특별법",
        })

    def test_law_record_uses_public_url_without_oc(self):
        node = ET.fromstring(
            """
            <law>
              <법령일련번호>282559</법령일련번호>
              <법령명한글>지방세법</법령명한글>
              <법령상세링크>https://www.law.go.kr/DRF/lawService.do?OC=secret&amp;target=law&amp;MST=282559&amp;type=HTML</법령상세링크>
            </law>
            """
        )
        result = map_law_record(node, "law")
        self.assertEqual(result["officialUrl"], "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=282559")
        self.assertNotIn("OC=", result["officialUrl"])


if __name__ == "__main__":
    unittest.main()

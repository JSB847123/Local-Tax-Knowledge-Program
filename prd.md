# PRD: Tax-Flow

**지방세 지식 및 전산 실무 연계 관리 시스템**
버전: v0.9 / 작성 기준일: 2026-06-19
대상: 대한민국 지방자치단체 지방세 담당 공무원, 특히 취득세·재산세 등 복잡 세목 담당자

---

## 0. Executive Summary

**Tax-Flow**는 지방세 공무원이 복잡한 지방세 업무를 처리할 때 필요한 **법령·판례·질의회신 검색**, **개인 지식/이론 정리**, **차세대 지방세입정보시스템·위택스 등 실제 전산 처리 방법 기록**을 하나의 흐름으로 연결하는 업무 지식 관리 시스템이다.

핵심은 단순 문서 보관이 아니라 다음의 업무 사고 흐름을 제품 안에서 구조화하는 것이다.

> **쟁점 발생 → 법령/판례/질의회신 확인 → 이론·판단 기준 정리 → 실제 전산 메뉴·입력값·주의사항으로 매핑 → 재사용 가능한 업무 매뉴얼화**

국가법령정보 공동활용 API는 법령, 자치법규, 판례, 법령해석례, 행정심판례 등 다양한 원문 조회 API를 제공하고 있으며, 한국지방세연구원 지방세 법령정보시스템은 지방세 관계 법령, 자치단체 조례, 최신 개정법령, 법원 판례, 조세심판원 결정례, 감사원 심사결정례, 행정안전부 유권해석 등을 제공한다. 따라서 Tax-Flow의 1차 설계 방향은 **공식 원문은 외부 신뢰 소스에서 조회·참조하고, 내부에는 공무원 개인/팀의 해석 노트와 전산 적용 매뉴얼을 축적하는 구조**가 적합하다. ([열린법률정보][1])

---

# 1. Project Overview

## 1.1 프로젝트 개요

### 제품명

**Tax-Flow**
가칭: 지방세 지식 및 전산 실무 연계 관리 시스템

### 제품 유형

* 개인 또는 팀 단위 지방세 업무 지식 관리 시스템
* 웹 기반 SaaS형 또는 지자체 내부망 설치형 웹 애플리케이션
* 대안: 개인 PC 기반 로컬 앱

### 핵심 사용자

대한민국 지방자치단체 지방세 담당 공무원
MVP 우선 대상 세목:

* **취득세**
* **재산세**

확장 대상 세목:

* 등록면허세
* 주민세
* 자동차세
* 지방소득세
* 지역자원시설세
* 기타 지방세 세목

한국지역정보개발원은 지방세정보시스템 사업 개요에서 취득세·재산세 등 11개 세목의 부과·징수·체납 및 지방세 통계관리를 위한 표준지방세정보시스템을 공무원 업무처리용으로 운영한다고 설명하고, 위택스는 대국민 지방세 신고·납부 및 수납 전 과정 온라인 처리를 담당한다고 설명한다. Tax-Flow는 이러한 공식 업무 시스템을 대체하는 것이 아니라, 그 위에서 공무원의 지식·판단·매뉴얼을 구조화하는 보조 시스템이다. ([한국지역정보개발원][2])

---

## 1.2 문제 정의

지방세 담당 공무원은 다음과 같은 반복적인 문제를 겪는다.

### 업무상 Pain Point

| 문제                            | 상세                                                           |
| ----------------------------- | ------------------------------------------------------------ |
| 법령·판례·질의회신이 흩어져 있음            | 국가법령정보센터, 지방세 법령정보시스템, 행안부 회신, 조세심판원 결정례, 내부 매뉴얼 등이 분산됨      |
| 쟁점별 판단 근거를 다시 찾는 데 시간이 많이 듦   | “대도시 내 법인 취득세 중과”, “과세기준일 현재 재산세 토지 구분”, “감면 추징” 등 반복 쟁점이 많음 |
| 법령 지식과 전산 처리 방법이 분리되어 있음      | 법리는 이해했지만 차세대 지방세입정보시스템에서 어느 메뉴에 무엇을 입력해야 하는지 별도 노하우가 필요함    |
| 담당자 변경 시 지식이 단절됨              | 개인 메모, 엑셀, 한글 파일, 카카오톡 공유, 구두 전수에 의존                         |
| 업무 중 필요한 정보의 신뢰도와 최신성 판단이 어려움 | 최신 개정 여부, 판례 변경, 행정해석의 적용 범위 확인이 필요함                         |
| 전산 처리 실수 리스크                  | 세율, 감면, 과표, 중과, 분리과세, 별도합산 등 복잡한 판단이 입력 실수로 이어질 수 있음         |

---

## 1.3 제품 목표

### Primary Goal

지방세 공무원이 **법령·판례 근거와 실제 전산 적용 방법을 하나의 업무 단위로 연결**하여 저장, 검색, 재사용할 수 있도록 한다.

### Secondary Goals

* 세목별 지식 체계를 독립적으로 관리한다.
* 자주 보는 법령, 판례, 행정해석을 빠르게 북마크한다.
* 개인/팀 단위 업무 노하우를 정형화된 템플릿으로 축적한다.
* 신규 담당자 인수인계와 반복 민원·과세 쟁점 처리 시간을 단축한다.
* 세무 전산 처리 시 체크리스트 기반으로 오류를 줄인다.

---

## 1.4 MVP 범위

### MVP에 반드시 포함

1. 세목별 워크스페이스
2. 사용자 정의 카테고리 CRUD 및 정렬
3. 법령/판례/질의회신 검색 UI
4. 외부 원문 링크 저장 및 북마크
5. 지식/이론 노트 에디터
6. 전산 적용 매뉴얼 작성 양식
7. `[법령/판례] - [이론 노트] - [전산 적용 매뉴얼]` 연결 구조
8. 통합 검색
9. 태그, 즐겨찾기, 최근 본 항목
10. 로컬 또는 웹 기반 저장 구조

### MVP에서 제외

* 차세대 지방세입정보시스템 직접 로그인/자동 입력
* 위택스 자동 신고/납부 처리
* 실제 납세자 개인정보 자동 수집
* 법적 판단 자동 결정 기능
* AI가 단독으로 과세 여부를 확정하는 기능

차세대 지방세입정보시스템은 2024년 2월 13일 서비스 개시 후 안정화 조치가 진행되었고, 행정안전부는 이후 해당 시스템을 통해 지방세 업무를 더 정확하고 효율적으로 처리할 수 있게 됐다고 설명했다. Tax-Flow는 이 시스템을 자동 조작하는 제품이 아니라, 공무원이 해당 시스템을 올바르게 사용하는 데 필요한 **업무 지식 레이어**로 설계한다. ([행정안전부][3])

---

## 1.5 핵심 성공 지표

| 구분     |                     지표 | 목표           |
| ------ | ---------------------: | ------------ |
| 검색 효율  |  특정 쟁점 관련 근거를 찾는 평균 시간 | 기존 대비 50% 단축 |
| 재사용성   |     작성된 전산 적용 매뉴얼 재조회율 | 월 30% 이상     |
| 지식 축적  |         사용자당 월 신규 노트 수 | 10개 이상       |
| 북마크 활용 |     저장된 법령/판례 북마크 재방문율 | 40% 이상       |
| 업무 안정성 |     매뉴얼 체크리스트 기반 완료 건수 | 월별 증가        |
| 인수인계   | 신규 담당자의 업무 적응 자료 탐색 시간 | 기존 대비 50% 단축 |

---

# 2. User Persona & User Journey

## 2.1 사용자 페르소나

### Persona A. 취득세 담당 2년 차 공무원

| 항목    | 내용                                                                           |
| ----- | ---------------------------------------------------------------------------- |
| 이름    | 김민재                                                                          |
| 소속    | 기초자치단체 세무과 취득세팀                                                              |
| 업무    | 부동산 취득세 신고 검토, 감면, 중과세, 추징                                                   |
| 주요 문제 | 판례와 행안부 유권해석을 자주 찾아야 하나, 찾은 자료를 실무 전산 처리와 연결하기 어려움                           |
| 니즈    | “대도시 법인 중과”, “주택 유상취득 세율”, “감면 후 추징” 같은 쟁점을 빠르게 재확인하고, 전산 입력 경로까지 한 번에 보고 싶음 |

### Persona B. 재산세 담당 5년 차 공무원

| 항목    | 내용                                              |
| ----- | ----------------------------------------------- |
| 이름    | 박서연                                             |
| 소속    | 재산세팀                                            |
| 업무    | 토지/건축물/주택 과세대상 관리, 과세기준일 판단, 별도합산·종합합산 구분       |
| 주요 문제 | 과세기준일 현재 토지 이용상황, 착공 여부, 공부와 현황 차이 등 판단 자료가 복잡함 |
| 니즈    | 법리, 판례, 현장 조사 기준, 과세자료 입력 방법을 쟁점별로 묶어 관리하고 싶음   |

### Persona C. 신규 전입 지방세 공무원

| 항목    | 내용                                       |
| ----- | ---------------------------------------- |
| 이름    | 이도윤                                      |
| 소속    | 세무과 신규 전입                                |
| 업무    | 재산세 보조 및 취득세 민원 응대                       |
| 주요 문제 | 업무 용어, 시스템 메뉴, 세목별 판단 체계를 빠르게 익혀야 함      |
| 니즈    | 선임자가 정리한 노트와 전산 매뉴얼을 카테고리별로 따라가며 학습하고 싶음 |

---

## 2.2 핵심 사용자 시나리오

### 시나리오 1. 취득세 중과 쟁점 처리

1. 공무원이 “대도시 법인 지점 설치 후 5년 이내 부동산 취득” 민원을 받는다.
2. Tax-Flow에서 `취득세 > 중과세 > 대도시 법인` 카테고리를 선택한다.
3. 키워드 `대도시 지점 중과 직접사용 임대`로 검색한다.
4. 관련 법령 조문, 판례, 행정안전부 유권해석을 확인한다.
5. 중요한 해석을 북마크한다.
6. 자신의 이론 노트에 판단 기준을 정리한다.
7. 전산 적용 매뉴얼에 다음 내용을 기록한다.

   * 차세대 지방세입정보시스템 메뉴 경로
   * 입력해야 할 취득 유형
   * 중과세율 선택 위치
   * 직접사용/임대 구분 시 주의사항
   * 증빙자료 체크리스트
8. 이후 유사 민원 발생 시 해당 Tax-Flow 문서를 다시 열어 빠르게 처리한다.

---

### 시나리오 2. 재산세 토지 과세구분 판단

1. 과세기준일 현재 토지가 착공 중인지 단순 준비행위인지 쟁점이 된다.
2. 공무원이 `재산세 > 토지 > 별도합산/종합합산` 카테고리에서 기존 노트를 검색한다.
3. 관련 판례와 내부 매뉴얼을 확인한다.
4. 현장사진, 착공신고, 굴착 여부, 공사계약서 등 필요한 판단 자료 체크리스트를 확인한다.
5. 과세구분 변경 시 전산 처리 메뉴와 변경 전후 검증 항목을 확인한다.
6. 처리 후 보완된 내용을 매뉴얼에 업데이트한다.

---

### 시나리오 3. 신규 담당자 인수인계

1. 신규 담당자가 `취득세` 워크스페이스에 진입한다.
2. 대시보드에서 “많이 보는 쟁점”, “최근 업데이트된 법령/판례”, “선임 추천 매뉴얼”을 확인한다.
3. `입문 코스` 태그가 붙은 노트만 필터링한다.
4. 각 노트에서 연결된 법령 원문과 전산 처리 매뉴얼을 함께 확인한다.
5. 실제 업무 처리 전 체크리스트를 복사하여 사용한다.

---

## 2.3 사용자 여정 맵

| 단계       | 사용자 행동             | 제품 기능              | 산출물              |
| -------- | ------------------ | ------------------ | ---------------- |
| 1. 쟁점 인지 | 민원/신고/과세자료에서 쟁점 발생 | 빠른 검색, 세목 선택       | 검색어, 세목 컨텍스트     |
| 2. 근거 탐색 | 법령·판례·회신 검색        | 외부 원문 검색 UI, 필터    | 원문 후보 목록         |
| 3. 근거 저장 | 중요 자료 보관           | 북마크, 스크랩           | 법령/판례 카드         |
| 4. 판단 정리 | 이론·판단 기준 기록        | 지식 노트 에디터          | 이론 노트            |
| 5. 전산 매핑 | 실제 시스템 처리 방법 기록    | 전산 적용 매뉴얼 템플릿      | 메뉴 경로, 입력값, 주의사항 |
| 6. 연결    | 원문·노트·매뉴얼 연결       | Tax-Flow Link      | 하나의 업무 플로우 문서    |
| 7. 재사용   | 유사 쟁점 검색           | 통합 검색, 태그, 최근 본 항목 | 빠른 업무 처리         |
| 8. 개선    | 처리 경험 반영           | 버전 관리, 수정 이력       | 최신 실무 매뉴얼        |

---

# 3. Core Features & Detailed Requirements

## 3.1 기능 전체 요약

| Feature ID | 기능명         | 우선순위 | 설명                           |
| ---------- | ----------- | ---: | ---------------------------- |
| F-001      | 세목별 워크스페이스  |   P0 | 취득세, 재산세 등 세목별 독립 공간         |
| F-002      | 카테고리 관리     |   P0 | 사용자 정의 카테고리 생성/수정/삭제/정렬      |
| F-003      | 법령/판례 검색    |   P0 | 외부 공식 소스 검색 인터페이스            |
| F-004      | 북마크/스크랩     |   P0 | 중요 법령·판례·회신 저장               |
| F-005      | 지식/이론 노트    |   P0 | 개인 학습, 판단 기준, 노하우 기록         |
| F-006      | 전산 적용 매뉴얼   |   P0 | 실제 세무 전산 메뉴·입력값·주의사항 기록      |
| F-007      | Tax-Flow 연결 |   P0 | 원문-노트-매뉴얼 간 링크 구조            |
| F-008      | 통합 검색       |   P0 | 세목, 카테고리, 태그, 원문, 노트, 매뉴얼 검색 |
| F-009      | 태그/라벨       |   P1 | 쟁점별 다차원 분류                   |
| F-010      | 버전 관리       |   P1 | 매뉴얼 변경 이력 추적                 |
| F-011      | 공유/팀 협업     |   P1 | 팀 단위 공유, 댓글, 검토              |
| F-012      | 업데이트 알림     |   P2 | 법령 개정, 새 판례, 원문 변경 감지        |
| F-013      | AI 요약/추천    |   P2 | 원문 요약, 유사 쟁점 추천              |

---

## 3.2 F-001 세목별 워크스페이스

### 목적

취득세, 재산세 등 세목별 업무 지식이 섞이지 않도록 독립된 작업 공간을 제공한다.

### 요구사항

| ID       | 요구사항                                       |
| -------- | ------------------------------------------ |
| F-001-01 | 사용자는 좌측 사이드바에서 세목을 선택할 수 있어야 한다.           |
| F-001-02 | 기본 세목으로 `취득세`, `재산세`를 제공한다.                |
| F-001-03 | 관리자는 세목을 추가/숨김/정렬할 수 있어야 한다.               |
| F-001-04 | 세목별로 카테고리, 노트, 북마크, 매뉴얼, 태그가 독립 관리되어야 한다.  |
| F-001-05 | 통합 검색에서는 전체 세목 검색과 현재 세목 내 검색을 모두 지원해야 한다. |

### 기본 세목 코드 예시

| tax_item_code               | tax_item_name | MVP |
| --------------------------- | ------------- | --: |
| acquisition_tax             | 취득세           |   Y |
| property_tax                | 재산세           |   Y |
| registration_license_tax    | 등록면허세         |   N |
| resident_tax                | 주민세           |   N |
| automobile_tax              | 자동차세          |   N |
| local_income_tax            | 지방소득세         |   N |
| local_resource_facility_tax | 지역자원시설세       |   N |

---

## 3.3 F-002 카테고리 관리

### 목적

사용자가 실제 업무 방식에 맞게 세목별 분류 체계를 자유롭게 구성한다.

### 주요 기능

* 카테고리 생성
* 카테고리명 수정
* 카테고리 삭제
* 드래그 앤 드롭 정렬
* 상위/하위 카테고리 구조
* 카테고리별 노트/북마크/매뉴얼 개수 표시
* 삭제 전 영향 항목 안내

### 카테고리 깊이

MVP 기준 최대 3depth 권장.

예시:

```text
취득세
 ├─ 과세대상
 ├─ 세율
 ├─ 중과세
 │   ├─ 대도시 법인
 │   ├─ 사치성 재산
 │   └─ 과밀억제권역
 ├─ 감면
 │   ├─ 생애최초
 │   ├─ 산업단지
 │   └─ 자경농민
 └─ 추징

재산세
 ├─ 과세대상
 ├─ 과세기준일
 ├─ 토지
 │   ├─ 종합합산
 │   ├─ 별도합산
 │   └─ 분리과세
 ├─ 건축물
 ├─ 주택
 └─ 감면
```

### 상세 요구사항

| ID       | 요구사항                                                       |
| -------- | ---------------------------------------------------------- |
| F-002-01 | 카테고리는 특정 세목에 종속되어야 한다.                                     |
| F-002-02 | 동일 세목의 동일 부모 아래에서는 카테고리명이 중복될 수 없다.                        |
| F-002-03 | 카테고리 삭제 시 연결된 노트/북마크/매뉴얼을 다른 카테고리로 이동하거나 미분류 처리할 수 있어야 한다. |
| F-002-04 | 카테고리 정렬 순서는 사용자별 또는 조직별로 저장 가능해야 한다.                       |
| F-002-05 | 카테고리는 `활성`, `숨김`, `보관` 상태를 가질 수 있어야 한다.                    |
| F-002-06 | 카테고리별 설명 필드를 제공하여 분류 기준을 기록할 수 있어야 한다.                     |

### Acceptance Criteria

* 사용자가 취득세 워크스페이스에서 만든 카테고리는 재산세 워크스페이스에 노출되지 않는다.
* 드래그 앤 드롭 후 새로고침해도 정렬 순서가 유지된다.
* 삭제 시 연결된 항목 수와 처리 옵션이 모달로 표시된다.

---

## 3.4 F-003 법령 및 판례 검색/스크랩

### 목적

지방세 업무에 필요한 법령, 판례, 유권해석, 심판결정례 등을 검색하고, 필요한 자료를 Tax-Flow 내부 지식과 연결한다.

### 지원 소스

| 소스                | MVP 지원 방식               | 비고                    |
| ----------------- | ----------------------- | --------------------- |
| 국가법령정보센터/공동활용 API | API 연동 우선               | 법령, 자치법규, 판례, 법령해석례 등 |
| 지방세 법령정보시스템       | 외부 링크/메타데이터 저장 우선       | 지방세 특화 판례·해석          |
| 행정안전부 유권해석        | 지방세 법령정보시스템 링크 또는 수동 등록 | 공식 원문 링크 보존           |
| 조세심판원 결정례         | 링크/메타데이터 저장             | P1 고도화                |
| 감사원 심사결정례         | 링크/메타데이터 저장             | P1 고도화                |
| 내부 문서             | 파일 첨부/링크                | P1                    |

국가법령정보 공동활용 API는 현행법령, 연혁법령, 자치법규, 판례, 헌재결정례, 법령해석례, 행정심판례 등의 목록/본문 조회를 제공하며, 판례 목록 API는 사건명, 사건번호, 선고일자, 법원명, 데이터출처명, 판례상세링크 등의 필드를 제공한다. ([열린법률정보][1])

### 검색 필터

| 필터    | 값 예시                                   |
| ----- | -------------------------------------- |
| 세목    | 취득세, 재산세                               |
| 자료 유형 | 법령, 시행령, 시행규칙, 조례, 판례, 행정해석, 조세심판, 감사원 |
| 키워드   | 대도시, 중과, 별도합산, 과세기준일                   |
| 날짜    | 선고일, 회신일, 개정일                          |
| 기관    | 대법원, 헌법재판소, 행정안전부, 조세심판원, 감사원          |
| 저장 여부 | 전체, 북마크됨, 연결된 노트 있음                    |
| 적용 상태 | 검토 전, 검토 완료, 실무 적용 중, 폐기/비권장           |

### 검색 결과 카드 필드

| 필드                   | 설명                                                  |
| -------------------- | --------------------------------------------------- |
| title                | 사건명, 법령명, 회신명                                       |
| source_type          | law / precedent / interpretation / tribunal / audit |
| institution          | 대법원, 행정안전부 등                                        |
| date                 | 선고일, 회신일, 시행일                                       |
| summary              | 원문 제공 요약 또는 사용자 작성 요약                               |
| related_laws         | 관련 법령 조문                                            |
| external_url         | 공식 원문 링크                                            |
| bookmark_status      | 북마크 여부                                              |
| linked_notes_count   | 연결된 노트 수                                            |
| linked_manuals_count | 연결된 전산 매뉴얼 수                                        |

### 스크랩 정책

* 원문 전체를 무단 복제 저장하지 않는다.
* 기본 저장 대상은 다음으로 제한한다.

  * 제목
  * 기관
  * 사건번호/문서번호
  * 날짜
  * 관련 법령
  * 공식 링크
  * 사용자가 작성한 요약
  * 인용할 핵심 문장 짧은 발췌
* 원문 확인 버튼은 항상 공식 원문으로 연결한다.

### 상세 요구사항

| ID       | 요구사항                                                        |
| -------- | ----------------------------------------------------------- |
| F-003-01 | 사용자는 검색창에 키워드를 입력하고 자료 유형을 선택할 수 있어야 한다.                    |
| F-003-02 | 검색 결과는 카드형/리스트형으로 전환 가능해야 한다.                               |
| F-003-03 | 사용자는 검색 결과를 즉시 북마크할 수 있어야 한다.                               |
| F-003-04 | 사용자는 검색 결과를 기존 노트 또는 신규 노트에 연결할 수 있어야 한다.                   |
| F-003-05 | 검색 결과에는 공식 원문 열기 버튼이 있어야 한다.                                |
| F-003-06 | 같은 외부 자료가 중복 저장되지 않도록 source + external_id 기준으로 중복 체크해야 한다. |
| F-003-07 | 검색 결과가 없을 경우 수동 등록 폼을 제공해야 한다.                              |

---

## 3.5 F-004 즐겨찾기/북마크

### 목적

자주 보는 법령, 판례, 유권해석을 빠르게 꺼내볼 수 있도록 한다.

### 북마크 대상

* 외부 법령/판례/해석 자료
* 내부 이론 노트
* 전산 적용 매뉴얼
* 통합 Tax-Flow 문서

### 북마크 필드

| 필드          | 설명                                     |
| ----------- | -------------------------------------- |
| bookmark_id | 북마크 ID                                 |
| target_type | source_document / note / manual / flow |
| target_id   | 대상 ID                                  |
| user_id     | 저장한 사용자                                |
| tax_item_id | 세목                                     |
| category_id | 카테고리                                   |
| memo        | 개인 메모                                  |
| pinned      | 상단 고정 여부                               |
| created_at  | 생성일                                    |

### 요구사항

| ID       | 요구사항                                         |
| -------- | -------------------------------------------- |
| F-004-01 | 모든 검색 결과 카드에는 북마크 토글 버튼이 있어야 한다.             |
| F-004-02 | 북마크 목록은 세목별, 유형별, 최근순, 많이 본 순으로 필터링 가능해야 한다. |
| F-004-03 | 사용자는 북마크에 개인 메모를 추가할 수 있어야 한다.               |
| F-004-04 | 북마크된 항목이 삭제되거나 링크가 변경되면 상태를 표시해야 한다.         |
| F-004-05 | 대시보드에 상단 고정 북마크 영역을 제공해야 한다.                 |

---

## 3.6 F-005 지식/이론 노트 에디터

### 목적

공무원이 학습한 지방세 이론, 판단 기준, 노하우, 민원 대응 포인트를 정리한다.

### 에디터 형태

* MVP: Markdown + Rich Text 혼합 에디터
* P1: 블록 기반 에디터
* P2: AI 요약/문장 정리/유사 판례 추천

### 노트 템플릿

```text
[쟁점명]
예: 대도시 내 법인 지점 설치 후 5년 이내 부동산 취득 중과 여부

[업무 상황]
어떤 민원/신고/과세자료에서 발생하는 쟁점인가?

[핵심 판단 기준]
1.
2.
3.

[관련 법령]
- 지방세법 제__조
- 지방세법 시행령 제__조

[관련 판례/해석]
- 대법원 __
- 행정안전부 유권해석 __

[실무상 체크포인트]
- 공부상 등록 여부
- 인적·물적 설비 여부
- 취득일
- 직접사용/임대 구분

[주의사항]
- 예외
- 최신 개정 확인 필요
- 지자체 내부 검토 필요 사항

[전산 적용 매뉴얼 링크]
- 연결된 매뉴얼
```

### 노트 상태

| 상태         | 의미           |
| ---------- | ------------ |
| draft      | 작성 중         |
| reviewed   | 검토 완료        |
| applied    | 실무 적용 중      |
| deprecated | 더 이상 권장하지 않음 |
| archived   | 보관           |

### 상세 요구사항

| ID       | 요구사항                                  |
| -------- | ------------------------------------- |
| F-005-01 | 사용자는 세목과 카테고리를 지정하여 노트를 작성할 수 있어야 한다. |
| F-005-02 | 노트에는 여러 법령/판례/해석 자료를 연결할 수 있어야 한다.    |
| F-005-03 | 노트 본문에서 연결 자료를 인라인 참조할 수 있어야 한다.      |
| F-005-04 | 노트에는 태그를 여러 개 부여할 수 있어야 한다.           |
| F-005-05 | 노트에는 상태값을 지정할 수 있어야 한다.               |
| F-005-06 | 수정 이력을 저장해야 한다.                       |
| F-005-07 | 사용자는 노트를 복제하여 유사 쟁점 노트를 만들 수 있어야 한다.  |

---

## 3.7 F-006 전산 적용 매뉴얼

### 목적

법령·판례상 판단이 실제 세무 전산 시스템에서 어떻게 처리되는지 구조화한다.

### 전산 적용 매뉴얼 대상 시스템

| 시스템           | 설명                         |
| ------------- | -------------------------- |
| 차세대 지방세입정보시스템 | 공무원 업무 처리용 지방세 시스템         |
| 위택스           | 대국민 신고·납부 관련 확인 및 민원 안내    |
| 지자체 내부 시스템    | 문서관리, 전자결재, 세외수입, 민원 시스템 등 |
| 기타            | 엑셀 검증표, 내부 대장 등            |

위택스는 취득세, 등록면허세, 지방소득세, 주민세, 지역자원시설세, 레저세 등의 전자신고납부와 부과된 지방세 조회·납부, 지방세환급 신청, 경정청구 신청 등 전자신청 서비스를 제공한다. Tax-Flow에서는 위택스 자체 기능을 대체하지 않고, 민원 안내·신고 확인·납부 확인과 관련된 내부 업무 메모를 연결하는 방식으로 설계한다. ([부천시청][4])

### 전산 적용 매뉴얼 템플릿

| 섹션       | 필드                                 |
| -------- | ---------------------------------- |
| 기본 정보    | 제목, 세목, 카테고리, 적용 업무, 난이도           |
| 관련 쟁점    | 연결 노트, 연결 법령/판례                    |
| 적용 시스템   | 차세대 지방세입정보시스템 / 위택스 / 기타           |
| 메뉴 경로    | 예: 부과관리 > 취득세 > 신고자료 관리 > 감면/중과 검토 |
| 전제 조건    | 사전 확인 자료, 납세자 유형, 취득 유형            |
| 입력 항목    | 과세표준, 세율, 감면코드, 중과코드, 물건정보 등       |
| 처리 절차    | Step 1, Step 2, Step 3             |
| 검증 방법    | 산출세액 확인, 고지자료 확인, 결재 전 검토          |
| 주의사항     | 실수하기 쉬운 항목, 예외 케이스                 |
| 증빙자료     | 등기사항증명서, 계약서, 사업자등록, 현장사진 등        |
| 민원 안내 문구 | 납세자에게 설명할 때 사용할 문장                 |
| 변경 이력    | 작성자, 수정일, 변경 사유                    |

### 전산 매뉴얼 Step 데이터 예시

```json
{
  "manual_title": "대도시 법인 취득세 중과 전산 처리",
  "system_name": "차세대 지방세입정보시스템",
  "menu_path": [
    "부과관리",
    "취득세",
    "부동산 신고자료 관리",
    "세율/감면 검토"
  ],
  "steps": [
    {
      "order": 1,
      "action": "납세자 법인 정보와 본점/지점 소재지 확인",
      "input_fields": ["법인등록번호", "사업장 소재지", "설립일"],
      "caution": "실제 운영 환경에서는 주민등록번호 등 개인정보를 Tax-Flow에 저장하지 말 것"
    },
    {
      "order": 2,
      "action": "취득 물건의 직접사용/임대 예정 여부 확인",
      "input_fields": ["물건 용도", "직접사용 면적", "임대 면적"],
      "caution": "면적 안분 기준을 별도 노트와 연결"
    }
  ]
}
```

### 상세 요구사항

| ID       | 요구사항                                            |
| -------- | ----------------------------------------------- |
| F-006-01 | 사용자는 노트에서 바로 전산 적용 매뉴얼을 생성할 수 있어야 한다.           |
| F-006-02 | 매뉴얼은 세목, 카테고리, 시스템명, 메뉴 경로를 필수값으로 가진다.          |
| F-006-03 | 메뉴 경로는 텍스트와 단계형 배열 둘 다 저장해야 한다.                 |
| F-006-04 | 처리 절차는 순서 변경 가능한 Step 구조여야 한다.                  |
| F-006-05 | 각 Step에는 입력 항목, 확인 자료, 주의사항을 기록할 수 있어야 한다.      |
| F-006-06 | 매뉴얼에는 스크린샷 첨부가 가능하되 개인정보 자동 탐지/마스킹 안내를 제공해야 한다. |
| F-006-07 | 매뉴얼에는 체크리스트 모드가 있어야 한다.                         |
| F-006-08 | 매뉴얼은 PDF 또는 Markdown으로 내보내기 가능해야 한다.            |
| F-006-09 | 매뉴얼 변경 이력을 저장해야 한다.                             |

---

## 3.8 F-007 Tax-Flow 연결 구조

### 목적

`법령/판례 원문`, `이론 노트`, `전산 적용 매뉴얼`을 별도 문서가 아닌 하나의 업무 단위로 연결한다.

### 핵심 개념

**Flow**는 특정 세무 쟁점에 대한 통합 업무 문서다.

```text
Tax-Flow 문서
 ├─ 관련 법령/판례/질의회신
 ├─ 이론 노트
 ├─ 전산 적용 매뉴얼
 ├─ 체크리스트
 ├─ 태그
 └─ 변경 이력
```

### 연결 유형

| 관계               | 설명                           |
| ---------------- | ---------------------------- |
| source_to_note   | 법령/판례가 특정 노트의 근거가 됨          |
| note_to_manual   | 이론 노트가 전산 매뉴얼로 적용됨           |
| source_to_manual | 특정 판례/회신이 전산 처리 주의사항과 직접 연결됨 |
| note_to_note     | 유사 쟁점 노트 간 연결                |
| manual_to_manual | 유사 업무 처리 매뉴얼 간 연결            |

### 상세 요구사항

| ID       | 요구사항                                        |
| -------- | ------------------------------------------- |
| F-007-01 | 사용자는 법령/판례 카드에서 “노트에 연결”을 선택할 수 있어야 한다.     |
| F-007-02 | 사용자는 노트에서 “전산 매뉴얼 생성”을 선택할 수 있어야 한다.        |
| F-007-03 | Flow 상세 화면은 원문, 노트, 매뉴얼을 한 화면에서 볼 수 있어야 한다. |
| F-007-04 | 연결된 항목은 양방향으로 이동 가능해야 한다.                   |
| F-007-05 | 연결 관계에는 사용자가 설명을 남길 수 있어야 한다.               |
| F-007-06 | 연결 관계에는 신뢰도/적용 상태를 표시할 수 있어야 한다.            |

### Flow 상태

| 상태           | 의미                        |
| ------------ | ------------------------- |
| draft        | 아직 정리 중                   |
| verified     | 팀/작성자가 검토 완료              |
| in_use       | 실무에서 사용 중                 |
| needs_update | 법령 개정 또는 시스템 변경으로 업데이트 필요 |
| deprecated   | 더 이상 사용하지 않음              |

---

## 3.9 F-008 통합 검색

### 목적

사용자가 기억하는 단어 일부만으로도 관련 근거, 노트, 매뉴얼을 빠르게 찾을 수 있도록 한다.

### 검색 대상

* 세목명
* 카테고리명
* 태그
* 법령/판례 메타데이터
* 사용자 요약
* 노트 본문
* 전산 매뉴얼 본문
* 메뉴 경로
* 체크리스트 항목

### 검색 UX

* 상단 글로벌 검색바
* 현재 세목 내 검색 토글
* 검색어 하이라이트
* 최근 검색어
* 저장된 검색 조건
* 검색 결과 그룹핑

### 검색 결과 그룹

```text
검색어: "대도시 중과 지점"

[법령/판례/해석]
- 취득세 중과 여부 질의회신
- 지방세법 제13조 관련 자료

[이론 노트]
- 대도시 내 법인 지점 설치 판단 기준
- 직접사용/임대 구분 시 중과 적용

[전산 매뉴얼]
- 취득세 중과세율 선택 및 검증 절차
- 감면 후 중과 추징 처리 체크리스트
```

---

## 3.10 F-009 태그/라벨

### 목적

카테고리 계층만으로 표현하기 어려운 쟁점을 다차원적으로 관리한다.

### 태그 예시

| 세목  | 태그 예시                                 |
| --- | ------------------------------------- |
| 취득세 | 대도시, 중과, 감면, 추징, 법인, 주택, 상속, 신탁, 산업단지 |
| 재산세 | 과세기준일, 별도합산, 종합합산, 분리과세, 착공, 현황과세, 감면 |
| 공통  | 민원빈발, 신규자필독, 최신개정확인, 결재전검토, 위험높음      |

### 요구사항

* 태그 자동완성
* 태그 병합
* 태그 색상 지정
* 태그별 대시보드 필터
* 자주 쓰는 태그 추천

---

## 3.11 F-010 버전 관리

### 목적

법령 개정, 판례 변경, 전산 메뉴 변경에 따라 노트와 매뉴얼의 변경 이력을 추적한다.

### 버전 관리 대상

* 노트 본문
* 전산 매뉴얼
* 카테고리명
* Flow 연결 관계
* 체크리스트

### 요구사항

| ID       | 요구사항                                                |
| -------- | --------------------------------------------------- |
| F-010-01 | 노트/매뉴얼 수정 시 자동으로 revision을 생성한다.                    |
| F-010-02 | 사용자는 이전 버전과 현재 버전을 비교할 수 있어야 한다.                    |
| F-010-03 | 변경 사유 입력 필드를 제공한다.                                  |
| F-010-04 | 특정 버전으로 복원할 수 있어야 한다.                               |
| F-010-05 | 법령 개정 또는 시스템 메뉴 변경으로 인한 수정은 `update_reason`으로 표시한다. |

---

## 3.12 F-011 보안 및 개인정보 보호

### 설계 원칙

Tax-Flow는 원칙적으로 **납세자 개인정보 저장 시스템이 아니다.**
전산 적용 방법을 기록할 때도 실제 납세자명, 주민등록번호, 법인등록번호, 주소 전체, 과세번호 등 민감 정보를 저장하지 않는 것을 기본 정책으로 한다.

개인정보 보호법 시행령은 개인정보처리자에게 내부 관리계획, 접근 권한 제한, 접근 통제, 인증정보 암호화, 주민등록번호 등 주요 정보의 암호화 저장, 접속기록 저장·점검 등 안전성 확보 조치를 요구한다. 공공시스템 운영기관에 대해서는 공공시스템별 안전성 확보 조치, 접근 권한 관리, 접속기록 저장·분석·점검 등의 추가 조치도 규정하고 있다. ([법제처][5])

### 필수 보안 요구사항

| 영역      | 요구사항                          |
| ------- | ----------------------------- |
| 인증      | 이메일/비밀번호, SSO, 내부망 계정 연동 옵션   |
| 권한      | 개인, 팀, 관리자 권한 분리              |
| 접근 통제   | 세목/팀/문서 단위 접근 권한              |
| 암호화     | 전송구간 TLS, 저장 데이터 암호화          |
| 로그      | 로그인, 조회, 생성, 수정, 삭제, 내보내기 로그  |
| 개인정보 방지 | 민감정보 입력 경고, 스크린샷 업로드 시 마스킹 안내 |
| 백업      | 정기 백업 및 복구 테스트                |
| 감사      | 관리자 감사 로그 조회                  |
| 반출 통제   | PDF/Excel 내보내기 권한 제한          |

개인정보보호위원회는 전체 개인정보처리자에게 접근인증 실패 시 접근 제한, 접속기록 점검, 인터넷망 구간 개인정보 전송 시 암호화 등 안전조치가 확대 적용된다고 안내했고, 공공시스템 운영기관은 접근권한 관리와 접속기록 보관·점검 등 강화된 안전조치를 준수해야 한다고 설명한다. ([www.pipc.go.kr][6])

---

# 4. Information Architecture

## 4.1 전체 IA 개념도

```text
Tax-Flow
 ├─ Home Dashboard
 │   ├─ 최근 본 항목
 │   ├─ 상단 고정 북마크
 │   ├─ 최근 작성 노트
 │   ├─ 업데이트 필요 문서
 │   └─ 세목별 바로가기
 │
 ├─ Tax Workspace
 │   ├─ 취득세
 │   │   ├─ Dashboard
 │   │   ├─ Categories
 │   │   ├─ Legal Search
 │   │   ├─ Bookmarks
 │   │   ├─ Notes
 │   │   ├─ Manuals
 │   │   ├─ Flows
 │   │   └─ Settings
 │   │
 │   └─ 재산세
 │       ├─ Dashboard
 │       ├─ Categories
 │       ├─ Legal Search
 │       ├─ Bookmarks
 │       ├─ Notes
 │       ├─ Manuals
 │       ├─ Flows
 │       └─ Settings
 │
 ├─ Global Search
 ├─ Tag Center
 ├─ Templates
 │   ├─ Note Templates
 │   └─ Manual Templates
 ├─ Import / Export
 ├─ User Settings
 └─ Admin
     ├─ Users
     ├─ Roles
     ├─ Source Connectors
     ├─ Audit Logs
     └─ Backup
```

---

## 4.2 주요 객체 관계

```text
User
 └─ Workspace Membership

TaxItem
 ├─ Category
 ├─ SourceDocument
 ├─ Note
 ├─ Manual
 └─ Flow

SourceDocument
 ├─ Bookmark
 ├─ FlowLink
 └─ Tags

Note
 ├─ FlowLink
 ├─ Revision
 ├─ Attachments
 └─ Tags

Manual
 ├─ ManualStep
 ├─ ChecklistItem
 ├─ Revision
 ├─ Attachments
 └─ Tags

Flow
 ├─ SourceDocument[]
 ├─ Note[]
 ├─ Manual[]
 ├─ ChecklistItem[]
 └─ Status
```

---

## 4.3 내비게이션 구조

### 좌측 사이드바

```text
Tax-Flow
 ├─ 전체 대시보드
 ├─ 통합 검색
 ├─ 취득세
 │   ├─ 대시보드
 │   ├─ 카테고리
 │   ├─ 법령/판례 검색
 │   ├─ 북마크
 │   ├─ 이론 노트
 │   ├─ 전산 매뉴얼
 │   └─ Flow 문서
 ├─ 재산세
 │   ├─ 대시보드
 │   ├─ 카테고리
 │   ├─ 법령/판례 검색
 │   ├─ 북마크
 │   ├─ 이론 노트
 │   ├─ 전산 매뉴얼
 │   └─ Flow 문서
 ├─ 태그
 ├─ 템플릿
 └─ 설정
```

---

# 5. UI/UX Wireframe Concept

## 5.1 디자인 원칙

### 키워드

* Minimal
* Professional
* Calm
* Readable
* 업무 집중형
* 라인 아트 기반
* 따뜻한 뉴트럴 톤

### 컬러 시스템 제안

| 용도             | 색상              | HEX       |
| -------------- | --------------- | --------- |
| Background     | Warm Ivory      | `#FAF7F1` |
| Surface        | Soft Sand       | `#F1E7D8` |
| Card           | Off White       | `#FFFDF8` |
| Border         | Warm Gray       | `#D8CFC2` |
| Primary Text   | Deep Brown      | `#3D3026` |
| Secondary Text | Taupe Gray      | `#74695F` |
| Accent         | Muted Brown     | `#8A5E3B` |
| Accent Light   | Sand Beige      | `#D9B98F` |
| Warning        | Soft Amber      | `#B7791F` |
| Danger         | Muted Red Brown | `#9B3A32` |
| Success        | Olive Gray      | `#667A5B` |

### Typography

* 본문: Pretendard, Noto Sans KR, system sans-serif
* 문서/노트 본문: 15~16px, line-height 1.65
* 제목 계층:

  * H1: 24px / 700
  * H2: 20px / 700
  * H3: 17px / 600
  * Body: 15px / 400
  * Metadata: 12~13px / 400

### UI 원칙

* 배경은 따뜻한 아이보리, 카드 표면은 밝은 화이트 계열
* 테두리는 얇고 명확하게
* 강조 색은 브라운 계열을 제한적으로 사용
* 법령/판례/노트/매뉴얼 유형별 아이콘은 라인 아트로 통일
* 표, 목록, 카드 모두 정보 계층을 명확히 구분
* 장문 독해 화면은 우측 보조 패널보다 본문 집중도를 우선

---

## 5.2 화면 1: 전체 대시보드

### 목적

오늘 업무에 바로 필요한 항목으로 진입한다.

```text
┌──────────────────────────────────────────────────────────────┐
│ Tax-Flow                         [통합 검색...]      사용자  │
├──────────────┬───────────────────────────────────────────────┤
│ 전체          │  오늘의 업무 보드                              │
│ 통합 검색     │                                               │
│              │  ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│ 취득세        │  │ 최근 본 항목 │ │ 상단 북마크 │ │ 업데이트 필요 │ │
│  - 대시보드   │  └────────────┘ └────────────┘ └────────────┘ │
│  - 검색       │                                               │
│  - 노트       │  세목별 바로가기                               │
│  - 매뉴얼     │  [취득세] 중과/감면/추징                       │
│              │  [재산세] 토지/주택/과세기준일                  │
│ 재산세        │                                               │
│  - 대시보드   │  최근 작성 노트                                │
│  - 검색       │  - 대도시 법인 중과 판단 기준                   │
│  - 노트       │  - 착공 중 토지 별도합산 검토                   │
│  - 매뉴얼     │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

### 주요 컴포넌트

* GlobalSearchBar
* RecentItemsCard
* PinnedBookmarksCard
* UpdateNeededCard
* TaxItemShortcut
* RecentNotesList

---

## 5.3 화면 2: 세목별 워크스페이스

### 목적

세목별 지식 체계를 독립적으로 탐색한다.

```text
┌──────────────────────────────────────────────────────────────┐
│ 취득세 Workspace                         [세목 내 검색...]   │
├──────────────┬───────────────────────────────────────────────┤
│ 카테고리      │  취득세 대시보드                               │
│ ├ 과세대상    │                                               │
│ ├ 세율        │  많이 보는 카테고리                            │
│ ├ 중과세      │  [대도시 법인] [사치성 재산] [과밀억제권역]      │
│ │ ├ 대도시법인│                                               │
│ │ └ 사치성재산│  최근 업데이트된 Flow                           │
│ ├ 감면        │  - 대도시 법인 중과 전산 처리                   │
│ └ 추징        │  - 산업단지 감면 후 추징 체크리스트              │
│              │                                               │
│ [+ 카테고리]  │  빠른 작업                                     │
│              │  [법령/판례 검색] [노트 작성] [매뉴얼 작성]       │
└──────────────┴───────────────────────────────────────────────┘
```

---

## 5.4 화면 3: 법령/판례 검색

### 목적

공식 원문 검색과 내부 지식 연결을 한 화면에서 처리한다.

```text
┌──────────────────────────────────────────────────────────────┐
│ 법령/판례 검색                                                │
├──────────────────────────────────────────────────────────────┤
│ 검색어 [ 대도시 법인 중과 지점 ] [검색]                       │
│ 필터: [취득세] [판례] [행안부 유권해석] [최근순]               │
├──────────────────────┬───────────────────────────────────────┤
│ 검색 결과             │ 미리보기 / 연결 패널                    │
│ ┌──────────────────┐ │ 제목: 취득세 중과 여부 질의회신          │
│ │ 행안부 유권해석   │ │ 기관: 서울세제                         │
│ │ 취득세 중과 여부  │ │ 관련법령: 지방세법 제13조               │
│ │ 2017.12.20       │ │                                       │
│ │ [북마크] [연결]   │ │ [공식 원문 열기]                        │
│ └──────────────────┘ │ [새 노트로 연결] [기존 노트에 연결]      │
│ ┌──────────────────┐ │                                       │
│ │ 대법원 판례       │ │ 사용자 요약                            │
│ │ ...              │ │ [요약 입력 영역]                        │
│ └──────────────────┘ │                                       │
└──────────────────────┴───────────────────────────────────────┘
```

---

## 5.5 화면 4: Tax-Flow 상세 화면

### 목적

법령/판례, 이론 노트, 전산 매뉴얼을 하나의 업무 단위로 확인한다.

```text
┌──────────────────────────────────────────────────────────────┐
│ Flow: 대도시 법인 취득세 중과 판단 및 전산 처리               │
│ 상태: 실무 적용 중  | 세목: 취득세 | 카테고리: 중과세 > 대도시 │
├──────────────┬─────────────────────────┬─────────────────────┤
│ 근거 자료      │ 이론 노트                  │ 전산 적용 매뉴얼      │
│              │                         │                     │
│ [법령]        │ 핵심 판단 기준             │ 시스템: 차세대        │
│ 지방세법 제13 │ 1. 지점 설치 여부           │ 메뉴 경로             │
│              │ 2. 5년 이내 취득 여부       │ 부과관리 > 취득세...  │
│ [행안부 회신] │ 3. 업무용/비업무용 구분     │                     │
│ 서울세제...   │                         │ Step 1. 법인정보 확인 │
│              │ 실무상 체크포인트           │ Step 2. 취득물건 확인 │
│ [판례]        │ - 사업자등록 여부           │ Step 3. 중과세율 선택 │
│ 대법원 ...    │ - 인적·물적 설비 여부       │                     │
│              │                         │ [체크리스트 실행]     │
└──────────────┴─────────────────────────┴─────────────────────┘
```

### UX 포인트

* 3열 구조를 기본으로 하되, 작은 화면에서는 탭 구조로 전환한다.
* 각 열은 독립 스크롤을 지원한다.
* 연결 자료는 카드 형태로 표시한다.
* “업데이트 필요” 상태일 경우 상단에 경고 배너를 표시한다.
* 전산 매뉴얼은 체크리스트 모드로 전환 가능하다.

---

## 5.6 화면 5: 카테고리 편집

```text
┌──────────────────────────────────────────────────────────────┐
│ 카테고리 관리 - 취득세                              [저장]    │
├──────────────────────────────────────────────────────────────┤
│ 드래그하여 순서 변경                                          │
│                                                              │
│ ☰ 과세대상                                  [수정] [삭제]     │
│ ☰ 세율                                      [수정] [삭제]     │
│ ☰ 중과세                                    [수정] [삭제]     │
│   ☰ 대도시 법인                             [수정] [삭제]     │
│   ☰ 사치성 재산                             [수정] [삭제]     │
│ ☰ 감면                                      [수정] [삭제]     │
│   ☰ 생애최초                                [수정] [삭제]     │
│   ☰ 산업단지                                [수정] [삭제]     │
│                                                              │
│ [+ 상위 카테고리 추가] [+ 하위 카테고리 추가]                  │
└──────────────────────────────────────────────────────────────┘
```

---

# 6. Data Schema & Tech Stack Recommendation

## 6.1 데이터 모델 개요

### 핵심 엔티티

| Entity         | 설명                |
| -------------- | ----------------- |
| User           | 사용자               |
| Organization   | 지자체 또는 팀          |
| TaxItem        | 세목                |
| Category       | 세목별 카테고리          |
| SourceDocument | 법령/판례/해석 원문 메타데이터 |
| Bookmark       | 즐겨찾기              |
| Note           | 지식/이론 노트          |
| Manual         | 전산 적용 매뉴얼         |
| ManualStep     | 매뉴얼 단계            |
| Flow           | 원문-노트-매뉴얼 연결 문서   |
| FlowLink       | 연결 관계             |
| Tag            | 태그                |
| Attachment     | 첨부파일              |
| Revision       | 버전 이력             |
| AuditLog       | 감사 로그             |

---

## 6.2 PostgreSQL 기준 테이블 설계안

### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### organizations

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) DEFAULT 'local_government',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### tax_items

```sql
CREATE TABLE tax_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### categories

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  tax_item_id UUID NOT NULL REFERENCES tax_items(id),
  parent_id UUID REFERENCES categories(id),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (organization_id, tax_item_id, parent_id, name)
);
```

### source_documents

```sql
CREATE TABLE source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL,
  source_provider VARCHAR(100) NOT NULL,
  external_id VARCHAR(200),
  title TEXT NOT NULL,
  institution VARCHAR(200),
  document_no VARCHAR(200),
  case_no VARCHAR(200),
  decision_date DATE,
  effective_date DATE,
  related_laws JSONB DEFAULT '[]',
  summary TEXT,
  external_url TEXT,
  raw_metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (source_provider, external_id)
);
```

### notes

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  tax_item_id UUID NOT NULL REFERENCES tax_items(id),
  category_id UUID REFERENCES categories(id),
  title VARCHAR(300) NOT NULL,
  body_markdown TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'draft',
  visibility VARCHAR(30) DEFAULT 'private',
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### manuals

```sql
CREATE TABLE manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  tax_item_id UUID NOT NULL REFERENCES tax_items(id),
  category_id UUID REFERENCES categories(id),
  title VARCHAR(300) NOT NULL,
  system_name VARCHAR(150) NOT NULL,
  menu_path_text TEXT,
  menu_path_json JSONB DEFAULT '[]',
  prerequisites TEXT,
  verification_method TEXT,
  cautions TEXT,
  status VARCHAR(30) DEFAULT 'draft',
  visibility VARCHAR(30) DEFAULT 'private',
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### manual_steps

```sql
CREATE TABLE manual_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title VARCHAR(300) NOT NULL,
  action_description TEXT NOT NULL,
  input_fields JSONB DEFAULT '[]',
  required_documents JSONB DEFAULT '[]',
  caution TEXT,
  expected_result TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### flows

```sql
CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  tax_item_id UUID NOT NULL REFERENCES tax_items(id),
  category_id UUID REFERENCES categories(id),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  status VARCHAR(30) DEFAULT 'draft',
  risk_level VARCHAR(30) DEFAULT 'normal',
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### flow_links

```sql
CREATE TABLE flow_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,
  relation_type VARCHAR(50) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### bookmarks

```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  tax_item_id UUID REFERENCES tax_items(id),
  category_id UUID REFERENCES categories(id),
  memo TEXT,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
```

### tags

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
```

### taggings

```sql
CREATE TABLE taggings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (tag_id, target_type, target_id)
);
```

### revisions

```sql
CREATE TABLE revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  version_no INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, version_no)
);
```

### audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

## 6.3 API 설계안

### 인증

| Method | Endpoint           | 설명        |
| ------ | ------------------ | --------- |
| POST   | `/api/auth/login`  | 로그인       |
| POST   | `/api/auth/logout` | 로그아웃      |
| GET    | `/api/auth/me`     | 현재 사용자 정보 |

### 세목/카테고리

| Method | Endpoint                               | 설명       |
| ------ | -------------------------------------- | -------- |
| GET    | `/api/tax-items`                       | 세목 목록    |
| GET    | `/api/tax-items/:taxItemId/categories` | 세목별 카테고리 |
| POST   | `/api/categories`                      | 카테고리 생성  |
| PATCH  | `/api/categories/:id`                  | 카테고리 수정  |
| DELETE | `/api/categories/:id`                  | 카테고리 삭제  |
| PATCH  | `/api/categories/reorder`              | 카테고리 정렬  |

### 법령/판례 검색

| Method | Endpoint                              | 설명              |
| ------ | ------------------------------------- | --------------- |
| GET    | `/api/legal-search`                   | 외부 소스 통합 검색     |
| GET    | `/api/source-documents/:id`           | 저장된 원문 메타데이터 조회 |
| POST   | `/api/source-documents`               | 수동 원문 등록        |
| POST   | `/api/source-documents/:id/bookmark`  | 북마크             |
| POST   | `/api/source-documents/:id/link-note` | 노트 연결           |

### 노트

| Method | Endpoint                       | 설명           |
| ------ | ------------------------------ | ------------ |
| GET    | `/api/notes`                   | 노트 목록        |
| POST   | `/api/notes`                   | 노트 생성        |
| GET    | `/api/notes/:id`               | 노트 상세        |
| PATCH  | `/api/notes/:id`               | 노트 수정        |
| DELETE | `/api/notes/:id`               | 노트 삭제        |
| POST   | `/api/notes/:id/create-manual` | 노트 기반 매뉴얼 생성 |

### 매뉴얼

| Method | Endpoint                         | 설명     |
| ------ | -------------------------------- | ------ |
| GET    | `/api/manuals`                   | 매뉴얼 목록 |
| POST   | `/api/manuals`                   | 매뉴얼 생성 |
| GET    | `/api/manuals/:id`               | 매뉴얼 상세 |
| PATCH  | `/api/manuals/:id`               | 매뉴얼 수정 |
| DELETE | `/api/manuals/:id`               | 매뉴얼 삭제 |
| POST   | `/api/manuals/:id/steps`         | 단계 추가  |
| PATCH  | `/api/manuals/:id/steps/reorder` | 단계 정렬  |

### Flow

| Method | Endpoint                       | 설명      |
| ------ | ------------------------------ | ------- |
| GET    | `/api/flows`                   | Flow 목록 |
| POST   | `/api/flows`                   | Flow 생성 |
| GET    | `/api/flows/:id`               | Flow 상세 |
| PATCH  | `/api/flows/:id`               | Flow 수정 |
| POST   | `/api/flows/:id/links`         | 연결 추가   |
| DELETE | `/api/flows/:id/links/:linkId` | 연결 삭제   |

### 통합 검색

| Method | Endpoint                          | 설명       |
| ------ | --------------------------------- | -------- |
| GET    | `/api/search?q=&taxItemId=&type=` | 내부 통합 검색 |
| GET    | `/api/search/recent`              | 최근 검색어   |
| POST   | `/api/search/saved`               | 검색 조건 저장 |

---

## 6.4 프론트엔드 컴포넌트 구조

```text
src/
 ├─ app/
 │   ├─ dashboard/
 │   ├─ tax-items/[taxItemId]/
 │   │   ├─ dashboard/
 │   │   ├─ categories/
 │   │   ├─ legal-search/
 │   │   ├─ notes/
 │   │   ├─ manuals/
 │   │   └─ flows/
 │   └─ settings/
 │
 ├─ components/
 │   ├─ layout/
 │   │   ├─ AppShell.tsx
 │   │   ├─ Sidebar.tsx
 │   │   └─ TopSearchBar.tsx
 │   ├─ categories/
 │   │   ├─ CategoryTree.tsx
 │   │   └─ CategoryEditor.tsx
 │   ├─ legal/
 │   │   ├─ LegalSearchForm.tsx
 │   │   ├─ SourceDocumentCard.tsx
 │   │   └─ SourcePreviewPanel.tsx
 │   ├─ notes/
 │   │   ├─ NoteEditor.tsx
 │   │   └─ NoteCard.tsx
 │   ├─ manuals/
 │   │   ├─ ManualEditor.tsx
 │   │   ├─ ManualStepEditor.tsx
 │   │   └─ ChecklistRunner.tsx
 │   └─ flows/
 │       ├─ FlowDetailView.tsx
 │       ├─ FlowLinkPanel.tsx
 │       └─ ThreePaneFlowLayout.tsx
 │
 ├─ lib/
 │   ├─ api/
 │   ├─ auth/
 │   ├─ search/
 │   └─ validators/
 │
 └─ styles/
```

---

## 6.5 추천 기술 스택

## Option A. 웹 기반 내부 업무 시스템

| 계층       | 추천                                                        |
| -------- | --------------------------------------------------------- |
| Frontend | React + TypeScript + Next.js                              |
| UI       | Tailwind CSS + Headless UI 또는 shadcn/ui 계열 컴포넌트           |
| Backend  | NestJS 또는 FastAPI                                         |
| DB       | PostgreSQL                                                |
| 검색       | PostgreSQL Full Text Search → P1에서 Meilisearch/OpenSearch |
| 파일 저장    | S3 호환 스토리지 또는 내부 NAS                                      |
| 인증       | 자체 계정 + 조직 SSO 연동 가능 구조                                   |
| 배포       | 내부망 서버, 공공 클라우드, 또는 지자체 보안 기준에 맞춘 온프레미스                   |
| 로그       | DB audit log + 애플리케이션 로그                                  |
| 문서 내보내기  | PDF, Markdown, DOCX 선택                                    |

### 장점

* 팀 협업에 적합
* 권한 관리 용이
* 백업/감사 로그 관리 가능
* 장기적으로 지자체 단위 지식베이스화 가능

### 단점

* 보안 검토, 배포 인프라, 계정 관리 필요
* 외부 API 연동 시 망 구성 검토 필요

---

## Option B. 개인 PC 로컬 앱

| 계층        | 추천                    |
| --------- | --------------------- |
| App Shell | Tauri 또는 Electron     |
| Frontend  | React + TypeScript    |
| DB        | SQLite + FTS5         |
| 파일 저장     | 로컬 암호화 폴더             |
| 검색        | SQLite FTS            |
| 동기화       | MVP 제외, P1에서 수동 백업/복원 |
| 내보내기      | Markdown, PDF, ZIP    |

### 장점

* 빠른 MVP 개발 가능
* 개인 학습 도구로 배포 쉬움
* 내부망 제약이 큰 경우 유리

### 단점

* 팀 협업 어려움
* 백업/버전 관리 취약
* 여러 PC 간 동기화 문제

---

## Option C. 하이브리드

| 구성            | 설명                          |
| ------------- | --------------------------- |
| 개인 로컬 앱       | 개인 노트, 북마크, 매뉴얼 작성          |
| 팀 서버          | 검토 완료 문서만 공유                |
| Export/Import | JSON/Markdown 기반 반출입        |
| 장점            | 개인정보·보안 부담 최소화 + 팀 지식 축적 가능 |
| 단점            | 동기화 정책 설계 필요                |

### 추천 결론

MVP가 개인 생산성 도구라면 **Option B**가 빠르다.
지자체 팀 단위 업무 지식 축적과 인수인계까지 목표라면 **Option A**가 적합하다.
실무 적용 가능성과 보안 부담을 균형 있게 보려면 **Option C**를 장기 구조로 두고, MVP는 웹 기반 단일 조직 버전으로 시작하는 것을 추천한다.

---

# 7. Detailed MVP Backlog

## 7.1 Sprint 1: 기본 골격

| 작업        | 설명                   | 완료 기준           |
| --------- | -------------------- | --------------- |
| 프로젝트 초기화  | FE/BE/DB 세팅          | 로컬 실행 가능        |
| 사용자/조직 모델 | users, organizations | 로그인 후 사용자 정보 조회 |
| 세목 모델     | tax_items seed       | 취득세/재산세 표시      |
| 앱 레이아웃    | Sidebar + Topbar     | 주요 메뉴 이동 가능     |

---

## 7.2 Sprint 2: 카테고리

| 작업        | 설명           | 완료 기준          |
| --------- | ------------ | -------------- |
| 카테고리 CRUD | 생성/수정/삭제     | 세목별 카테고리 관리 가능 |
| 트리 UI     | 3depth 트리    | 접기/펼치기 가능      |
| 정렬        | Drag & Drop  | 순서 저장          |
| 삭제 처리     | 연결 항목 이동/미분류 | 삭제 전 영향 안내     |

---

## 7.3 Sprint 3: 원문 검색/북마크

| 작업         | 설명            | 완료 기준    |
| ---------- | ------------- | -------- |
| 검색 UI      | 키워드/필터 입력     | 검색 요청 가능 |
| 외부 API 어댑터 | 국가법령정보 API 우선 | 결과 카드 표시 |
| 수동 등록      | 링크/메타데이터 입력   | 외부 자료 저장 |
| 북마크        | 토글/목록         | 북마크 재조회  |

---

## 7.4 Sprint 4: 노트

| 작업     | 설명                  | 완료 기준     |
| ------ | ------------------- | --------- |
| 노트 목록  | 세목/카테고리 필터          | 목록 표시     |
| 노트 에디터 | Markdown/Rich       | 저장/수정 가능  |
| 원문 연결  | source_documents 연결 | 노트 상세에 표시 |
| 태그     | 태그 생성/부여            | 태그 검색 가능  |

---

## 7.5 Sprint 5: 전산 매뉴얼

| 작업       | 설명          | 완료 기준       |
| -------- | ----------- | ----------- |
| 매뉴얼 생성   | 노트 기반 생성    | 노트에서 매뉴얼 생성 |
| 메뉴 경로 입력 | 단계형 경로      | 배열 저장       |
| Step 관리  | 추가/수정/삭제/정렬 | 절차 저장       |
| 체크리스트    | Step 기반 실행  | 완료 체크 가능    |

---

## 7.6 Sprint 6: Flow 통합 화면

| 작업      | 설명           | 완료 기준       |
| ------- | ------------ | ----------- |
| Flow 생성 | 제목/세목/카테고리   | Flow 문서 생성  |
| 연결 관리   | 원문/노트/매뉴얼 연결 | 3열 화면 표시    |
| 통합 검색   | 노트/매뉴얼/원문 검색 | 검색 결과 그룹 표시 |
| 대시보드    | 최근/북마크/업데이트  | 업무 진입 가능    |

---

# 8. Non-Functional Requirements

## 8.1 성능

| 항목          | 기준                   |
| ----------- | -------------------- |
| 초기 페이지 로딩   | 3초 이내                |
| 내부 검색 응답    | 1초 이내                |
| 외부 법령 검색 응답 | 5초 이내, 초과 시 로딩/재시도   |
| 노트 저장       | 500ms 이내             |
| 카테고리 트리 렌더링 | 1,000개 노드까지 무리 없이 표시 |

---

## 8.2 접근성

| 항목     | 기준                   |
| ------ | -------------------- |
| 키보드 탐색 | 주요 기능 Tab 이동 가능      |
| 명도 대비  | 본문 텍스트 WCAG AA 수준 권장 |
| 폰트 크기  | 최소 13px 이상           |
| 장문 읽기  | 줄간격 1.6 이상           |
| 색상 의존도 | 상태를 색상만으로 구분하지 않음    |

---

## 8.3 보안

| 항목   | 기준                 |
| ---- | ------------------ |
| 인증   | 세션/JWT 보안 설정       |
| 권한   | RBAC               |
| 로그   | 주요 변경/조회 로그 저장     |
| 민감정보 | 입력 방지 안내 및 마스킹     |
| 첨부파일 | 확장자 제한, 바이러스 검사 옵션 |
| 백업   | 정기 백업              |
| 내보내기 | 권한 있는 사용자만 가능      |

---

## 8.4 데이터 보존

| 데이터         | 보존 정책               |
| ----------- | ------------------- |
| 노트/매뉴얼      | 삭제 시 soft delete 권장 |
| 감사 로그       | 최소 1년 이상            |
| 첨부파일        | 삭제 시 복구 대기 기간 설정    |
| 외부 원문 메타데이터 | 공식 링크와 함께 장기 보존     |
| 북마크         | 사용자 삭제 전까지 보존       |

---

# 9. Future Roadmap

## Phase 1. MVP 안정화

* 취득세/재산세 워크스페이스
* 카테고리 관리
* 법령/판례 검색
* 북마크
* 노트
* 전산 매뉴얼
* Flow 상세 화면
* 통합 검색

---

## Phase 2. 팀 협업

* 팀 공유 문서함
* 검토 요청
* 댓글
* 승인 워크플로우
* 팀 표준 매뉴얼 지정
* 신규자 교육용 컬렉션
* 부서장/검토자 권한

---

## Phase 3. 업데이트 관리

* 법령 개정 감지
* 원문 링크 상태 점검
* 새 판례/회신 알림
* “업데이트 필요” 문서 자동 표시
* 전산 메뉴 개편 이력 관리
* 문서별 최신성 점수

---

## Phase 4. AI 보조 기능

* 법령/판례 요약
* 쟁점 키워드 자동 추출
* 유사 노트 추천
* 전산 매뉴얼 초안 생성
* 민원 답변 문구 초안 생성
* 노트 간 중복 탐지
* “이 쟁점과 연결된 기존 매뉴얼 있음” 추천

단, AI 기능은 반드시 **참고 보조**로 제한해야 하며, 최종 과세 판단과 전산 입력 책임은 담당 공무원에게 있음을 UI에 명확히 표시해야 한다.

---

## Phase 5. 기관 단위 지식베이스

* 지자체별 공통 템플릿
* 세목별 표준 지식맵
* 담당자 인수인계 패키지
* 법령/판례 기반 교육 모드
* 내부 감사 대응 자료 정리
* 문서 품질 점수
* 업무 처리 사례집 자동 생성

---

# 10. 개발 착수용 핵심 결정사항

## 10.1 MVP 제품 원칙

| 항목        | 결정                                |
| --------- | --------------------------------- |
| 공식 원문 저장  | 원문 전체 저장보다 공식 링크와 메타데이터 중심        |
| 사용자 지식 저장 | 내부 노트/요약/매뉴얼은 Tax-Flow에 저장        |
| 전산 시스템 연동 | MVP에서는 직접 자동화하지 않고 메뉴 경로/입력 방식 기록 |
| 개인정보      | 기본적으로 저장 금지, 예시는 익명화              |
| 세목        | 취득세·재산세 우선                        |
| 카테고리      | 세목별 독립 트리                         |
| 화면 핵심     | 3열 Flow 상세 화면                     |
| 검색        | 내부 통합 검색 + 외부 공식 검색 인터페이스         |
| 배포        | 웹 기반 우선, 로컬 앱은 대안                 |

---

## 10.2 MVP에서 가장 중요한 사용자 가치

> “이 판례/법령이 실제 전산 처리에서 어디에 어떻게 반영되는가?”를 한 화면에서 확인할 수 있어야 한다.

따라서 개발 우선순위는 다음과 같다.

1. 세목별 카테고리
2. 원문 검색/북마크
3. 노트 작성
4. 전산 매뉴얼 작성
5. 원문-노트-매뉴얼 연결
6. 통합 검색
7. 대시보드

---

# 11. Final Product Definition

**Tax-Flow는 지방세 공무원의 개인 지식과 실무 전산 노하우를 체계화하는 “지방세 업무 플로우 지식베이스”다.**

일반적인 법령 검색 서비스와의 차이는 다음에 있다.

| 일반 법령 검색       | Tax-Flow                     |
| -------------- | ---------------------------- |
| 법령/판례 원문 조회 중심 | 원문 + 개인 판단 노트 + 전산 적용 매뉴얼 연결 |
| 자료 단위 관리       | 세무 쟁점 단위 관리                  |
| 읽고 끝남          | 북마크, 노트화, 매뉴얼화, 재사용          |
| 법리와 전산 실무 분리   | 법리와 전산 메뉴/입력값/주의사항 통합        |
| 개인 메모 분산       | 세목별 구조화된 지식베이스               |
| 인수인계 어려움       | Flow 문서 기반 인수인계 가능           |

MVP는 **취득세와 재산세를 중심으로 한 개인/팀 업무 지식 관리 도구**로 시작하고, 장기적으로는 지방세 담당자의 반복 업무, 교육, 인수인계, 전산 처리 품질 향상을 지원하는 전문 업무 플랫폼으로 확장한다.

[1]: https://open.law.go.kr/LSO/openApi/guideList.do "국가법령정보 공동활용"
[2]: https://www.klid.or.kr/open/bbs.do?PID=serviceSysMng "한국지역정보개발원"
[3]: https://www.mois.go.kr/frt/bbs/type001/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000009&nttId=107306 "
(설명) 차세대 지방세입정보시스템 개통 일주일에도 불안 불안(연합뉴스) 등 | 
행정안전부>  뉴스·소식> 보도자료> 설명자료"
[4]: https://www.bucheon.go.kr/site/homepage/menu/viewMenu?menuid=148006008009001 "
	
		
		
		
		
		
		
		위택스납부 | 지방세납부방법안내 | 세금 | 분야별정보 | 부천시청
		
	
"
[5]: https://www.law.go.kr/lumLsLinkPop.do?chrClsCd=010202&lspttninfSeq=66999 "연계정보"
[6]: https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000%22&nttId=10264 "개인정보보호위원회"

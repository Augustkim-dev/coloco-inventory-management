# Database Rebuild Guide

## 📋 개요

`comprehensive_rebuild.sql` 파일은 전체 데이터베이스를 깨끗하게 재구축하기 위한 종합 SQL 스크립트입니다. 이 파일은 기존의 17개 마이그레이션 파일(001-017)을 하나로 통합하여 운영 환경 배포를 위한 깔끔한 초기 상태를 제공합니다.

---

## 🎯 이 스크립트가 하는 일

### 1. **DROP (삭제)**
- 모든 기존 테이블 삭제 (역순으로 안전하게 삭제)
- 모든 함수 삭제

### 2. **CREATE (생성)**
- **11개 테이블** 생성:
  - `users` - 사용자 관리
  - `locations` - 지점 정보 (HQ + 브랜치)
  - `suppliers` - 공급업체
  - `products` - 제품 마스터
  - `supplier_products` - 공급업체-제품 관계
  - `purchase_orders` - 발주서
  - `purchase_order_items` - 발주 상세
  - `stock_batches` - 재고 배치 (FIFO)
  - `pricing_configs` - 가격 설정
  - `sales` - 판매 기록
  - `exchange_rates` - 환율 정보

- **2개 함수** 생성:
  - `update_updated_at_column()` - 자동 타임스탬프 업데이트
  - `get_available_stock()` - 재고 조회

- **25개 RLS 정책** 생성:
  - HQ_Admin vs Branch_Manager 권한 분리
  - 테이블별 접근 제어

### 3. **INSERT (초기 데이터)**
- **3개 지점**: Korea HQ, Vietnam Branch, China Branch
- **2개 환율**: KRW→VND (18.0), KRW→CNY (0.0053)

---

## 🚀 실행 방법

### **방법 1: Supabase Dashboard (권장)**

1. Supabase 프로젝트 대시보드 접속
2. 좌측 메뉴에서 **SQL Editor** 클릭
3. **New Query** 버튼 클릭
4. `comprehensive_rebuild.sql` 파일 내용을 복사하여 붙여넣기
5. **Run** 버튼 클릭하여 실행

### **방법 2: Supabase CLI**

```bash
# Supabase에 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-ref

# SQL 파일 실행
supabase db execute -f supabase/migrations/comprehensive_rebuild.sql
```

### **방법 3: psql 커맨드 라인**

```bash
psql postgresql://[connection-string] < supabase/migrations/comprehensive_rebuild.sql
```

---

## ⚠️ 주의사항

### **실행 전 필독!**

1. **데이터 백업**: 기존 데이터가 있다면 **반드시 백업**하세요.
   - 이 스크립트는 `DROP TABLE IF EXISTS ... CASCADE`를 사용하여 **모든 데이터를 삭제**합니다.

2. **테스트 환경 우선**: 프로덕션 환경에 적용하기 전에 반드시 테스트 환경에서 먼저 실행하세요.

3. **RLS 정책 확인**: 실행 후 RLS 정책이 제대로 적용되었는지 확인하세요.

4. **첫 사용자 생성**: 스크립트 실행 후 첫 HQ_Admin 사용자를 수동으로 생성해야 합니다.

---

## 🔍 실행 후 검증

### 1. **테이블 확인**

```sql
-- 생성된 테이블 개수 확인 (11개여야 함)
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public';
```

### 2. **RLS 정책 확인**

```sql
-- 테이블별 RLS 정책 개수 확인 (총 25개)
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

### 3. **초기 데이터 확인**

```sql
-- Locations 데이터 확인 (3개)
SELECT * FROM public.locations ORDER BY display_order;

-- Exchange rates 데이터 확인 (2개)
SELECT * FROM public.exchange_rates ORDER BY from_currency;
```

### 4. **함수 확인**

```sql
-- 생성된 함수 확인 (2개)
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

---

## 📝 다음 단계

### 1. **첫 관리자 사용자 생성**

Supabase Auth에서 사용자 생성 후 `public.users` 테이블에 레코드 추가:

```sql
-- 예시 (UUID는 Supabase Auth에서 생성된 실제 ID 사용)
INSERT INTO public.users (id, email, name, role, location_id, preferred_language)
SELECT
  '00000000-0000-0000-0000-000000000000', -- auth.users의 실제 UUID로 교체
  'admin@example.com',
  'Admin User',
  'HQ_Admin',
  (SELECT id FROM public.locations WHERE location_type = 'HQ'),
  'ko';
```

### 2. **기타 마스터 데이터 입력**

- Suppliers (공급업체)
- Products (제품)
- Supplier-Product 관계 설정

### 3. **애플리케이션 연동 테스트**

---

## 📂 파일 구조

```
supabase/
├── migrations/
│   ├── 001_create_users_table.sql          ← 개별 마이그레이션 파일들
│   ├── 002_create_locations_table.sql      ← (참고용으로 보관)
│   ├── ...
│   ├── 017_add_user_language_preference.sql
│   ├── comprehensive_rebuild.sql           ← ⭐ 이 파일 사용
│   └── README_REBUILD.md                   ← 이 문서
└── seed_data.sql                            ← 테스트 데이터 (선택사항)
```

---

## 🔄 기존 마이그레이션 파일과의 관계

### **개별 마이그레이션 파일 (001-017)**
- **용도**: 개발 과정 중 점진적 스키마 변경
- **특징**: 각 변경사항을 단계별로 추적
- **보관**: Git 히스토리용으로 보관 권장

### **comprehensive_rebuild.sql**
- **용도**: 운영 환경 초기 구축 또는 완전 재구축
- **특징**: 모든 변경사항이 통합된 최종 상태
- **사용 시기**:
  - 새로운 프로덕션 환경 구축
  - 개발 환경 완전 초기화
  - 테스트 환경 리셋

---

## 🐛 문제 해결

### **오류: "relation already exists"**
- **원인**: 테이블이 이미 존재함
- **해결**: `DROP TABLE` 구문이 제대로 실행되었는지 확인

### **오류: "permission denied"**
- **원인**: 실행 권한 부족
- **해결**: 데이터베이스 소유자 권한으로 실행

### **오류: "foreign key constraint"**
- **원인**: 외래키 제약조건 위반
- **해결**: 스크립트 전체를 한 번에 실행 (부분 실행 금지)

---

## 📞 지원

문제가 발생하면:
1. 실행 로그 확인
2. RLS 정책 상태 확인
3. Supabase 프로젝트 로그 확인
4. 개발팀에 문의

---

## 📜 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-10-31 | 1.0 | 초기 버전 생성 (마이그레이션 001-017 통합) |

---

## ✅ 체크리스트

실행 전 확인:
- [ ] 기존 데이터 백업 완료
- [ ] 테스트 환경에서 먼저 실행
- [ ] Supabase 프로젝트 올바른지 확인
- [ ] 실행 권한 확인

실행 후 확인:
- [ ] 11개 테이블 생성 확인
- [ ] 25개 RLS 정책 확인
- [ ] 3개 locations 데이터 확인
- [ ] 2개 exchange_rates 데이터 확인
- [ ] 첫 HQ_Admin 사용자 생성 완료

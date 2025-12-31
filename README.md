# Figma Design System Color Checker

Figma 디자인 파일에서 디자인 시스템 컬러 팔레트 준수 여부를 검사하는 플러그인입니다.

[![CI](https://github.com/lacomparte/plugin-figma-color-check/actions/workflows/ci.yml/badge.svg)](https://github.com/lacomparte/plugin-figma-color-check/actions/workflows/ci.yml)

## Features

- **컬러 팔레트 검사**: 선택한 요소 또는 전체 페이지의 색상이 디자인 시스템 팔레트에 포함되어 있는지 검사
- **다양한 팔레트 소스 지원**:
  - Figma Variables (Color Variables)
  - 별도 페이지에 정의된 컬러 팔레트
- **자동 색상 추천**: 팔레트에 없는 색상에 대해 가장 유사한 팔레트 색상 제안
- **일괄 수정**: 팔레트 외 색상을 추천 색상으로 일괄 변경
- **검색 기능**: 팔레트 자동완성 검색 (대소문자, 공백 무시)

## Tech Stack

- **Runtime**: Figma Plugin API
- **Frontend**: React 19, TypeScript 5.7
- **Build**: Vite 5
- **Code Quality**: ESLint, Prettier
- **CI/CD**: GitHub Actions

## Project Structure

```
src/
├── code.ts              # Figma 플러그인 샌드박스 코드
├── ui.html              # UI 진입점
├── ui/
│   ├── App.tsx          # 메인 앱 컴포넌트
│   ├── components/      # UI 컴포넌트
│   ├── context/         # React Context (상태 관리)
│   ├── hooks/           # 커스텀 훅
│   └── styles/          # 글로벌 스타일
├── tokens/
│   └── colors.ts        # 색상 토큰 타입 정의
├── types/
│   └── plugin.ts        # 플러그인 메시지 타입
└── utils/
    ├── colorUtils.ts    # 색상 유틸리티 함수
    └── colorCategory.ts # 색상 계열 분류
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Figma Desktop App

### Installation

```bash
# 의존성 설치
pnpm install

# 개발 모드 실행 (watch mode)
pnpm dev

# 프로덕션 빌드
pnpm build
```

### Figma에서 플러그인 로드

1. Figma Desktop 앱 실행
2. 파일 열기
3. **Plugins** > **Development** > **Import plugin from manifest...**
4. 프로젝트의 `manifest.json` 선택

## Scripts

| 스크립트 | 설명 |
|---------|------|
| `pnpm dev` | 개발 모드 (code.ts + ui 동시 watch) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint` | ESLint 검사 |
| `pnpm lint:fix` | ESLint 자동 수정 |
| `pnpm format` | Prettier 포맷팅 |
| `pnpm format:check` | Prettier 검사 |
| `pnpm typecheck` | TypeScript 타입 검사 |

## CI/CD

### Continuous Integration

모든 PR과 main 브랜치 push 시 자동 실행:
- TypeScript 타입 검사
- ESLint 검사
- Prettier 포맷 검사
- 빌드 검증

### Development Workflow

```
1. main 브랜치에서 feature 브랜치 생성
   └─ git checkout -b feat/new-feature

2. 작업 후 PR 생성
   └─ git push origin feat/new-feature

3. 코드 리뷰 + CI 통과 후 main에 병합

4. 릴리스 필요 시 Release workflow 실행
   └─ GitHub Actions → Release → Run workflow
```

### Release

GitHub Actions에서 수동으로 릴리스를 트리거합니다:

1. **Actions** 탭 → **Release** workflow 선택
2. **Run workflow** 클릭
3. **Version type** 선택:
   - `patch`: 버그 수정 (1.0.0 → 1.0.1)
   - `minor`: 기능 추가 (1.0.0 → 1.1.0)
   - `major`: 호환성 깨는 변경 (1.0.0 → 2.0.0)
4. **Run workflow** 실행

워크플로우가 자동으로:
- `package.json` 버전 업데이트
- 빌드 실행
- Git 태그 생성 및 push
- GitHub Release 생성 (zip 파일 첨부)

## Usage

사용 방법은 [HOW_TO_USE.md](./HOW_TO_USE.md)를 참조하세요.

## License

Private

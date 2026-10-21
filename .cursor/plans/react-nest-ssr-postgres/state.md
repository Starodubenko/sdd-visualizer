# react-nest-ssr-postgres

status: done
step: 02
next: done
changed:
  - .cursor/rules/00-project-context.mdc
  - .cursor/rules/25-codegen-and-generators.mdc
  - .cursor/rules/30-architect-rule.mdc
  - .cursor/rules/40-designer-rule.mdc
  - .cursor/rules/50-validator-rule.mdc
  - .cursor/rules/60-developer-rule.mdc
  - .cursor/rules/62-no-re-exports.mdc
  - .cursor/rules/66-colocated-unit-folder-and-readme-index.mdc
  - .cursor/rules/67-table-column-ordinals.mdc
  - .cursor/rules/70-integrator-rule.mdc
  - README.md
  - 01-theory.md
  - 02-maturity.md
  - 03-transitions.md
  - 04-roles.md
  - 05-docs-repo.md
checks:
  - "01: rg forbidden tokens in the ten rule files — no matches"
  - "01: 00, 30, 60, 70 name React, Nest SSR, and PostgreSQL; 00 says the parent ERMO/Omni stack does not apply"
  - "02: rg pmts-omni, Orval, Admiral, react-query, словарь in the six method docs — no matches"
  - "02: AN-1…AN-7, DS-1…DS-7, BE-1…BE-8, QA-1…QA-9, FE-1…FE-10 still present"
  - "02-fix: level 1 does not cite backend.md; level 2 frontend acceptance before the delta is FE-1…FE-7"
keep:
  - Репозиторий остаётся методом и спецификациями, код приложения сюда не добавляется.
  - Файлы фичи и уровни зрелости сохраняют имена.
  - React-правила 61 и 63 не переписываются.
blocked:

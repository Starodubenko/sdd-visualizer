status: done
step: 01
next: done
changed:
  - docs/method/04-roles.adoc
  - docs/method/05-docs-repo.adoc
  - apps/web/src/features/document-view/adoc-sections.ts
  - apps/web/src/features/document-view/adoc-sections.test.ts
checks:
  - "01: npm test --workspace @sdd/web 55/55 PASS"
  - "01: browser /method 05-docs-repo chapters are epic, feature dir, settings, roles, summary"
keep:
  - главы == не переименовывать
  - критерии AN DS BE QA FE и таблицы не переписывать
  - корень теории docs/method
blocked:

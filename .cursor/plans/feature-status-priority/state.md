status: done
step: 01
next: done
changed:
  - apps/server/src/documents/feature-status.ts
  - apps/server/src/documents/feature-status.test.ts
  - docs/method/05-docs-repo.md
checks:
  - "01: npm run build -w @sdd/server PASS"
  - "01: npm test -w @sdd/server 15/15 PASS"
keep:
  - тег файла по-прежнему берётся из каталога, где лежит файл
  - отсутствующий ключевой файл — в процессе
blocked:

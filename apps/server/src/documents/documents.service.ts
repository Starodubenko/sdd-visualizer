import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { featureStatus, type FeatureFile } from './feature-status';
import {
  DONE_DIR,
  IN_PROGRESS_DIR,
  READY_DIR,
  isFeatureId,
  isKeyFile,
  resolveDocsPath,
  statusDir,
  toRelative,
  type FeatureStatus,
  type FileStatus,
} from './paths';
import {
  getMarkdownSectionBody,
  replaceMarkdownSectionBody,
} from './markdown-section';
import { parseUpdateFileForApply } from './parse-update-file';
import { renderUpdateFile } from './render-update-file';
import { clearTreeCache, listDirectory, type TreeEntry } from './tree';
import {
  basenameWithoutExtension,
  formatUpdateTimestamp,
  sectionSlug,
} from './update-filename';

export type NodeKind = 'docs' | 'project' | 'feature' | 'directory' | 'file';

export type FeatureFileDescriptor = FeatureFile & { path: string };

export type NodeDescription = {
  path: string;
  kind: NodeKind;
  status?: FeatureStatus;
  files?: FeatureFileDescriptor[];
  entries?: TreeEntry[];
};

const RESERVED = new Set(['method', 'global', 'settings']);

@Injectable()
export class DocumentsService {
  constructor(private readonly root: string) {}

  async list(relativePath: string): Promise<TreeEntry[]> {
    const absolute = resolveDocsPath(this.root, relativePath);
    const info = await stat(absolute);
    if (!info.isDirectory()) {
      throw new BadRequestException('Путь не является каталогом');
    }
    const entries = await listDirectory(absolute);
    const pathParts = relativePath.split('/').filter(Boolean);
    const visibleEntries =
      pathParts.length === 2 && pathParts[0] === 'docs' && !RESERVED.has(pathParts[1])
        ? entries.filter((entry) => entry.name !== 'settings')
        : entries;
    if (this.isFeatureDir(visibleEntries)) {
      return this.flattenFeatureListing(relativePath, absolute, visibleEntries);
    }
    const enriched: TreeEntry[] = [];
    for (const entry of visibleEntries) {
      if (entry.kind !== 'dir') {
        enriched.push(entry);
        continue;
      }
      const childAbsolute = join(absolute, entry.name);
      const childEntries = await listDirectory(childAbsolute);
      if (this.isFeatureDir(childEntries)) {
        const { status } = await this.readFeatureStatus(childAbsolute);
        enriched.push({ ...entry, status });
      } else {
        enriched.push(entry);
      }
    }
    return enriched;
  }

  async describe(relativePath: string): Promise<NodeDescription> {
    const absolute = resolveDocsPath(this.root, relativePath);
    const info = await stat(absolute).catch(() => {
      throw new NotFoundException('Не найдено');
    });
    if (!info.isDirectory()) {
      return { path: relativePath, kind: 'file' };
    }
    const entries = await listDirectory(absolute);
    const parts = relativePath.split('/');
    if (relativePath === 'docs') {
      return { path: relativePath, kind: 'docs', entries };
    }
    if (parts.length === 2 && parts[0] === 'docs' && !RESERVED.has(parts[1])) {
      return {
        path: relativePath,
        kind: 'project',
        entries: entries.filter((entry) => entry.name !== 'settings'),
      };
    }
    const names = new Set(entries.map((entry) => entry.name));
    if (names.has(IN_PROGRESS_DIR) || names.has(READY_DIR) || names.has(DONE_DIR)) {
      const status = await this.readFeatureStatus(absolute);
      const flatEntries = await this.flattenFeatureListing(
        relativePath,
        absolute,
        entries,
      );
      return {
        path: relativePath,
        kind: 'feature',
        status: status.status,
        files: status.files.map((file) => ({
          ...file,
          path: `${relativePath}/${statusDir(file.status)}/${file.name}`,
        })),
        entries: flatEntries,
      };
    }
    return { path: relativePath, kind: 'directory', entries };
  }

  async readDocument(relativePath: string): Promise<{ path: string; content: string }> {
    const absolute = resolveDocsPath(this.root, relativePath);
    const info = await stat(absolute).catch(() => {
      throw new NotFoundException('Не найдено');
    });
    if (!info.isFile()) {
      throw new BadRequestException('Путь не является файлом');
    }
    const content = await readFile(absolute, 'utf8');
    return { path: relativePath, content };
  }

  async writeDocument(relativePath: string, content: string): Promise<void> {
    const absolute = resolveDocsPath(this.root, relativePath);
    const info = await stat(absolute).catch(() => {
      throw new NotFoundException('Не найдено');
    });
    if (!info.isFile()) {
      throw new BadRequestException('Путь не является файлом');
    }
    await writeFile(absolute, content, 'utf8');
    clearTreeCache();
  }

  async moveStatus(relativePath: string, status: FileStatus): Promise<{ path: string }> {
    const normalized = relativePath.replace(/\\/g, '/');
    if (normalized.includes('/updates/')) {
      return this.moveUpdateStatus(normalized, status);
    }
    const absolute = resolveDocsPath(this.root, relativePath);
    const name = basename(absolute);
    if (!isKeyFile(name)) {
      throw new BadRequestException('Статус меняется только у ключевых файлов');
    }
    const currentDir = basename(dirname(absolute));
    if (
      currentDir !== IN_PROGRESS_DIR &&
      currentDir !== READY_DIR &&
      currentDir !== DONE_DIR
    ) {
      throw new BadRequestException('Файл лежит вне каталога статуса');
    }
    const targetDirName = statusDir(status);
    const featureDir = dirname(dirname(absolute));
    const target = join(featureDir, targetDirName, name);
    await mkdir(join(featureDir, targetDirName), { recursive: true });
    if (absolute !== target) {
      await rename(absolute, target);
    }
    clearTreeCache();
    return { path: toRelative(this.root, target) };
  }

  private async moveUpdateStatus(
    relativePath: string,
    status: FileStatus,
  ): Promise<{ path: string }> {
    if (status !== 'done') {
      throw new BadRequestException('Файл изменения переносится только в «Выполнено»');
    }
    const absolute = resolveDocsPath(this.root, relativePath);
    const name = basename(absolute);
    const updateStatusDir = basename(dirname(absolute));
    const updatesDir = dirname(dirname(absolute));
    if (
      updateStatusDir !== IN_PROGRESS_DIR ||
      basename(updatesDir) !== 'updates'
    ) {
      throw new BadRequestException('Файл изменения лежит вне каталога в процессе');
    }
    const updateContent = await readFile(absolute, 'utf8');
    const parsed = parseUpdateFileForApply(updateContent);
    if (!parsed) {
      throw new BadRequestException('Некорректный файл изменения');
    }
    const parts = relativePath.split('/').filter(Boolean);
    const featureDir = join(this.root, ...parts.slice(0, 3));
    const sourceAbsolute = await this.findFeatureSourceFile(featureDir, parsed.source);
    if (!sourceAbsolute) {
      throw new BadRequestException('Исходный файл спеки не найден');
    }
    const specContent = await readFile(sourceAbsolute, 'utf8');
    const currentSectionBody = getMarkdownSectionBody(specContent, parsed.section);
    if (
      currentSectionBody === null ||
      currentSectionBody.trim() !== parsed.original.trim()
    ) {
      throw new BadRequestException('Секция спеки не совпадает с оригиналом изменения');
    }
    const updatedSpec = replaceMarkdownSectionBody(
      specContent,
      parsed.section,
      parsed.pravka,
    );
    if (!updatedSpec) {
      throw new BadRequestException('Секция спеки не найдена');
    }
    await writeFile(sourceAbsolute, updatedSpec, 'utf8');
    const target = join(updatesDir, DONE_DIR, name);
    await mkdir(join(updatesDir, DONE_DIR), { recursive: true });
    if (absolute !== target) {
      await rename(absolute, target);
    }
    clearTreeCache();
    return { path: toRelative(this.root, target) };
  }

  private async findFeatureSourceFile(
    featureDir: string,
    sourceFileName: string,
  ): Promise<string | null> {
    for (const dirName of [IN_PROGRESS_DIR, READY_DIR, DONE_DIR]) {
      const candidate = join(featureDir, dirName, sourceFileName);
      const info = await stat(candidate).catch(() => null);
      if (info?.isFile()) {
        return candidate;
      }
    }
    return null;
  }

  async createFeature(project: string, featureId: string): Promise<{ path: string }> {
    if (!isFeatureId(project) || RESERVED.has(project)) {
      throw new BadRequestException('Некорректное имя проекта');
    }
    if (!isFeatureId(featureId)) {
      throw new BadRequestException('Имя фичи — kebab-case');
    }
    const projectDir = resolveDocsPath(this.root, `docs/${project}`);
    const projectInfo = await stat(projectDir).catch(() => {
      throw new NotFoundException('Проект не найден');
    });
    if (!projectInfo.isDirectory()) {
      throw new NotFoundException('Проект не найден');
    }
    const featureDir = join(projectDir, featureId);
    const existing = await stat(featureDir).catch(() => null);
    if (existing) {
      throw new BadRequestException('Фича уже существует');
    }
    const templates = await this.templatesFromSettings(project, featureId);
    if (templates.length === 0) {
      throw new BadRequestException('Нет шаблонов в настройках');
    }
    const inProgress = join(featureDir, IN_PROGRESS_DIR);
    await mkdir(inProgress, { recursive: true });
    await mkdir(join(featureDir, READY_DIR), { recursive: true });
    await mkdir(join(featureDir, 'assets'), { recursive: true });
    await Promise.all(
      templates.map(({ name, content }) =>
        writeFile(join(inProgress, name), content, 'utf8'),
      ),
    );
    clearTreeCache();
    return { path: `docs/${project}/${featureId}` };
  }

  private async projectSettingsDir(project: string): Promise<string> {
    if (!isFeatureId(project) || RESERVED.has(project)) {
      throw new NotFoundException('Проект не найден');
    }
    const projectDir = join(this.root, 'docs', project);
    const projectInfo = await stat(projectDir).catch(() => null);
    if (!projectInfo?.isDirectory()) {
      throw new NotFoundException('Проект не найден');
    }
    const settingsDir = join(projectDir, 'settings');
    const settingsInfo = await stat(settingsDir).catch(() => null);
    if (!settingsInfo?.isDirectory()) {
      throw new NotFoundException('Настройки проекта не найдены');
    }
    return settingsDir;
  }

  private settingsTreePath(project: string, ...parts: string[]): string {
    return ['docs', project, 'settings', ...parts].join('/');
  }

  private async templatesFromSettings(
    project: string,
    featureId: string,
  ): Promise<Array<{ name: string; content: string }>> {
    const settingsDir = join(this.root, 'docs', project, 'settings');
    const settingsInfo = await stat(settingsDir).catch(() => null);
    if (!settingsInfo?.isDirectory()) {
      return [];
    }
    const entries = await readdir(settingsDir, { withFileTypes: true });
    const templates: Array<{ name: string; content: string }> = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const typeDir = join(settingsDir, entry.name);
      const files = await readdir(typeDir);
      const templateName = files.find((name) => name.startsWith('template.'));
      if (!templateName) {
        continue;
      }
      const extension = templateName.slice('template.'.length);
      const raw = await readFile(join(typeDir, templateName), 'utf8');
      const content = raw.replaceAll('{{feature}}', featureId);
      templates.push({ name: `${entry.name}.${extension}`, content });
    }
    return templates;
  }

  async deleteFeature(relativePath: string): Promise<void> {
    const description = await this.describe(relativePath);
    if (description.kind !== 'feature') {
      throw new BadRequestException('Удалять можно только каталог фичи');
    }
    const absolute = resolveDocsPath(this.root, relativePath);
    await rm(absolute, { recursive: true, force: true });
    clearTreeCache();
  }

  async createSettingsAgent(project: string, name: string): Promise<{ path: string }> {
    if (!isFeatureId(name)) {
      throw new BadRequestException('Имя агента — kebab-case');
    }
    const settingsDir = await this.projectSettingsDir(project);
    const orchestratorPath = join(settingsDir, 'orchestrator.md');
    const orchestratorInfo = await stat(orchestratorPath).catch(() => null);
    if (!orchestratorInfo?.isFile()) {
      throw new BadRequestException('Нет оркестратора');
    }
    const agentDir = join(settingsDir, name);
    const existing = await stat(agentDir).catch(() => null);
    if (existing) {
      throw new BadRequestException('Агент уже существует');
    }
    await mkdir(agentDir, { recursive: true });
    const templateContent = `# {{feature}}\nfeature: {{feature}}\nrole: ${name}\n`;
    const agentContent = `Этот агент пишет только файл \`${name}.md\` по соседнему \`template.md\` и не меняет набор разделов.\n`;
    await writeFile(join(agentDir, 'template.md'), templateContent, 'utf8');
    await writeFile(join(agentDir, 'agent.md'), agentContent, 'utf8');
    const orchestratorBefore = await readFile(orchestratorPath, 'utf8');
    const row = `| \`${name}.md\` | \`settings/${name}/\` |`;
    if (orchestratorBefore.includes(row)) {
      throw new BadRequestException('Агент уже существует');
    }
    await writeFile(
      orchestratorPath,
      this.appendOrchestratorRow(orchestratorBefore, row),
      'utf8',
    );
    clearTreeCache();
    return { path: this.settingsTreePath(project, name) };
  }

  async renameSettingsAgent(
    project: string,
    name: string,
    nextName: string,
  ): Promise<{ path: string }> {
    if (!isFeatureId(nextName)) {
      throw new BadRequestException('Имя агента — kebab-case');
    }
    const settingsDir = await this.projectSettingsDir(project);
    const agentDir = join(settingsDir, name);
    const existing = await stat(agentDir).catch(() => null);
    if (!existing?.isDirectory()) {
      throw new NotFoundException('Агент не найден');
    }
    if (name === nextName) {
      return { path: this.settingsTreePath(project, name) };
    }
    const targetDir = join(settingsDir, nextName);
    const targetExists = await stat(targetDir).catch(() => null);
    if (targetExists) {
      throw new BadRequestException('Агент уже существует');
    }
    const renamedDir = join(settingsDir, nextName);
    await rename(agentDir, renamedDir);
    const orchestratorPath = join(settingsDir, 'orchestrator.md');
    const orchestratorInfo = await stat(orchestratorPath).catch(() => null);
    if (orchestratorInfo?.isFile()) {
      const orchestratorContent = await readFile(orchestratorPath, 'utf8');
      await writeFile(
        orchestratorPath,
        this.replaceOrchestratorAgentRow(orchestratorContent, name, nextName),
        'utf8',
      );
    }
    const pathPrefix = `settings/${name}/`;
    const nextPathPrefix = `settings/${nextName}/`;
    await this.walkSettingsFiles(renamedDir, async (filePath) => {
      const content = await readFile(filePath, 'utf8');
      if (!content.includes(pathPrefix)) {
        return;
      }
      await writeFile(filePath, content.replaceAll(pathPrefix, nextPathPrefix), 'utf8');
    });
    const templatePath = join(renamedDir, 'template.md');
    const templateInfo = await stat(templatePath).catch(() => null);
    if (templateInfo?.isFile()) {
      const templateContent = await readFile(templatePath, 'utf8');
      const lines = templateContent.split('\n');
      let changed = false;
      const nextLines = lines.map((line) => {
        if (line === `role: ${name}`) {
          changed = true;
          return `role: ${nextName}`;
        }
        return line;
      });
      if (changed) {
        await writeFile(templatePath, nextLines.join('\n'), 'utf8');
      }
    }
    clearTreeCache();
    return { path: this.settingsTreePath(project, nextName) };
  }

  async renameSettingsSubagent(
    project: string,
    parent: string,
    name: string,
    nextName: string,
  ): Promise<{ path: string }> {
    if (!isFeatureId(nextName)) {
      throw new BadRequestException('Имя сабагента — kebab-case');
    }
    const settingsDir = await this.projectSettingsDir(project);
    const subagentDir = join(settingsDir, parent, name);
    const existing = await stat(subagentDir).catch(() => null);
    if (!existing?.isDirectory()) {
      throw new NotFoundException('Сабагент не найден');
    }
    if (name === nextName) {
      return { path: this.settingsTreePath(project, parent, name) };
    }
    const targetDir = join(settingsDir, parent, nextName);
    const targetExists = await stat(targetDir).catch(() => null);
    if (targetExists) {
      throw new BadRequestException('Сабагент уже существует');
    }
    await rename(subagentDir, targetDir);
    const agentMdPath = join(settingsDir, parent, 'agent.md');
    const agentMdInfo = await stat(agentMdPath).catch(() => null);
    if (agentMdInfo?.isFile()) {
      const parentAgentContent = await readFile(agentMdPath, 'utf8');
      await writeFile(
        agentMdPath,
        this.replaceSubagentRow(parentAgentContent, parent, name, nextName),
        'utf8',
      );
    }
    clearTreeCache();
    return { path: this.settingsTreePath(project, parent, nextName) };
  }

  async deleteSettingsAgent(project: string, name: string): Promise<void> {
    if (!isFeatureId(name)) {
      throw new BadRequestException('Имя агента — kebab-case');
    }
    const settingsDir = await this.projectSettingsDir(project);
    const agentDir = join(settingsDir, name);
    const existing = await stat(agentDir).catch(() => null);
    if (!existing?.isDirectory()) {
      throw new NotFoundException('Агент не найден');
    }
    const orchestratorPath = join(settingsDir, 'orchestrator.md');
    const orchestratorContent = await readFile(orchestratorPath, 'utf8').catch(() => '');
    await rm(agentDir, { recursive: true, force: true });
    if (orchestratorContent) {
      await writeFile(
        orchestratorPath,
        this.removeOrchestratorRow(orchestratorContent, name),
        'utf8',
      );
    }
    clearTreeCache();
  }

  async createSettingsSubagent(
    project: string,
    parent: string,
    name: string,
  ): Promise<{ path: string }> {
    if (!isFeatureId(name)) {
      throw new BadRequestException('Имя сабагента — kebab-case');
    }
    const settingsDir = await this.projectSettingsDir(project);
    const agentDir = join(settingsDir, parent);
    const agentMdPath = join(agentDir, 'agent.md');
    const agentDirInfo = await stat(agentDir).catch(() => null);
    const agentMdInfo = await stat(agentMdPath).catch(() => null);
    if (!agentDirInfo?.isDirectory() || !agentMdInfo?.isFile()) {
      throw new NotFoundException('Агент не найден');
    }
    const subagentDir = join(agentDir, name);
    const existingSubagent = await stat(subagentDir).catch(() => null);
    if (existingSubagent) {
      throw new BadRequestException('Сабагент уже существует');
    }
    await mkdir(subagentDir, { recursive: true });
    const templateContent = `## ${name}\n\nЧасть документа агента ${parent}.\n`;
    const agentContent = `Этот сабагент пишет только свою часть файла \`${parent}.md\` по соседнему \`template.md\`.\n`;
    await writeFile(join(subagentDir, 'template.md'), templateContent, 'utf8');
    await writeFile(join(subagentDir, 'agent.md'), agentContent, 'utf8');
    const parentAgentContent = await readFile(agentMdPath, 'utf8');
    const row = `| \`${name}\` | \`settings/${parent}/${name}/\` |`;
    if (parentAgentContent.includes(row)) {
      throw new BadRequestException('Сабагент уже существует');
    }
    await writeFile(
      agentMdPath,
      this.appendSubagentRow(parentAgentContent, row),
      'utf8',
    );
    clearTreeCache();
    return { path: this.settingsTreePath(project, parent, name) };
  }

  async deleteSettingsSubagent(project: string, parent: string, name: string): Promise<void> {
    if (!isFeatureId(name)) {
      throw new BadRequestException('Имя сабагента — kebab-case');
    }
    const settingsDir = await this.projectSettingsDir(project);
    const subagentDir = join(settingsDir, parent, name);
    const existing = await stat(subagentDir).catch(() => null);
    if (!existing?.isDirectory()) {
      throw new NotFoundException('Сабагент не найден');
    }
    await rm(subagentDir, { recursive: true, force: true });
    const agentMdPath = join(settingsDir, parent, 'agent.md');
    const agentMdInfo = await stat(agentMdPath).catch(() => null);
    if (agentMdInfo?.isFile()) {
      const parentAgentContent = await readFile(agentMdPath, 'utf8');
      await writeFile(
        agentMdPath,
        this.removeSubagentRow(parentAgentContent, parent, name),
        'utf8',
      );
    }
    clearTreeCache();
  }

  private appendSubagentRow(content: string, row: string): string {
    const header = '## Сабагенты';
    if (!content.includes(header)) {
      const block = `\n\n${header}\n\n| Сабагент | Каталог |\n|----------|---------|\n${row}\n`;
      return `${content.trimEnd()}${block}`;
    }
    const lines = content.split('\n');
    let lastTableLine = -1;
    let inSection = false;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.trim() === header) {
        inSection = true;
        continue;
      }
      if (inSection && line.startsWith('## ') && line.trim() !== header) {
        break;
      }
      if (inSection && line.startsWith('|')) {
        lastTableLine = index;
      }
    }
    if (lastTableLine === -1) {
      const block = `\n\n${header}\n\n| Сабагент | Каталог |\n|----------|---------|\n${row}\n`;
      return `${content.trimEnd()}${block}`;
    }
    const nextLines = [...lines.slice(0, lastTableLine + 1), row, ...lines.slice(lastTableLine + 1)];
    return nextLines.join('\n');
  }

  private removeSubagentRow(content: string, parent: string, name: string): string {
    const pathNeedle = `\`settings/${parent}/${name}/\``;
    const lines = content.split('\n');
    const header = '## Сабагенты';
    let sectionStart = -1;
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index].trim() === header) {
        sectionStart = index;
        break;
      }
    }
    if (sectionStart === -1) {
      return content;
    }
    let sectionEnd = lines.length;
    for (let index = sectionStart + 1; index < lines.length; index += 1) {
      if (lines[index].startsWith('## ') && lines[index].trim() !== header) {
        sectionEnd = index;
        break;
      }
    }
    const before = lines.slice(0, sectionStart);
    const sectionLines = lines.slice(sectionStart, sectionEnd);
    const after = lines.slice(sectionEnd);
    const dataRow = (line: string) =>
      line.startsWith('|') &&
      !line.includes('Сабагент') &&
      !line.includes('---') &&
      line.includes('|');
    const remainingSectionLines = sectionLines.filter(
      (line) => !(line.startsWith('|') && line.includes(pathNeedle)),
    );
    const remainingDataRows = remainingSectionLines.filter(dataRow);
    if (remainingDataRows.length === 0) {
      const trimmedBefore = before.join('\n').replace(/\n+$/, '');
      const trimmedAfter = after.join('\n').replace(/^\n+/, '');
      if (trimmedBefore && trimmedAfter) {
        return `${trimmedBefore}\n\n${trimmedAfter}`;
      }
      if (trimmedBefore) {
        return `${trimmedBefore}\n`;
      }
      if (trimmedAfter) {
        return trimmedAfter;
      }
      return '';
    }
    return [...before, ...remainingSectionLines, ...after].join('\n');
  }

  private appendOrchestratorRow(content: string, row: string): string {
    const marker = 'Для имени, которого нет в таблице';
    const markerIndex = content.indexOf(marker);
    if (markerIndex === -1) {
      return `${content.trimEnd()}\n${row}\n`;
    }
    const before = content.slice(0, markerIndex).trimEnd();
    const after = content.slice(markerIndex);
    return `${before}\n${row}\n\n${after}`;
  }

  private removeOrchestratorRow(content: string, name: string): string {
    const pathNeedle = `\`settings/${name}/\``;
    const lines = content.split('\n');
    const nextLines = lines.filter(
      (line) => !(line.startsWith('|') && line.includes(pathNeedle)),
    );
    return nextLines.join('\n');
  }

  private replaceOrchestratorAgentRow(
    content: string,
    name: string,
    nextName: string,
  ): string {
    const pathNeedle = `\`settings/${name}/\``;
    const lines = content.split('\n');
    return lines
      .map((line) => {
        if (!line.startsWith('|') || !line.includes(pathNeedle)) {
          return line;
        }
        const fileCell = line.match(/^\|\s*`([^`]+)`\s*\|/);
        if (!fileCell) {
          return line;
        }
        const fileName = fileCell[1];
        const dotIndex = fileName.lastIndexOf('.');
        const extension = dotIndex >= 0 ? fileName.slice(dotIndex) : '.md';
        return `| \`${nextName}${extension}\` | \`settings/${nextName}/\` |`;
      })
      .join('\n');
  }

  private replaceSubagentRow(
    content: string,
    parent: string,
    name: string,
    nextName: string,
  ): string {
    const pathNeedle = `\`settings/${parent}/${name}/\``;
    const nextRow = `| \`${nextName}\` | \`settings/${parent}/${nextName}/\` |`;
    return content
      .split('\n')
      .map((line) =>
        line.startsWith('|') && line.includes(pathNeedle) ? nextRow : line,
      )
      .join('\n');
  }

  private async walkSettingsFiles(
    absoluteDir: string,
    visit: (filePath: string) => Promise<void>,
  ): Promise<void> {
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(absoluteDir, entry.name);
      if (entry.isDirectory()) {
        await this.walkSettingsFiles(fullPath, visit);
      } else if (entry.isFile()) {
        await visit(fullPath);
      }
    }
  }

  async renameFeature(relativePath: string, featureId: string): Promise<{ path: string }> {
    const description = await this.describe(relativePath);
    if (description.kind !== 'feature') {
      throw new BadRequestException('Переименовывать можно только каталог фичи');
    }
    if (!isFeatureId(featureId)) {
      throw new BadRequestException('Имя фичи — kebab-case');
    }
    const parts = relativePath.split('/').filter(Boolean);
    const project = parts[1];
    const oldId = parts[2];
    if (oldId === featureId) {
      return { path: relativePath };
    }
    const projectDir = resolveDocsPath(this.root, `docs/${project}`);
    const oldAbsolute = resolveDocsPath(this.root, relativePath);
    const newAbsolute = join(projectDir, featureId);
    const existing = await stat(newAbsolute).catch(() => null);
    if (existing) {
      throw new BadRequestException('Фича уже существует');
    }
    await rename(oldAbsolute, newAbsolute);
    const newRelative = `docs/${project}/${featureId}`;
    await this.walkFeatureFiles(newAbsolute, async (filePath) => {
      const content = await readFile(filePath, 'utf8');
      const lines = content.split('\n');
      let changed = false;
      const nextLines = lines.map((line) => {
        if (line.trim() === `feature: ${oldId}`) {
          changed = true;
          return `feature: ${featureId}`;
        }
        return line;
      });
      if (changed) {
        await writeFile(filePath, nextLines.join('\n'), 'utf8');
      }
    });
    clearTreeCache();
    return { path: newRelative };
  }

  async saveAsset(
    featurePath: string,
    originalName: string,
    bytes: Buffer,
  ): Promise<{ path: string; markdown: string }> {
    const description = await this.describe(featurePath);
    if (description.kind !== 'feature') {
      throw new BadRequestException('Скриншот сохраняется в каталог фичи');
    }
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'screen.png';
    const fileName = `${Date.now()}-${safeName}`;
    const absolute = resolveDocsPath(this.root, `${featurePath}/assets/${fileName}`);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes);
    clearTreeCache();
    return {
      path: `${featurePath}/assets/${fileName}`,
      markdown: `![](../assets/${fileName})`,
    };
  }

  async readRaw(relativePath: string): Promise<{ absolute: string }> {
    const absolute = resolveDocsPath(this.root, relativePath);
    const info = await stat(absolute);
    if (!info.isFile()) {
      throw new NotFoundException('Не найдено');
    }
    return { absolute };
  }

  async createUpdate(
    relativePath: string,
    section: string,
    body: string,
    at: Date,
  ): Promise<{ path: string }> {
    const sectionTitle = section.trim();
    if (!sectionTitle) {
      throw new BadRequestException('Пустая секция');
    }
    const slug = sectionSlug(sectionTitle);
    if (!slug) {
      throw new BadRequestException('Пустая секция');
    }
    this.assertFeatureStatusFilePath(relativePath);
    const pathParts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
    if (pathParts[3] !== DONE_DIR) {
      throw new BadRequestException('Изменение можно создать только для выполненного файла');
    }
    const absolute = resolveDocsPath(this.root, relativePath);
    const info = await stat(absolute).catch(() => {
      throw new BadRequestException('Путь не является файлом спеки');
    });
    if (!info.isFile()) {
      throw new BadRequestException('Путь не является файлом спеки');
    }
    const sourceFileName = basename(absolute);
    const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
    const updatesDir = join(
      this.root,
      ...parts.slice(0, 3),
      'updates',
      IN_PROGRESS_DIR,
    );
    await mkdir(updatesDir, { recursive: true });
    const stamp = formatUpdateTimestamp(at);
    const baseName = `${stamp}-${basenameWithoutExtension(sourceFileName)}-${slug}`;
    let fileName = `${baseName}.md`;
    let target = join(updatesDir, fileName);
    if (await stat(target).catch(() => null)) {
      fileName = `${baseName}-2.md`;
      target = join(updatesDir, fileName);
    }
    const content = renderUpdateFile(sourceFileName, sectionTitle, body);
    await writeFile(target, content, 'utf8');
    clearTreeCache();
    return { path: toRelative(this.root, target) };
  }

  private assertFeatureStatusFilePath(relativePath: string): void {
    const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length !== 5 || parts[0] !== 'docs') {
      throw new BadRequestException('Путь не является файлом спеки');
    }
    const statusSegment = parts[3];
    if (
      statusSegment !== IN_PROGRESS_DIR &&
      statusSegment !== READY_DIR &&
      statusSegment !== DONE_DIR
    ) {
      throw new BadRequestException('Путь не является файлом спеки');
    }
  }

  private async walkFeatureFiles(
    absoluteDir: string,
    visit: (filePath: string) => Promise<void>,
  ): Promise<void> {
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(absoluteDir, entry.name);
      if (entry.isDirectory()) {
        await this.walkFeatureFiles(fullPath, visit);
      } else if (entry.isFile()) {
        await visit(fullPath);
      }
    }
  }

  private isFeatureDir(entries: TreeEntry[]): boolean {
    const names = new Set(entries.map((entry) => entry.name));
    return names.has(IN_PROGRESS_DIR) || names.has(READY_DIR) || names.has(DONE_DIR);
  }

  private sortEntries(entries: TreeEntry[]): TreeEntry[] {
    return [...entries].sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'dir' ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
  }

  private async collectOpenChangeSources(featureAbsolute: string): Promise<Set<string>> {
    const sources = new Set<string>();
    const updatesInProgressDir = join(featureAbsolute, 'updates', IN_PROGRESS_DIR);
    const updateEntries = await listDirectory(updatesInProgressDir).catch(() => []);
    for (const entry of updateEntries) {
      if (entry.kind !== 'file') {
        continue;
      }
      const content = await readFile(join(updatesInProgressDir, entry.name), 'utf8');
      const parsed = parseUpdateFileForApply(content);
      if (parsed) {
        sources.add(parsed.source);
      }
    }
    return sources;
  }

  private async flattenFeatureListing(
    relativePath: string,
    absolute: string,
    entries: TreeEntry[],
  ): Promise<TreeEntry[]> {
    const openChangeSources = await this.collectOpenChangeSources(absolute);
    const flattened: TreeEntry[] = [];
    for (const entry of entries) {
      if (entry.kind === 'dir' && entry.name === IN_PROGRESS_DIR) {
        const statusEntries = await listDirectory(join(absolute, IN_PROGRESS_DIR));
        for (const file of statusEntries) {
          if (file.kind === 'file') {
            flattened.push(
              this.featureListingFileEntry(
                file.name,
                'in_progress',
                `${relativePath}/${IN_PROGRESS_DIR}/${file.name}`,
                openChangeSources,
              ),
            );
          }
        }
      } else if (entry.kind === 'dir' && entry.name === READY_DIR) {
        const statusEntries = await listDirectory(join(absolute, READY_DIR));
        for (const file of statusEntries) {
          if (file.kind === 'file') {
            flattened.push(
              this.featureListingFileEntry(
                file.name,
                'ready',
                `${relativePath}/${READY_DIR}/${file.name}`,
                openChangeSources,
              ),
            );
          }
        }
      } else if (entry.kind === 'dir' && entry.name === DONE_DIR) {
        const statusEntries = await listDirectory(join(absolute, DONE_DIR));
        for (const file of statusEntries) {
          if (file.kind === 'file') {
            flattened.push(
              this.featureListingFileEntry(
                file.name,
                'done',
                `${relativePath}/${DONE_DIR}/${file.name}`,
                openChangeSources,
              ),
            );
          }
        }
      } else {
        flattened.push(entry);
      }
    }
    return this.sortEntries(flattened);
  }

  private featureListingFileEntry(
    name: string,
    status: FileStatus,
    path: string,
    openChangeSources: Set<string>,
  ): TreeEntry {
    const entry: TreeEntry = { name, kind: 'file', status, path };
    if (openChangeSources.has(name)) {
      entry.hasOpenChange = true;
    }
    return entry;
  }

  private async readFeatureStatus(featureDir: string) {
    const inProgress = await listDirectory(join(featureDir, IN_PROGRESS_DIR)).catch(() => []);
    const ready = await listDirectory(join(featureDir, READY_DIR)).catch(() => []);
    const done = await listDirectory(join(featureDir, DONE_DIR)).catch(() => []);
    const updatesInProgress = await listDirectory(
      join(featureDir, 'updates', IN_PROGRESS_DIR),
    ).catch(() => []);
    const hasOpenUpdates = updatesInProgress.some((entry) => entry.kind === 'file');
    return featureStatus(
      inProgress.map((entry) => entry.name),
      ready.map((entry) => entry.name),
      done.map((entry) => entry.name),
      hasOpenUpdates,
    );
  }
}

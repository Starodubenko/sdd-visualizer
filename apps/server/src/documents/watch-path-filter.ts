/** Workspace-relative path with forward slashes. */
export const includeDocsWatchPath = (workspaceRelativePath: string): boolean => {
  const normalized = workspaceRelativePath.replaceAll('\\', '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.some((part) => part === '.git' || part === 'global')) {
    return false;
  }
  return parts[0] === 'docs';
};

export type ChangeStatus = 'added' | 'modified' | 'deleted';

export type ChangeTreeNode = {
  name: string;
  children?: ChangeTreeNode[];
  status?: ChangeStatus;
};

type MutableNode = {
  name: string;
  children: Map<string, MutableNode>;
  status?: ChangeStatus;
};

const toSortedTree = (node: MutableNode): ChangeTreeNode => {
  const childList = [...node.children.values()]
    .map(toSortedTree)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (node.status) {
    return { name: node.name, status: node.status };
  }
  return { name: node.name, children: childList };
};

export const buildChangeTree = (
  entries: { path: string; status: ChangeStatus }[],
): ChangeTreeNode[] => {
  const root = new Map<string, MutableNode>();
  for (const entry of entries) {
    const parts = entry.path.split('/').filter(Boolean);
    let level = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i] ?? '';
      const isFile = i === parts.length - 1;
      let node = level.get(part);
      if (!node) {
        node = { name: part, children: new Map() };
        level.set(part, node);
      }
      if (isFile) {
        node.status = entry.status;
      } else {
        level = node.children;
      }
    }
  }
  return [...root.values()].map(toSortedTree).sort((a, b) => a.name.localeCompare(b.name));
};

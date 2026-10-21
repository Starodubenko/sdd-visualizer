import type { ProjectChanges } from './changes.service';

export const buildCommitMessage = (projects: ProjectChanges[]): string => {
  const lines = ['Изменена документация'];

  for (const project of projects) {
    lines.push(` - ${project.name}`);

    const rootDocs: string[] = [];
    const featureDocs = new Map<string, string[]>();

    for (const entry of project.entries) {
      const slash = entry.path.indexOf('/');
      if (slash === -1) {
        rootDocs.push(entry.path);
      } else {
        const feature = entry.path.slice(0, slash);
        const doc = entry.path.slice(slash + 1);
        const docs = featureDocs.get(feature) ?? [];
        docs.push(doc);
        featureDocs.set(feature, docs);
      }
    }

    rootDocs.sort();
    for (const doc of rootDocs) {
      lines.push(`    - ${doc}`);
    }

    const features = [...featureDocs.keys()].sort();
    for (const feature of features) {
      lines.push(`    - ${feature}`);
      const docs = [...new Set(featureDocs.get(feature)!)].sort();
      for (const doc of docs) {
        lines.push(`       - ${doc}`);
      }
    }
  }

  return lines.join('\n');
};

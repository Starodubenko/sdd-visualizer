import type { FC } from 'react';
import type { PageData } from './shared/api';
import { WorkspacePage } from './pages/Workspace/WorkspacePage';

type Props = {
  data: PageData;
};

export const App: FC<Props> = (props) => {
  const { data } = props;
  if (data.page === 'settings') {
    return (
      <WorkspacePage
        mode="settings"
        projects={data.settings.projects}
        settingsProject={data.settings.project}
        settingsEntries={data.settings.entries}
        initialPath={data.settings.path}
        initialOpen={data.settings.open}
      />
    );
  }
  return (
    <WorkspacePage
      projects={data.workspace.projects}
      featureEntries={data.workspace.featureEntries}
      initialPath={data.workspace.path}
      initialOpen={data.workspace.open}
    />
  );
};

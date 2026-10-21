import type { FC } from 'react';
import type { PageData } from './shared/api';
import { WorkspacePage } from './pages/Workspace/WorkspacePage';

type Props = {
  data: PageData;
};

export const App: FC<Props> = (props) => {
  const { data } = props;
  return (
    <WorkspacePage
      projects={data.workspace.projects}
      featureEntries={data.workspace.featureEntries}
    />
  );
};

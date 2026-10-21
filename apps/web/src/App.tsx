import type { FC } from 'react';
import type { PageData } from './shared/api';
import { AdminPage } from './pages/Admin/AdminPage';
import { WorkspacePage } from './pages/Workspace/WorkspacePage';

type Props = {
  data: PageData;
};

export const App: FC<Props> = (props) => {
  const { data } = props;
  if (data.page === 'admin') {
    return <AdminPage projects={data.admin.projects} />;
  }
  return (
    <WorkspacePage
      projects={data.workspace.projects}
      featureEntries={data.workspace.featureEntries}
    />
  );
};

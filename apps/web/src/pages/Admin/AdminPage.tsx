import { useEffect, useState, type FC } from 'react';
import { ThemeSwitch } from '../../features/theme/ThemeSwitch';
import { saveProject, type PublicProject } from '../../shared/api';
import { ConfirmModal } from '../../shared/ConfirmModal';

type Props = {
  projects: PublicProject[];
};

export const AdminPage: FC<Props> = (props) => {
  const { projects } = props;
  const [selected, setSelected] = useState<PublicProject | null>(null);
  const [remote, setRemote] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);
  const [saved, setSaved] = useState<PublicProject[]>(projects);

  useEffect(() => {
    if (!selected) {
      setRemote('');
      setToken('');
      return;
    }
    setRemote(selected.remote);
    setToken('');
  }, [selected]);

  const chooseProject = (project: PublicProject) => {
    setSelected(project);
    setError('');
  };

  const runSave = () => {
    if (!selected) {
      return;
    }
    setConfirmSave(false);
    setError('');
    void saveProject(selected.name, remote, token)
      .then((updated) => {
        setSaved((current) =>
          current.map((entry) => (entry.name === updated.name ? updated : entry)),
        );
        setSelected(updated);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось сохранить');
      });
  };

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-start">
          <strong>Админка проектов</strong>
        </div>
        <div className="toolbar-end">
          <ThemeSwitch />
          <a href="/">К дереву</a>
        </div>
      </header>
      <aside className="tree-column">
        <ul>
          {saved.map((project) => (
            <li key={project.name}>
              <button type="button" className="tree-row" onClick={() => chooseProject(project)}>
                {project.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="pane">
        {error && <p className="error">{error}</p>}
        <div className="sheet">
          {selected ? (
            <div className="sheet-card">
              <p>
                <strong>Имя каталога:</strong> {selected.name}
              </p>
              <label>
                Адрес репозитория
                <input value={remote} onChange={(event) => setRemote(event.target.value)} />
              </label>
              <label>
                Токен
                <input
                  type="password"
                  value={token}
                  placeholder={selected.hasToken ? 'Сохранён' : ''}
                  onChange={(event) => setToken(event.target.value)}
                />
              </label>
              <button type="button" className="primary" onClick={() => setConfirmSave(true)}>
                Сохранить
              </button>
            </div>
          ) : (
            <p>Выберите проект.</p>
          )}
        </div>
      </section>
      <ConfirmModal
        title="Сохранение"
        message="Сохранить настройки проекта?"
        confirmLabel="Сохранить"
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={runSave}
      />
    </div>
  );
};

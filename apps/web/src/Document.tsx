import type { FC } from 'react';
import { App } from './App';
import type { PageData } from './shared/api';

type Props = {
  data: PageData;
};

export const Document: FC<Props> = (props) => {
  const { data } = props;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <title>
          {data.page === 'settings'
            ? 'Визуализатор: Настройки'
            : data.page === 'method'
              ? 'Визуализатор: Теория'
              : 'Визуализатор: Документация'}
        </title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
        <link rel="stylesheet" href="/assets/entry-client.css" />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('sdd-theme');if(t==='dark')document.documentElement.dataset.theme='dark';}catch(e){}`,
          }}
        />
        <div id="root">
          <App data={data} />
        </div>
        <script dangerouslySetInnerHTML={{ __html: `window.__DATA__=${json}` }} />
        <script type="module" src="/assets/entry-client.js" />
      </body>
    </html>
  );
};

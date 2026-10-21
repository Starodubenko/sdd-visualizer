import { createElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import type { Response } from 'express';
import { Document } from './Document';
import type { PageData } from './shared/api';

export const renderPage = (response: Response, data: PageData): void => {
  const { pipe } = renderToPipeableStream(createElement(Document, { data }), {
    onShellReady() {
      response.status(200);
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.write('<!doctype html>');
      pipe(response);
    },
    onShellError() {
      if (!response.headersSent) {
        response.status(500).end('Ошибка отрисовки');
      }
    },
  });
};

import { hydrateRoot } from 'react-dom/client';
import { App } from './App';
import type { PageData } from './shared/api';
import './style.css';

declare global {
  interface Window {
    __DATA__: PageData;
  }
}

const root = document.getElementById('root');
if (root && window.__DATA__) {
  hydrateRoot(root, <App data={window.__DATA__} />);
}

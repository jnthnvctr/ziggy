import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../ui/global.css';
import { Preview } from './Preview';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { DEMO_SESSION_ID } from '@dnd/shared';
import { DmView } from './views/DmView.js';
import { ProjectorView } from './views/ProjectorView.js';
import { Home } from './views/Home.js';
import './index.css';

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/dm/:sessionId', element: <DmView /> },
  { path: '/play/:sessionId', element: <ProjectorView /> },
  { path: '/dm', element: <Navigate to={`/dm/${DEMO_SESSION_ID}`} replace /> },
  { path: '/play', element: <Navigate to={`/play/${DEMO_SESSION_ID}`} replace /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

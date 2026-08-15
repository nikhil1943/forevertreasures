import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'products/:id',
    renderMode: RenderMode.Server // Renders on the server dynamically per request
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
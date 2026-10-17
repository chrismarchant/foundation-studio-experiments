import { renderToString } from 'react-dom/server';
import App from './App.jsx';
import { ROUTES } from './routes.js';

export { ROUTES };
export const render = (route, bp = 'desktop') => renderToString(<App route={route} bp={bp} />);

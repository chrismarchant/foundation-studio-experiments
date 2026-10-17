import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import App from './App.jsx';
import { bpFromSearch, routeFromPath } from './routes.js';

const root = createRoot(document.getElementById('root'));
// Synchronous render so the right breakpoint variant is in the DOM before the load event.
flushSync(() => {
  root.render(<App route={routeFromPath(location.pathname)} bp={bpFromSearch(location.search)} />);
});

import { getSection } from './routes.js';

// Mechanical wrapper: injects the Penpot CSS in a <style> and renders the (deduped, wrapped) fragment as-is.
export default function App({ route, bp }) {
  const section = route && getSection(route, bp);
  if (!section) return <p>Not found</p>;
  return (
    <>
      <style data-source="wrapper-prelude" dangerouslySetInnerHTML={{ __html: section.prelude }} />
      <style data-source="penpot-generateStyle" dangerouslySetInnerHTML={{ __html: section.css }} />
      <div data-fs-host dangerouslySetInnerHTML={{ __html: section.html }} />
    </>
  );
}

import React from 'react';
import { usePageContext } from 'vike-react/usePageContext';
import App from '../src/App';
import '../src/index.css';

export default function Page() {
  const pageContext = usePageContext();
  const initialPackages = pageContext.data?.packages ?? null;

  return (
    <App
      initialPackages={initialPackages}
      initialPathname={pageContext.urlPathname || '/'}
      initialAuthReady={pageContext.urlPathname === '/'}
    />
  );
}
import React from 'react';
import { usePageContext } from 'vike-react/usePageContext';
import App from '../src/App';
import '../src/index.css';

export default function Page() {
  const pageContext = usePageContext();
  const initialPackages = pageContext.data?.packages ?? null;
  // New, additive: only populated on '/agents' (list) and '/agents/:id'
  // (detail) — every other route leaves these null, same convention
  // initialPackages already uses, so no other page's behavior changes.
  const initialAgents = pageContext.data?.agents ?? null;
  const initialAgent = pageContext.data?.agent ?? null;
  // Same convention as initialAgents/initialAgent — only populated on
  // '/blog' (list) and '/blog/:slug' (post detail).
  const initialBlogPosts = pageContext.data?.blogPosts ?? null;
  const initialBlogPost = pageContext.data?.blogPost ?? null;

  return (
    <App
      initialPackages={initialPackages}
      initialAgents={initialAgents}
      initialAgent={initialAgent}
      initialBlogPosts={initialBlogPosts}
      initialBlogPost={initialBlogPost}
      initialPathname={pageContext.urlPathname || '/'}
      initialAuthReady={pageContext.urlPathname === '/'}
    />
  );
}
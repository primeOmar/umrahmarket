// Makes pages/+Page.jsx (and its +data.js / +Head.jsx siblings) match every
// URL, not just '/'. <App/>'s own React Router then does the real per-path
// rendering exactly as it does today — this file just replaces the job the
// old vercel.json catch-all ("/(.*)" -> "/index.html") used to do, now that
// Vike owns the entry point instead of a static index.html.
export default '/*'
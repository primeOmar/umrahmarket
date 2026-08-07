import vikeReact from 'vike-react/config';

export default {
  extends: [vikeReact],
  // Server-render by default. Only the '/' loader in +data.js actually does
  // work right now — every other URL still resolves through App.jsx's own
  // <Routes>, unchanged, so this doesn't alter behavior on those pages yet.
  ssr: true,
};
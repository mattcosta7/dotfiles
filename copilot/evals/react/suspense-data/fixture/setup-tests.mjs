import 'global-jsdom/register';

// jsdom's FormData, not Node's, so React form Actions work in tests.
globalThis.FormData = window.FormData;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

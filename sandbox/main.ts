import { setupBasicHTML, setupReactiveState } from './demo';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Set up all demos
  setupBasicHTML(document.getElementById('basic-html')!);
  setupReactiveState(document.getElementById('reactive-state')!);
});

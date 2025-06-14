import { setupBasicHTML, setupReactiveStateFunction, setupReactiveStateClass } from './demo';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Set up all demos
  setupBasicHTML(document.getElementById('basic-html')!);
  setupReactiveStateClass(document.getElementById('reactive-state-class')!);
  setupReactiveStateFunction(document.getElementById('reactive-state-function')!);
});

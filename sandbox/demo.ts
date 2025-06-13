import htm from 'htm';
import van from 'vanjs-core';
import * as vanX from 'vanjs-ext';
import vanHTM from 'vanjs-htm';
import vanRE from 'vanjs-reactive-element';

const { html, rmPortals } = vanHTM({ htm, van, vanX });
const { VanReactiveElement, define } = vanRE({ van });

// Basic HTML Rendering Demo
export function setupBasicHTML(container: HTMLElement) {
  define('basic-html', {}, (props, { element, noShadowDOM, onCleanup, onMount, render, setStyles }) => {
    noShadowDOM();

    render(() => {
      return html`
        <div>
          <h3>
            Hello,
            <b>Van Reactive Element</b>
            !
          </h3>
          <p>This is a basic example with nested elements.</p>
          <button onclick=${() => alert('Button clicked!')}>Click Me</button>
        </div>
      `;
    });
  });

  van.add(container, van.tags['basic-html']());
}

// Reactive State Demo
export function setupReactiveState(container: HTMLElement) {
  define('reactive-state', { count: { attribute: false, default: 0 }, name: '' }, (props, { noShadowDOM, render }) => {
    noShadowDOM();

    render(() => {
      return html`
        <div>
          <h3>Hello, ${props.name}!</h3>
          <p>Count: ${props.count}</p>
          <button onclick=${() => props.count.val--}>Decrement</button>
          <button onclick=${() => props.count.val++}>Increment</button>
          <br />
          <input
            type="text"
            value=${props.name}
            oninput=${(e: Event) => (props.name.val = (e.target as HTMLInputElement).value)}
            placeholder="Enter your name"
          />
        </div>
      `;
    });
  });

  van.add(container, van.tags['reactive-state']({ count: van.state(0), name: van.state('World') }));
}

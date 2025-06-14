import htm from 'htm';
import van, { type State } from 'vanjs-core';
import * as vanX from 'vanjs-ext';
import vanHTM from 'vanjs-htm';
import vanRE from 'vanjs-reactive-element';

const { html, rmPortals } = vanHTM({ htm, van, vanX });
const { VanReactiveElement, define } = vanRE({ van });

// Basic HTML Rendering Demo
export function setupBasicHTML(container: HTMLElement) {
  define('basic-html', {}, (props, { element, noShadowDOM, onCleanup, onMount }) => {
    noShadowDOM();

    return () =>
      html`
        <h3>
          Hello,
          <b>Van Reactive Element</b>
          !
        </h3>
        <p>This is a basic example with nested elements.</p>
        <button onclick=${() => alert('Button clicked!')}>Click Me</button>
      `;
  });

  van.add(container, van.tags['basic-html']());
}

export function setupReactiveStateClass(container: HTMLElement) {
  class ReactiveStateClass extends VanReactiveElement {
    static properties = {
      count: { attribute: false, default: 0 },
      name: { default: '', reflect: true }
    };

    declare count: State<number>;
    declare name: State<string>;

    constructor() {
      super();
    }

    protected createRenderRoot() {
      // Use light DOM
      return this;
    }

    protected render() {
      return html`
        <div>
          <h3>Hello, ${this.name} - Class!</h3>
          <p>Count: ${this.count}</p>
          <button onclick=${() => this.count.val--}>Decrement</button>
          <button onclick=${() => this.count.val++}>Increment</button>
          <br />
          <input
            type="text"
            value=${this.name}
            oninput=${(e: Event) => (this.name = (e.target as HTMLInputElement).value as any)}
            placeholder="Enter your name"
          />
        </div>
      `;
    }
  }

  ReactiveStateClass.define();

  van.add(container, van.tags['reactive-state-class']({ count: 0, name: 'World' }));
}

// Reactive State Demo
export function setupReactiveStateFunction(container: HTMLElement) {
  define(
    'reactive-state-function',
    { attributes: { name: { default: '', reflect: true } }, properties: { count: 0 } },
    (props, { element, noShadowDOM }) => {
      noShadowDOM();

      return () =>
        html`
          <div>
            <h3>Hello, ${props.name} - Function!</h3>
            <p>Count: ${props.count}</p>
            <button onclick=${() => props.count.val--}>Decrement</button>
            <button onclick=${() => props.count.val++}>Increment</button>
            <br />
            <input
              type="text"
              value=${props.name}
              oninput=${(e: Event) => (props.set.name = (e.target as HTMLInputElement).value)}
              placeholder="Enter your name"
            />
          </div>
        `;
    }
  );

  van.add(container, van.tags['reactive-state-function']({ count: 0, name: 'World' }));
}

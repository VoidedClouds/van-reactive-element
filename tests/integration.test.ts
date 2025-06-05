import { describe, it, expect, beforeEach, afterEach, vi, VanReactiveElement, define, van, tags, promisedTimeout } from './utils';
import { css } from '../src/syntax-utils';

// Helper to generate a unique tag name for each test
function uniqueTagName(base: string) {
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

describe('VanReactiveElement Integration Tests', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('Class-based Components', () => {
    it('should create a working counter component with reactive properties', async () => {
      const tag = uniqueTagName('counter-element');
      class CounterElement extends VanReactiveElement {
        // Use van.state for reactive properties
        count = van.state(0);
        step = van.state(1);

        static get styles() {
          return css`
            :host {
              display: block;
              padding: 20px;
              border: 1px solid #ccc;
            }
            button {
              margin: 0 5px;
              padding: 5px 10px;
            }
            .count {
              font-size: 24px;
              font-weight: bold;
            }
          `;
        }

        render() {
          return tags.div(
            { class: 'counter' },
            tags.div({ class: 'count' }, 'Count: ', this.count),
            tags.button({ onclick: () => (this.count.val -= this.step.val) }, '-', this.step),
            tags.button({ onclick: () => (this.count.val += this.step.val) }, '+', this.step)
          );
        }
      }

      if (!customElements.get(tag)) CounterElement.define(CounterElement, tag);
      await customElements.whenDefined(tag);

      // Create and add to DOM
      const counter = document.createElement(tag) as any;
      container.appendChild(counter);

      // Wait for component to initialize
      await promisedTimeout();

      // Check initial render
      let countDisplay = counter.renderRoot.querySelector('.count');
      expect(countDisplay?.textContent).toBe('Count: 0');

      // Click increment button
      const incrementBtn = counter.renderRoot.querySelectorAll('button')[1];
      incrementBtn.click();
      await promisedTimeout();

      // Check updated value - reactivity should update the DOM automatically
      expect(counter.count.val).toBe(1);
      countDisplay = counter.renderRoot.querySelector('.count');
      expect(countDisplay?.textContent).toBe('Count: 1');

      // Change step and click decrement
      counter.step.val = 5;
      const decrementBtn = counter.renderRoot.querySelectorAll('button')[0];
      decrementBtn.click();
      await promisedTimeout();

      expect(counter.count.val).toBe(-4);
      countDisplay = counter.renderRoot.querySelector('.count');
      expect(countDisplay?.textContent).toBe('Count: -4');
    });

    it('should handle lifecycle methods correctly', async () => {
      const tag = uniqueTagName('lifecycle-element');
      const onMountSpy = vi.fn();
      const onCleanupSpy = vi.fn();

      class LifecycleElement extends VanReactiveElement {
        onMount() {
          onMountSpy(this.tagName);
        }

        onCleanup() {
          onCleanupSpy(this.tagName);
        }

        render() {
          return tags.div('Lifecycle Test');
        }
      }

      if (!customElements.get(tag)) LifecycleElement.define(LifecycleElement, tag);
      await customElements.whenDefined(tag);

      const element = document.createElement(tag);
      container.appendChild(element);

      // Wait for mount
      await promisedTimeout(20);
      expect(onMountSpy).toHaveBeenCalledWith(element.tagName);

      // Remove element
      await promisedTimeout();
      element.remove();

      // Wait for async disconnect
      await promisedTimeout();
      expect(onCleanupSpy).toHaveBeenCalledWith(element.tagName);
    });

    it('should handle custom events with proper namespacing', async () => {
      const tag = uniqueTagName('event-element');
      const eventHandler = vi.fn();

      class EventElement extends VanReactiveElement {
        render() {
          return tags.button(
            {
              onclick: () => {
                this.dispatchCustomEvent('button-click', {
                  detail: { timestamp: Date.now() },
                  bubbles: true
                });
              }
            },
            'Click Me'
          );
        }
      }

      if (!customElements.get(tag)) EventElement.define(EventElement, tag);
      await customElements.whenDefined(tag);

      const element = document.createElement(tag) as any;
      element.addEventListener('button-click', eventHandler);
      container.appendChild(element);

      await promisedTimeout();

      // Click button
      const button = element.renderRoot.querySelector('button');
      button?.click();

      expect(eventHandler).toHaveBeenCalled();
      const event = eventHandler.mock.calls[0][0];
      expect(event.type).toBe('button-click');
      expect(event.detail).toHaveProperty('timestamp');
    });
  });

  describe('Functional Components with define()', () => {
    it('should create a functional component with state', async () => {
      define(
        'todo-item',
        {
          text: { default: '' },
          completed: { default: false }
        },
        (_props: any, { setStyles, element }: any) => {
          setStyles(css`
            :host {
              display: block;
              padding: 10px;
              border: 1px solid #ddd;
              margin: 5px 0;
            }
            .completed {
              text-decoration: line-through;
              opacity: 0.6;
            }
          `);

          element.render = () => {
            // Use van.state for reactive properties
            const completed = element.completed || van.state(false);
            const text = element.text || van.state('');

            return tags.div(
              { class: () => (completed.val ? 'completed' : '') },
              tags.input({
                type: 'checkbox',
                checked: completed.val,
                onchange: (e: Event) => {
                  completed.val = (e.target as HTMLInputElement).checked;
                  element.completed = completed.val;
                }
              }),
              tags.span(text)
            );
          };
        }
      );

      const todo = document.createElement('todo-item') as any;
      todo.text = 'Test Todo Item';
      container.appendChild(todo);

      await promisedTimeout();

      // Check initial render
      const span = todo.renderRoot.querySelector('span');
      expect(span?.textContent).toBe('Test Todo Item');

      expect(todo.completed.val).toBe(false);

      // Toggle checkbox
      const checkbox = todo.renderRoot.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.click();
      await promisedTimeout(); // Wait for reactivity

      expect(todo.completed.val).toBe(true);
      expect(todo.renderRoot.querySelector('div')?.className).toBe('completed');
    });

    it('should support composition with multiple functional components', async () => {
      // Create a list item component
      define(
        'list-item',
        {
          value: { default: '' }
        },
        (_props: any, { element }: any) => {
          element.render = () =>
            tags.li(
              {
                onclick: () => {
                  element.dispatchCustomEvent('item-click', { detail: element.value.val, bubbles: true });
                }
              },
              element.value
            );
        }
      );

      // Create a list component that uses list items
      define(
        'item-list',
        {
          items: { default: [] }
        },
        (_props: any, { setStyles, element }: any) => {
          setStyles(css`
            ul {
              list-style: none;
              padding: 0;
            }
            li {
              cursor: pointer;
              padding: 5px;
            }
            li:hover {
              background: #f0f0f0;
            }
          `);

          const handleItemClick = (e: CustomEvent) => {
            element.dispatchCustomEvent('selection-change', { detail: e.detail, bubbles: true });
          };

          element.onMount = () => {
            // Listen on the element itself, not the shadow root
            // Custom events with composed: true will bubble through shadow boundaries
            // Note: Functional components are all named 'FunctionalElement'
            element.addEventListener('item-click', handleItemClick);
          };

          element.onCleanup = () => {
            element.removeEventListener('item-click', handleItemClick);
          };

          element.render = () => () => {
            // Create elements programmatically to set properties
            const ul = document.createElement('ul');

            element.items.val.forEach((item: string) => {
              const listItem = document.createElement('list-item') as any;
              listItem.value = item;
              ul.appendChild(listItem);
            });

            return ul;
          };
        }
      );

      const selectionHandler = vi.fn();
      const list = document.createElement('item-list') as any;
      list.items = ['Apple', 'Banana', 'Orange'];
      list.addEventListener('selection-change', selectionHandler);
      container.appendChild(list);

      await promisedTimeout(50); // Wait longer for nested components

      // Click on second item
      const items = list.renderRoot.querySelectorAll('list-item');
      expect(items.length).toBe(3);

      // Wait for nested components to be fully initialized
      await promisedTimeout(50);

      // The nested components should have their shadow roots
      const secondItem = items[1] as any;
      expect(secondItem.renderRoot).toBeTruthy();

      const secondItemLi = secondItem.renderRoot.querySelector('li');
      expect(secondItemLi).toBeTruthy();

      // Add a direct event listener to debug
      const debugHandler = vi.fn();
      list.addEventListener('item-click', debugHandler);

      secondItemLi?.click();

      // Wait for event propagation
      await promisedTimeout();

      expect(debugHandler).toHaveBeenCalled();
      expect(selectionHandler).toHaveBeenCalled();
      expect(selectionHandler.mock.calls[0][0].detail).toBe('Banana');
    });

    it('should handle no shadow DOM mode', async () => {
      define(
        'light-dom',
        {
          content: { default: 'Light DOM Content' }
        },
        (props: any, { noShadowDOM, element }: any) => {
          noShadowDOM();

          element.render = () => tags.div({ class: 'light-content' }, props.content);
        }
      );

      const element = document.createElement('light-dom') as any;
      container.appendChild(element);

      await promisedTimeout();

      // Should render to light DOM, not shadow DOM
      expect(element.shadowRoot).toBe(null);
      expect(element.querySelector('.light-content')?.textContent).toBe('Light DOM Content');
    });
  });

  describe('Advanced Reactivity', () => {
    it('should handle computed properties and effects', async () => {
      const tag = uniqueTagName('reactive-element');
      class ReactiveElement extends VanReactiveElement {
        // Use van.state for reactive properties
        firstName = van.state('John');
        lastName = van.state('Doe');
        fullName = van.state('');
        updateCount = van.state(0);

        constructor() {
          super();
          // Set up computed property using van's reactivity
          van.derive(() => {
            this.fullName.val = `${this.firstName.val} ${this.lastName.val}`;
            this.updateCount.val++;
          });
        }

        render() {
          return tags.div(
            tags.p({ class: 'full-name' }, 'Full Name: ', this.fullName),
            tags.p({ class: 'update-count' }, 'Updates: ', this.updateCount),
            tags.input({
              placeholder: 'First Name',
              value: this.firstName.val,
              oninput: (e: Event) => (this.firstName.val = (e.target as HTMLInputElement).value)
            }),
            tags.input({
              placeholder: 'Last Name',
              value: this.lastName.val,
              oninput: (e: Event) => (this.lastName.val = (e.target as HTMLInputElement).value)
            })
          );
        }
      }

      if (!customElements.get(tag)) ReactiveElement.define(ReactiveElement, tag);
      await customElements.whenDefined(tag);

      const element = document.createElement(tag) as any;
      container.appendChild(element);

      await promisedTimeout();

      // Check initial values
      expect(element.renderRoot.querySelector('.full-name')?.textContent).toBe('Full Name: John Doe');
      expect(element.renderRoot.querySelector('.update-count')?.textContent).toBe('Updates: 1');

      // Update first name
      const firstNameInput = element.renderRoot.querySelectorAll('input')[0] as HTMLInputElement;
      firstNameInput.value = 'Jane';
      firstNameInput.dispatchEvent(new Event('input'));

      await promisedTimeout();

      expect(element.firstName.val).toBe('Jane');
      expect(element.fullName.val).toBe('Jane Doe');
      expect(element.renderRoot.querySelector('.full-name')?.textContent).toBe('Full Name: Jane Doe');
      expect(element.updateCount.val).toBe(2);
    });
  });

  describe('Query Methods', () => {
    it('should provide working query helper methods', async () => {
      const tag = uniqueTagName('query-test-element');
      class QueryTestElement extends VanReactiveElement {
        render() {
          return tags.div(
            tags.header({ 'data-element-id': 'main-header' }, tags.h1('Title')),
            tags.nav({ class: 'menu' }, tags.a({ href: '#home' }, 'Home'), tags.a({ href: '#about' }, 'About')),
            tags.main(tags.section({ class: 'content' }, 'Content 1'), tags.section({ class: 'content' }, 'Content 2'))
          );
        }
      }

      if (!customElements.get(tag)) QueryTestElement.define(QueryTestElement, tag);
      await customElements.whenDefined(tag);

      const element = document.createElement(tag) as any;
      container.appendChild(element);

      await promisedTimeout();

      // Instead of element.checkQueries(), check queries directly
      expect(element.query('header')).toBeTruthy();
      expect(element.query('nav')).toBeTruthy();
    });
  });

  describe('Attribute Integration', () => {
    it('should sync attributes with properties in real components', async () => {
      const tag = uniqueTagName('user-card');
      class UserCard extends VanReactiveElement {
        static properties = {
          name: { default: 'Anonymous', type: String },
          age: { default: 0, type: Number },
          isActive: { default: false, type: Boolean },
          data: { default: null, type: Object }
        };
        render() {
          return tags.div(
            tags.h3(this['name']),
            tags.p('Age: ', this['age']),
            tags.p('Status: ', () => (this['isActive'].val ? 'Active' : 'Inactive')),
            () => this['data'].val && tags.pre(JSON.stringify(this['data'].val, null, 2))
          );
        }
      }
      if (!customElements.get(tag)) UserCard.define(UserCard, tag);
      await customElements.whenDefined(tag);
      const element = document.createElement(tag) as any;
      element.setAttribute('name', 'John Doe');
      element.setAttribute('age', '25');
      element.setAttribute('is-active', ''); // Use correct attribute name for isActive
      element.setAttribute('data', '{"role":"admin"}');
      container.appendChild(element);
      await promisedTimeout();
      // Check initial sync from attributes
      expect(element['name'].val).toBe('John Doe');
      expect(element['age'].val).toBe(25);
      expect(element['isActive'].val).toBe(true);
      expect(element['data'].val).toEqual({ role: 'admin' });
    });

    it('should work with functional components and attributes', async () => {
      define(
        'toggle-button',
        {
          pressed: {
            type: Boolean,
            default: false,
            reflect: true,
            attribute: 'aria-pressed'
          },
          label: {
            type: String,
            default: 'Toggle'
          }
        },
        (props: any, { setStyles, element }: any) => {
          setStyles(css`
            :host {
              display: inline-block;
            }
            button {
              padding: 8px 16px;
              cursor: pointer;
            }
            button[aria-pressed='true'] {
              background: #007bff;
              color: white;
            }
          `);

          element.render = () =>
            tags.button(
              {
                'aria-pressed': props.pressed,
                onclick: () => (element.pressed = !element.pressed.val)
              },
              props.label
            );
        }
      );

      const element = document.createElement('toggle-button') as any;
      element.setAttribute('label', 'Dark Mode');
      element.setAttribute('aria-pressed', 'true');

      document.body.appendChild(element);
      await promisedTimeout();

      // Check initial state
      expect(element.pressed.val).toBe(true);
      expect(element.label.val).toBe('Dark Mode');

      // Toggle state
      element.pressed = false;
      await promisedTimeout();
      expect(element.getAttribute('aria-pressed')).toBe(null);

      // Clean up
      await promisedTimeout();
      document.body.removeChild(element);
    });
  });
});

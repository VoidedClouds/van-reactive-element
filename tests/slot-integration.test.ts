import { describe, it, expect, promisedTimeout, van, tags } from './utils';
import { css } from '../src/syntax-utils';
import { VanReactiveElement, define } from './utils';

describe('Slot Integration Tests', () => {
  it('should handle slots in shadow DOM components', async () => {
    class SlotDemo extends VanReactiveElement {
      static get styles() {
        return css`
          :host {
            display: block;
            border: 1px solid #ccc;
            padding: 16px;
          }
          .header {
            font-weight: bold;
            margin-bottom: 8px;
          }
          .content {
            margin-bottom: 8px;
          }
          .footer {
            font-style: italic;
            color: #666;
          }
        `;
      }

      render() {
        return tags.div(
          { class: 'container' },
          tags.div({ class: 'header' }, tags.slot({ name: 'header' }, 'Default Header')),
          tags.div({ class: 'content' }, tags.slot('Default Content')),
          tags.div({ class: 'footer' }, tags.slot({ name: 'footer' }, 'Default Footer'))
        );
      }
    }

    customElements.define('slot-demo', SlotDemo);

    // Create element with slotted content
    const element = document.createElement('slot-demo') as any;

    // Add content for slots
    element.innerHTML = `
      <h2 slot="header">Custom Header</h2>
      <p>This is the main content</p>
      <p>Another paragraph</p>
      <div slot="footer">Custom Footer Text</div>
    `;

    document.body.appendChild(element);

    // Check that the element has shadow root
    expect(element.shadowRoot).toBeTruthy();

    // Check that slots exist in shadow DOM
    const headerSlot = element.shadowRoot.querySelector('slot[name="header"]');
    const defaultSlot = element.shadowRoot.querySelector('slot:not([name])');
    const footerSlot = element.shadowRoot.querySelector('slot[name="footer"]');

    expect(headerSlot).toBeTruthy();
    expect(defaultSlot).toBeTruthy();
    expect(footerSlot).toBeTruthy();

    // Clean up
    await promisedTimeout();
    document.body.removeChild(element);
  });

  it('should work with light DOM components', async () => {
    class LightDomSlots extends VanReactiveElement {
      createRenderRoot() {
        return this; // Light DOM
      }

      render() {
        return tags.div(
          { class: 'wrapper' },
          tags.header(
            { class: 'header-section' }
            // In light DOM, we just use the children directly
          ),
          tags.main(
            { class: 'main-section' }
            // Content will be here
          )
        );
      }

      connectedCallback() {
        // Store original children before rendering
        const originalChildren = Array.from(this.children);

        // Call parent connectedCallback to render
        super.connectedCallback();

        // After rendering, organize the original children
        const header = this.querySelector('.header-section');
        const main = this.querySelector('.main-section');

        originalChildren.forEach((child) => {
          const slot = child.getAttribute('slot');
          if (slot === 'header' && header) {
            header.appendChild(child);
          } else if (!slot && main) {
            main.appendChild(child);
          }
        });
      }
    }

    customElements.define('light-dom-slots', LightDomSlots);

    const element = document.createElement('light-dom-slots') as any;

    // Add content
    element.innerHTML = `
      <h1 slot="header">Page Title</h1>
      <p>Content paragraph 1</p>
      <p>Content paragraph 2</p>
    `;

    document.body.appendChild(element);

    // Wait for mount and onMount callback to organize children
    await promisedTimeout(20);

    // Check that content was organized
    const header = element.querySelector('.header-section h1');
    const paragraphs = element.querySelectorAll('.main-section p');

    expect(header).toBeTruthy();
    expect(header.textContent).toBe('Page Title');
    expect(paragraphs.length).toBe(2);

    // Clean up
    await promisedTimeout();
    document.body.removeChild(element);
  });

  it('should demonstrate slot usage with functional components', async () => {
    const Card = define(
      'card',
      {
        attributes: {
          variant: { type: String, default: 'default' }
        },
        styles: css`
          :host {
            display: block;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
            margin: 16px;
          }
          .card-header {
            background: #f5f5f5;
            padding: 12px;
            font-weight: bold;
          }
          .card-body {
            padding: 16px;
          }
          .card-footer {
            background: #fafafa;
            padding: 12px;
            border-top: 1px solid #eee;
          }
          :host([variant='primary']) .card-header {
            background: #007bff;
            color: white;
          }
        `
      },
      (props) => {
        return () =>
          tags.div(
            { class: 'card' },
            tags.div({ class: 'card-header' }, tags.slot({ name: 'header' }, 'Card Header')),
            tags.div({ class: 'card-body' }, tags.slot('Card content goes here')),
            tags.div({ class: 'card-footer' }, tags.slot({ name: 'footer' }, 'Card Footer'))
          );
      }
    );

    customElements.define('card-demo', Card);

    const element = document.createElement('card-demo') as any;
    element.setAttribute('variant', 'primary');

    // Add slotted content
    element.innerHTML = `
      <span slot="header">User Profile</span>
      <p>Name: John Doe</p>
      <p>Email: john@example.com</p>
      <button slot="footer">Edit Profile</button>
    `;

    document.body.appendChild(element);

    // Verify structure
    expect(element.shadowRoot).toBeTruthy();
    expect(element.shadowRoot.querySelector('.card')).toBeTruthy();

    // Clean up
    await promisedTimeout();
    document.body.removeChild(element);
  });

  it('should show practical slot usage patterns', async () => {
    // Create a layout component that uses multiple slots
    class AppLayout extends VanReactiveElement {
      static get styles() {
        return css`
          :host {
            display: grid;
            grid-template-areas:
              'header header'
              'sidebar main'
              'footer footer';
            grid-template-columns: 200px 1fr;
            grid-template-rows: auto 1fr auto;
            min-height: 400px;
            gap: 16px;
          }
          .header {
            grid-area: header;
            background: #333;
            color: white;
            padding: 16px;
          }
          .sidebar {
            grid-area: sidebar;
            background: #f5f5f5;
            padding: 16px;
          }
          .main {
            grid-area: main;
            padding: 16px;
          }
          .footer {
            grid-area: footer;
            background: #666;
            color: white;
            padding: 16px;
          }
        `;
      }

      render() {
        return tags.div(
          tags.header({ class: 'header' }, tags.slot({ name: 'header' }, 'App Header')),
          tags.aside({ class: 'sidebar' }, tags.slot({ name: 'sidebar' }, 'Sidebar Content')),
          tags.main({ class: 'main' }, tags.slot('Main Content')),
          tags.footer({ class: 'footer' }, tags.slot({ name: 'footer' }, 'App Footer'))
        );
      }

      // Helper method to check if slots have content
      hasSlotContent(slotName = '') {
        const selector = slotName ? `slot[name="${slotName}"]` : 'slot:not([name])';
        const slot = this.shadowRoot?.querySelector(selector) as HTMLSlotElement;
        return slot && slot.assignedNodes().length > 0;
      }
    }

    customElements.define('app-layout-demo', AppLayout);

    const element = document.createElement('app-layout-demo') as any;

    // Add complex slotted content
    element.innerHTML = `
      <nav slot="header">
        <a href="#">Home</a>
        <a href="#">About</a>
        <a href="#">Contact</a>
      </nav>
      
      <div slot="sidebar">
        <h3>Navigation</h3>
        <ul>
          <li>Dashboard</li>
          <li>Settings</li>
          <li>Profile</li>
        </ul>
      </div>
      
      <article>
        <h1>Welcome to the App</h1>
        <p>This is the main content area.</p>
      </article>
      
      <p slot="footer">© 2024 My App</p>
    `;

    document.body.appendChild(element);

    // Check layout structure
    expect(element.shadowRoot).toBeTruthy();
    expect(element.shadowRoot.querySelector('.header')).toBeTruthy();
    expect(element.shadowRoot.querySelector('.sidebar')).toBeTruthy();
    expect(element.shadowRoot.querySelector('.main')).toBeTruthy();
    expect(element.shadowRoot.querySelector('.footer')).toBeTruthy();

    // Clean up
    await promisedTimeout();
    document.body.removeChild(element);
  });
});

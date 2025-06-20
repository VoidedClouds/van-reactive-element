# Van Reactive Element

A lightweight web components library that seamlessly integrates [VanJS](https://vanjs.org/) with custom elements. Build reactive web components with minimal boilerplate and maximum flexibility.

## Features

- **Seamless VanJS Integration** - Use VanJS state and reactivity within web components
- **Two Paradigms** - Choose between class or functional component styles inspired by [Lit](https://lit.dev) and [Solid Element](https://github.com/solidjs/solid/tree/main/packages/solid-element)
- **Built-in Styling** - Scoped CSS support with shadow DOM encapsulation and adopted stylesheets
- **Reactive by Design** - Automatic UI updates when state changes
- **Attribute Syncing** - Automatic attribute to property conversion with type coercion
- **Property Reflection** - Optionally reflect property changes back to attributes
- **Developer Friendly** - TypeScript support, comprehensive lifecycle hooks

## Installation

```bash
npm install vanjs-reactive-element vanjs-core
```

## Quick Links

- [Examples](#examples) - Todo list from [VanJS](https://vanjs.org/demo#todo-list) implemented in both class or functional component styles
- [API Reference](#api) - Complete API documentation
- [Reactivity Patterns](#reactivity-patterns) - Learn about rendering patterns
- [Attributes & Properties](#attributes-and-properties) - Property configuration and type conversion
- [Slots & Content](#slots-and-content-distribution) - Content distribution with slots

## Usage

### Examples

#### Counter Example - Class Component

A simple counter component demonstrating basic state management:

[Try on CodePen](https://codepen.io/VoidedClouds/pen/jEPKwbL)

```javascript
import van from 'vanjs-core';
import vanRE from 'vanjs-reactive-element';

const { VanReactiveElement, css } = vanRE({ van });

class CounterElement extends VanReactiveElement {
  static properties = {
    count: { attribute: false, default: 0 }
  };

  static get styles() {
    return css`
      button {
        margin: 0 5px;
      }
    `;
  }

  render() {
    const { button, p } = van.tags;

    return [
      p('Count: ', this.count),
      button({ onclick: () => this.count.val-- }, 'Decrement'),
      button({ onclick: () => this.count.val++ }, 'Increment')
    ];
  }
}

// Register the custom element
CounterElement.define();

// Use it
van.add(document.body, van.tags['counter-element']());
```

#### Counter Example - Functional Component

The same counter using the functional approach:

[Try on CodePen](https://codepen.io/VoidedClouds/pen/myJKwVJ)

```javascript
const CounterElement = define(
  'counter-element',
  {
    properties: {
      count: 0
    },
    styles: css`
      button {
        margin: 0 5px;
      }
    `
  },
  (element, { noShadowDOM, onCleanup, onMount }) => {
    return () => {
      const { button, p } = van.tags;

      return [
        p('Count: ', element.count),
        button({ onclick: () => element.count.val-- }, 'Decrement'),
        button({ onclick: () => element.count.val++ }, 'Increment')
      ];
    };
  }
);

// Use it
van.add(document.body, van.tags['counter-element']());
```

#### Todo List Example - Class Component

A more complex example implementing todo functionality from [VanJS](https://vanjs.org/demo#todo-list):

[Try on CodePen](https://codepen.io/VoidedClouds/pen/pvJRBME)

```javascript
// Extract VanReactiveElement and css helper from vanRE
const { VanReactiveElement, css, define } = vanRE({ van });

// Define a custom element <todo-list> by extending VanReactiveElement
class TodoList extends VanReactiveElement {
  // Props with default values and types
  static properties = {
    title: { default: 'Todo List', type: String },
    titleAttributePostfix: 'Will be replaced',
    titlePropertyPostfix: { attribute: false, default: 'Will also be replaced' }
  };

  // Define component styles
  static get styles() {
    return css`
      a {
        cursor: pointer;
      }
    `;
  }

  // Factory method to create a reactive todo item
  createTodoItem(text) {
    const done = van.state(false); // Track if the todo is done
    const deleted = van.state(false); // Track if the todo is deleted
    const { div, input, span, del, a } = van.tags;

    // Return a function that reactively renders the todo item
    return () =>
      deleted.val
        ? null // If deleted, render nothing
        : div(
            { class: 'todo-item' },
            input({
              type: 'checkbox',
              checked: done,
              onclick: (e) => (done.val = e.target.checked) // Toggle done state
            }),
            () => (done.val ? del : span)(text), // Strike-through if done
            a({ onclick: () => (deleted.val = true) }, '❌') // Delete button
          );
  }

  // Render method for the main todo list UI
  render() {
    const { div, h2, input, button } = van.tags;
    const inputDom = input({ type: 'text' }); // Input for new todo text
    const count = van.state(0); // Track number of add clicks
    const derived = van.derive(() => count.val * 2); // Derived state

    // Main DOM structure
    const dom = div(
      h2(this.title, ' - Attribute: ', this.titleAttributePostfix, ' - Property: ', this.titlePropertyPostfix),
      div('Add Click Count: ', count, ' * 2 = ', derived),
      inputDom,
      button(
        {
          onclick: () => (
            count.val++, // Increment count
            van.add(dom, this.createTodoItem(inputDom.value)) // Add new todo item
          )
        },
        'Add'
      )
    );

    return dom;
  }
}

// Register the custom element as <todo-list>
TodoList.define();

// State for the property postfix, updates every second
const titlePropertyPostfix = van.state(new Date().toLocaleTimeString());

// Create the todo-list element and set its attribute postfix
const todoList = van.tags['todo-list']({
  'title-attribute-postfix': 'Attribute Postfix',
  titlePropertyPostfix
});

// Update postfixes every second
const intervalId = setInterval(() => {
  const timeString = new Date().toLocaleTimeString();
  titlePropertyPostfix.val = timeString; // Update property postfix
  todoList.setAttribute('title-attribute-postfix', timeString); // Update attribute postfix
}, 1000);

// Mount the todo list to the document body
van.add(document.body, todoList);
```

> **Tip:** You can always use the native [`customElements.define`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define) method to register your component classes if you prefer. The provided `define` method is a convenience, but not required.

#### Todo List Example - Functional Component

[Try on CodePen](https://codepen.io/VoidedClouds/pen/JodEQBG)

```javascript
// Define a custom element "todo-list"
const TodoList = define(
  'todo-list',
  {
    // Attributes (reactive, read-only, settable via setProperty/setProperties)
    attributes: {
      title: { type: String, default: 'Todo List' },
      titleAttributePostfix: { type: String, default: 'Will be replaced' }
    },
    // Properties (reactive, read-write directly, settable via setProperty/setProperties)
    properties: {
      titlePropertyPostfix: 'Will also be replaced'
    },
    // Component styles
    styles: css`
      a {
        cursor: pointer;
      }
    `
  },
  (element, { noShadowDOM, onCleanup, onMount }) => {
    // Factory for creating a todo item component
    const createTodoItem = (text) => {
      const done = van.state(false); // Track if todo is done
      const deleted = van.state(false); // Track if todo is deleted
      const { div, input, span, del, a } = van.tags;

      // Return a function that renders the todo item reactively
      return () =>
        deleted.val
          ? null // If deleted, render nothing
          : div(
              { class: 'todo-item' },
              input({
                type: 'checkbox',
                checked: done,
                onclick: (e) => (done.val = e.target.checked)
              }),
              () => (done.val ? del : span)(text), // Strike-through if done
              a({ onclick: () => (deleted.val = true) }, '❌') // Delete button
            );
    };

    // Return the render function for the todo list
    return () => {
      const { div, h2, input, button } = van.tags;
      const inputDom = input({ type: 'text' }); // Input for new todos
      const count = van.state(0); // Count of add clicks
      const derived = van.derive(() => count.val * 2); // Derived state

      // Main DOM structure
      const dom = div(
        h2(element.title, ' - Attribute: ', element.titleAttributePostfix, ' - Property: ', element.titlePropertyPostfix),
        div('Add Click Count: ', count, ' * 2 = ', derived),
        inputDom,
        button(
          {
            onclick: () => (
              count.val++, // Increment count
              van.add(dom, createTodoItem(inputDom.value)) // Add new todo item
            )
          },
          'Add'
        )
      );

      return dom;
    };
  }
);
// Note: The `define` function returns a custom element class, which can be subclassed or registered manually if needed.

// State for the property postfix, updates every second
const titlePropertyPostfix = van.state(new Date().toLocaleTimeString());

// Create the todo-list element, set attribute postfix
const todoList = van.tags['todo-list']({
  'title-attribute-postfix': 'Attribute Postfix',
  titlePropertyPostfix
});

// Update postfixes every second
const intervalId = setInterval(() => {
  const timeString = new Date().toLocaleTimeString();
  titlePropertyPostfix.val = timeString; // Update property postfix
  todoList.setAttribute('title-attribute-postfix', timeString); // Update attribute postfix
}, 1000);

// Mount the todo list to the document body
van.add(document.body, todoList);
```

**Note:** When using the `define` function, you must provide the full tag name (including a hyphen) as required by the web components spec.

## API

### `vanRE(options)`

Initialize the VanJS Reactive Element library.

**Parameters:**

- `options.rxScope` - Optional, reactive scope function for managing component lifecycle (typically `effectScope` from your reactivity library)
- `options.van` - Required, VanJS instance with required `add` and `state` methods

**Returns:**

- `VanReactiveElement` - Base class for creating class components
- `css` - Tagged template literal for component styles
- `define` - Function for creating functional components

### `VanReactiveElement` Class

Base class for creating web components with VanJS integration.

#### Static Properties

- `properties` - Component property definitions with configuration:
  - `attribute` - Enable attribute binding (true by default) or specify custom attribute name
  - `converter` - Custom converter with `fromAttribute` and `toAttribute` methods
  - `default` - Default property value
  - `reflect` - Reflect property changes back to attributes
  - `type` - Property type (String, Number, Boolean, Object, Array) for automatic conversion
- `shadowRootOptions` - Shadow root creation options (default: `{ mode: 'open' }`)
- `styles` - Component CSS styles (scoped to shadow DOM). Use `css` tagged template literal or CSSStyleSheet for adopted stylesheets

#### Instance Methods

- `createRenderRoot()` - Create the render root (override to return `this` for light DOM)
- `dispatchCustomEvent(name, options)` - Dispatch a custom event
- `hasShadowDOM()` - Check if the component uses shadow DOM
- `onCleanup()` - Called when the component is disconnected from DOM
- `onMount()` - Called after the component connects to DOM
- `query(selector)` - Query single element within render root
- `queryAll(selector)` - Query all elements within render root
- `registerDisposer(fn)` - Register a cleanup function
- `render()` - Define the component's content. Returns either:
  - Content directly with state objects for automatic reactivity: `div(this.myState)`
  - A function returning content for computed values or when using `.val`: `() => display.val ? div(this.myState) : ''`
- `setProperty(name, value)` - Set a single property value (works for both attributes and properties)
- `setProperties(properties)` - Set multiple properties at once using an object (works for both attributes and properties)

#### Static Methods

- `define(name?)` - Register the component as a custom element  
  Defines a custom element using the provided name. The name must include a hyphen (per custom elements spec).
  If no `name` is provided, the class name of the component will be used to generate the custom element name by converting from PascalCase/camelCase to kebab-case.

### `define(customElementName, options, setup)`

Create a functional component.

**Parameters:**

- `customElementName` - Custom element name (must include a hyphen)
- `options` - Component configuration object:
  - `attributes` - Attribute property definitions (become StateView - read-only)
  - `properties` - Internal property definitions (become State - read-write)
  - `styles` - Component styles (use `css` tagged template literal or CSSStyleSheet)
  - `shadowRootOptions` - Shadow root configuration (default: `{ mode: 'open' }`)
- `setup` - Setup function called once per instance that returns the render function

**Returns:**  
A custom element class, which can be subclassed or registered manually if needed.

**Setup Function Parameters:**

- `element` - The custom element instance with typed reactive properties:
  - **Attributes** (read-only): `element.attributeName` is a StateView
    - Reading: `element.attributeName.val` or direct binding `element.attributeName` in templates
    - Setting: Use `element.setProperty('attributeName', 'new value')` and `element.setProperties(properties)`
  - **Properties** (read-write): `element.propertyName` is a State
    - Reading: `element.propertyName.val` or direct binding `element.propertyName` in templates
    - Setting: `element.propertyName.val = { new: 'value' }` to update the State value or `element.setProperty('attributeName', 'new value')` and `element.setProperties(properties)` to update the State reference or value
  - **Universal setters**: `element.setProperty('name', value)` and `element.setProperties(properties)` work for both attributes and properties
- `context` - Component context object:
  - `noShadowDOM()` - Disable shadow DOM
  - `onCleanup(fn)` - Set cleanup callback
  - `onMount(fn)` - Set mount callback

**Setup Function Returns:**
The setup function must return a render function that defines the component's content, or nothing (void) if no rendering is needed.

### Important Notes

1. **Reactivity**: Properties are not reactive by default. Use `van.state()` or `van.derive()` for reactive properties.
2. **Element Naming**: You must provide the full custom element name (with hyphen) when calling `define`.
3. **Property Binding**: Properties with attribute binding use `van.state` internally for reactivity.
4. **Element-based API in Functional Components**:
   - Attributes are read-only (`StateView`) - use `element.setProperty('attrName', value)` and `element.setProperties(properties)` to update
   - Internal properties are read-write (`State`) - can be updated directly with `element.propName.val = value`

#### Example: Element API Usage

```javascript
define(
  'my-component',
  {
    attributes: {
      // These become StateView (read-only)
      name: { type: String, default: 'World' },
      count: { type: Number, default: 0 }
    },
    properties: {
      // These become State (read-write)
      data: { foo: 'bar' },
      items: []
    }
  },
  (element) => {
    // Reading attributes (StateView)
    console.log(element.name.val); // "World"

    // Setting attributes via setProperties method
    element.setProperties({ count: 42, name: 'Hello' });

    // Reading/writing properties
    element.data.val = { foo: 'updated' }; // ✅ Updates value properly
    element.items.val.push('new item'); // ✅ Modifying array contents

    // Using setProperty method (works for both attributes and properties)
    element.setProperty('data', { foo: 'via setter' }); // ✅ Type-safe value update

    // Return render function
    return () => div('Name: ', element.name, ' Count: ', element.count, ' Data: ', () => JSON.stringify(element.data.val));
  }
);
```

### Reactivity Patterns

VanJS Reactive Element supports two patterns for reactive rendering:

1. **Direct State Binding** (Recommended for simple cases):

   ```javascript
   render() {
     const {div} = van.tags;
     // Pass derive/state objects directly - VanJS handles reactivity
     return div('Count: ', this.count);
   }
   ```

2. **Function-based Rendering** (Required for computed values or `.val` access):
   ```javascript
   render() {
     const {div} = van.tags;
     // Return a function when using computed values or .val
     return () => div(
       div('Count: ', this.count),
       div('Doubled: ', () => this.count.val * 2)
     );
   }
   ```

Use direct derive/state binding when possible for cleaner code. Use function-based rendering when you need to access `.val` use computed properties that aren't van.derive states.

#### Example: When to Use Each Pattern

```javascript
import { effectScope } from 'your-reactivity-library';
import van from 'vanjs-core';

import vanRE from 'vanjs-reactive-element';

const { VanReactiveElement, css } = vanRE({ van, rxScope: effectScope });

class MyComponent extends VanReactiveElement {
  // State
  count = van.state(0);
  multiplier = van.state(2);

  // Computed getter (not a van.derive state)
  get doubled() {
    return this.count.val * 2;
  }

  render() {
    const { div } = van.tags;

    // ❌ Won't be reactive - getter is called once
    // return div('Doubled: ', this.doubled);

    // ✅  Use van.derive state or function wrapper for computed values
    return div('Doubled: ', () => this.doubled);
  }
}
```

### Adopted Stylesheets

VanJS Reactive Element supports modern CSS features like adopted stylesheets for better performance:

```javascript
class MyComponent extends VanReactiveElement {
  // Create a reusable stylesheet
  static stylesheet = new CSSStyleSheet();

  static {
    // Populate the stylesheet
    this.stylesheet.replaceSync(`
      :host {
        display: block;
        padding: 20px;
      }
      
      .title {
        color: #333;
        font-size: 24px;
      }
    `);
  }

  // Return the stylesheet instead of a string
  static get styles() {
    return this.stylesheet;
  }

  render() {
    const { h1 } = van.tags;
    return h1({ class: 'title' }, 'Hello World');
  }
}
```

Adopted stylesheets are more efficient for components that are used multiple times, as the browser can share the same stylesheet across all instances.

### Attributes and Properties

VanJS Reactive Element provides automatic attribute to property syncing with type conversion:

#### Property Configuration

```javascript
import { effectScope } from 'your-reactivity-library';
import van from 'vanjs-core';

import vanRE from 'vanjs-reactive-element';

const { VanReactiveElement, css } = vanRE({ van, rxScope: effectScope });

class MyElement extends VanReactiveElement {
  static properties = {
    // Simple property with default value
    name: { default: 'Anonymous' },

    // Property with type converter
    count: {
      type: Number,
      default: 0
    },

    // Property with custom attribute name
    isActive: {
      type: Boolean,
      default: false,
      attribute: 'active' // Maps to 'active' attribute instead of 'is-active'
    },

    // Property that reflects changes back to attribute
    status: {
      type: String,
      default: 'pending',
      reflect: true
    },

    // Property with custom converter
    data: {
      type: Object,
      converter: {
        fromAttribute: (value) => (value ? JSON.parse(value) : null),
        toAttribute: (value) => (value ? JSON.stringify(value) : null)
      }
    },

    // Property without attribute binding
    internal: {
      default: null,
      attribute: false
    }
  };
}
```

#### Built-in Type Converters

- **String**: Pass-through (default)
- **Number**: Converts to/from numeric values
- **Boolean**: Presence = true, absence = false
- **Object/Array**: JSON serialization

#### Usage Example

```javascript
// HTML
<my-element name="John Doe" count="42" active data='{"role": "admin"}'></my-element>;

// JavaScript
const element = document.querySelector('my-element');

// Properties are automatically synced from attributes
console.log(element.name); // "John Doe"
console.log(element.count); // 42 (number)
console.log(element.isActive); // true (boolean)
console.log(element.data); // { role: "admin" } (object)

// Update properties
element.count = 100;
element.status = 'completed';

// Reflected properties update attributes
console.log(element.getAttribute('status')); // "completed"
```

#### Functional Component Attributes

```javascript
const ToggleButton = define(
  'toggle-button',
  {
    attributes: {
      pressed: {
        type: Boolean,
        default: false,
        reflect: true,
        attribute: 'aria-pressed' // Property with custom ARIA attribute name
      },
      label: {
        type: String,
        default: 'Toggle'
      }
    }
  },
  (element, {}) => {
    return () => {
      const { button } = van.tags;

      return button(
        {
          'aria-pressed': element.pressed,
          onclick: () => element.setProperty('pressed', !element.pressed.val)
        },
        element.label
      );
    };
  }
);
```

### Slots and Content Distribution

VanJS Reactive Element fully supports Web Components slots for content distribution.  
Note: Use native slot APIs such as `slot.assignedNodes()` and `slot.assignedElements()` for slot management:

#### Shadow DOM Slots

```javascript
import { effectScope } from 'your-reactivity-library';
import van from 'vanjs-core';

import vanRE from 'vanjs-reactive-element';

const { VanReactiveElement, css } = vanRE({ van, rxScope: effectScope });

class CardComponent extends VanReactiveElement {
  static get styles() {
    return css`
      :host {
        display: block;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
      }
      .header {
        background: #f5f5f5;
        padding: 16px;
        font-weight: bold;
      }
      .body {
        padding: 16px;
      }
      .footer {
        padding: 16px;
        border-top: 1px solid #eee;
      }
    `;
  }

  render() {
    const { div, slot } = van.tags;
    return div(
      { class: 'card' },
      div({ class: 'header' }, slot({ name: 'header' }, 'Default Header')),
      div({ class: 'body' }, slot('Default Content')),
      div({ class: 'footer' }, slot({ name: 'footer' }))
    );
  }
}

// Usage
<card-component>
  <h2 slot="header">Card Title</h2>
  <p>This is the card content</p>
  <p>Multiple elements can go in the default slot</p>
  <button slot="footer">Action</button>
</card-component>;
```

#### Working with Slots

```javascript
import { effectScope } from 'your-reactivity-library';
import van from 'vanjs-core';

import vanRE from 'vanjs-reactive-element';

const { VanReactiveElement, css } = vanRE({ van, rxScope: effectScope });

class SlotAwareComponent extends VanReactiveElement {
  onMount() {
    // Access slots directly using standard Web Component APIs
    const slots = this.renderRoot.querySelectorAll('slot');

    slots.forEach((slot) => {
      // Get assigned nodes for each slot
      const assignedNodes = slot.assignedNodes();
      const assignedElements = slot.assignedElements();

      // Listen for slot changes
      slot.addEventListener('slotchange', (e) => {
        const newNodes = e.target.assignedNodes();
        console.log(`Slot "${slot.name || 'default'}" changed:`, newNodes);
      });
    });

    // Check specific slot content
    const footerSlot = this.renderRoot.querySelector('slot[name="footer"]');
    if (footerSlot && footerSlot.assignedNodes().length === 0) {
      console.log('No footer content provided');
    }
  }
}
```

#### Light DOM Content Organization

For components using light DOM (no shadow DOM), override `createRenderRoot()` to return `this`:

```javascript
import { effectScope } from 'your-reactivity-library';
import van from 'vanjs-core';

import vanRE from 'vanjs-reactive-element';

const { VanReactiveElement, css } = vanRE({ van, rxScope: effectScope });

class LightDomLayout extends VanReactiveElement {
  createRenderRoot() {
    return this; // Use light DOM
  }

  render() {
    const { div, header, main, footer } = van.tags;
    return div({ class: 'layout' }, header({ class: 'header-area' }), main({ class: 'content-area' }), footer({ class: 'footer-area' }));
  }

  onMount() {
    // Organize children by slot attribute
    Array.from(this.children).forEach((child) => {
      const slot = child.getAttribute('slot');
      if (slot === 'header') {
        this.querySelector('.header-area')?.appendChild(child);
      } else if (slot === 'footer') {
        this.querySelector('.footer-area')?.appendChild(child);
      } else {
        this.querySelector('.content-area')?.appendChild(child);
      }
    });
  }
}
```

#### Conditional Slot Rendering

```javascript
import { effectScope } from 'your-reactivity-library';
import van from 'vanjs-core';

import vanRE from 'vanjs-reactive-element';

const { VanReactiveElement, css } = vanRE({ van, rxScope: effectScope });

class ConditionalSlots extends VanReactiveElement {
  hasIcon = van.state(false);

  render() {
    const { div, span, slot } = van.tags;
    return () =>
      div(
        { class: 'button-wrapper' },
        this.hasIcon.val && span({ class: 'icon' }, slot({ name: 'icon' })),
        span({ class: 'label' }, slot('Button'))
      );
  }

  onMount() {
    // Check if icon slot has content
    const iconSlot = this.renderRoot.querySelector('slot[name="icon"]');
    if (iconSlot) {
      this.hasIcon.val = iconSlot.assignedNodes().length > 0;
    }
  }
}
```

## License

MIT License

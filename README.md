# Van Reactive Element

A lightweight web components library that seamlessly integrates [VanJS](https://vanjs.org/) with custom elements, supporting any reactivity system. Build reactive web components with minimal boilerplate and maximum flexibility.

## Features

- **Seamless VanJS Integration** - Use VanJS state and reactivity within web components
- **Two Paradigms** - Choose between class-based or functional component styles
- **Built-in Styling** - Scoped CSS support with shadow DOM encapsulation and adopted stylesheets
- **Reactive by Design** - Automatic UI updates when state changes
- **Attribute Syncing** - Automatic attribute to property conversion with type coercion
- **Property Reflection** - Optionally reflect property changes back to attributes
- **Developer Friendly** - TypeScript support, comprehensive lifecycle hooks
- **Lightweight** - Minimal overhead on top of VanJS
- **Convenient Property Access** - The `.val` getter provides easy access to unwrapped property values

## Installation

```bash
npm install vanjs-reactive-element vanjs-core
```

## Quick Links

- [Examples](#examples) - Todo list from [VanJS](https://vanjs.org/demo#todo-list) implemented in both class-based or functional component styles
- [API Reference](#api) - Complete API documentation
- [Reactivity Patterns](#reactivity-patterns) - Learn about rendering patterns
- [Attributes & Properties](#attributes-and-properties) - Property configuration and type conversion
- [Slots & Content](#slots-and-content-distribution) - Content distribution with slots

## Usage

### Examples

Both examples below implement the same simple todo functionality from [VanJS](https://vanjs.org/demo#todo-list) to demonstrate the differences between class-based and functional component patterns.

#### Class-Based Component

[Try on CodePen](https://codepen.io/VoidedClouds/pen/pvJRBME)

```javascript
import van from 'vanjs-core';
import vanRE from 'vanjs-reactive-element';

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
  'title-attribute-postfix': 'Attribute Postfix'
});
todoList.titlePropertyPostfix = titlePropertyPostfix; // Bind property postfix

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

#### Functional Component

[Try on CodePen](https://codepen.io/VoidedClouds/pen/JodEQBG)

```javascript
// Define a custom element "todo-list"
const TodoList = define(
  'todo-list',
  {
    // Props with default values and types (Props are Attributes by default)
    title: { default: 'Todo List', type: String },
    titleAttributePostfix: 'Will be replaced',
    titlePropertyPostfix: { attribute: false, default: 'Will also be replaced' }
  },
  (props, { element, noShadowDOM, onCleanup, onMount, render, setStyles }) => {
    // Set component styles
    setStyles(css`
      a {
        cursor: pointer;
      }
    `);

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

    // Main render function for the todo list
    render(() => {
      const { div, h2, input, button } = van.tags;
      const inputDom = input({ type: 'text' }); // Input for new todos
      const count = van.state(0); // Count of add clicks
      const derived = van.derive(() => count.val * 2); // Derived state

      // Main DOM structure
      const dom = div(
        h2(props.title, ' - Attribute: ', props.titleAttributePostfix, ' - Property: ', props.titlePropertyPostfix),
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
    });

    // Example of using the .val getter in functional components:
    // props.val.title === props.title.val (for reactive properties)
    // props.val.titlePropertyPostfix === props.titlePropertyPostfix (for non-reactive properties)
  }
);
// Note: The `define` function returns a custom element class, which can be subclassed or registered manually if needed.

// State for the property postfix, updates every second
const titlePropertyPostfix = van.state(new Date().toLocaleTimeString());

// Create the todo-list element, set attribute postfix
const todoList = van.tags['todo-list']({
  'title-attribute-postfix': 'Attribute Postfix'
});
todoList.titlePropertyPostfix = titlePropertyPostfix; // Bind property postfix

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

- `VanReactiveElement` - Base class for creating class-based components
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

#### Instance Properties

- `val` - Read-only getter providing access to unwrapped values of reactive properties. For state properties, returns the `.val` value; for non-reactive properties, returns the value directly

#### Instance Methods

- `createRenderRoot()` - Create the render root (override to return `this` for light DOM)
- `dispatchCustomEvent(name, options)` - Dispatch a custom event
- `hasShadowDOM()` - Check if the component uses shadow DOM
- `onCleanup()` - Called when the component is disconnected from DOM
- `onMount()` - Called after the component connects to DOM
- `query(selector)` - Query single element within render root
- `queryAll(selector)` - Query all elements within render root
- `registerDisposer(fn)` - Register a cleanup function
- `render()` - Define the component template. Returns either:
  - A template directly with state objects for automatic reactivity: `div(this.myState)`
  - A function returning a template for computed values or when using `.val`: `() => div(this.computed)`

#### Static Methods

- `define(elementClass?, name?)` - Register the component as a custom element  
  Defines a custom element using the provided name. The name must include a hyphen (per custom elements spec).
  If no `elementClass` or `name` are provided the class and/or class name of the component will be used to register the custom element generating the custom element name by converting the class from PascalCase/camelCase to kebab-case.

### `define(customElementName, properties, setup)`

Create a functional component.

**Parameters:**

- `customElementName` - Custom element name (must include a hyphen)
- `properties` - Property definitions (object with default values)
- `setup` - Setup function called once per instance

**Returns:**  
A custom element class, which can be subclassed or registered manually if needed.

**Setup Function Parameters:**

- `props` - Reactive property accessors
- `context` - Component context object:
  - `element` - The element instance
  - `noShadowDOM()` - Disable shadow DOM
  - `onCleanup(fn)` - Set cleanup callback
  - `onMount(fn)` - Set mount callback
  - `render(fn)` - Set render function
  - `setStyles(styles)` - Set component styles (use `css` tagged template literal or CSSStyleSheet)

### Important Notes

1. **Reactivity**: Properties are not reactive by default. Use `van.state()` or `van.derive()` for reactive properties.
2. **Element Naming**: You must provide the full custom element name (with hyphen) when calling `define`.
3. **Property Binding**: Properties with attribute binding use `van.state` internally for reactivity.
4. **The `.val` Getter**: Both class-based and functional components provide a `.val` getter for convenient access to unwrapped property values. This is especially useful in functional components where props are accessed through a proxy.

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
       div('Count: ', this.count.val),
       div('Doubled: ', this.count.val * 2)
     );
   }
   ```

Use direct derive/state binding when possible for cleaner code. Use function-based rendering when you need to access `.val` or use computed properties that aren't van.derive states.

### The `.val` Getter

VanJS Reactive Element provides a convenient `.val` getter that returns unwrapped property values:

```javascript
class MyComponent extends VanReactiveElement {
  static properties = {
    name: { type: String, default: 'World' }, // Reactive (has attribute)
    count: { type: Number, default: 0 }, // Reactive (has attribute)
    data: { attribute: false, default: { x: 1 } } // Non-reactive (no attribute)
  };

  logValues() {
    // Traditional access
    console.log(this.name.val); // 'World' (unwrap State)
    console.log(this.count.val); // 0 (unwrap State)
    console.log(this.data); // { x: 1 } (direct value)

    // Using .val getter (more convenient)
    console.log(this.val.name); // 'World' (automatically unwrapped)
    console.log(this.val.count); // 0 (automatically unwrapped)
    console.log(this.val.data); // { x: 1 } (returned as-is)
  }
}
```

In functional components, the `.val` getter is available on the props object:

```javascript
define(
  'my-component',
  {
    message: 'Hello',
    count: { type: Number, default: 0 },
    internal: { attribute: false, default: [] }
  },
  (props, ctx) => {
    // Access unwrapped values via props.val
    console.log(props.val.message); // 'Hello' (unwrapped from State)
    console.log(props.val.count); // 0 (unwrapped from State)
    console.log(props.val.internal); // [] (direct value)

    ctx.render(() => {
      const { div } = van.tags;
      // You can use props.val in templates too
      return div(`Message: ${props.val.message}, Count: ${props.val.count}`);
    });
  }
);
```

The `.val` getter is particularly useful when:

- You need to access multiple property values at once
- You're working with mixed reactive and non-reactive properties
- You want cleaner code without manually checking if a property is a State object

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

    // ✅ Option 1: Use function wrapper for computed values
    return () => div('Doubled: ', this.doubled);

    // ✅ Option 2: Pass state directly (preferred for simple cases)
    // return div('Count: ', this.count);
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
  },
  (props, { element }) => {
    element.render = () => {
      const { button } = van.tags;
      return button(
        {
          'aria-pressed': props.pressed,
          onclick: () => (element.pressed = !element.pressed)
        },
        props.label
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

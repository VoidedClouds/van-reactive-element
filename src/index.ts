import type { ChildDom, State, StateView, Van } from 'vanjs-core';
import { camelAndPascalToKebab, converters, defaultConverter, type AttributeConverter } from './property-utils';
import { css } from './syntax-utils';

// Re-export AttributeConverter for external use
export type { AttributeConverter } from './property-utils';
export type { ChildDom, State, StateView, Van };

// Export all interfaces for external use
/**
 * Configuration options for VanJS Reactive Element
 * @example
 * const vanRE = createVanRE({
 *   van: { add: van.add, state: van.state },
 *   rxScope: van.derive // Optional: custom reactive scope
 * })
 */
export interface VanREOptions {
  /** Reactive scope function for managing component lifecycle */
  rxScope?: (fn: () => void | (() => void)) => () => void;
  /** VanJS instance with required methods */
  van: {
    add: Van['add'];
    state: Van['state'];
  };
}

/**
 * Type Usage Quick Reference:
 *
 * 1. Class Components:
 * ```typescript
 * class MyElement extends VanReactiveElement {
 *   declare name: State<string>;
 *   declare count: State<number>;
 *   declare data: State<{ foo: string }>;  // All properties are reactive
 *
 *   static properties = {
 *     name: { type: String, default: 'World' },
 *     count: { type: Number, default: 0 },
 *     data: { attribute: false, default: { foo: 'bar' } }
 *   };
 * }
 * ```
 *
 * 2. Functional Components with options object:
 * ```typescript
 * define('my-component', {
 *   // Attributes (all get StateView - read-only)
 *   // Must specify type for proper serialization
 *   attributes: {
 *     name: { type: String, default: 'John' },
 *     count: { type: Number, default: 0 },
 *     active: { type: Boolean, reflect: true },
 *     label: { type: String }  // No default is fine
 *   },
 *
 *   // Internal properties (all get State - read-write)
 *   // MUST be simple values, not PropertyOptions
 *   properties: {
 *     data: { foo: 'bar' },    // Object literal
 *     cache: [],               // Empty array
 *     loading: false,          // Boolean
 *     message: ''              // Empty string
 *   },
 *
 *   // Optional styles
 *   styles: `
 *     :host { display: block; }
 *     button { padding: 8px; }
 *   `
 * }, (props) => {
 *   // Attribute properties are StateView (read-only)
 *   const name = props.name.val;          // ✓ Can read
 *   // props.name.val = 'Jane';           // ✗ Error: readonly
 *
 *   // Internal properties are State (read-write)
 *   props.data.val = { foo: 'new' };      // ✓ Can modify
 *   props.cache.val.push('item');         // ✓ Direct mutation
 *   props.loading.val = true;             // ✓ Direct assignment
 *
 *   // Universal setter for all properties
 *   props.set.name = 'Jane';              // ✓ Attributes
 *   props.set.data = { foo: 'bar' };      // ✓ Properties
 *
 *   // Return the render function
 *   return () => button(
 *     { onclick: () => props.set.count = props.count.val + 1 },
 *     props.label, ': ', props.count
 *   );
 * });
 *
 * // With custom shadow root options and styles
 * define('closed-component', {
 *   attributes: { name: { type: String, default: 'Shadow' } },
 *   properties: { internal: 'state' },
 *   shadowRootOptions: { mode: 'closed', delegatesFocus: true },
 *   styles: `:host { display: inline-block; }`
 * }, (props) => {
 *   return () => span(props.name);
 * });
 * ```
 *
 * 3. Direct State assignment in class components:
 * ```typescript
 * class MyElement extends VanReactiveElement {
 *   static properties = { count: 0 };
 *
 *   increment() {
 *     // Runtime accepts both State<T> and plain values
 *     this.count = van.state(100);  // Assign State directly
 *     this.count = 50;              // Assign plain value
 *     this.count.val = 75;          // Modify via .val
 *   }
 * }
 * ```
 */

// More flexible type for property constructors
export type PropertyType = StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor | ArrayConstructor | Function;

/**
 * Property configuration options
 * @template T - The type of the property value
 *
 * Type inference priority:
 * 1. Explicit type parameter in PropertyOptions<T>
 * 2. Default value type
 * 3. Type property (String, Number, Boolean, Object, Array)
 *
 * @example
 * // Type inferred from default value
 * count: { type: Number, default: 0 }  // → State<number>
 *
 * @example
 * // Type inferred from 'type' property when no default
 * isActive: {
 *   type: Boolean,
 *   attribute: 'data-active',
 *   reflect: true
 * }  // → State<boolean>
 *
 * @example
 * // Simple type-only definition
 * enabled: { type: Boolean }  // → State<boolean>
 *
 * @example
 * // Explicit type takes precedence
 * internal: { type: Object, attribute: false } as PropertyOptions<User>  // → State<User>
 */
export interface PropertyOptions<T = unknown> {
  /** Enable attribute binding. true = kebab-case, false = disabled, string = custom name */
  attribute?: boolean | string;
  /** Custom converter for attribute serialization/deserialization */
  converter?: AttributeConverter<T>;
  /** Default value for the property */
  default?: T;
  /** Reflect property changes back to attributes */
  reflect?: boolean;
  /** Type hint for automatic conversion (String, Number, Boolean, Object, Array) */
  type?: PropertyType;
}

/**
 * Context object provided to functional component setup
 * @template E - The element type
 * @example
 * define('my-component', {
 *   attributes: { label: { type: String, default: 'Click me' } },
 *   properties: { count: 0 },
 *   styles: `
 *     :host { display: block; }
 *     button { padding: 8px; }
 *   `
 * }, (props, ctx) => {
 *   ctx.onMount(() => console.log('Component mounted'));
 *   ctx.onCleanup(() => console.log('Component cleanup'));
 *
 *   // Return the render function
 *   return () => button({
 *     onclick: () => props.set.count = props.count.val + 1
 *   }, props.label, ': ', props.count);
 * })
 */
export interface SetupContext<E extends VanReactiveElement = VanReactiveElement> {
  /** The custom element instance */
  element: E;
  /** Disable shadow DOM (use light DOM instead) */
  noShadowDOM: () => void;
  /** Register cleanup function called on disconnect */
  onCleanup: (fn: () => void) => void;
  /** Register mount function called after initial render */
  onMount: (fn: () => void) => void;
}

/**
 * Property definitions for attributes.
 * Must use PropertyOptions with at least a type specified.
 *
 * @example
 * {
 *   // Type is required for proper serialization
 *   name: { type: String },                          // No default
 *   count: { type: Number, default: 0 },             // With default
 *   active: { type: Boolean, reflect: true },        // With reflection
 *   label: { type: String, attribute: 'aria-label' } // Custom attribute name
 * }
 */
export type PropertyDefinitions = {
  [key: string]: PropertyOptions;
};

/**
 * State definitions are simple key-value pairs
 */
export type StateDefinitions = Record<string, any>;

/**
 * Options for defining a custom element
 */
export interface DefineOptions<A extends PropertyDefinitions = PropertyDefinitions, S extends StateDefinitions = StateDefinitions> {
  /** Properties that sync with DOM attributes (become StateView) */
  attributes?: A;
  /** Internal properties on the instance (become State) */
  properties?: S;
  /** Optional shadow root configuration */
  shadowRootOptions?: ShadowRootInit;
  /** Component styles (scoped to shadow DOM) */
  styles?: string | CSSStyleSheet;
}

export type DefineFunction = <A extends PropertyDefinitions, S extends StateDefinitions>(
  customElementName: string,
  options: DefineOptions<A, S>,
  setup: (props: SplitPropertiesWithSetter<A, S>, context: SetupContext) => (() => unknown) | void
) => VanReactiveElementConstructor;

export interface VanRE {
  VanReactiveElement: VanReactiveElementConstructor;
  css: (template: TemplateStringsArray, ...values: any[]) => string;
  define: DefineFunction;
}

// Export the main VanReactiveElement constructor interface
/**
 * Instance interface for VanReactiveElement
 */
export interface VanReactiveElement extends HTMLElement {
  renderRoot: ShadowRoot | HTMLElement | null;
  dispatchCustomEvent(typeName: string, options?: CustomEventInit): boolean;
  hasShadowDOM(): boolean;
  query(selector: string): Element | null;
  queryAll(selector: string): NodeListOf<Element>;
  registerDisposer(disposer: () => void): () => void;
}

/**
 * Constructor interface for VanReactiveElement
 */
export interface VanReactiveElementConstructor {
  new (): VanReactiveElement;
  readonly properties: Record<string, PropertyOptions>;
  readonly shadowRootOptions: ShadowRootInit;
  readonly styles: string | CSSStyleSheet | null;
  define(name?: string): any;
}

/**
 * Type representing the internal storage of properties on an element instance.
 * This is mainly used internally and for advanced use cases.
 */
type InternalProperties = Record<string, any>;

/**
 * Infers type from a property type constructor
 */
type InferFromType<T> = T extends StringConstructor
  ? string
  : T extends NumberConstructor
  ? number
  : T extends BooleanConstructor
  ? boolean
  : T extends ObjectConstructor
  ? object
  : T extends ArrayConstructor
  ? unknown[]
  : T extends new (...args: any[]) => infer R
  ? R
  : unknown;

/**
 * Infers attribute properties as StateView (read-only)
 * Handles PropertyOptions with default values, type hints, etc.
 */
export type InferredAttributeProperties<T> = {
  [K in keyof T]: T[K] extends { default: infer D }
    ? StateView<D>
    : T[K] extends { type: infer Type }
    ? StateView<InferFromType<Type>>
    : T[K] extends PropertyOptions<infer U>
    ? StateView<U>
    : StateView<T[K]>;
};

/**
 * Infers state properties as State (read-write)
 * State definitions are always simple values, not PropertyOptions
 */
export type InferredStateProperties<T> = {
  [K in keyof T]: State<T[K]>;
};

/**
 * Extract the inner type from StateView or State
 */
type UnwrapReactiveType<T> = T extends StateView<infer U> ? U : T extends State<infer U> ? U : T;

/**
 * Type for the split property setter that accepts plain values
 * Automatically unwraps StateView and State types
 */
export type SplitPropertySetter<A, S> = {
  [K in keyof (A & S)]: UnwrapReactiveType<K extends keyof S ? State<S[K]> : K extends keyof A ? InferredAttributeProperties<A>[K] : never>;
};

/**
 * Combined properties for split definition with setter
 */
export type SplitPropertiesWithSetter<A, S> = InferredAttributeProperties<A> &
  InferredStateProperties<S> & {
    set: SplitPropertySetter<A, S>;
  };

const vanRE = (options: VanREOptions): VanRE => {
  const { rxScope = (fn) => (fn?.(), () => {}), van } = options;
  const { defineProperty, entries, fromEntries, getPrototypeOf } = Object;
  const isValueState = (value: unknown) => {
    return value && typeof value === 'object' && 'val' in value;
  };

  /**
   * VanReactiveElement provides a base class for creating custom HTML elements with reactive properties.
   * It integrates a reactivity system with the Web Components standard.
   *
   * Features:
   * - Shadow DOM management with customizable shadow root options
   * - Declarative definition of properties for initial values
   * - Lifecycle management with automatic cleanup
   * - Built-in CSS styling through the static `styles` property
   * - Utility methods for defining custom elements with automatic naming
   *
   * @extends HTMLElement
   *
   * @example
   * /// Define a custom counter element
   * class CounterElement extends VanReactiveElement {
   *   // Use van.state for reactive properties
   *   count = van.state(0);
   *
   *   static get styles() {
   *     return `
   *       :host { display: block; }
   *       button { margin: 5px; }
   *     `;
   *   }
   *
   *   render() {
   *     // Using vanjs-core syntax
   *     return div(
   *       div("Count: ", this.count),
   *       button({ onclick: () => this.count.val++ }, "Increment")
   *     );
   *   }
   * }
   *
   * /// Register the element as <counter-element />
   * CounterElement.define();
   */
  class VanReactiveElementClass extends HTMLElement {
    /** @protected */
    renderRoot: ShadowRoot | HTMLElement | null = null; // Initialize renderRoot

    /** @private */
    _disposers = new Set<() => void>(); // Store cleanup functions
    /** @private */
    _hasSetupProperties = false; // Ensure properties are initialized only once
    /** @private */
    _isSetupComplete = false; // Track if initial setup has run
    /** @private */
    _reflectingProperty: string | null = null;

    static properties: Record<string, PropertyOptions> = {};

    /** @private */
    _attributeToPropertyMap = new Map<string, string>();
    /** @private */
    _propertyToAttributeMap = new Map<string, string>();

    /**
     * Defines options for the shadow root. Override in subclasses.
     * Defaults to `{ mode: 'open' }`.
     * @returns {ShadowRootInit}
     */
    static get shadowRootOptions(): ShadowRootInit {
      return { mode: 'open' };
    }

    /**
     * Defines component-specific styles. Override in subclasses.
     * Should return a CSS string or CSSStyleSheet.
     * @returns {string | CSSStyleSheet | null}
     */
    static get styles(): string | CSSStyleSheet | null {
      return null;
    }

    // --- Constructor & Initialization ---

    constructor() {
      super();

      this.registerDisposer(
        rxScope(() => {
          this._setupProperties();
        })
      );
    }

    // --- Native Lifecycle Callbacks ---

    static get observedAttributes(): string[] {
      const attributes: string[] = [];
      const { properties } = this;

      if (!properties) return attributes;

      for (const [propName, options] of entries(properties)) {
        if (!options) continue;

        if (options.attribute === false) continue;

        const attrName = typeof options.attribute === 'string' ? options.attribute : camelAndPascalToKebab(propName);
        attributes.push(attrName);
      }

      return attributes;
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
      if (oldValue === newValue) return;
      const propName = this._attributeToPropertyMap.get(name);
      if (!propName) return;
      if (this._reflectingProperty === propName) return; // Prevent loop

      const ctor = this.constructor as VanReactiveElementConstructor;
      const options = ctor.properties[propName];
      if (!options) return;

      // Get converter
      const converter = options.converter || (options.type && converters[options.type.name]) || defaultConverter;

      // Convert and set the property
      const value = converter.fromAttribute(newValue);

      // Set the property via its descriptor, which will handle state updates
      (this as InternalProperties)[propName] = value;
    }

    connectedCallback() {
      // Create renderRoot before controllers `hostConnected`
      this.renderRoot ??= this.createRenderRoot();
      // Initialize disposers for this connection
      this._disposers ??= new Set();
      // Setup styles
      this._setupStyles();

      // --- Setup Component ---
      // Only run setup once per connection
      if (!this._isSetupComplete) {
        this.registerDisposer(
          rxScope(() => {
            // Render the component's content
            if (this.renderRoot && this.render) {
              van.add(this.renderRoot as Element, this.render() as Parameters<Van['add']>[1]);
            }

            this._isSetupComplete = true;

            // Call onMount after the initial setup DOM is rendered
            requestAnimationFrame(() => {
              this.isConnected && this._isSetupComplete && this.onMount?.();
            });
          })
        );
      }
    }

    disconnectedCallback() {
      if (this.isConnected) return;

      // Dispose and clear events, scopes, etc.
      this._disposers.forEach((disposer) => {
        try {
          disposer();
        } catch (error) {
          __DEV__ && console.error('Error disposing effect:', error);
        }
      });
      this._disposers.clear();

      // Reset flag to allow setup again if reconnected
      this._isSetupComplete = false;

      // Call user-defined cleanup hook
      try {
        this.onCleanup?.();
      } catch (error) {
        __DEV__ && console.error('Error running user-defined cleanup:', error);
      }
    }

    // --- Custom Lifecycle Callbacks ---

    /**
     * Creates the root node where the component's content will be rendered.
     * By default, creates and returns an open shadow root.
     * Override to customize shadow root options or render to light DOM (by returning `this`).
     * @returns {ShadowRoot | HTMLElement} The node to render into.
     * @protected
     */
    protected createRenderRoot(): ShadowRoot | HTMLElement {
      return this.shadowRoot ?? this.attachShadow((this.constructor as VanReactiveElementConstructor).shadowRootOptions);
    }

    /**
     * Called after the component's disconnected.
     * @protected
     */
    protected onCleanup(): void {
      // No-op. Override in subclasses.
    }

    /**
     * Called after the component's initial setup and DOM creation.
     * @protected
     */
    protected onMount(): void {
      // No-op. Override in subclasses.
    }

    /**
     * Defines the component's content. Override in subclasses to provide the UI structure.
     *
     * @returns {unknown} The content to render. This can be any valid VanJS content.
     * @protected
     *
     * @example
     * render() {
     *   const count = van.state(0);
     *   return () => button({
     *     onclick: () => count.val++
     *   }, "Clicks: ", count);
     * }
     *
     * // The returned function is called automatically when reactive dependencies change.
     */
    protected render?(): unknown;

    // --- Automatic Cleanup ---

    /**
     * Registers a cleanup function for automatic cleanup when the component is disconnected.
     * This method adds the given function to the component's cleanup routine.
     *
     * @param {Function} disposer - A function to call when the component is disconnected.
     * @returns {Function} The disposer that was passed in, for chaining.
     *
     * @example
     * this.registerDisposer(() => {
     *   // Clean up resources
     * });
     */
    registerDisposer(disposer: () => void): () => void {
      if (typeof disposer === 'function') {
        this._disposers.add(disposer);
      } else if (__DEV__) {
        console.warn('[VanReactiveElement.registerDisposer] The disposer must be a function.', disposer);
      }

      return disposer;
    }

    // --- Instance methods ---

    /**
     * Checks if the component is using shadow DOM.
     * @returns {boolean} True if the component has a shadow DOM, false if using light DOM.
     */
    hasShadowDOM(): boolean {
      return this.renderRoot !== this && this.renderRoot instanceof ShadowRoot;
    }
    /**
     * Sets the properties of the current instance.
     * @param {Record<string, unknown>} properties - An object containing the properties to set.
     * @returns {VanReactiveElementClass} - The current instance for chaining.
     */
    setProperties(properties: Record<string, unknown>): VanReactiveElementClass {
      return Object.assign(this, properties);
    }

    /**
     * Sets a single property on the current instance.
     * This is a universal setter that assigns the given value to the specified property.
     *
     * @param {string} property - The name of the property to set.
     * @param {unknown} value - The value to assign to the property.
     * @returns {unknown} The value assigned.
     */
    setProperty(property: string, value: unknown): unknown {
      return (this[property] = value);
    }

    // --- Selector Methods ---

    /**
     * Returns the first element matching the selector within the component's shadow DOM.
     * @param {string} selector CSS selector.
     * @returns {Element | null}
     */
    query(selector: string): Element | null {
      return this.renderRoot?.querySelector(selector) ?? null;
    }

    /**
     * Returns a NodeList of all elements matching the selector within the component's shadow DOM.
     * @param {string} selector CSS selector.
     * @returns {NodeListOf<Element>} An empty NodeList if renderRoot doesn't exist.
     */
    queryAll(selector: string): NodeListOf<Element> {
      // querySelectorAll returns an empty NodeList if not found, which is safe.
      return this.renderRoot?.querySelectorAll(selector) ?? document.createDocumentFragment().querySelectorAll('*'); // Return empty NodeList
    }

    // --- Event Methods ---

    /**
     * Dispatches a custom event from the element.
     * @param {string} typeName The name of the event.
     * @param {CustomEventInit} options Event options (detail, bubbles, composed, cancelable).
     *                                    Defaults: bubbles=false, composed=true for shadow DOM/false for light DOM, cancelable=false.
     * @returns {boolean} False if event is cancelable and preventDefault() was called, true otherwise.
     */
    dispatchCustomEvent(typeName: string, options: CustomEventInit = {}): boolean {
      const event = new CustomEvent(typeName, {
        bubbles: false,
        composed: this.hasShadowDOM(), // Only compose (bubble out of shadow DOM) if we have shadow DOM
        cancelable: false,
        ...options // User options override defaults
      });
      return this.dispatchEvent(event);
    }

    // --- Define methods ---

    /**
     * Defines a custom element based on its class if no parameters are provided,
     * generating the custom element name by converting the class from PascalCase/camelCase to kebab-case.
     * Example: A class named `MyButton` will be defined as `my-button`.
     * @param {string} [name] Optional name of the custom element.
     * @returns {VanReactiveElement} The class itself for chaining.
     */
    static define(name?: string): any {
      const classToDefine = this;
      let tagName = name || classToDefine?.name;

      if (!tagName) {
        __DEV__ && console.error('[VanReactiveElement] Cannot define custom element: Tag name is missing or invalid.', classToDefine);
        return classToDefine!;
      }

      // Convert PascalCase/camelCase to kebab-case
      // Handles potential leading uppercase and consecutive uppercase letters (e.g., MyHTMLElement -> my-html-element)
      tagName = `${name ?? camelAndPascalToKebab(tagName)}`;

      try {
        // Check if already defined to prevent errors
        if (customElements.get(tagName)) {
          if (__DEV__) {
            // Don't throw an error, just warn, as it might be intentional in some HMR scenarios
            console.warn(`[VanReactiveElement] Custom element "${tagName}" is already defined.`);
          }
          return classToDefine;
        }

        customElements.define(tagName, classToDefine);
      } catch (error) {
        __DEV__ && console.error(`[VanReactiveElement] Failed to define custom element "${tagName}":`, error);
      }

      return classToDefine;
    }

    // --- Private methods ---

    /** @private */
    _setupProperties(): void {
      if (this._hasSetupProperties) return;

      const ctor = this.constructor as InternalProperties;
      const { properties } = ctor;

      if (!properties) return;

      for (const property in properties) {
        const userOptions = properties[property] || {};
        const defaultValue = userOptions.default;

        if (userOptions.attribute === false) {
          // Simple storage for properties without attributes (non-reactive)
          let propValue = isValueState(defaultValue) ? defaultValue : van.state(defaultValue);

          defineProperty(getPrototypeOf(this), property, {
            get() {
              return propValue;
            }, // Direct reference via closure
            set(newValue) {
              isValueState(newValue) ? (propValue = newValue) : (propValue.val = newValue);
            },
            configurable: true,
            enumerable: true
          });
        } else {
          // Setup attribute mapping
          const attrName = typeof userOptions.attribute === 'string' ? userOptions.attribute : camelAndPascalToKebab(property);
          this._attributeToPropertyMap.set(attrName, property);
          this._propertyToAttributeMap.set(property, attrName);

          // Use van.state for properties with attributes (reactive)
          const propertyState = van.state(defaultValue);

          defineProperty(this, property, {
            get() {
              return propertyState;
            }, // Return the state object itself via closure
            set(newValue) {
              if (propertyState.rawVal === newValue) return;
              propertyState.val = newValue;

              if (userOptions.reflect) {
                const attrName = this._propertyToAttributeMap.get(property);
                if (attrName) {
                  this._reflectingProperty = property;
                  const converter = userOptions.converter || (userOptions.type && converters[userOptions.type.name]) || defaultConverter;

                  const attrValue = converter.toAttribute(newValue);
                  if (attrValue === null) {
                    this.removeAttribute(attrName);
                  } else {
                    this.setAttribute(attrName, attrValue);
                  }
                  this._reflectingProperty = null;
                }
              }
            },
            configurable: true,
            enumerable: true
          });

          // Sync initial attribute value if present
          if (attrName && this.hasAttribute(attrName)) {
            const attrValue = this.getAttribute(attrName);
            const converter = userOptions.converter || (userOptions.type && converters[userOptions.type.name]) || defaultConverter;
            // Set via property descriptor which will update the state
            (this as InternalProperties)[property] = converter.fromAttribute(attrValue);
          }
        }
      }

      this._hasSetupProperties = true;
    }

    /** @private */
    _setupStyles(): void {
      if (!this.renderRoot) return;

      const ctor = this.constructor as InternalProperties;
      const styles = ctor.styles;

      if (!styles) return;

      // Check if styles are already applied
      if (this.renderRoot instanceof ShadowRoot) {
        // For adopted stylesheets
        if (styles instanceof CSSStyleSheet) {
          const adoptedSheets = this.renderRoot.adoptedStyleSheets || [];
          if (!adoptedSheets.includes(styles)) {
            this.renderRoot.adoptedStyleSheets = [...adoptedSheets, styles];
          }
          return;
        }
      }

      // For string styles, check if already exists
      if (!this.renderRoot.querySelector('style[vre\\:style]')) {
        if (typeof styles === 'string') {
          const styleEl = document.createElement('style');
          styleEl.setAttribute('vre:style', ''); // Mark the style tag
          styleEl.textContent = styles;
          this.renderRoot.prepend(styleEl); // Prepend styles
        }
      }
    }
  }

  return {
    VanReactiveElement: VanReactiveElementClass as VanReactiveElementConstructor,
    css,
    /**
     * Defines a custom element with consolidated options.
     * @param customElementName - The custom element name (e.g., 'my-component')
     * @param options - Configuration object with attributes, properties, shadowRootOptions, and styles
     * @param setup - Setup function called once per element instance that returns the render function
     */
    define: <A extends PropertyDefinitions, S extends StateDefinitions>(
      customElementName: string,
      options: DefineOptions<A, S>,
      setup: (props: SplitPropertiesWithSetter<A, S>, context: SetupContext) => (() => unknown) | void
    ) => {
      const { attributes = {} as A, properties = {} as S, shadowRootOptions, styles } = options;
      // Merge properties, marking internal properties with attribute: false
      // Attributes are already PropertyOptions, properties need formatting

      class FunctionalElement extends VanReactiveElementClass {
        static properties = {
          ...attributes,
          ...fromEntries(entries(properties).map(([key, value]) => [key, { default: value, attribute: false }]))
        };

        static get shadowRootOptions(): ShadowRootInit {
          return shadowRootOptions || super.shadowRootOptions;
        }

        static get styles() {
          return styles || super.styles;
        }

        constructor() {
          super();

          // Create setter proxy object
          const setter = new Proxy({} as SplitPropertySetter<any, any>, {
            get: (_, key: string) => {
              // Return undefined for non-existent properties
              const properties = (this.constructor as VanReactiveElementConstructor).properties;
              if (!(key in properties)) return undefined;

              // Return current value for getter
              return (this as InternalProperties)[key]?.val;
            },
            set: (_, key: string, value: any) => {
              const properties = (this.constructor as VanReactiveElementConstructor).properties;
              if (key in properties) {
                (this as InternalProperties)[key] = value;
                return true;
              }
              return false;
            },
            has: (_, key: string) => {
              return key in (this.constructor as VanReactiveElementConstructor).properties;
            }
          });

          // Gather props with setter interface
          const props = new Proxy({ set: setter } as SplitPropertiesWithSetter<any, any>, {
            get: (target, key: string) => {
              if (key === 'set') return target.set;
              return (this as InternalProperties)[key];
            },
            set: (_, key: string, value: any) => {
              if (key === 'set') return false; // set is read-only
              const properties = (this.constructor as VanReactiveElementConstructor).properties;
              if (key in properties) {
                (this as InternalProperties)[key] = value;
                return true;
              }
              return false;
            },
            has: (_, key: string) => {
              if (key === 'set') return true;
              return key in (this.constructor as VanReactiveElementConstructor).properties;
            }
          }) as SplitPropertiesWithSetter<A, S>;

          this.registerDisposer(
            rxScope(() => {
              // Provide context helpers and store the render function
              this.render = setup(props, {
                element: this as VanReactiveElement,
                noShadowDOM: () => {
                  if (!this.renderRoot) {
                    return (this.createRenderRoot = () => this);
                  }
                  if (__DEV__) {
                    console.warn('noShadowDOM() called after renderRoot was created. It will be ignored.');
                  }
                },
                onCleanup: (fn: () => void) => {
                  this.onCleanup = fn;
                },
                onMount: (fn: () => void) => {
                  this.onMount = fn;
                }
              }) as (() => unknown) | undefined;
            })
          );
        }
      }

      return FunctionalElement.define(customElementName) as VanReactiveElementConstructor;
    }
  };
};

export default vanRE;

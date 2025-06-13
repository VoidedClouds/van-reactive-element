import type { State, Van } from 'vanjs-core';
import { camelAndPascalToKebab, converters, defaultConverter, type AttributeConverter } from './property-utils';
import { css } from './syntax-utils';

// Re-export AttributeConverter for external use
export type { AttributeConverter } from './property-utils';
export type { State } from 'vanjs-core';

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
 * 2. Functional Components:
 * ```typescript
 * define('my-component', {
 *   name: 'John',                            // State<string>
 *   data: { attribute: false, default: {} }  // State<{}>
 * }, (props) => {
 *   const typed: string = props.name.val;    // Access State value
 *   const plain: {} = props.data.val;        // All props are States
 * })
 * ```
 *
 * 3. Direct State assignment:
 * ```typescript
 * class MyElement extends VanReactiveElement {
 *   static properties = { count: 0 };
 *
 *   increment() {
 *     this.count = van.state(100);  // Can assign State directly
 *     this.count = 50;              // Or plain values
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
 * define('my-component', { count: 0 }, (props, ctx) => {
 *   ctx.setStyles(`
 *     :host { display: block; }
 *     button { padding: 8px; }
 *   `);
 *
 *   ctx.render(() =>
 *     button({ onclick: () => props.count++ },
 *       'Count: ', props.count
 *     )
 *   );
 *
 *   ctx.onMount(() => console.log('Component mounted'));
 *   ctx.onCleanup(() => console.log('Component cleanup'));
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
  /** Set the render function for the component */
  render: (fn: () => unknown) => void;
  /** Set component styles (scoped to shadow DOM) */
  setStyles: (styles: string | CSSStyleSheet) => void;
}

/**
 * Property definitions for components.
 * Can use simple values as defaults or full PropertyOptions for more control.
 *
 * @example
 * {
 *   // Simple defaults (will have attributes)
 *   name: 'John',
 *   count: 0,
 *
 *   // Full configuration
 *   active: { type: Boolean, reflect: true },
 *   data: { attribute: false, default: { foo: 'bar' } } // No attribute
 * }
 */
export type PropertyDefinitions<T = Record<string, unknown>> = {
  [K in keyof T]: T[K] | PropertyOptions<T[K]>;
};

export type DefineFunction = <T extends PropertyDefinitions>(
  customElementName: string,
  properties?: T,
  setup?: (props: InferredProperties<T>, context: SetupContext) => void
) => VanReactiveElementClass;

export interface VanRE {
  VanReactiveElement: VanReactiveElementClass;
  css: (template: TemplateStringsArray, ...values: any[]) => string;
  define: DefineFunction;
}

// Export the main VanReactiveElement class interface
/**
 * Class constructor interface for VanReactiveElement
 */
export interface VanReactiveElementClass<T extends VanReactiveElement = VanReactiveElement> {
  new (): T;
  readonly properties: Record<string, PropertyOptions>;
  readonly shadowRootOptions: ShadowRootInit;
  readonly styles: string | CSSStyleSheet | null;
  define(elementClass?: any, name?: string): any;
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
 * Infers the runtime type of a property from its definition.
 * All properties are wrapped in State<T> for consistent reactivity
 * Priority: explicit type in PropertyOptions<T> > default value > type property > fallback
 */
export type InferredPropertyType<T> = T extends { default: infer D }
  ? State<D>
  : T extends { type: infer Type }
    ? State<InferFromType<Type>>
    : T extends PropertyOptions<infer U>
      ? State<U>
      : State<T>;

/**
 * Infers the runtime props type from property definitions.
 * All properties become State<T> for consistent reactivity
 *
 * @example
 * const props = {
 *   name: 'World',                           // → State<string> (from value)
 *   count: { type: Number, default: 0 },     // → State<number> (from default)
 *   active: { type: Boolean },               // → State<boolean> (from type)
 *   data: { attribute: false, default: {} }  // → State<{}> (from default)
 *   items: { type: Array } as const         // → State<unknown[]> (from type)
 * };
 *
 * type Props = InferredProperties<typeof props>;
 * // Props = { 
 * //   name: State<string>, 
 * //   count: State<number>, 
 * //   active: State<boolean>, 
 * //   data: State<{}>,
 * //   items: State<unknown[]>
 * // }
 */
export type InferredProperties<T> = {
  [K in keyof T]: InferredPropertyType<T[K]>;
};

export interface VanReactiveElement extends HTMLElement {
  readonly renderRoot: ShadowRoot | HTMLElement | null;
  createRenderRoot(): ShadowRoot | HTMLElement;
  onCleanup?(): void;
  onMount?(): void;
  render?(): unknown;
  registerDisposer(disposer: () => void): () => void;
  hasShadowDOM(): boolean;
  query<E extends Element = Element>(selector: string): E | null;
  queryAll<E extends Element = Element>(selector: string): NodeListOf<E>;
  dispatchCustomEvent<T = any>(typeName: string, options?: CustomEventInit<T>): boolean;
}

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
  class VanReactiveElementImpl extends HTMLElement {
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

      const ctor = this.constructor as typeof VanReactiveElementImpl;
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
            // Render the component's template
            if (this.renderRoot && this.render) {
              van.add(this.renderRoot as Element, this.render() as Parameters<Van['add']>[1]);
            }

            this._isSetupComplete = true;

            // Call onMount after the initial setup DOM is rendered
            requestAnimationFrame(() => {
              this._isSetupComplete && this.onMount?.();
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
     * Creates the root node where the component's template will be rendered.
     * By default, creates and returns an open shadow root.
     * Override to customize shadow root options or render to light DOM (by returning `this`).
     * @returns {ShadowRoot | HTMLElement} The node to render into.
     * @protected
     */
    createRenderRoot(): ShadowRoot | HTMLElement {
      return this.shadowRoot ?? this.attachShadow((this.constructor as typeof VanReactiveElementImpl).shadowRootOptions);
    }

    /**
     * Called after the component's disconnected.
     * @protected
     */
    onCleanup(): void {
      // No-op. Override in subclasses.
    }

    /**
     * Called after the component's initial setup and DOM creation.
     * @protected
     */
    onMount(): void {
      // No-op. Override in subclasses.
    }

    /**
     * Defines the component's template. Override in subclasses to provide the UI structure.
     *
     * @returns {unknown} The template to render. This can be any valid VanJS content.
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
    render?(): unknown;

    // --- Automatic Cleanup ---

    /**
     * Registers a cleanup function for automatic cleanup when the component is disconnected.
     * This method adds the given function to the component's cleanup routine.
     *
     * @param {Function} disposer - A function to call when the component is disconnected.
     * @returns {Function} The disposer that was passed in, for chaining.
     * @protected
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
     * @param {typeof VanReactiveElement} [elementClass] Optional class to define as a custom element.
     * @param {string} [name] Optional name of the custom element.
     * @returns {VanReactiveElement} The class itself for chaining.
     */
    static define(elementClass?: any, name?: string): any {
      const classToDefine = elementClass ?? this;
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
            get: () => propValue, // Direct reference via closure
            set: (newValue) => (isValueState(newValue) ? (propValue = newValue) : (propValue.val = newValue)),
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
            get: () => propertyState, // Return the state object itself via closure
            set: (newValue) => {
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
      if (!this.renderRoot.querySelector("style[data-managed-by='vre']")) {
        if (typeof styles === 'string') {
          const styleEl = document.createElement('style');
          styleEl.setAttribute('data-managed-by', 'vre'); // Mark the style tag
          styleEl.textContent = styles;
          this.renderRoot.prepend(styleEl); // Prepend styles
        }
      }
    }
  }

  return {
    VanReactiveElement: VanReactiveElementImpl as VanReactiveElementClass,
    css,
    /**
     * Defines a custom element using a functional setup, similar to solid-element's customElement.
     * @param {string} customElementName - The custom element name (e.g., 'my-component').
     * @param {object} properties - Property definitions (name: defaultValue or {type, default}).
     * @param {function} setup - Function(props, context) called once per element instance.
     */
    define: <T extends PropertyDefinitions>(
      customElementName: string,
      properties: T = {} as T,
      setup?: (props: InferredProperties<T>, context: SetupContext) => void
    ) => {
      class FunctionalElement extends VanReactiveElementImpl {
        static properties = fromEntries(
          entries(properties).map(([key, val]) => {
            if (
              typeof val === 'object' &&
              val !== null &&
              ('default' in val || 'type' in val || 'attribute' in val || 'converter' in val || 'reflect' in val)
            ) {
              return [key, val as PropertyOptions];
            }
            // Simple value is the default
            return [key, { default: val } as PropertyOptions];
          })
        );

        static _dynamicStyles: string | CSSStyleSheet | null = null; // Store dynamic styles

        static get styles() {
          return this._dynamicStyles || super.styles;
        }

        constructor() {
          super();

          // Gather props
          const props = new Proxy({} as InferredProperties<T>, {
            get: (_, key: string) => (this as InternalProperties)[key],
            has: (_, key: string) => key in (this.constructor as typeof VanReactiveElementImpl).properties
          }) as InferredProperties<T>;

          this.registerDisposer(
            rxScope(() =>
              // Provide context helpers
              setup?.(props, {
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
                },
                render: (fn: () => any) => {
                  this.render = fn;
                },
                setStyles: (styles: string | CSSStyleSheet) => {
                  // Set styles on the constructor (class)
                  defineProperty(this.constructor as typeof FunctionalElement, '_dynamicStyles', {
                    configurable: true,
                    enumerable: false,
                    value: styles,
                    writable: true
                  });
                }
              })
            )
          );
        }
      }

      FunctionalElement.define(FunctionalElement, customElementName);
      return FunctionalElement as VanReactiveElementClass;
    }
  };
};

export default vanRE;

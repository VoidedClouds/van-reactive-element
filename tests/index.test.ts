import { describe, it, expect, vi, beforeEach, afterEach, promisedTimeout } from './utils';
import vanRE from '../src/index';

// Mock dependencies
const mockCss = vi.fn((...args: [TemplateStringsArray, ...any[]]) => {
  return args[0].reduce((result, str, i) => result + str + (args[i + 1] || ''), '');
});

const mockRxScope = vi.fn((fn: () => void | (() => void)) => {
  const cleanup = fn();
  return cleanup || (() => {});
});

const mockVan = {
  add: vi.fn(),
  state: vi.fn((initialValue) => {
    let value = initialValue;
    return {
      get val() {
        return value;
      },
      set val(newValue) {
        value = newValue;
      }
    };
  })
};

// Helper to create a test element class that is properly registered
function createTestElement(VanReactiveElement: any, properties: any = {}) {
  class TestElement extends VanReactiveElement {
    static properties = properties;
  }

  // Register the element to avoid "Invalid constructor" errors in JSDOM
  const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
  customElements.define(customElementName, TestElement);

  return { TestElement, customElementName };
}

describe('vanRE', () => {
  let VanReactiveElement: any;
  let define: any;

  beforeEach(() => {
    const result = vanRE({
      rxScope: mockRxScope,
      van: mockVan as any
    });
    VanReactiveElement = result.VanReactiveElement;
    define = result.define;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('VanReactiveElement', () => {
    it('should create a class that extends HTMLElement', () => {
      expect(VanReactiveElement.prototype).toBeInstanceOf(HTMLElement);
    });

    describe('properties', () => {
      it('should have default empty properties', () => {
        expect(VanReactiveElement.properties).toEqual({});
      });

      it('should setup properties with default values', () => {
        const { TestElement } = createTestElement(VanReactiveElement, {
          count: { type: Number, default: 0 },
          name: { default: 'test' }
        });

        const element = new TestElement();
        element._setupProperties();

        expect(element.count.val).toBe(0);
        expect(element.name.val).toBe('test');
      });
    });

    describe('shadowRootOptions', () => {
      it('should have default open shadow root', () => {
        expect(VanReactiveElement.shadowRootOptions).toEqual({ mode: 'open' });
      });
    });

    describe('styles', () => {
      it('should have null styles by default', () => {
        expect(VanReactiveElement.styles).toBe(null);
      });

      it('should apply styles to shadow root', () => {
        const { TestElement } = createTestElement(VanReactiveElement);

        // Override styles on the class
        Object.defineProperty(TestElement, 'styles', {
          get() {
            return '.test { color: red; }';
          },
          configurable: true
        });

        const element = new TestElement();
        element.connectedCallback();

        const styleEl = element.renderRoot?.querySelector('style[vre\\:style]');
        expect(styleEl).toBeTruthy();
        expect(styleEl?.textContent).toBe('.test { color: red; }');
      });

      it('should support adopted stylesheets', () => {
        const { TestElement } = createTestElement(VanReactiveElement);

        // Mock CSSStyleSheet for JSDOM
        const stylesheet = {
          replaceSync: vi.fn(),
          [Symbol.toStringTag]: 'CSSStyleSheet'
        };
        // Make it instanceof CSSStyleSheet
        Object.setPrototypeOf(stylesheet, CSSStyleSheet.prototype);

        // Override styles on the class
        Object.defineProperty(TestElement, 'styles', {
          get() {
            return stylesheet;
          },
          configurable: true
        });

        const element = new TestElement();

        // Mock shadow root with adoptedStyleSheets support
        let shadowRoot: any;
        vi.spyOn(element, 'createRenderRoot').mockImplementation(() => {
          shadowRoot = element.attachShadow({ mode: 'open' });
          shadowRoot.adoptedStyleSheets = [];
          return shadowRoot;
        });

        element.connectedCallback();

        // Check that adopted stylesheets were applied
        expect(shadowRoot.adoptedStyleSheets).toContain(stylesheet);
        expect(shadowRoot.adoptedStyleSheets.length).toBe(1);
      });

      it('should not duplicate adopted stylesheets on reconnection', () => {
        const { TestElement } = createTestElement(VanReactiveElement);

        // Mock CSSStyleSheet for JSDOM
        const stylesheet = {
          replaceSync: vi.fn(),
          [Symbol.toStringTag]: 'CSSStyleSheet'
        };
        // Make it instanceof CSSStyleSheet
        Object.setPrototypeOf(stylesheet, CSSStyleSheet.prototype);

        // Override styles on the class
        Object.defineProperty(TestElement, 'styles', {
          get() {
            return stylesheet;
          },
          configurable: true
        });

        const element = new TestElement();

        // Mock shadow root with adoptedStyleSheets support
        let shadowRoot: any;
        vi.spyOn(element, 'createRenderRoot').mockImplementation(() => {
          shadowRoot = element.attachShadow({ mode: 'open' });
          shadowRoot.adoptedStyleSheets = [];
          return shadowRoot;
        });

        element.connectedCallback();

        // Simulate reconnection
        element._setupStyles();
        element._setupStyles();

        // Should still only have one stylesheet
        expect(shadowRoot.adoptedStyleSheets.length).toBe(1);
      });
    });

    describe('lifecycle methods', () => {
      it('should call render when connected', () => {
        const renderFn = vi.fn(() => 'test content');
        const { TestElement } = createTestElement(VanReactiveElement);

        TestElement.prototype.render = renderFn;

        const element = new TestElement();
        element.connectedCallback();

        expect(mockRxScope).toHaveBeenCalled();
        expect(mockVan.add).toHaveBeenCalledWith(element.renderRoot, 'test content');
      });

      it('should call onMount after initial render', async () => {
        const onMountFn = vi.fn();
        const { TestElement } = createTestElement(VanReactiveElement);

        TestElement.prototype.onMount = function () {
          onMountFn();
        };

        // Add a render method so connectedCallback doesn't throw
        TestElement.prototype.render = function () {
          return () => 'test';
        };

        const element = new TestElement();

        // Simulate proper connection to DOM
        document.body.appendChild(element);

        // Wait for requestAnimationFrame
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Clean up
        document.body.removeChild(element);

        expect(onMountFn).toHaveBeenCalled();
      });

      it('should clean up disposers on disconnect', async () => {
        const disposer = vi.fn();
        const { TestElement } = createTestElement(VanReactiveElement);

        const element = new TestElement();
        element.registerDisposer(disposer);
        await element.disconnectedCallback();

        expect(disposer).toHaveBeenCalled();
        expect(element._disposers.size).toBe(0);
      });

      it('should call onCleanup on disconnect', async () => {
        const onCleanupFn = vi.fn();
        const { TestElement } = createTestElement(VanReactiveElement);

        TestElement.prototype.onCleanup = function () {
          onCleanupFn();
        };

        const element = new TestElement();
        await element.disconnectedCallback();

        expect(onCleanupFn).toHaveBeenCalled();
      });
    });

    describe('registerDisposer', () => {
      it('should register function disposers', () => {
        const { TestElement } = createTestElement(VanReactiveElement);
        const element = new TestElement();
        const disposer = vi.fn();

        const result = element.registerDisposer(disposer);

        expect(result).toBe(disposer);
        expect(element._disposers.has(disposer)).toBe(true);
      });

      it('should ignore non-function disposers', () => {
        const { TestElement } = createTestElement(VanReactiveElement);
        const element = new TestElement();
        const invalidDisposer = { dispose: vi.fn() };

        element.registerDisposer(invalidDisposer as any);

        expect(element._disposers.has(invalidDisposer)).toBe(false);
      });
    });

    describe('query methods', () => {
      it('should find element by data-element-id', () => {
        const { TestElement } = createTestElement(VanReactiveElement);
        const element = new TestElement();

        // Initialize renderRoot and add test element
        element.renderRoot = element.attachShadow({ mode: 'open' });
        const testEl = document.createElement('div');
        testEl.setAttribute('data-element-id', 'test-id');
        element.renderRoot.appendChild(testEl);

        const found = element.query('[data-element-id="test-id"]');

        expect(found).toBeTruthy();
        expect(found?.getAttribute('data-element-id')).toBe('test-id');
      });

      it('should query single element', () => {
        const { TestElement } = createTestElement(VanReactiveElement);
        const element = new TestElement();

        // Initialize renderRoot and add test element
        element.renderRoot = element.attachShadow({ mode: 'open' });
        const testEl = document.createElement('div');
        testEl.className = 'test';
        element.renderRoot.appendChild(testEl);

        const found = element.query('.test');

        expect(found).toBeTruthy();
      });

      it('should query all elements', () => {
        const { TestElement } = createTestElement(VanReactiveElement);
        const element = new TestElement();

        // Initialize renderRoot and add test element
        element.renderRoot = element.attachShadow({ mode: 'open' });
        const testEl = document.createElement('div');
        testEl.className = 'test';
        element.renderRoot.appendChild(testEl);

        const found = element.queryAll('.test');

        expect(found.length).toBe(1);
      });
    });

    describe('dispatchCustomEvent', () => {
      it('should dispatch custom events with default options', () => {
        const { TestElement } = createTestElement(VanReactiveElement);
        const element = new TestElement();
        document.body.appendChild(element); // Connect to initialize renderRoot
        const dispatchEventSpy = vi.spyOn(element, 'dispatchEvent');

        element.dispatchCustomEvent('test-event', { detail: { value: 123 } });

        expect(dispatchEventSpy).toHaveBeenCalled();
        const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
        expect(event.type).toBe('test-event');
        expect(event.detail).toEqual({ value: 123 });
        expect(event.bubbles).toBe(false);
        expect(event.composed).toBe(true); // true for shadow DOM
        expect(event.cancelable).toBe(false);

        element.remove(); // Clean up
      });
    });

    describe('define', () => {
      it('should define custom element with user-provided name', () => {
        const defineSpy = vi.spyOn(customElements, 'define').mockImplementation(() => {});

        class MyButton extends VanReactiveElement {}
        MyButton.define('my-button');

        expect(defineSpy).toHaveBeenCalledWith('my-button', MyButton);

        defineSpy.mockRestore();
      });

      it('should handle custom names', () => {
        const defineSpy = vi.spyOn(customElements, 'define').mockImplementation(() => {});

        class TestElement extends VanReactiveElement {}
        TestElement.define('custom-name');

        expect(defineSpy).toHaveBeenCalledWith('custom-name', TestElement);

        defineSpy.mockRestore();
      });

      it('should handle already defined elements', () => {
        const getSpy = vi.spyOn(customElements, 'get').mockReturnValue(VanReactiveElement as any);
        const defineSpy = vi.spyOn(customElements, 'define').mockImplementation(() => {});

        class TestElement extends VanReactiveElement {}
        const result = TestElement.define();

        expect(result).toBe(TestElement);
        expect(defineSpy).not.toHaveBeenCalled();

        getSpy.mockRestore();
        defineSpy.mockRestore();
      });
    });
  });

  describe('setProperties', () => {
    it('should properly set properties', () => {
      let propValues = { prop1: 'prop1 value start', prop2: 'prop2 value start' };

      class TestElement extends VanReactiveElement {
        static properties = {
          prop1: { default: propValues.prop1, reflect: true },
          prop2: { attribute: false, default: propValues.prop2 }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();

      expect(element.prop1.val).toBe(propValues.prop1);
      expect(element.prop2.val).toBe(propValues.prop2);

      propValues = { prop1: 'prop1 value updated', prop2: 'prop2 value updated' };

      element.setProperties(propValues);

      expect(element.prop1.val).toBe(propValues.prop1);
      expect(element.prop2.val).toBe(propValues.prop2);

      expect(element.getAttribute('prop1')).toBe(propValues.prop1);
      // prop2 is not a reflected attribute, should be null
      expect(element.getAttribute('prop2')).toBe(null);
    });
  });

  describe('setProperty', () => {
    it('should properly set properties', () => {
      let propValues = { prop1: 'prop1 value start', prop2: 'prop2 value start' };

      class TestElement extends VanReactiveElement {
        static properties = {
          prop1: { default: propValues.prop1, reflect: true },
          prop2: { attribute: false, default: propValues.prop2 }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();

      expect(element.prop1.val).toBe(propValues.prop1);
      expect(element.prop2.val).toBe(propValues.prop2);

      propValues = { prop1: 'prop1 value updated', prop2: 'prop2 value updated' };

      element.setProperty('prop1', propValues.prop1);
      element.setProperty('prop2', propValues.prop2);

      expect(element.prop1.val).toBe(propValues.prop1);
      expect(element.prop2.val).toBe(propValues.prop2);

      expect(element.getAttribute('prop1')).toBe(propValues.prop1);
      // prop2 is not a reflected attribute, should be null
      expect(element.getAttribute('prop2')).toBe(null);
    });
  });

  describe('define function', () => {
    it('should create functional components', () => {
      const setupFn = vi.fn();
      const defineSpy = vi.spyOn(customElements, 'define').mockImplementation(() => {});

      const ElementClass = define(
        'my-component',
        {
          attributes: {
            name: { type: String, default: 'test' }
          },
          properties: {
            count: 0
          }
        },
        setupFn
      );

      expect(defineSpy).toHaveBeenCalledWith('my-component', ElementClass);
      expect(ElementClass.properties).toEqual({
        name: { type: String, default: 'test' },
        count: { default: 0, attribute: false }
      });

      defineSpy.mockRestore();
    });

    it('should call setup function with props and context', () => {
      const renderFn = vi.fn(() => 'test content');
      const setupFn = vi.fn(() => renderFn);
      const defineSpy = vi.spyOn(customElements, 'define').mockImplementation(() => {});

      const ElementClass = define(
        'test-component',
        {
          properties: {
            value: 42
          }
        },
        setupFn
      );

      defineSpy.mockRestore();

      // Register the element class to avoid constructor errors
      const customElementName = `test-func-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, ElementClass);
      const element = new ElementClass();

      expect(mockRxScope).toHaveBeenCalled();
      expect(setupFn).toHaveBeenCalled();

      const callArgs = setupFn.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs.length).toBeGreaterThanOrEqual(2);

      const [elementArg, context] = callArgs as unknown as [any, any];
      expect(elementArg).toHaveProperty('value');
      expect(elementArg).toHaveProperty('setProperty');
      expect(elementArg).toHaveProperty('setProperties');
      expect(context).toHaveProperty('noShadowDOM');
      expect(context).toHaveProperty('onCleanup');
      expect(context).toHaveProperty('onMount');
      expect(context).not.toHaveProperty('render');
      expect(context).not.toHaveProperty('setStyles');

      // Verify render function was stored
      expect(element.render).toBe(renderFn);
    });

    it('should allow setting styles in options', () => {
      const setupFn = vi.fn();
      const defineSpy = vi.spyOn(customElements, 'define').mockImplementation(() => {});

      const ElementClass = define(
        'styled-component',
        {
          styles: '.dynamic { color: blue; }'
        },
        setupFn
      );

      defineSpy.mockRestore();

      expect(ElementClass.styles).toBe('.dynamic { color: blue; }');
    });

    it('should allow setting adopted stylesheets in options', () => {
      const setupFn = vi.fn();

      // Mock CSSStyleSheet for JSDOM
      const stylesheet = {
        replaceSync: vi.fn(),
        [Symbol.toStringTag]: 'CSSStyleSheet'
      };
      // Make it instanceof CSSStyleSheet
      Object.setPrototypeOf(stylesheet, CSSStyleSheet.prototype);

      const defineSpy = vi.spyOn(customElements, 'define').mockImplementation(() => {});
      const ElementClass = define(
        'adopted-component',
        {
          styles: stylesheet
        },
        setupFn
      );
      defineSpy.mockRestore();

      expect(ElementClass.styles).toBe(stylesheet);
    });

    it('should handle noShadowDOM option', () => {
      let noShadowDOMFn: any;
      const setupFn = vi.fn((element, context) => {
        noShadowDOMFn = context.noShadowDOM;
      });

      const defineSpy = vi.spyOn(customElements, 'define').mockImplementation(() => {});
      const ElementClass = define('no-shadow-component', {}, setupFn);
      defineSpy.mockRestore();

      // Register the element class to avoid constructor errors
      const customElementName = `test-func-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, ElementClass);
      const element = new ElementClass();

      noShadowDOMFn();

      expect(element.createRenderRoot()).toBe(element);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors when disposing effects', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { TestElement } = createTestElement(VanReactiveElement);
      const element = new TestElement();

      const errorDisposer = vi.fn(() => {
        throw new Error('Disposal error');
      });

      element.registerDisposer(errorDisposer);

      await element.disconnectedCallback();
      await promisedTimeout();

      expect(errorDisposer).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error disposing effect:', expect.any(Error));
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors in user-defined onCleanup', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      class TestElement extends VanReactiveElement {
        onCleanup() {
          throw new Error('Cleanup error');
        }
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement as any);

      const element = new TestElement();
      await element.disconnectedCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error running user-defined cleanup:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it('should handle missing tag name in define method', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      class UnnamedClass extends VanReactiveElement {}
      // Call define with no name and no class name (simulate missing tag name)
      Object.defineProperty(UnnamedClass, 'name', { value: '' });
      const result = UnnamedClass.define();
      expect(result).toBe(UnnamedClass);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[VanReactiveElement] Cannot define custom element: Tag name is missing or invalid.',
        UnnamedClass
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle custom element definition errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const defineSpy = vi.spyOn(customElements, 'define').mockImplementation(() => {
        throw new Error('Definition failed');
      });
      class TestElement extends VanReactiveElement {}
      const result = TestElement.define('test-element');
      expect(result).toBe(TestElement);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[VanReactiveElement] Failed to define custom element "test-element":',
        expect.any(Error)
      );
      defineSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle define() by using "this" as the class and using the class name', () => {
      class TestElement extends VanReactiveElement {}
      const result = TestElement.define();
      expect(result).toBe(TestElement);
      expect(customElements.get('test-element')).toBe(TestElement);
    });

    it('should handle define("custom-name") by using "this" with custom name', () => {
      class TestElement extends VanReactiveElement {}
      const customElementName = `custom-undefined-${Math.random().toString(36).substr(2, 9)}`;
      const result = TestElement.define(customElementName);
      expect(result).toBe(TestElement);
      expect(customElements.get(customElementName)).toBe(TestElement);
    });
  });

  describe('Edge Cases', () => {
    it('should warn when noShadowDOM is called after renderRoot is created', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const defineSpy = vi.spyOn(customElements, 'define').mockImplementation(() => {});

      let noShadowDOMFn: any;
      const setupFn = vi.fn((element, context) => {
        noShadowDOMFn = context.noShadowDOM;
      });

      const ElementClass = define('test-component', {}, setupFn);
      defineSpy.mockRestore();

      const customElementName = `test-func-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, ElementClass);
      const element = new ElementClass();

      element.renderRoot = element.attachShadow({ mode: 'open' });
      noShadowDOMFn();

      expect(consoleWarnSpy).toHaveBeenCalledWith('noShadowDOM() called after renderRoot was created. It will be ignored.');
      consoleWarnSpy.mockRestore();
    });

    it('should handle _setupStyles when renderRoot is null', () => {
      class TestElement extends VanReactiveElement {
        static get styles() {
          return 'body { color: red; }';
        }
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupStyles();
      expect(element.renderRoot).toBe(null);
    });

    it('should handle adoptedStyleSheets when undefined', () => {
      class TestElement extends VanReactiveElement {
        static get styles() {
          const sheet = {
            [Symbol.toStringTag]: 'CSSStyleSheet'
          };
          Object.setPrototypeOf(sheet, CSSStyleSheet.prototype);
          return sheet;
        }
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();

      const mockShadowRoot = {
        querySelector: vi.fn(() => null),
        adoptedStyleSheets: undefined
      };
      Object.setPrototypeOf(mockShadowRoot, ShadowRoot.prototype);
      element.renderRoot = mockShadowRoot as any;

      element._setupStyles();
      expect(mockShadowRoot.adoptedStyleSheets).toEqual([TestElement.styles]);
    });

    it('should handle query methods when renderRoot is null', () => {
      const { TestElement } = createTestElement(VanReactiveElement);
      const element = new TestElement();

      expect(element.query('[data-element-id="test"]')).toBe(null);
      expect(element.query('.test')).toBe(null);

      const allElements = element.queryAll('.test');
      expect(allElements).toBeDefined();
      expect(allElements.length).toBe(0);
    });

    it('should handle elements with no properties', () => {
      class NoPropsElement extends VanReactiveElement {}

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, NoPropsElement);

      const element = new NoPropsElement();
      element._setupProperties();
      expect(element._hasSetupProperties).toBe(true);
    });

    it('should handle null property definitions', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          prop1: null,
          prop2: undefined,
          prop3: { default: 'value' }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      expect(element.prop1.val).toBe(undefined);
      expect(element.prop2.val).toBe(undefined);
      expect(element.prop3.val).toBe('value');
    });

    it('should handle falsy properties object', () => {
      class NullPropsElement extends VanReactiveElement {
        static properties = null;
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, NullPropsElement);

      const element = new NullPropsElement();
      element._setupProperties();
      expect(element._hasSetupProperties).toBe(false);
    });
  });

  describe('Attribute Sync Edge Cases', () => {
    it('should handle properties with attribute: false in attributeChangedCallback', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          regularProp: {
            default: 'initial',
            attribute: false
          }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      element._attributeToPropertyMap.set('fake-attr', 'regularProp');
      element.attributeChangedCallback('fake-attr', null, 'new-value');

      expect(element.regularProp.val).toBe('new-value');
    });

    it('should handle property with attribute: false correctly', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          internalProp: {
            default: 'initial',
            attribute: false
          }
        };
      }

      const customElementName = `internal-prop-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      // All properties are reactive States, even with attribute: false
      expect(element.internalProp.val).toBe('initial');

      element.internalProp = 'initial';
      expect(element.internalProp.val).toBe('initial');

      element.internalProp = 'changed';
      expect(element.internalProp.val).toBe('changed');
    });

    it('should handle attribute sync when property is set via setter', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          syncProp: {
            default: 'initial',
            type: String
          }
        };
      }

      const customElementName = `sync-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = document.createElement(customElementName) as any;
      element.setAttribute('sync-prop', 'from-attribute');
      element._setupProperties();

      expect(element.syncProp.val).toBe('from-attribute');
    });
  });
});

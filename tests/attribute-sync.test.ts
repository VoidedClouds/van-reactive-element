import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import vanRE from '../src/index';

// Mock dependencies
const mockCss = vi.fn((...args: [TemplateStringsArray, ...any[]]) => {
  return args[0].reduce((result, str, i) => result + str + (args[i + 1] || ''), '');
});

const mockEfSc = vi.fn((fn: () => void | (() => void)) => {
  const cleanup = fn();
  return cleanup || (() => {});
});

const mockHtml = vi.fn();

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

describe('Attribute Sync Tests', () => {
  let VanReactiveElement: any;
  let define: any;

  beforeEach(() => {
    const result = vanRE({
      css: mockCss,
      efSc: mockEfSc,
      html: mockHtml,
      van: mockVan
    });
    VanReactiveElement = result.VanReactiveElement;
    define = result.define;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('observedAttributes', () => {
    it('should return attribute names for properties with attribute enabled', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: { default: 'test' },
          camelCaseProp: { default: 123 },
          noAttr: { default: 'hidden', attribute: false }
        };
      }

      expect(TestElement.observedAttributes).toEqual(['my-prop', 'camel-case-prop']);
    });

    it('should use custom attribute names when specified', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: { default: 'test', attribute: 'custom-name' },
          otherProp: { default: 123, attribute: 'another-name' }
        };
      }

      expect(TestElement.observedAttributes).toEqual(['custom-name', 'another-name']);
    });

    it('should handle properties with type converters', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          count: { type: Number, default: 0 },
          isActive: { type: Boolean, default: false },
          data: { type: Object, default: null }
        };
      }

      expect(TestElement.observedAttributes).toEqual(['count', 'is-active', 'data']);
    });
  });

  describe('attributeChangedCallback', () => {
    it('should update property when attribute changes', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: { default: 'initial' }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      element.setAttribute('my-prop', 'new value');
      element.attributeChangedCallback('my-prop', 'initial', 'new value');

      expect(element.myProp.val).toBe('new value');
    });

    it('should convert attribute values using type converters', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          count: { type: Number, default: 0 },
          isActive: { type: Boolean, default: false },
          data: { type: Object, default: null }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      // Number conversion
      element.attributeChangedCallback('count', null, '42');
      expect(element.count.val).toBe(42);

      // Boolean conversion
      element.attributeChangedCallback('is-active', null, '');
      expect(element.isActive.val).toBe(true);

      // Object conversion
      element.attributeChangedCallback('data', null, '{"test": true}');
      expect(element.data.val).toEqual({ test: true });
    });

    it('should use custom converter if provided', () => {
      const customConverter = {
        fromAttribute: vi.fn((value: string | null) => (value ? value.toUpperCase() : null)),
        toAttribute: vi.fn((value: any) => (value ? String(value).toLowerCase() : null))
      };

      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: {
            default: 'test',
            converter: customConverter
          }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      element.attributeChangedCallback('my-prop', null, 'hello');
      expect(customConverter.fromAttribute).toHaveBeenCalledWith('hello');
      expect(element.myProp.val).toBe('HELLO');
    });

    it('should not update if old and new values are the same', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: { default: 'test' }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      const setterSpy = vi.fn();
      Object.defineProperty(element, 'myProp', {
        set: setterSpy,
        get: () => 'test'
      });

      element.attributeChangedCallback('my-prop', 'test', 'test');
      expect(setterSpy).not.toHaveBeenCalled();
    });

    it('should handle unknown attributes gracefully', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: { default: 'test' }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      // Should not throw when attribute is not mapped
      expect(() => {
        element.attributeChangedCallback('unknown-attr', null, 'value');
      }).not.toThrow();
    });

    it('should handle missing property definition gracefully', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: { default: 'test' }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      // Manually add a mapping without property definition
      element._attributeToPropertyMap.set('fake-attr', 'fakeProp');

      // Should not throw
      expect(() => {
        element.attributeChangedCallback('fake-attr', null, 'value');
      }).not.toThrow();
    });
  });

  describe('property reflection', () => {
    it('should reflect property changes to attributes when reflect is true', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          reflectedProp: {
            default: 'initial',
            reflect: true
          },
          notReflected: {
            default: 'hidden'
          }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      // Test reflected property
      element.reflectedProp = 'new value';
      expect(element.getAttribute('reflected-prop')).toBe('new value');

      // Test non-reflected property
      element.notReflected = 'changed';
      expect(element.hasAttribute('not-reflected')).toBe(false);
    });

    it('should remove attribute when property is set to null', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: {
            default: 'test',
            reflect: true
          }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      element.myProp = 'value';
      expect(element.hasAttribute('my-prop')).toBe(true);

      element.myProp = null;
      expect(element.hasAttribute('my-prop')).toBe(false);
    });

    it('should use type converters for reflection', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          count: {
            type: Number,
            default: 0,
            reflect: true
          },
          isActive: {
            type: Boolean,
            default: false,
            reflect: true
          }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      // Number reflection
      element.count = 42;
      expect(element.getAttribute('count')).toBe('42');

      // Boolean reflection
      element.isActive = true;
      expect(element.getAttribute('is-active')).toBe('');

      element.isActive = false;
      expect(element.hasAttribute('is-active')).toBe(false);
    });
  });

  describe('initial attribute sync', () => {
    it('should sync initial attribute values to properties', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: { default: 'default' },
          count: { type: Number, default: 0 }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = document.createElement(customElementName) as any;
      element.setAttribute('my-prop', 'from-attribute');
      element.setAttribute('count', '100');

      element._setupProperties();

      expect(element.myProp.val).toBe('from-attribute');
      expect(element.count.val).toBe(100);
    });

    it('should not sync if attribute is false', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          noAttr: {
            default: 'default',
            attribute: false
          }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = document.createElement(customElementName) as any;
      element.setAttribute('no-attr', 'should-not-sync');

      element._setupProperties();

      expect(element.noAttr.val).toBe('default');
    });
  });

  describe('functional components with attributes', () => {
    it('should support attribute configuration in functional components', () => {
      const ElementClass = define(
        'attr-component',
        {
          myProp: {
            default: 'test',
            reflect: true
          },
          count: {
            type: Number,
            default: 0,
            attribute: 'item-count'
          }
        },
        () => {}
      );

      expect(ElementClass.observedAttributes).toContain('my-prop');
      expect(ElementClass.observedAttributes).toContain('item-count');
    });
  });

  describe('edge cases', () => {
    it('should handle properties without default value', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: { reflect: true }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      element.myProp = 'test';
      expect(element.getAttribute('my-prop')).toBe('test');
    });

    it('should not set property if value is unchanged', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: { default: 'test' }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      const element = new TestElement();
      element._setupProperties();

      // Set initial value
      element.myProp = 'test';

      // Track attribute changes
      const setAttributeSpy = vi.spyOn(element, 'setAttribute');
      const removeAttributeSpy = vi.spyOn(element, 'removeAttribute');

      // Setting to same value should not trigger any changes
      element.myProp = 'test';
      expect(setAttributeSpy).not.toHaveBeenCalled();
      expect(removeAttributeSpy).not.toHaveBeenCalled();

      // But we should still be able to set different values
      element.myProp = 'different';
      expect(element.myProp.val).toBe('different');
    });
  });
});

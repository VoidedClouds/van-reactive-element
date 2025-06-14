import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('Attribute Sync Tests', () => {
  let VanReactiveElement: any;
  let define: any;

  beforeEach(() => {
    const result = vanRE({
      rxScope: mockRxScope,
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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
          attributes: {
            myProp: {
              type: String,
              default: 'test',
              reflect: true
            },
            count: {
              type: Number,
              default: 0,
              attribute: 'item-count'
            }
          }
        },
        () => {}
      );

      expect(ElementClass.observedAttributes).toContain('my-prop');
      expect(ElementClass.observedAttributes).toContain('item-count');
    });

    it('should properly reflect properties to attributes in functional components', () => {
      const customElementName = `reflect-component-${Math.random().toString(36).substring(2, 11)}`;
      
      const ElementClass = define(
        customElementName,
        {
          attributes: {
            reflectedString: {
              type: String,
              default: 'initial',
              reflect: true
            },
            reflectedNumber: {
              type: Number,
              default: 0,
              reflect: true
            },
            reflectedBoolean: {
              type: Boolean,
              default: false,
              reflect: true,
              attribute: 'is-enabled'
            },
            notReflected: {
              type: String,
              default: 'hidden',
              reflect: false
            }
          }
        },
        () => {}
      );

      const element = document.createElement(customElementName) as any;
      document.body.appendChild(element);

      // Test string reflection
      element.reflectedString = 'updated value';
      expect(element.getAttribute('reflected-string')).toBe('updated value');

      // Test number reflection
      element.reflectedNumber = 42;
      expect(element.getAttribute('reflected-number')).toBe('42');

      // Test boolean reflection with custom attribute name
      element.reflectedBoolean = true;
      expect(element.getAttribute('is-enabled')).toBe('');
      
      element.reflectedBoolean = false;
      expect(element.hasAttribute('is-enabled')).toBe(false);

      // Test non-reflected property
      element.notReflected = 'changed';
      expect(element.hasAttribute('not-reflected')).toBe(false);

      // Test null value removes attribute
      element.reflectedString = null;
      expect(element.hasAttribute('reflected-string')).toBe(false);

      document.body.removeChild(element);
    });

    it('should sync initial attributes to properties in functional components', () => {
      const customElementName = `sync-component-${Math.random().toString(36).substring(2, 11)}`;
      
      define(
        customElementName,
        {
          attributes: {
            stringProp: {
              type: String,
              default: 'default'
            },
            numberProp: {
              type: Number,
              default: 0,
              attribute: 'num-value'
            },
            boolProp: {
              type: Boolean,
              default: false
            }
          }
        },
        (props) => {
          // Properties should be accessible within the setup function
          // This tests that the setup function has access to synced properties
        }
      );

      // Create element with attributes already set
      const element = document.createElement(customElementName) as any;
      element.setAttribute('string-prop', 'from-attribute');
      element.setAttribute('num-value', '100');
      element.setAttribute('bool-prop', '');
      
      document.body.appendChild(element);

      // Properties should be synced from attributes after connection
      expect(element.stringProp.val).toBe('from-attribute');
      expect(element.numberProp.val).toBe(100);
      expect(element.boolProp.val).toBe(true);

      // Test that attribute changes are reflected in properties
      element.setAttribute('string-prop', 'updated');
      expect(element.stringProp.val).toBe('updated');

      element.removeAttribute('bool-prop');
      expect(element.boolProp.val).toBe(false);

      document.body.removeChild(element);
    });

    it('should handle custom converters in functional components', () => {
      const customElementName = `converter-component-${Math.random().toString(36).substring(2, 11)}`;
      
      const uppercaseConverter = {
        fromAttribute: (value: string | null) => value ? value.toUpperCase() : null,
        toAttribute: (value: any) => value ? String(value).toLowerCase() : null
      };

      const ElementClass = define(
        customElementName,
        {
          attributes: {
            customProp: {
              type: String,
              default: 'test',
              converter: uppercaseConverter,
              reflect: true
            }
          }
        },
        () => {}
      );

      const element = document.createElement(customElementName) as any;
      element.setAttribute('custom-prop', 'hello');
      
      document.body.appendChild(element);

      // Should convert from attribute
      expect(element.customProp.val).toBe('HELLO');

      // Should convert to attribute
      element.customProp = 'WORLD';
      expect(element.getAttribute('custom-prop')).toBe('world');

      document.body.removeChild(element);
    });
  });

  describe('initial attribute sync with converters', () => {
    it('should sync initial attribute with custom converter', () => {
      // Custom converter that uppercases strings
      const customConverter = {
        fromAttribute: (value: string | null) => value ? value.toUpperCase() : null,
        toAttribute: (value: any) => value ? String(value).toLowerCase() : null
      };

      class TestElement extends VanReactiveElement {
        static properties = {
          customProp: {
            type: String,
            default: 'default',
            converter: customConverter
          }
        };
      }

      const customElementName = `test-converter-sync-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      // Create element with initial attribute
      const element = document.createElement(customElementName) as any;
      element.setAttribute('custom-prop', 'hello');
      
      // Manually trigger setup to simulate connection
      element._setupProperties();

      // Should have synced and converted the initial attribute value
      expect(element.customProp.val).toBe('HELLO');
    });

    it('should sync initial attribute with type converter from converters map', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          count: {
            type: Number,
            default: 0
          },
          data: {
            type: Object,
            default: null
          }
        };
      }

      const customElementName = `test-type-sync-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      // Create element with initial attributes
      const element = document.createElement(customElementName) as any;
      element.setAttribute('count', '42');
      element.setAttribute('data', '{"test": true}');
      
      // Manually trigger setup to simulate connection
      element._setupProperties();

      // Should have synced and converted the initial attribute values
      expect(element.count.val).toBe(42);
      expect(element.data.val).toEqual({ test: true });
    });

    it('should handle initial attribute sync without custom converter', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          message: {
            type: String,
            default: 'default',
            reflect: true
          }
        };
      }

      const customElementName = `test-initial-sync-${Math.random().toString(36).substr(2, 9)}`;
      customElements.define(customElementName, TestElement);

      // Create element with initial attribute BEFORE setup
      const element = document.createElement(customElementName) as any;
      element.setAttribute('message', 'from-attribute');
      
      // Now trigger setup - this should sync the attribute
      element._setupProperties();

      // Should have synced the initial attribute value using default converter
      expect(element.message.val).toBe('from-attribute');
    });
  });

  describe('edge cases', () => {
    it('should handle properties without default value', () => {
      class TestElement extends VanReactiveElement {
        static properties = {
          myProp: { reflect: true }
        };
      }

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

      const customElementName = `test-element-${Math.random().toString(36).substring(2, 11)}`;
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

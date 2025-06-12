import { describe, it, expect, vi } from 'vitest';
import {
  camelAndPascalToKebab,
  kebabToCamel,
  defaultConverter,
  booleanConverter,
  numberConverter,
  stringConverter,
  objectConverter,
  arrayConverter,
  converters
} from '../src/property-utils';

describe('property-utils', () => {
  describe('camelAndPascalToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelAndPascalToKebab('camelCase')).toBe('camel-case');
      expect(camelAndPascalToKebab('somePropertyName')).toBe('some-property-name');
    });

    it('should convert PascalCase to kebab-case', () => {
      expect(camelAndPascalToKebab('PascalCase')).toBe('pascal-case');
      expect(camelAndPascalToKebab('MyComponentName')).toBe('my-component-name');
    });

    it('should handle consecutive uppercase letters', () => {
      expect(camelAndPascalToKebab('HTMLElement')).toBe('html-element');
      expect(camelAndPascalToKebab('XMLHttpRequest')).toBe('xml-http-request');
      expect(camelAndPascalToKebab('myHTMLElement')).toBe('my-html-element');
    });

    it('should handle single words', () => {
      expect(camelAndPascalToKebab('single')).toBe('single');
      expect(camelAndPascalToKebab('UPPERCASE')).toBe('uppercase');
    });

    it('should handle numbers', () => {
      expect(camelAndPascalToKebab('prop1Name')).toBe('prop1-name');
      expect(camelAndPascalToKebab('name2')).toBe('name2');
    });
  });

  describe('kebabToCamel', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(kebabToCamel('my-property')).toBe('myProperty');
      expect(kebabToCamel('another-test-case')).toBe('anotherTestCase');
    });

    it('should handle single word', () => {
      expect(kebabToCamel('component')).toBe('component');
    });

    it('should handle multiple hyphens', () => {
      expect(kebabToCamel('my-html-element')).toBe('myHtmlElement');
      expect(kebabToCamel('a-b-c-d')).toBe('aBCD');
    });
  });

  describe('defaultConverter', () => {
    it('should pass through values unchanged', () => {
      expect(defaultConverter.toAttribute('test')).toBe('test');
      expect(defaultConverter.toAttribute(123)).toBe(123);
      expect(defaultConverter.toAttribute(null)).toBe(null);

      expect(defaultConverter.fromAttribute('test')).toBe('test');
      expect(defaultConverter.fromAttribute(null)).toBe(null);
    });
  });

  describe('booleanConverter', () => {
    it('should convert boolean to attribute', () => {
      expect(booleanConverter.toAttribute(true)).toBe('');
      expect(booleanConverter.toAttribute(false)).toBe(null);
      expect(booleanConverter.toAttribute(null)).toBe(null);
    });

    it('should convert attribute to boolean', () => {
      expect(booleanConverter.fromAttribute('')).toBe(true);
      expect(booleanConverter.fromAttribute('true')).toBe(true);
      expect(booleanConverter.fromAttribute('false')).toBe(true); // Presence means true
      expect(booleanConverter.fromAttribute(null)).toBe(false);
    });
  });

  describe('numberConverter', () => {
    it('should convert number to attribute', () => {
      expect(numberConverter.toAttribute(123)).toBe('123');
      expect(numberConverter.toAttribute(0)).toBe('0');
      expect(numberConverter.toAttribute(-456)).toBe('-456');
      expect(numberConverter.toAttribute(3.14)).toBe('3.14');
      expect(numberConverter.toAttribute(null)).toBe(null);
    });

    it('should convert attribute to number', () => {
      expect(numberConverter.fromAttribute('123')).toBe(123);
      expect(numberConverter.fromAttribute('0')).toBe(0);
      expect(numberConverter.fromAttribute('-456')).toBe(-456);
      expect(numberConverter.fromAttribute('3.14')).toBe(3.14);
      expect(numberConverter.fromAttribute(null)).toBe(null);
      expect(numberConverter.fromAttribute('not-a-number')).toBe(NaN);
    });
  });

  describe('stringConverter', () => {
    it('should convert string to attribute', () => {
      expect(stringConverter.toAttribute('test')).toBe('test');
      expect(stringConverter.toAttribute('')).toBe('');
      expect(stringConverter.toAttribute(null)).toBe(null);
    });

    it('should convert attribute to string', () => {
      expect(stringConverter.fromAttribute('test')).toBe('test');
      expect(stringConverter.fromAttribute('')).toBe('');
      expect(stringConverter.fromAttribute(null)).toBe(null);
    });
  });

  describe('objectConverter', () => {
    it('should convert object to attribute', () => {
      expect(objectConverter.toAttribute({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
      expect(objectConverter.toAttribute([1, 2, 3])).toBe('[1,2,3]');
      expect(objectConverter.toAttribute(null)).toBe(null);
    });

    it('should convert attribute to object', () => {
      expect(objectConverter.fromAttribute('{"a":1,"b":2}')).toEqual({ a: 1, b: 2 });
      expect(objectConverter.fromAttribute('[1,2,3]')).toEqual([1, 2, 3]);
      expect(objectConverter.fromAttribute(null)).toBe(null);
    });

    it('should pass through objects directly', () => {
      const obj = { test: true };
      expect(objectConverter.fromAttribute(obj as any)).toBe(obj);

      const arr = [1, 2, 3];
      expect(objectConverter.fromAttribute(arr as any)).toBe(arr);
    });

    it('should handle JSON parse errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(objectConverter.fromAttribute('invalid json')).toBe('invalid json');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing attribute value as JSON: invalid json', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('arrayConverter', () => {
    it('should convert array to attribute', () => {
      expect(arrayConverter.toAttribute([1, 2, 3])).toBe('[1,2,3]');
      expect(arrayConverter.toAttribute(['a', 'b', 'c'])).toBe('["a","b","c"]');
      expect(arrayConverter.toAttribute(null)).toBe(null);
    });

    it('should convert attribute to array', () => {
      expect(arrayConverter.fromAttribute('[1,2,3]')).toEqual([1, 2, 3]);
      expect(arrayConverter.fromAttribute('["a","b","c"]')).toEqual(['a', 'b', 'c']);
      expect(arrayConverter.fromAttribute(null)).toBe(null);
    });
  });

  describe('converters', () => {
    it('should contain all type converters', () => {
      expect(converters.String).toBe(stringConverter);
      expect(converters.Number).toBe(numberConverter);
      expect(converters.Boolean).toBe(booleanConverter);
      expect(converters.Object).toBe(objectConverter);
      expect(converters.Array).toBe(arrayConverter);
    });
  });
});

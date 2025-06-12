// --- Types ---
/**
 * Custom converter for property-attribute serialization
 * @template T - The property value type
 * @example
 * const dateConverter: AttributeConverter<Date> = {
 *   toAttribute: (date) => date?.toISOString() ?? null,
 *   fromAttribute: (str) => str ? new Date(str) : null
 * }
 *
 * @example
 * // Usage in property definition
 * static properties = {
 *   createdAt: {
 *     type: Date,
 *     converter: dateConverter,
 *     reflect: true
 *   }
 * }
 */
export interface AttributeConverter<T = any> {
  /** Convert property value to attribute string */
  toAttribute: (value: T | null) => string | null;
  /** Convert attribute string to property value */
  fromAttribute: (value: string | null) => T | null;
}

// --- Utility Functions ---
const defaultConverter: AttributeConverter = {
  toAttribute: (value: any) => value,
  fromAttribute: (value: string | null) => value
};

const booleanConverter: AttributeConverter<boolean> = {
  toAttribute: (value: boolean | null) => (value ? '' : null), // Reflect presence/absence
  fromAttribute: (value: string | null) => value !== null // Attribute presence means true
};

const numberConverter: AttributeConverter<number> = {
  toAttribute: (value: number | null) => (value === null ? null : String(value)),
  fromAttribute: (value: string | null) => (value === null ? null : Number(value))
};

const stringConverter: AttributeConverter<string> = {
  toAttribute: (value: string | null) => (value === null ? null : String(value)),
  fromAttribute: (value: string | null) => (value === null ? null : String(value))
};

const objectConverter: AttributeConverter<object> = {
  toAttribute: (value: object | null) => (value == null ? null : JSON.stringify(value)),
  fromAttribute: (value: string | object | null) => {
    // When setting the property directly, if it's null/undefined, keep it as null.
    if (value == null) return null;
    // If it's already an object/array, pass it through.
    if (typeof value === 'object') return value;
    // Otherwise, try to parse it as JSON.
    try {
      return JSON.parse(value as string);
    } catch (e) {
      console.error(`Error parsing attribute value as JSON: ${value}`, e);
      return value;
    }
  }
};

// Array converter can often be the same as object converter
const arrayConverter: AttributeConverter<any[]> = objectConverter as AttributeConverter<any[]>;

// Use string keys instead of computed properties to avoid TypeScript errors
const converters: Record<string, AttributeConverter<any>> = {
  'String': stringConverter,
  'Number': numberConverter,
  'Boolean': booleanConverter,
  'Object': objectConverter,
  'Array': arrayConverter
};

const camelAndPascalToKebab = (str: string): string =>
  str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // Add hyphen between lowercase/digit and uppercase
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2') // Add hyphen between consecutive uppercase followed by lowercase
    .toLowerCase();

const kebabToCamel = (str: string): string =>
  str
    .split('-')
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');

export {
  defaultConverter,
  booleanConverter,
  numberConverter,
  stringConverter,
  objectConverter,
  arrayConverter,
  converters,
  camelAndPascalToKebab,
  kebabToCamel
};

const reduce = ([strings, ...values]: [TemplateStringsArray, ...any[]]): string => {
  return strings.reduce((result, str, i) => result + str + (values[i] || ''), '');
};

/**
 * Tagged template literal for CSS strings with syntax highlighting support
 * @param template - Template strings array
 * @param values - Interpolated values
 * @returns CSS string
 * @example
 * const styles = css`
 *   :host {
 *     display: block;
 *     padding: ${spacing}px;
 *   }
 *   
 *   .button {
 *     background: ${theme.primary};
 *     border-radius: 4px;
 *   }
 * `
 * 
 * @example
 * // Usage in component
 * static get styles() {
 *   return css`
 *     :host { display: flex; }
 *     .container { gap: 1rem; }
 *   `
 * }
 */
export const css = (...args: [TemplateStringsArray, ...any[]]): string => {
  // Process the template literal if needed
  return reduce(args);
};

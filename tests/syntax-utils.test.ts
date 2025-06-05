import { describe, it, expect } from 'vitest';
import { css } from '../src/syntax-utils';

describe('syntax-utils', () => {
  describe('css', () => {
    it('should return a simple string when no interpolations', () => {
      const result = css`
        .container {
          display: flex;
        }
      `;
      expect(result).toBe(`
        .container {
          display: flex;
        }
      `);
    });

    it('should interpolate values correctly', () => {
      const color = 'red';
      const size = 16;
      const result = css`
        .text {
          color: ${color};
          font-size: ${size}px;
        }
      `;
      expect(result).toBe(`
        .text {
          color: red;
          font-size: 16px;
        }
      `);
    });

    it('should handle multiple interpolations', () => {
      const value1 = 'flex';
      const value2 = 'center';
      const value3 = '10px';
      const result = css`
        .box {
          display: ${value1};
          justify-content: ${value2};
          padding: ${value3};
        }
      `;
      expect(result).toBe(`
        .box {
          display: flex;
          justify-content: center;
          padding: 10px;
        }
      `);
    });

    it('should handle empty interpolations', () => {
      const emptyValue = '';
      const result = css`color: ${emptyValue};`;
      expect(result).toBe('color: ;');
    });

    it('should handle null/undefined interpolations', () => {
      const nullValue = null;
      const undefinedValue = undefined;
      const result = css`
        color: ${nullValue};
        background: ${undefinedValue};
      `;
      expect(result).toBe(`
        color: ;
        background: ;
      `);
    });

    it('should handle numeric interpolations', () => {
      const width = 100;
      const height = 50.5;
      const result = css`
        width: ${width}px;
        height: ${height}rem;
      `;
      expect(result).toBe(`
        width: 100px;
        height: 50.5rem;
      `);
    });

    it('should handle complex nested CSS', () => {
      const primaryColor = '#333';
      const borderRadius = '4px';
      const result = css`
        :host {
          display: block;
          
          .container {
            background: ${primaryColor};
            border-radius: ${borderRadius};
            
            &:hover {
              opacity: 0.8;
            }
          }
        }
      `;
      expect(result).toContain('background: #333');
      expect(result).toContain('border-radius: 4px');
    });
  });
});
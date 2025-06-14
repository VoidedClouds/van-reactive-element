import van from 'vanjs-core';
export { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import vanRE, { type ChildDom, type State, type Van, type VanReactiveElementConstructor } from '../src/index';

export type { ChildDom, State, Van, VanReactiveElementConstructor };
export { van };
export const tags = van.tags;
export const { VanReactiveElement, define } = vanRE({ van });

export const promisedTimeout = (timeInMs = 0) => new Promise((resolve) => setTimeout(resolve, timeInMs));

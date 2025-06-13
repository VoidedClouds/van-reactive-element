import van, { type ChildDom } from 'vanjs-core';
export { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import vanRE, { type State } from '../src/index';

export { ChildDom, State, van };
export const tags = van.tags;
export const { VanReactiveElement, define } = vanRE({ van });

export const promisedTimeout = (timeInMs = 0) => new Promise((resolve) => setTimeout(resolve, timeInMs));

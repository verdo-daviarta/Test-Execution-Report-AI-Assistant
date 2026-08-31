import { describe, expect, it } from 'vitest';
import { createId } from './id';

describe('createId', () => {
  it('creates unique prefixed identifiers', () => {
    const first = createId('test');
    const second = createId('test');
    expect(first.startsWith('test-')).toBe(true);
    expect(second.startsWith('test-')).toBe(true);
    expect(first).not.toBe(second);
  });
});

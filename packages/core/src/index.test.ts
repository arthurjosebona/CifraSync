import { describe, expect, it } from 'vitest';

import * as core from './index';

describe('@cifrasync/core', () => {
  it('carrega o módulo', () => {
    expect(core).toBeTypeOf('object');
  });
});

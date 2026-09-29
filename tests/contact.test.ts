import { describe, expect, it } from 'vitest';
import { parseMailto } from '../src/ui/ContactCard';

describe('sponsor / support e-mail links', () => {
  it('reads the address and subject from a mailto link', () => {
    expect(parseMailto('mailto:support@helao2.com?subject=Advertise%20in%20Inkroads')).toEqual({ email: 'support@helao2.com', subject: 'Advertise in Inkroads' });
    expect(parseMailto('mailto:support@helao2.com')).toEqual({ email: 'support@helao2.com', subject: '' });
  });
  it('leaves web links alone', () => {
    expect(parseMailto('https://helao2.com')).toBeNull();
    expect(parseMailto('mailto:not-an-address')).toBeNull();
  });
});

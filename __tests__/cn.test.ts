import { cn } from '@/utils/cn';
test('keeps custom sizes beside colours', () => {
  expect(cn('text-caption font-medium text-foreground')).toBe('text-caption font-medium text-foreground');
  expect(cn('text-micro', 'text-badge-neutral-text')).toBe('text-micro text-badge-neutral-text');
  expect(cn('text-sm', 'text-caption')).toBe('text-caption');
});

import { cn } from '@/utils/cn';
test('keeps custom sizes beside colours', () => {
  expect(cn('text-caption font-medium text-foreground')).toBe('text-caption font-medium text-foreground');
  expect(cn('text-micro', 'text-badge-neutral-text')).toBe('text-micro text-badge-neutral-text');
  expect(cn('text-sm', 'text-caption')).toBe('text-caption');
});

test('a skeleton on the page background swaps its fill, keeping the shimmer', () => {
  const base = 'rounded-sm bg-muted bg-gradient-to-r from-transparent from-35% via-card/50 via-50% to-transparent to-65% bg-[length:250%_100%] bg-no-repeat';
  expect(cn(base, 'bg-border rounded-full')).toBe(
    'bg-gradient-to-r from-transparent from-35% via-card/50 via-50% to-transparent to-65% bg-[length:250%_100%] bg-no-repeat bg-border rounded-full'
  );
});

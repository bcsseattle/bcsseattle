import { StatePanel } from '@/components/ui/state-panel';
import { AppHeader } from '~/components/app-header';

// Built in Phase 3 (docs/mobile-app-plan.md §7).
export default function GiveTab() {
  return (
    <>
      <AppHeader title="Give" />
      <StatePanel title="Coming in the next build">This tab is built in Phase 3.</StatePanel>
    </>
  );
}

'use client';

import { Progress } from '@/components/ui/progress';
import { formatMoney } from '@/utils/format';

interface FundraiserProgressProps {
  currentAmount: number;
  goalAmount: number;
}

export function FundraiserProgress({
  currentAmount,
  goalAmount
}: FundraiserProgressProps) {
  const progress = (currentAmount / goalAmount) * 100;

  return (
    <div className="space-y-2">
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between text-sm">
        <div>
          <p className="font-medium">{formatMoney(currentAmount * 100, { whole: true })}</p>
          <p className="text-muted-foreground">raised of {formatMoney(goalAmount * 100, { whole: true })}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">{Math.round(progress)}%</p>
          <p className="text-muted-foreground">funded</p>
        </div>
      </div>
    </div>
  );
}

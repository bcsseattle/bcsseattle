'use client';

import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/utils/helpers';

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
          <p className="font-medium">{formatCurrency(currentAmount)}</p>
          <p className="text-muted-foreground">raised of {formatCurrency(goalAmount)}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">{Math.round(progress)}%</p>
          <p className="text-muted-foreground">funded</p>
        </div>
      </div>
    </div>
  );
}

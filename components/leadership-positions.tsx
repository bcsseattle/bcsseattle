import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, Trophy } from 'lucide-react';

export default function LeadershipPositions({
  positions
}: {
  positions: string[];
}) {
  return (
    <Card className="bg-inherit bg-none border-none">
      <CardHeader className="flex flex-row gap-2 items-center pb-4">
        <Trophy className="text-gray-600 w-5 h-5 flex-shrink-0" />
        <CardTitle>Leadership Positions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {positions.map((position) => (
          <div key={position} className="flex items-start gap-3 text-gray-800">
            <CheckCircle className="text-primary w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{position}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
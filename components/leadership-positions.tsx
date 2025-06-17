import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, Trophy } from 'lucide-react';

export default function LeadershipPositions({
  positions
}: {
  positions: string[];
}) {
  return (
    <Card className="bg-inherit bg-none border-none">
      <CardHeader className="flex flex-row gape-2 items-center pb-2">
        <Trophy className="mr-4 space-x-3text-gray-600" />
        <CardTitle>Leadership Positions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {positions.map((position) => (
          <div key={position} className="flex items-center gap-2 text-gray-800">
            <CheckCircle className="text-primary w-4 h-4" />
            <span>{position}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

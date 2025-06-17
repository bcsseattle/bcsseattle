import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, Trophy } from 'lucide-react';

interface Position {
  position: string;
  description?: string | null;
  display_order: number;
}

export default function LeadershipPositions({
  positions
}: {
  positions: Position[] | string[];
}) {
  // Handle both old string[] format and new Position[] format
  const positionData = positions.map((item, index) => {
    if (typeof item === 'string') {
      return {
        position: item,
        description: '',
        display_order: index + 1
      };
    }
    return item;
  });
  return (
    <Card className="bg-inherit bg-none border-none">
      <CardHeader className="flex flex-row gap-2 items-center pb-2">
        <Trophy className="text-gray-600 w-5 h-5 flex-shrink-0" />
        <CardTitle>Leadership Positions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {positionData.map((item) => (
          <div key={item.position} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {item.display_order}
              </span>
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-gray-900">{item.position}</h4>
              {item.description && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

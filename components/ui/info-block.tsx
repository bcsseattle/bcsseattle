import { Card } from './card';

export const InfoBlock = ({ title, description, children }: any) => (
  <Card className="p-4 bg-blue-50">
    <div className="space-x-2">
      <div>
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-md">{description}</p>
        {children}
      </div>
    </div>
  </Card>
);

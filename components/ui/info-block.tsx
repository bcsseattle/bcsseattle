import { Card } from './card';

export const InfoBlock = ({ title, description, children }: any) => (
  <Card className="p-4 border-accent-200 bg-accent-100">
    <div className="space-x-2">
      <div>
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm">{description}</p>
        {children}
      </div>
    </div>
  </Card>
);

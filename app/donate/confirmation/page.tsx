import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function ConfirmationPage() {
  return (
    <div className="flex spacy-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Donation Confirmation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            Thank you for your donation. Your donation will be used to support
            our mission.
          </p>
          <Button variant={'default'} disabled={true}>
            Download Receipt
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export interface FundraiserDonation {
  id: string;
  amount: number;
  fundraiser_id: string;
  donor_id: string | null;
  donor_name: string | null;
  is_anonymous: boolean | null;
  message: string | null;
  payment_intent_id: string | null;
  payment_status: string | null;
}

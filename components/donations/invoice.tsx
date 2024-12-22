'use client';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { InfoBlock } from '../ui/info-block';
import { Donor, organization, Donation } from '@/types';
import { getPriceString } from '@/utils/helpers';
import Logo from '../icons/Logo';
import { Button } from '../ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  organization: organization;
  donor: Donor;
  donation: Donation;
}

export default function Invoice({ organization, donor, donation }: Props) {
  const currentPath = usePathname();
  return (
    <div className="space-y-6 container">
      <div>
        <InfoBlock title="Donation Receipt" description="">
          <div className="flex justify-between">
            <p>Thank you for your support!</p>
            <Button variant="default">
              <Link href={`${currentPath}/pdf`}>Download</Link>
            </Button>
          </div>
        </InfoBlock>
      </div>
      <Card className="p-12">
        <CardHeader>
          <div className="flex justify-between">
            <div>
              <div className="w-[200px] mb-8">
                <h1 className="text-lg font-extrabold uppercase">
                  {organization.name}
                </h1>
              </div>
              <div className="mt-2 text-gray-500">
                <p>{organization.address}</p>
                <p>
                  {organization.city}, {organization.state} {organization.zip}
                </p>
                <p>{organization.country}</p>
                <p>Email: {organization.email}</p>
                <p>Ph: {organization.phone}</p>
                <p>EIN: {organization.ein}</p>
              </div>
            </div>
            <div className="h-72 w-72">
              <Logo />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Donor Information */}
          <section className="mt-8">
            <h2 className="font-bold text-xl">Donor Information</h2>
            <div className="mt-2 text-gray-500">
              <p>Name: {donor.full_name}</p>
              <p>
                Address: {donor.address}, {donor.city}, {donor.zip_code},{' '}
                {donor.state}
              </p>
              <p>Phone: {donor.phone}</p>
              <p>Email: {donor.email}</p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-bold text-xl">Donation Details</h2>
            <div className="mt-2 text-gray-500">
              <p>Invoice Number: {donation.id}</p>
              <p>Date of Donation: {donation.donation_date}</p>
              <p>Description of Donation: {donation.donation_description}</p>
              <p>Donation Amount: {getPriceString(donation.donation_amount)}</p>
            </div>
          </section>

          <section className="mt-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Tax Deductible</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="">
                  <TableCell>{donation.donation_description}</TableCell>
                  <TableCell>
                    {getPriceString(donation.donation_amount)}
                  </TableCell>
                  <TableCell>
                    {getPriceString(donation.donation_amount)}
                  </TableCell>
                  <TableCell>1</TableCell>
                  <TableCell className="text-right">
                    {getPriceString(donation.donation_amount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>

          <section className="mt-6 text-sm">
            <div className="flex justify-between">
              <div className="md:w-2/3" />
              <div className=" flex-1 divide-y divide-gray-300">
                <h3 className="font-bold text-lg">Summary</h3>
                <div className="flex justify-between">
                  <p className="border-1 border-cyan-300">Subtotal</p>
                  <p>{getPriceString(donation.donation_amount)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Deductible</p>
                  <p>{getPriceString(donation.donation_amount)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Total</p>
                  <p>{getPriceString(donation.donation_amount)}</p>
                </div>
                <div className="flex justify-between font-bold">
                  <p>Total Charges</p>
                  <p>{getPriceString(donation.donation_amount)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-bold text-xl">Additional Notes:</h2>
            <p className="mt-2 text-gray-500">
              Goods/Services Provided (if any): None
            </p>
          </section>

          <section className="mt-8">
            <h2 className="font-bold text-xl">Thank you for your support!</h2>
            <div className="mt-2 text-gray-500">
              <p className="mt-2 text-gray-500">{organization.description}</p>
              <p>
                Your generous donation is tax-deductible to the extent allowed
                by law. No goods or services were provided in exchange for this
                donation unless otherwise noted.
              </p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

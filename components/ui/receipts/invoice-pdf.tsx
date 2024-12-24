import { Invoice, Member, Organization } from '@/types';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image
} from '@react-pdf/renderer';
import { getPriceString } from '@/utils/helpers';
import Stripe from 'stripe';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11,
    position: 'relative', // Ensures absolute elements are positioned relative to the page
    paddingBottom: 50
  },
  content: {
    marginBottom: 50
  },
  image: {
    width: 150,
    height: 150,
    margin: 'auto'
  },
  header: {
    marginBottom: 12
  },
  company: {
    width: '40%'
  },
  title: {
    textTransform: 'uppercase',
    fontSize: 18,
    fontWeight: 'black',
    textAlign: 'left'
  },
  address: {
    color: '#999',
    textAlign: 'left',
    marginTop: 14,
    lineHeight: 1
  },
  section: {
    marginBottom: 16
  },
  label: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10
  },
  sectionDetails: {
    color: '#999',
    lineHeight: 1
  },
  table: {
    width: 'auto',
    border: 'none',
    marginTop: 10,
    marginBottom: 15,
    fontSize: 10
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1px solid #ccc',
    color: '#999'
  },
  tableRow: {
    paddingTop: 2,
    flexDirection: 'row'
  },
  tableCol: {
    width: '33%',
    textAlign: 'center'
  },
  tableCel: {
    width: '33%',
    textAlign: 'center',
    padding: 2
  },
  borderTop: {
    borderTop: '1px solid #ccc'
  },
  footer: {
    color: '#ccc',
    marginTop: 25,
    paddingTop: 10,
    position: 'absolute',
    bottom: 20,
    width: '90%'
  },
  break: {
    marginBottom: 10
  },
  flex: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});

interface InvoicePDFProps {
  invoice: Invoice;
  organization: Organization;
  member: Member;
  payments: Stripe.PaymentIntent[];
  totalSpent: number;
  customer: Stripe.Customer;
  taxYear: number;
}

const Footer = () => (
  <View style={{ ...styles.footer, ...styles.borderTop }} fixed>
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between'
      }}
    >
      <Text>Website: www.bcsseattle.org</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  </View>
);

export default function InvoicePDF({
  invoice,
  organization,
  member,
  customer,
  payments,
  totalSpent,
  taxYear
}: InvoicePDFProps) {
  return (
    <Document>
      <Page style={styles.page} size="A4">
        <View style={styles.content}>
          <View style={styles.header}>
            <View
              style={{
                ...styles.flex
              }}
            >
              <View style={styles.company}>
                <Text style={styles.title}>{organization.name}</Text>
                <View style={styles.address}>
                  <Text>{organization.address}</Text>
                  <Text>
                    {organization.city}, {organization.state} {organization.zip}
                  </Text>
                  <Text>{organization.country}</Text>
                  <Text>Email: {organization.email}</Text>
                  <Text>Ph: {organization.phone}</Text>
                  <Text>EIN: {organization.ein}</Text>
                </View>
              </View>
              <View>
                <Image
                  src="https://www.bcsseattle.org/bcss-logo.png"
                  style={styles.image}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Donor Information</Text>
            <View style={styles.sectionDetails}>
              <Text>Name: {member.fullName}</Text>
              <Text>
                Address: {member.address}, {member.city}, {member.state}{' '}
                {member.zip}
              </Text>
              <Text>Phone: {member.phone}</Text>
              <Text>Email: {customer.email}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Donation Details</Text>
            <View style={styles.sectionDetails}>
              <Text>Invoice Number: {invoice?.id}</Text>
              <Text>Donation Year: {taxYear}</Text>
              <Text>Description of Donation: General Support</Text>
              <Text>Total Donation Amount: {getPriceString(totalSpent)}</Text>
            </View>
          </View>

          <View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ ...styles.tableCol, textAlign: 'left' }}>
                  Description
                </Text>
                <Text style={styles.tableCol}>Date</Text>
                <Text style={styles.tableCol}>Price</Text>
                <Text style={styles.tableCol}>Tax Deductible</Text>
                <Text style={styles.tableCol}>Quantity</Text>
                <Text style={{ ...styles.tableCel, textAlign: 'right' }}>
                  Total
                </Text>
              </View>
              {payments.map((payment, index) => (
                <View style={styles.tableRow} key={index}>
                  <Text style={{ ...styles.tableCol, textAlign: 'left' }}>
                    Donation
                  </Text>
                  <Text style={styles.tableCel}>
                    {payment.created
                      ? new Date(payment.created * 1000).toLocaleDateString()
                      : ''}
                  </Text>
                  <Text style={styles.tableCel}>
                    {getPriceString(payment.amount)}
                  </Text>
                  <Text style={styles.tableCel}>
                    {getPriceString(payment.amount)}
                  </Text>
                  <Text style={styles.tableCel}>{1}</Text>
                  <Text style={{ ...styles.tableCel, textAlign: 'right' }}>
                    {getPriceString(payment.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ ...styles.section, fontSize: 10 }}>
            <View
              style={{
                ...styles.flex,
                width: '50%',
                alignSelf: 'flex-end',
                paddingBottom: 5,
                fontSize: 14,
                fontWeight: 'bold'
              }}
            >
              <Text>Summary</Text>
            </View>
            <View
              style={{
                ...styles.flex,
                ...styles.borderTop,
                width: '50%',
                alignSelf: 'flex-end',
                paddingBottom: 2
              }}
            >
              <View>
                <Text>Subtotal</Text>
              </View>
              <View>
                <Text>{getPriceString(totalSpent)}</Text>
              </View>
            </View>
            <View
              style={{
                ...styles.flex,
                ...styles.borderTop,
                width: '50%',
                alignSelf: 'flex-end',
                paddingBottom: 2
              }}
            >
              <View>
                <Text>Deductible</Text>
              </View>
              <View>
                <Text>{getPriceString(totalSpent)}</Text>
              </View>
            </View>
            <View
              style={{
                ...styles.flex,
                ...styles.borderTop,
                width: '50%',
                alignSelf: 'flex-end',
                paddingBottom: 2
              }}
            >
              <View>
                <Text>Total</Text>
              </View>
              <View>
                <Text>{getPriceString(totalSpent)}</Text>
              </View>
            </View>
            <View
              style={{
                ...styles.flex,
                ...styles.borderTop,
                width: '50%',
                alignSelf: 'flex-end',
                paddingBottom: 2
              }}
            >
              <View>
                <Text
                  style={{
                    fontWeight: 'bold',
                    fontSize: 12,
                    marginTop: 5
                  }}
                >
                  Total Charges
                </Text>
              </View>
              <View>
                <Text
                  style={{
                    fontWeight: 'bold',
                    fontSize: 12,
                    marginTop: 5
                  }}
                >
                  {getPriceString(totalSpent)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Additional Notes:</Text>
            <View style={styles.sectionDetails}>
              <Text>Goods/Services Provided (if any): N/A</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Thank you for your support!</Text>
            <View style={styles.sectionDetails}>
              <Text>{organization.description}</Text>
              <Text style={styles.break}></Text>
              <Text>
                Your generous donation is tax-deductible to the extent allowed
                by law. No goods or services were provided in exchange for this
                donation unless otherwise noted.
              </Text>
            </View>
          </View>
        </View>
        <Footer />
      </Page>
    </Document>
  );
}

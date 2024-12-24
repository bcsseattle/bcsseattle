import { Donation, Donor, Organization } from '@/types';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image
} from '@react-pdf/renderer';
import { getPriceString } from '@/utils/helpers';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    paddingTop: 10
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
  organization: Organization;
  donation: Donation;
  donor: Donor;
}

export default function InvoicePDF({
  organization,
  donation,
  donor
}: InvoicePDFProps) {
  const donations = [donation];
  return (
    <Document>
      <Page style={styles.page} size="A4">
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
            <Text>Name: {donor.full_name}</Text>
            <Text>
              Address: {donor.address}, {donor.city}, {donor.state}{' '}
              {donor.zip_code}
            </Text>
            <Text>Phone: {donor.phone}</Text>
            <Text>Email: {donor.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Donation Details</Text>
          <View style={styles.sectionDetails}>
            <Text>Invoice Number: {donation?.id}</Text>
            <Text>
              Date of Donation:{' '}
              {new Date(donation?.donation_date).toLocaleDateString()}
            </Text>
            <Text>
              Description of Donation: {donation?.goods_services_description}
            </Text>
            <Text>
              Donation Amount: {getPriceString(donation?.donation_amount)}
            </Text>
          </View>
        </View>

        <View>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableCol, textAlign: 'left' }}>
                Description
              </Text>
              <Text style={styles.tableCol}>Price</Text>
              <Text style={styles.tableCol}>Tax Deductible</Text>
              <Text style={styles.tableCol}>Quantity</Text>
              <Text style={{ ...styles.tableCel, textAlign: 'right' }}>
                Total
              </Text>
            </View>
            {donations.map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={{ ...styles.tableCol, textAlign: 'left' }}>
                  Donation
                </Text>
                <Text style={styles.tableCel}>
                  {getPriceString(item.donation_amount)}
                </Text>
                <Text style={styles.tableCel}>
                  {getPriceString(item.donation_amount)}
                </Text>
                <Text style={styles.tableCel}>{1}</Text>
                <Text style={{ ...styles.tableCel, textAlign: 'right' }}>
                  {getPriceString(item.donation_amount)}
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
              <Text>{getPriceString(donation.donation_amount)}</Text>
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
              <Text>{getPriceString(donation.donation_amount)}</Text>
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
              <Text>{getPriceString(donation.donation_amount)}</Text>
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
                {getPriceString(donation.donation_amount)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Additional Notes:</Text>
          <View style={styles.sectionDetails}>
            <Text>
              Goods/Services Provided (if any):{' '}
              {donation?.goods_or_services_provided
                ? donation.goods_services_description
                : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Thank you for your support!</Text>
          <View style={styles.sectionDetails}>
            <Text>{organization.description}</Text>
            <Text style={styles.break}></Text>
            <Text>
              Your generous donation is tax-deductible to the extent allowed by
              law. No goods or services were provided in exchange for this
              donation unless otherwise noted.
            </Text>
          </View>
        </View>

        <View style={{ ...styles.footer, ...styles.borderTop }}>
          <Text>Website: www.bcsseattle.org</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}

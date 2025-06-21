import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text
} from '@react-email/components';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;

interface NewMemberJoinedTemplateProps {
  name: string;
  email: string;
  membershipType?: string;
  signupDate?: string;
}

export const NewMemberJoinedTemplate = ({
  name = '',
  email = '',
  membershipType = 'Standard',
  signupDate = new Date().toLocaleDateString()
}: NewMemberJoinedTemplateProps) => (
  <Html>
    <Head>
      <Preview>New Member Joined BCS Seattle</Preview>
    </Head>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Img
            alt="BCS Seattle"
            src={`${baseUrl}/bcss-logo.png`}
            width={100}
            height={100}
          />

          <Heading>New Member Alert</Heading>
          <Text style={paragraph}>Dear Admin,</Text>
          <Text style={paragraph}>
            A new member has joined BCS Seattle! Here are the details:
          </Text>

          <Section style={memberDetails}>
            <Text style={detailItem}>
              <strong>Name:</strong> {name}
            </Text>
            <Text style={detailItem}>
              <strong>Email:</strong> {email}
            </Text>
            <Text style={detailItem}>
              <strong>Membership Type:</strong> {membershipType}
            </Text>
            <Text style={detailItem}>
              <strong>Signup Date:</strong> {signupDate}
            </Text>
          </Section>

          <Link style={button} href={`${baseUrl}/admin/members`}>
            View Member Dashboard
          </Link>

          <Text style={paragraph}>
            Please reach out to welcome the new member and provide them with any
            necessary onboarding information.
          </Text>

          <Text style={footer}>BCS Seattle Admin Notification System</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif'
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px'
};

const box = {
  padding: '0 48px'
};

const memberDetails = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  borderRadius: '8px',
  margin: '20px 0'
};

const detailItem = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '5px 0'
};

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const
};

const button = {
  backgroundColor: '#656ee8',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '10px',
  margin: '20px 0'
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px'
};

export default NewMemberJoinedTemplate;

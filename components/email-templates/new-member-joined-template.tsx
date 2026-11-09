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
}: NewMemberJoinedTemplateProps) => {
  // Handle cases where name might be undefined or empty
  const displayName = name && name.trim() ? name : email.split('@')[0] || 'New Member';
  
  return (
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

          <Heading>New Member Registration</Heading>
          <Text style={paragraph}>Dear Admin,</Text>
          <Text style={paragraph}>
            A new member has registered and is awaiting approval. Please review their information below:
          </Text>

          <Section style={memberDetails}>
            <Text style={detailItem}>
              <strong>Name:</strong> {displayName}
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
            <Text style={{...detailItem, color: '#d69e2e', fontWeight: 'bold'}}>
              <strong>Status:</strong> Pending Approval
            </Text>
          </Section>

          <Link style={button} href={`${baseUrl}/admin/members`}>
            Review & Approve Member
          </Link>

          <Text style={paragraph}>
            This member requires approval before they can access member-only features. 
            Please review their information and approve their membership to complete their onboarding.
          </Text>

          <Text style={footer}>BCS Seattle Admin Notification System</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
}

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

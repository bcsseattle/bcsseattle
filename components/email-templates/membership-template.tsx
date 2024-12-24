import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text
} from '@react-email/components';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;

export const WelcomeEmailTemplate = () => (
  <Html lang="en">
    <Head>
      <Preview>Welcome to Baloch Community Services of Seattle</Preview>
    </Head>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Img
            alt="BCS Seattle"
            src={`${baseUrl}/bcss-logo.png`}
            width={49}
            height={21}
          />
          <Text style={paragraph}>
            Welcome to Baloch Community Services of Seattle! We are excited to
            have you become a member of our community.
          </Text>
          <Text style={paragraph}>
            If you have any questions or need help, please don't hesitate to
            reach out to us.
          </Text>
          <Text style={paragraph}>
            Please select a membership plan if you haven't already.
          </Text>
          <Button style={button} href={`${baseUrl}/contribute`}>
            Select Contribution Plan
          </Button>
          <Text style={footer}>
            BCS Seattle is a 501(c)(3) nonprofit organization. All donations are
            tax deductible.
          </Text>
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

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0'
};

const paragraph = {
  color: '#525f7f',

  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const
};

const anchor = {
  color: '#556cd6'
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
  padding: '10px'
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px'
};

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

interface PaymentFailedTemplateProps {
  name: string;
  amount: string;
  retryUrl: string;
  failureMessage: string;
}

export const PaymentFailedTemplate = ({
  name = '',
  amount = '',
  retryUrl,
  failureMessage
}: PaymentFailedTemplateProps) => (
  <Html>
    <Head>
      <Preview>BCS Contribution Payment Failed</Preview>
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

          <Heading>Payment Failed</Heading>
          <Text style={paragraph}>Dear {name},</Text>
          <Text style={paragraph}>
            We were unable to process your contribution payment of {amount}.
            This could be due to insufficient funds, expired card, or other
            payment issues.
          </Text>

          <Link style={button} href={retryUrl}>
            Update Payment Method
          </Link>

          <Text style={paragraph}>
            If you continue to experience issues, please contact us at{' '}
            <Link href="mailto:info@bcsseattle.org">info@bcsseattle.org</Link>{' '}
            for assistance.
          </Text>
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

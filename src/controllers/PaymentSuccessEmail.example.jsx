/**
 * React Email Template Example
 * 
 * SETUP REQUIRED:
 * 1. Create directory: mkdir src/emails
 * 2. Move this file to: src/emails/PaymentSuccessEmail.jsx
 * 3. Import in emailService.js and use with react parameter
 * 
 * USAGE:
 * import { PaymentSuccessEmail } from '../emails/PaymentSuccessEmail.jsx';
 * 
 * await emailService.sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Payment Successful',
 *   react: PaymentSuccessEmail({
 *     name: 'John Doe',
 *     amount: '999',
 *     orderId: 'order_123',
 *     paymentId: 'pay_456',
 *     date: 'March 31, 2024'
 *   })
 * });
 */

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

export const PaymentSuccessEmail = ({
  name = 'User',
  amount = '0',
  orderId = 'N/A',
  paymentId = 'N/A',
  date = new Date().toLocaleDateString()
}) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Text style={headerText}>Payment Successful! ✅</Text>
        </Section>

        {/* Content */}
        <Section style={content}>
          <Text style={greeting}>Hi <strong>{name}</strong>,</Text>
          
          <Text style={paragraph}>
            Thank you for your payment. Your transaction was successful!
          </Text>

          {/* Payment Details Card */}
          <Section style={detailsCard}>
            <Text style={detailsTitle}>Payment Details</Text>
            
            <table style={table}>
              <tbody>
                <tr>
                  <td style={labelCell}>Amount Paid:</td>
                  <td style={valueCell}>₹{amount}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Order ID:</td>
                  <td style={valueCell}>{orderId}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Payment ID:</td>
                  <td style={valueCell}>{paymentId}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Date:</td>
                  <td style={valueCell}>{date}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Text style={paragraph}>
            You can now access your therapy sessions and all premium features.
          </Text>

          {/* CTA Button */}
          <Section style={buttonContainer}>
            <Button
              style={button}
              href={`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard`}
            >
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Text style={footer}>
            If you have any questions about your payment, please contact our support team.
          </Text>

          <Text style={footer}>
            Best regards,<br />
            <strong>The CareNest Team</strong>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#10b981',
  borderRadius: '10px 10px 0 0',
  padding: '30px',
  textAlign: 'center',
};

const headerText = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '30px',
  backgroundColor: '#f9f9f9',
  borderRadius: '0 0 10px 10px',
};

const greeting = {
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
  color: '#333333',
};

const detailsCard = {
  backgroundColor: '#ffffff',
  padding: '20px',
  borderRadius: '8px',
  borderLeft: '4px solid #10b981',
  margin: '20px 0',
};

const detailsTitle = {
  color: '#10b981',
  fontSize: '18px',
  fontWeight: 'bold',
  marginTop: '0',
  marginBottom: '16px',
};

const table = {
  width: '100%',
  fontSize: '14px',
};

const labelCell = {
  padding: '8px 0',
  color: '#666666',
};

const valueCell = {
  padding: '8px 0',
  textAlign: 'right',
  fontWeight: 'bold',
};

const buttonContainer = {
  textAlign: 'center',
  margin: '30px 0',
};

const button = {
  backgroundColor: '#667eea',
  borderRadius: '5px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  padding: '12px 30px',
};

const divider = {
  borderColor: '#e6e6e6',
  margin: '30px 0',
};

const footer = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '15px',
};

export default PaymentSuccessEmail;

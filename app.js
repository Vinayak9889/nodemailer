require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

// ✅ Nodemailer Transporter Setup for GoDaddy Email
const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465, // use 587 for TLS
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Nodemailer transporter error:', error);
  } else {
    console.log('Nodemailer transporter is ready to send emails');
  }
});

// ✅ Reusable Email Sending Function
async function sendGenericEmail(mailOptions) {
  const optionsWithDefaults = {
    from: `"${process.env.APP_NAME || 'Your Website'}" <${process.env.EMAIL_USER}>`,
    ...mailOptions,
  };

  try {
    const info = await transporter.sendMail(optionsWithDefaults);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    if (error.response) console.error('Response:', error.response);
    if (error.responseCode) console.error('Code:', error.responseCode);
    throw error;
  }
}

// ✅ API: Original Legacy Contact Form
app.post('/api/send-email', async (req, res) => {
  const {
    name,
    email,
    company,
    phone,
    message,
    subject: generalSubject,
    service,
    inquiryType,
  } = req.body;

  if (!name || !email || !message || !inquiryType) {
    return res.status(400).json({ message: 'Required fields missing.' });
  }

  let subject = `New Contact Form Submission - ${inquiryType}`;
  let body = `
    <h2>Contact Form Submission</h2>
    <p><strong>Inquiry Type:</strong> ${inquiryType}</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
    ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
    ${inquiryType === 'general' && generalSubject ? `<p><strong>Subject:</strong> ${generalSubject}</p>` : ''}
    ${(inquiryType === 'business' || inquiryType === 'support') && service
      ? `<p><strong>Service:</strong> ${service}</p>` : ''}
    <h3>Message:</h3>
    <p>${message.replace(/\n/g, '<br>')}</p>
    <hr>
    <p>Sent via contact form (legacy)</p>
  `;

  const mailOptions = {
    from: `"${name} via Contact Form" <${process.env.EMAIL_USER}>`,
    replyTo: email,
    to: process.env.EMAIL_RECEIVER,
    subject,
    html: body,
  };

  try {
    await sendGenericEmail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send email.', error: error.message });
  }
});

// ✅ API: New Contact Form (ContactUs.tsx)
app.post('/api/send-contact-email', async (req, res) => {
  const {
    name,
    email,
    phone,
    subject: userSubject,
    enquiryType,
    message,
    activeTab,
  } = req.body;

  if (!name || !email || !message || !userSubject || !enquiryType || !activeTab) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const tabLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  const subject = `New ${tabLabel} Inquiry: "${userSubject}" from ${name}`;

  let body = `
    <h2>New Contact Form Submission (${tabLabel})</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
    <p><strong>Tab:</strong> ${tabLabel}</p>
    <p><strong>Enquiry Type:</strong> ${enquiryType}</p>
    <p><strong>Subject:</strong> ${userSubject}</p>
    <h3>Message:</h3>
    <p>${message.replace(/\n/g, '<br>')}</p>
    <hr>
    <p>Sent via new contact form</p>
  `;

  const mailOptions = {
    from: `"${name} (Contact Form)" <${process.env.EMAIL_USER}>`,
    replyTo: email,
    to: process.env.EMAIL_RECEIVER,
    subject,
    html: body,
  };

  try {
    await sendGenericEmail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Email failed to send.', error: error.message });
  }
});

// ✅ API: Welcome Email Example
app.post('/api/send-welcome-email', async (req, res) => {
  const { userName, userEmail } = req.body;

  if (!userName || !userEmail) {
    return res.status(400).json({ message: 'User name and email are required.' });
  }

  const subject = `Welcome to Our Platform, ${userName}!`;
  const body = `
    <h1>Welcome, ${userName}!</h1>
    <p>Thanks for joining our platform. We're excited to have you!</p>
    <p>Best regards,<br>The ${process.env.APP_NAME} Team</p>
  `;

  const mailOptions = {
    to: userEmail,
    subject,
    html: body,
    replyTo: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
  };

  try {
    await sendGenericEmail(mailOptions);
    res.status(200).json({ message: `Welcome email sent to ${userEmail}.` });
  } catch (error) {
    res.status(500).json({ message: 'Welcome email failed to send.', error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*', credentials: true, optionSuccessStatus: 200 }));
app.use(express.json());

// Nodemailer Transporter Setup for GoDaddy
const transporter = nodemailer.createTransport({
  host: "smtpout.secureserver.net", // GoDaddy SMTP server
  port: 465,
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER, // Your GoDaddy email address
    pass: process.env.EMAIL_PASS  // Your GoDaddy email password
  }
});

// Verify SMTP connection
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP configuration error:', error);
  } else {
    console.log('SMTP server is ready to send emails.');
  }
});

// Utility function to send an email
async function sendEmail(mailOptions) {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// POST /api/send-email endpoint
app.post('/api/send-email', async (req, res) => {
  const { name, email, subject, message, phone } = req.body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'Please fill in all required fields: name, email, subject, and message.' });
  }

  // Email content
  const emailSubject = `Contact Form: ${subject}`;
  const emailBody = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
    <h3>Message:</h3>
    <p>${message.replace(/\n/g, '<br>')}</p>
    <hr />
    <p>This email was sent from your website's contact form.</p>
  `;

  // Email options
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Website'}" <${process.env.EMAIL_USER}>`,
    to: email, // Send email to the user who filled the form
    subject: emailSubject,
    html: emailBody,
    replyTo: process.env.EMAIL_USER
  };

  // Send email
  try {
    await sendEmail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully to the user.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send email.', error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

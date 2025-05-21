require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware

const corsOptions ={
   origin:'*', 
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200,
}
app.use(cors(corsOptions))
app.use(express.json());

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Error with Nodemailer transporter config:', error);
  } else {
    console.log('Nodemailer transporter is ready to send emails');
  }
});

// --- Reusable Email Sending Function ---
async function sendGenericEmail(mailOptions) {
  const optionsWithDefaults = {
    from: `"${process.env.APP_NAME || 'Your Application'}" <${process.env.EMAIL_USER}>`,
    ...mailOptions,
  };

  try {
    const info = await transporter.sendMail(optionsWithDefaults);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email via generic function:', error);
    if (error.response) {
      console.error('Error response:', error.response);
    }
    if (error.responseCode) {
      console.error('Error response code:', error.responseCode);
    }
    throw error;
  }
}

// --- ORIGINAL API Endpoint (for your OLD component) ---
// This endpoint expects a payload similar to your initial backend setup.
// Expected fields: name, email, company, phone, message, subject (for general), service (for business/support), inquiryType
app.post('/api/send-email', async (req, res) => {
  const {
    name,
    email,
    company,      // Field from your original backend
    phone,
    message,
    subject: generalSubject, // Subject specific to general inquiry in original logic
    service,      // Specific to business/support in original logic
    inquiryType,  // E.g., 'general', 'business', 'support' from original logic
  } = req.body;

  if (!name || !email || !message || !inquiryType) {
    return res.status(400).json({ message: 'Name, email, message, and inquiryType are required.' });
  }

  let emailSubjectLine = `New Contact Form Submission - ${inquiryType.charAt(0).toUpperCase() + inquiryType.slice(1)}`;
  let emailBody = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Inquiry Type:</strong> ${inquiryType}</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
  `;

  if (company) emailBody += `<p><strong>Company:</strong> ${company}</p>`;
  if (phone) emailBody += `<p><strong>Phone:</strong> ${phone}</p>`;

  if (inquiryType === 'general' && generalSubject) {
    emailBody += `<p><strong>Subject:</strong> ${generalSubject}</p>`;
  } else if ((inquiryType === 'business' || inquiryType === 'support') && service) {
    const serviceLabel = inquiryType === 'business' ? "Partnership Type / Service of Interest" : "Issue Category / Service";
    emailBody += `<p><strong>${serviceLabel}:</strong> ${service}</p>`;
  }

  emailBody += `<h3>Message:</h3><p>${message.replace(/\n/g, '<br>')}</p>`;
  emailBody += `<hr><p>This email was sent from the contact form on your website (Legacy Endpoint).</p>`;


  const mailOptions = {
    from: `"${name} via Contact Form" <${process.env.EMAIL_USER}>`,
    replyTo: email,
    to: process.env.EMAIL_RECEIVER || process.env.EMAIL_USER,
    subject: emailSubjectLine,
    html: emailBody,
  };

  try {
    await sendGenericEmail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send email. Server error.', error: error.message });
  }
});

// --- NEW API Endpoint (for your NEW ContactUs.tsx component) ---
// Expected fields from new component: name, email, phone, subject (userSubject), enquiryType, message, activeTab
app.post('/api/send-contact-email', async (req, res) => {
  const {
    name,
    email,
    phone,
    subject: userSubject, // Renamed from 'subject' to avoid conflict
    enquiryType,
    message,
    activeTab,
  } = req.body;

  if (!name || !email || !message || !userSubject || !enquiryType || !activeTab) {
    return res.status(400).json({
      message: 'Missing required fields: name, email, subject, enquiryType, message, and activeTab are required.'
    });
  }

  const tabLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  const emailSubjectLine = `New ${tabLabel} Inquiry: "${userSubject}" from ${name}`;

  let emailBody = `
    <h2>New Contact Form Submission (${tabLabel})</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
  `;

  if (phone) emailBody += `<p><strong>Phone:</strong> ${phone}</p>`;
  emailBody += `<p><strong>Selected Tab:</strong> ${tabLabel}</p>`;
  emailBody += `<p><strong>Enquiry Type (Dropdown):</strong> ${enquiryType}</p>`;
  emailBody += `<p><strong>User's Subject (Input Field):</strong> ${userSubject}</p>`;
  emailBody += `<h3>Message:</h3><p>${message.replace(/\n/g, '<br>')}</p>`;
  emailBody += `<hr><p>This email was sent from the new contact form on your website.</p>`;

  const mailOptions = {
    from: `"${name} (Contact Form)" <${process.env.EMAIL_USER}>`,
    replyTo: email,
    to: process.env.EMAIL_RECEIVER || process.env.EMAIL_USER,
    subject: emailSubjectLine,
    html: emailBody,
  };

  try {
    await sendGenericEmail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully! We will get back to you shortly.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send email. Please try again later.', error: error.message });
  }
});


// Example: API Endpoint for a Different Component (e.g., sending a welcome email) - kept for reusability demo
app.post('/api/send-welcome-email', async (req, res) => {
  const { userName, userEmail } = req.body;

  if (!userName || !userEmail) {
    return res.status(400).json({ message: 'User name and email are required for welcome email.' });
  }
  // ... (rest of the welcome email logic as in previous response)
  const welcomeSubject = `Welcome to Our Platform, ${userName}!`;
  const welcomeHtmlBody = `
    <h1>Welcome, ${userName}!</h1>
    <p>Thank you for signing up for Our Platform.</p>
    <p>We're excited to have you on board.</p>
    <p>Best regards,<br>The Our Platform Team</p>
  `;

  const mailOptions = {
    to: userEmail,
    subject: welcomeSubject,
    html: welcomeHtmlBody,
    replyTo: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER
  };

  try {
    await sendGenericEmail(mailOptions);
    res.status(200).json({ message: `Welcome email sent successfully to ${userEmail}!` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send welcome email.', error: error.message });
  }
});


app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});

// .env file should contain:
// EMAIL_USER=your_gmail_address@gmail.com
// EMAIL_PASS=your_gmail_app_password
// EMAIL_RECEIVER=email_address_to_receive_contact_form_submissions@example.com (can be same as EMAIL_USER)
// APP_NAME=Your Website Name
// PORT=3001
// SUPPORT_EMAIL=support_department_email@example.com (Optional, for welcome email example)

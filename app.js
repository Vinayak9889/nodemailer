require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001; // Using port from .env or default 3001

// Middleware
const corsOptions = {
    origin: '*', // Allow all origins for development. Restrict this in production!
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json()); // Parse JSON request bodies

// Nodemailer Transporter Setup for GoDaddy
const transporter = nodemailer.createTransport({
    host: 'smtpout.secureserver.net', // GoDaddy SMTP server
    port: 465, // Use 465 for SSL (recommended)
    secure: true, // true for port 465 (SSL)
    auth: {
        user: process.env.EMAIL_USER, // Your GoDaddy email (e.g., yourname@yourdomain.com)
        pass: process.env.EMAIL_PASS, // Your GoDaddy email password
    },
});

// Verify transporter connection
transporter.verify((error, success) => {
    if (error) {
        console.error('Error with Nodemailer transporter config:', error);
        if (error.response) console.error('Transporter Error Response:', error.response);
        if (error.responseCode) console.error('Transporter Error Response Code:', error.responseCode);
    } else {
        console.log('Nodemailer transporter is ready to send emails');
    }
});

// Reusable Email Sending Function
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

// ORIGINAL API Endpoint (for your OLD component)
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

// API Endpoint for the CTASection component
app.post('/api/request-demo', async (req, res) => {
    const { name, email, sector } = req.body;

    if (!name || !email || !sector) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_RECEIVER || process.env.EMAIL_USER,
        subject: `New Demo Request from ${name} - Manufacturing Solution`,
        html: `
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Manufacturing Sector:</strong> ${sector}</p>
            <p>This is a demo request from your website's CTA section.</p>
        `,
    };

    try {
        await sendGenericEmail(mailOptions);
        res.status(200).json({ message: 'Demo request sent successfully!' });
    } catch (error) {
        console.error('Error sending email for demo request:', error);
        res.status(500).json({ message: 'Failed to send demo request.', error: error.message });
    }
});

// NEW API Endpoint (for your NEW ContactUs.tsx component)
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

// NEW API Endpoint for Newsletter Subscription
app.post('/api/subscribe', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    // Email to admin (notification of new subscriber)
    const adminMailOptions = {
        to: process.env.EMAIL_RECEIVER || process.env.EMAIL_USER,
        subject: `New Newsletter Subscriber: ${email}`,
        html: `
            <h2>New Newsletter Subscription</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p>This email was subscribed via the newsletter form on your website.</p>
        `,
        replyTo: email,
    };

    // Welcome email to subscriber
    const welcomeMailOptions = {
        to: email,
        subject: `Welcome to ${process.env.APP_NAME || 'Our Newsletter'}!`,
        html: `
            <h1>Welcome to Our Newsletter!</h1>
            <p>Thank you for subscribing, ${email}!</p>
            <p>Stay tuned for the latest updates, insights, and news about our services and technologies.</p>
            <p>You can unsubscribe at any time using the link in our emails.</p>
            <p>Best regards,<br>${process.env.APP_NAME || 'Our Team'}</p>
        `,
    };

    try {
        // Send both admin notification and welcome email
        await Promise.all([
            sendGenericEmail(adminMailOptions),
            sendGenericEmail(welcomeMailOptions),
        ]);
        res.status(200).json({ message: 'Subscription successful! Welcome email sent.' });
    } catch (error) {
        console.error('Error handling newsletter subscription:', error);
        res.status(500).json({ message: 'Failed to process subscription. Please try again.', error: error.message });
    }
});

// Example API Endpoint for Welcome Email (unchanged)
app.post('/api/send-welcome-email', async (req, res) => {
    const { userName, userEmail } = req.body;

    if (!userName || !userEmail) {
        return res.status(400).json({ message: 'User name and email are required for welcome email.' });
    }

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
        replyTo: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
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

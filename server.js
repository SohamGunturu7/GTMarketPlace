import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Debug: Check if environment variables are loaded
console.log('Environment variables loaded:', {
  GMAIL_USER: process.env.GMAIL_USER ? 'Set' : 'Not set',
  GMAIL_PASS: process.env.GMAIL_PASS ? 'Set' : 'Not set'
});

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for the frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://gtmarketplace.org',
    'https://www.gtmarketplace.org',
    'https://d1k7i4r47gycm.cloudfront.net'
  ],
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Configure nodemailer transporter with Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  },
  debug: true, // Enable debug logging
  logger: true  // Enable logger
});

// Verify transporter configuration
transporter.verify(function(error, success) {
  if (error) {
    console.log('Transporter verification error:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});https://d1k7i4r47gycm.cloudfront.net/support

// Endpoint to handle issue reports
app.post('/api/report-issue', async (req, res) => {
  console.log('Received report request:', {
    body: req.body,
    headers: req.headers
  });

  const { reportText, userEmail } = req.body;
  
  if (!reportText) {
    console.log('Error: Report text is missing');
    return res.status(400).json({ error: 'Report text is required' });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.log('Error: Gmail credentials not configured');
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'Gmail credentials not properly configured'
    });
  }

  const mailOptions = {
    from: process.env.GMAIL_USER, // Use your Gmail address as the sender
    to: 'gunturu.soham@gmail.com',
    subject: 'Issue Report -- GT Marketplace',
    text: `Report from user ${userEmail || 'Anonymous'}:\n\n${reportText}`
  };

  try {
    console.log('Attempting to send email with options:', {
      ...mailOptions,
      auth: { user: process.env.GMAIL_USER, pass: '***' } // Log without exposing password
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    res.status(200).json({ message: 'Report sent successfully' });
  } catch (error) {
    console.error('Detailed error sending email:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    res.status(500).json({
      error: 'Failed to send report',
      details: error.message,
      code: error.code
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

app.get('/', (req, res) => {
  res.send('GT Marketplace Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
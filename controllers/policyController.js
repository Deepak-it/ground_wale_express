const asyncHandler = require('../utils/asyncHandler');

const terms = {
  title: 'Cric Info Terms & Conditions',
  sections: [
    'Terms of Service 1. Acceptance of Terms By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement. 2. Ground Owner Responsibilities As a ground owner, you are responsible for: Maintaining accurate ground information and pricing Ensuring the ground is available as per scheduled bookings Maintaining the quality and safety of facilities Honoring confirmed bookings 3. Payment Terms Payments are processed within 2-3 business days after booking completion. A service fee of 10% is deducted from each booking. 4. Cancellation Policy Customers can cancel bookings up to 4 hours before the scheduled time. Late cancellations may be subject to penalties as per platform policy. 5. Liability Ground owners are responsible for any incidents or injuries that occur on their premises during booking hours.'
  ],
};

const privacy = {
  title: 'Cric Info Privacy Policy',
  sections: [
    'Effective date: 14 July 2026. Controller: Cric Info. Contact: support@groundwale.com. DPO: dpo@groundwale.com.',
    'We collect account, authentication, booking, payout, uploaded media, and technical diagnostic data needed to provide and secure our services.',
    'We use personal data for account management, OTP/login security, operations, customer support, fraud prevention, compliance, and service improvements.',
    'We do not sell personal data for money. We may share data with hosting, communication, payout, analytics, support providers, and legal authorities when required.',
    'Users may request access, correction, deletion, portability, and details about data sharing. Users may request: Do Not Sell or Share My Personal Information by emailing support@groundwale.com.',
    'Legal basis (where applicable): contract, legitimate interests, legal obligations, and consent.',
    'Regional rights: GDPR (EU/UK), CCPA/CPRA (California), LGPD (Brazil), VCDPA (Virginia), including right to lodge complaints with supervisory authorities where applicable.',
    'Data retention: we retain data only as needed for operations, security, legal compliance, dispute resolution, and fraud prevention.',
  ],
};

exports.getTerms = asyncHandler(async (_req, res) => {
  res.json(terms);
});

exports.getPrivacy = asyncHandler(async (_req, res) => {
  res.json(privacy);
});
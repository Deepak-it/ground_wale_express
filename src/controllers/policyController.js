const asyncHandler = require('../utils/asyncHandler');

const terms = {
  title: 'Ground Wale Terms & Conditions',
  sections: [
    'Terms of Service 1. Acceptance of Terms By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement. 2. Ground Owner Responsibilities As a ground owner, you are responsible for: Maintaining accurate ground information and pricing Ensuring the ground is available as per scheduled bookings Maintaining the quality and safety of facilities Honoring confirmed bookings 3. Payment Terms Payments are processed within 2-3 business days after booking completion. A service fee of 10% is deducted from each booking. 4. Cancellation Policy Customers can cancel bookings up to 4 hours before the scheduled time. Late cancellations may be subject to penalties as per platform policy. 5. Liability Ground owners are responsible for any incidents or injuries that occur on their premises during booking hours.'
  ],
};

const privacy = {
  title: 'Ground Wale Privacy Policy',
  sections: [
    'Terms of Service 1. Acceptance of Terms By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement. 2. Ground Owner Responsibilities As a ground owner, you are responsible for: Maintaining accurate ground information and pricing Ensuring the ground is available as per scheduled bookings Maintaining the quality and safety of facilities Honoring confirmed bookings 3. Payment Terms Payments are processed within 2-3 business days after booking completion. A service fee of 10% is deducted from each booking. 4. Cancellation Policy Customers can cancel bookings up to 4 hours before the scheduled time. Late cancellations may be subject to penalties as per platform policy. 5. Liability Ground owners are responsible for any incidents or injuries that occur on their premises during booking hours.',
  ],
};

exports.getTerms = asyncHandler(async (_req, res) => {
  res.json(terms);
});

exports.getPrivacy = asyncHandler(async (_req, res) => {
  res.json(privacy);
});
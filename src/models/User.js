const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema(
  {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    accountHolderName: { type: String, trim: true },
    branch: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
  },
  { _id: false },
);

const notificationPreferenceSchema = new mongoose.Schema(
  {
    bookingAlerts: { type: Boolean, default: true },
    paymentAlerts: { type: Boolean, default: true },
    reminders: { type: Boolean, default: false },
    promotionalOffers: { type: Boolean, default: true },
  },
  { _id: false },
);

function normalizeRole(value) {
  const role = String(value || '')
    .trim()
    .toLowerCase();

  if (!role) {
    return 'ground_owner';
  }

  if (
    role === 'box_cricket_owner' ||
    role === 'box' ||
    role === 'box cricket' ||
    role === 'box_cricket' ||
    role === 'boxcricket' ||
    role === 'box-cricket'
  ) {
    return 'box_cricket_owner';
  }

  if (role === 'academy_owner' || role === 'academy' || role === 'coach') {
    return 'academy_owner';
  }

  if (
    role === 'ground_owner' ||
    role === 'owner' ||
    role === 'ground' ||
    role === 'turf' ||
    role === 'turf_owner'
  ) {
    return 'ground_owner';
  }

  if (
    role === 'player' ||
    role === 'captain' ||
    role === 'sportsneo' ||
    role === 'sports neo' ||
    role === 'sports_neo' ||
    role === 'sports-neo'
  ) {
    return 'player';
  }

  return role;
}

const userSchema = new mongoose.Schema(
  {
    ownerName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true, index: true, unique: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    mapLocation: { type: String, trim: true },
    role: {
      type: String,
      enum: ['ground_owner', 'player', 'academy_owner', 'box_cricket_owner'],
      default: 'ground_owner',
      set: normalizeRole,
    },
    isCaptain: { type: Boolean, default: false },
    sportsNeoRole: { type: String, trim: true, lowercase: true },
    password: { type: String, trim: true },
    otpCode: { type: String, trim: true },
    otpExpiresAt: { type: Date },
    otpVerified: { type: Boolean, default: false },
    bankAccount: { type: bankAccountSchema, default: () => ({}) },
    communicationSettings: {
      type: new mongoose.Schema(
        {
          whatsappReminders: { type: Boolean, default: true },
          smsReminders: { type: Boolean, default: false },
          autoMessageTemplate: { type: String, trim: true },
        },
        { _id: false },
      ),
      default: () => ({
        whatsappReminders: true,
        smsReminders: false,
        autoMessageTemplate:
          'Dear Parents,\n\nYour fees are due for payment. Amount: ₹(amount)\nDue Date: (date)\n\nThank You,\nElite Sports Academy',
      }),
    },
    paymentMethods: {
      type: new mongoose.Schema(
        {
          upiEnabled: { type: Boolean, default: true },
          cashEnabled: { type: Boolean, default: true },
          bankTransferEnabled: { type: Boolean, default: false },
          upiId: { type: String, trim: true, default: '' },
        },
        { _id: false },
      ),
      default: () => ({
        upiEnabled: true,
        cashEnabled: true,
        bankTransferEnabled: false,
        upiId: '',
      }),
    },
    feePlans: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, trim: true },
            amount: { type: String, trim: true },
            duration: { type: String, trim: true },
            discountEnabled: { type: Boolean, default: false },
            discountLabel: { type: String, trim: true },
            discountValue: { type: String, trim: true },
            condition: { type: String, trim: true },
            payBeforeDate: { type: String, trim: true },
          },
          { _id: false },
        ),
      ],
      default: () => [],
    },
    notificationPreferences: {
      type: notificationPreferenceSchema,
      default: () => ({
        bookingAlerts: true,
        paymentAlerts: true,
        reminders: false,
        promotionalOffers: true,
      }),
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('validate', function normalizeStoredRole(next) {
  this.role = normalizeRole(this.role);
  next();
});

module.exports = mongoose.model('User', userSchema);
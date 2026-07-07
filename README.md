# Ground Wale Express API

Express + MongoDB backend prepared for the Flutter turf management flows in this workspace.

## What is included

- Cached MongoDB connection using Mongoose so the app does not create a new connection for every request.
- Pool sizing through environment variables.
- REST endpoints for:
  - turf owner auth and OTP verification
  - owner profile and bank account
  - ground registration and review status
  - facilities and pricing updates
  - slot management
  - booking history
  - wallet, withdrawals, and earning reports
  - notifications
  - dashboard summary
  - help and support tickets
  - terms and privacy policy content

## Setup

1. Open a terminal in the `express` directory.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and update the MongoDB URI if needed.
4. Start the API:

```bash
npm run dev
```

## Connection pooling

The database bootstrap is in `src/config/db.js`.

- The first request or server start establishes a single shared Mongoose connection.
- Later requests reuse the same process-wide connection.
- Pool tuning is controlled with `MAX_POOL_SIZE` and `MIN_POOL_SIZE`.

## Route summary

Base path: `/api/v1`

- `POST /auth/send-otp`
- `POST /auth/verify-otp`
- `POST /auth/logout`
- `GET /owners/:ownerId/profile`
- `PATCH /owners/:ownerId/profile`
- `GET /owners/:ownerId/bank-account`
- `PUT /owners/:ownerId/bank-account`
- `GET /owners/:ownerId/notifications`
- `PATCH /owners/:ownerId/notifications/:notificationId/read`
- `GET /owners/:ownerId/dashboard`
- `POST /grounds`
- `GET /grounds`
- `GET /grounds/:groundId`
- `PATCH /grounds/:groundId`
- `POST /grounds/:groundId/submit-review`
- `GET /grounds/:groundId/review-status`
- `PATCH /grounds/:groundId/facilities`
- `PATCH /grounds/:groundId/pricing`
- `PATCH /grounds/:groundId/ownership-verification`
- `GET /grounds/:groundId/slots`
- `POST /grounds/:groundId/slots`
- `PATCH /slots/:slotId`
- `POST /slots/:slotId/block`
- `DELETE /slots/:slotId`
- `GET /grounds/:groundId/bookings`
- `GET /bookings/:bookingId`
- `PATCH /bookings/:bookingId/status`
- `GET /grounds/:groundId/wallet`
- `GET /grounds/:groundId/wallet/transactions`
- `POST /grounds/:groundId/wallet/withdraw`
- `GET /grounds/:groundId/reports/earnings`
- `POST /support/tickets`
- `GET /policies/terms`
- `GET /policies/privacy`

## Notes

- This is a backend scaffold with real persistence and route wiring.
- Authentication is mocked around OTP payload flow for now. You can later replace it with SMS/email providers and JWT issuance.
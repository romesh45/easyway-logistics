# EasyWay Logistics – Backend API

> Node.js + Express.js + MongoDB backend for the EasyWay smart lorry load-matching platform.

---

## 📁 Project Structure

```
easyway-logistics/
├── config/
│   └── db.js                   # MongoDB connection
├── controllers/
│   ├── authController.js       # Register, login, profile
│   ├── vehicleController.js    # Vehicle CRUD (owner)
│   ├── loadController.js       # Load CRUD + matching algorithm
│   ├── availabilityController.js # Availability CRUD (owner)
│   ├── bookingController.js    # Full booking lifecycle
│   ├── paymentController.js    # UPI payment processing
│   ├── shipmentController.js   # Shipment tracking
│   └── reportController.js     # Reports + notifications
├── middleware/
│   ├── auth.js                 # JWT protect + restrictTo
│   ├── validate.js             # express-validator rules
│   └── errorHandler.js         # Centralised error handler
├── models/
│   ├── User.js                 # Users (sender / owner)
│   ├── Vehicle.js              # Vehicle fleet
│   ├── Load.js                 # Shipment requests
│   ├── Availability.js         # Owner availability posts
│   ├── Booking.js              # Booking lifecycle
│   ├── Payment.js              # UPI transactions
│   ├── Shipment.js             # Shipment tracking + Reports
│   └── Notification.js         # In-app notifications
├── routes/
│   ├── auth.js                 # /api/auth/*
│   ├── vehicles.js             # /api/vehicles/*
│   └── index.js                # All other routes
├── utils/
│   ├── helpers.js              # Fare calc, distance, JWT, matching
│   └── seed.js                 # Demo data seeder
├── .env                        # Environment config
├── package.json
└── server.js                   # Entry point
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18.0.0
- MongoDB (local or Atlas)

### 1. Install Dependencies
```bash
cd easyway-logistics
npm install
```

### 2. Configure Environment
Edit `.env` (already created with defaults):
```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/easyway
JWT_SECRET=your_strong_secret_here
CLIENT_ORIGIN=http://127.0.0.1:5500
```

For MongoDB Atlas:
```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/easyway
```

### 3. Seed Demo Data (optional)
```bash
npm run seed
```
Creates demo users, vehicles, loads, bookings, and shipments.

**Demo credentials after seeding:**
| Role   | Email              | Password    |
|--------|--------------------|-------------|
| Sender | priya@demo.com     | demo@1234   |
| Owner  | rajan@demo.com     | demo@1234   |
| Owner  | selvam@demo.com    | demo@1234   |
| Sender | kavitha@demo.com   | demo@1234   |

### 4. Run the Server
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```
Server starts at: **http://localhost:5001**

---

## 📡 Complete API Reference

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

### Authentication `/api/auth`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/register` | ❌ | any | Register new user |
| POST | `/api/auth/login` | ❌ | any | Login, receive JWT |
| GET | `/api/auth/me` | ✅ | any | Get current user |
| PUT | `/api/auth/profile` | ✅ | any | Update profile |
| PUT | `/api/auth/change-password` | ✅ | any | Change password |
| DELETE | `/api/auth/account` | ✅ | any | Deactivate account |

**Register body:**
```json
{
  "fullName": "Priya Sharma",
  "email": "priya@example.com",
  "phone": "+91 98765 43210",
  "password": "secure1234",
  "role": "sender",
  "company": "Sharma Electronics"
}
```
Owner registration with first vehicle:
```json
{
  "role": "owner",
  "vehicleNumber": "TN 38 CD 5678",
  "vehicleType": "closed_container",
  "capacity": 18,
  "ratePerKm": 22,
  "permitType": "all_india"
}
```

### Vehicles `/api/vehicles` (Owner only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vehicles` | List my vehicles |
| POST | `/api/vehicles` | Register new vehicle |
| GET | `/api/vehicles/:id` | Get vehicle details |
| PUT | `/api/vehicles/:id` | Update vehicle |
| DELETE | `/api/vehicles/:id` | Remove vehicle |

**Vehicle body:**
```json
{
  "vehicleNumber": "TN 38 CD 5678",
  "vehicleType": "closed_container",
  "capacity": 18,
  "ratePerKm": 22,
  "permitType": "all_india",
  "preferredRoutes": "Tamil Nadu, Karnataka",
  "notes": "AC cabin"
}
```

**Permit types:** `all_india` | `state` | `local` | `preferred`

**Vehicle types:** `mini_truck`, `pickup`, `tempo`, `tata_ace`, `bolero_pickup`, `lcv`, `hcv`, `open_truck`, `closed_container`, `container_20ft`, `container_40ft`, `trailer`, `flatbed`, `liquid_tanker`, `gas_tanker`, `refrigerated`, `car_carrier`, `tip_truck`, `dumper`, `crane_truck`, `half_body`, `full_body`, `multi_axle`

### Loads `/api/loads` (Sender only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/loads` | My load requests |
| POST | `/api/loads` | Post new load |
| GET | `/api/loads/:id` | Load details |
| PUT | `/api/loads/:id` | Edit load |
| DELETE | `/api/loads/:id` | Cancel load |
| **GET** | **`/api/loads/:id/matches`** | **Run matching algorithm** |

**Match query params:** `?sort=match|price|rating|date&permitFilter=all_india|state|local|preferred&page=1&limit=20`

**Match response:**
```json
{
  "success": true,
  "data": {
    "estimatedDistance": 347,
    "matches": [
      {
        "availabilityId": "...",
        "vehicleType": "closed_container",
        "capacity": 18,
        "ratePerKm": 22,
        "matchScore": 90,
        "fare": {
          "baseFare": 7634,
          "driverGST": 381,
          "platformFee": 229,
          "platformGST": 41,
          "totalEstimated": 8285,
          "advanceAmount": 2485,
          "remainingAmount": 5800
        },
        "owner": { "name": "Rajan Kumar", "rating": 4.9, "totalTrips": 142 }
      }
    ],
    "excluded": [{ "vehicleNumber": "KA01AB1234", "excludeReason": "Local permit — route out of area" }]
  }
}
```

### Availability `/api/availability` (Owner only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/availability` | Post availability |
| GET | `/api/availability/mine` | My active availability posts |
| PUT | `/api/availability/:id` | Update availability |
| DELETE | `/api/availability/:id` | Remove availability |

### Bookings `/api/bookings`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/bookings` | any | My bookings |
| POST | `/api/bookings` | sender | Create booking |
| GET | `/api/bookings/:id` | any | Booking details (contact gated) |
| PUT | `/api/bookings/:id/accept` | owner | Accept → reveals sender contact |
| PUT | `/api/bookings/:id/reject` | owner | Reject booking |
| PUT | `/api/bookings/:id/cancel` | any | Cancel with reason |

**Create booking body:**
```json
{ "loadId": "<mongo_id>", "availabilityId": "<mongo_id>" }
```

**Cancel booking body:**
```json
{
  "reason": "Vehicle breakdown on NH44",
  "reasonCode": "breakdown",
  "penaltyAcknowledged": true
}
```
Reason codes that **waive the penalty**: `breakdown`, `emergency`, `weather`, `route_issue`

### Payments `/api/payments`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/payments` | any | Transaction history |
| POST | `/api/payments/initiate` | sender | Start UPI payment |
| POST | `/api/payments/:id/confirm` | sender | Confirm / simulate UPI |
| GET | `/api/payments/booking/:id` | any | Payments for a booking |

**Initiate payment body:**
```json
{
  "bookingId": "<mongo_id>",
  "upiId": "priya@paytm",
  "method": "paytm"
}
```
Methods: `paytm` | `phonepe` | `gpay` | `bhim` | `amazonpay` | `other_upi`

**Confirm payment body:**
```json
{ "gatewayPaymentId": "GW_ABC123", "simulateSuccess": true }
```

### Shipments `/api/shipments`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/shipments` | any | My shipments |
| GET | `/api/shipments/:bookingId` | any | Shipment details + location history |
| PUT | `/api/shipments/:bookingId/status` | owner | Update status |
| PUT | `/api/shipments/:bookingId/location` | owner | Update GPS location |

**Status transitions:** `accepted → in_transit → delivered → completed`

**Update status body:**
```json
{
  "status": "in_transit",
  "currentLocation": "Salem, Tamil Nadu",
  "note": "Loaded and en route",
  "progressPercent": 25
}
```

### Reports `/api/reports` (Sender only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports` | File a driver report |
| GET | `/api/reports/mine` | My submitted reports |
| GET | `/api/reports/:id` | Report details |

**Report body:**
```json
{
  "bookingId": "<mongo_id>",
  "category": "late_arrival",
  "description": "Driver arrived 4 hours late without notice, causing loading delays at the warehouse.",
  "severity": "high",
  "vehicleNumber": "TN 38 CD 5678"
}
```
Categories: `late_arrival` | `unauthorized_charge` | `no_show` | `unprofessional` | `wrong_vehicle` | `damage` | `route_deviation` | `other`

### Notifications `/api/notifications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications (`?unreadOnly=true`) |
| PUT | `/api/notifications/mark-read` | Mark read (`{ "ids": ["id1"] }` or `"all"`) |

---

## 🔗 Connecting the HTML Frontend

Add this to your `easyway-v3.html` before the closing `</script>` tag:

```javascript
// ── API Configuration ─────────────────────────────────────────
const API_BASE = 'http://localhost:5001/api';

// Helper: authenticated fetch
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('ew_token');
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data;
}

// ── Auth ──────────────────────────────────────────────────────
async function apiLogin(email, password) {
  const { data } = await apiFetch('/auth/login', {
    method: 'POST', body: { email, password }
  });
  localStorage.setItem('ew_token', data.token);
  AppState.currentUser = data.user;
  return data;
}

async function apiRegister(formData) {
  const { data } = await apiFetch('/auth/register', {
    method: 'POST', body: formData
  });
  localStorage.setItem('ew_token', data.token);
  AppState.currentUser = data.user;
  return data;
}

// ── Loads & Matching ──────────────────────────────────────────
async function apiPostLoad(loadData) {
  const { data } = await apiFetch('/loads', { method: 'POST', body: loadData });
  return data;
}

async function apiGetMatches(loadId, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const { data } = await apiFetch(`/loads/${loadId}/matches?${params}`);
  return data;
}

// ── Bookings ──────────────────────────────────────────────────
async function apiCreateBooking(loadId, availabilityId) {
  const { data } = await apiFetch('/bookings', {
    method: 'POST', body: { loadId, availabilityId }
  });
  return data;
}

async function apiAcceptBooking(bookingId) {
  const { data } = await apiFetch(`/bookings/${bookingId}/accept`, { method: 'PUT' });
  return data;
}

async function apiCancelBooking(bookingId, reason, reasonCode, penaltyAcknowledged) {
  const { data } = await apiFetch(`/bookings/${bookingId}/cancel`, {
    method: 'PUT',
    body: { reason, reasonCode, penaltyAcknowledged }
  });
  return data;
}

// ── Payments ──────────────────────────────────────────────────
async function apiInitiatePayment(bookingId, upiId, method) {
  const { data } = await apiFetch('/payments/initiate', {
    method: 'POST', body: { bookingId, upiId, method }
  });
  return data;
}

async function apiConfirmPayment(paymentId) {
  const { data } = await apiFetch(`/payments/${paymentId}/confirm`, {
    method: 'POST', body: { simulateSuccess: true }
  });
  return data;
}

// ── Reports ───────────────────────────────────────────────────
async function apiSubmitReport(bookingId, category, description, severity) {
  const { data } = await apiFetch('/reports', {
    method: 'POST', body: { bookingId, category, description, severity }
  });
  return data;
}
```

---

## 🛡️ Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt with salt rounds = 12 |
| Authentication | JWT (7-day expiry) |
| Role-based access | `restrictTo('sender')` / `restrictTo('owner')` middleware |
| Input validation | express-validator on all routes |
| NoSQL injection | express-mongo-sanitize |
| HTTP headers | Helmet.js |
| Rate limiting | 100 req/15min global; 20 req/15min for auth |
| Contact privacy | Phone numbers gated behind booking acceptance |

---

## 💰 Pricing Formula

```
baseFare       = distance(km) × ratePerKm
driverGST      = baseFare × 5%
platformFee    = baseFare × 3%
platformGST    = platformFee × 18%
totalEstimated = baseFare + driverGST + platformFee + platformGST
advanceAmount  = totalEstimated × 30%
remaining      = totalEstimated - advanceAmount
```

## 🚫 Cancellation Policy

| Scenario | Penalty |
|----------|---------|
| Before advance payment | Free, no penalty |
| After confirmation | ₹500–₹1,500 (10% of total) |
| Reason: `breakdown`, `emergency`, `weather`, `route_issue` | Penalty waived automatically |

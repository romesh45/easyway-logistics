# ⚡ EasyWay: Algorithmic Freight Matching Engine

> An enterprise-grade Digital Freight Matching (DFM) backend. Replaces manual freight brokering with a programmatic load-to-vehicle matching algorithm, dynamic pricing engine, and automated real-time dispatch lifecycle.

---

## 🌍 The Problem It Solves

The commercial logistics sector suffers from massive inefficiencies—often referred to as "empty miles." Traditional freight brokers rely on manual phone calls, fragmented WhatsApp chats, and static rate sheets. This results in trucks driving empty on return trips, significantly delayed shipments, and inflated B2B supply chain costs.

**EasyWay** acts as a high-speed, programmatic middleman. It ingests freight requests (loads) and instantly maps them to available trucking assets based on strict geospatial boundaries, capacity limits, and permit constraints—optimizing asset utilization and dynamically calculating fair-market pricing.

---

## 🏗 System Architecture & Data Flow

EasyWay operates via a strict state-machine lifecycle, progressing shipments from matching to delivery.

1. **Ingestion & Constraint Mapping**: Senders post `Load` requirements (weight, vehicle type). Owners post `Availability`.
2. **Algorithmic Matching**: The `LoadController` executes an intersection of requirements. It filters out vehicles lacking sufficient capacity, calculates distance heuristically, and enforces regulatory permit checks (e.g., stripping out `local` permit trucks attempting `interstate` routes).
3. **Dynamic Pricing Engine**: Generates real-time fare breakdowns (Base Fare + Platforms Fees + Taxes) based on the computed distance matrix and the specific asset's `ratePerKm`.
4. **Dispatch State Machine**: Implements a strict unidirectional flow (`pending` → `accepted` → `confirmed` → `in_transit` → `delivered`), securely gating PII (driver/sender contact info) until the contract is accepted.
5. **Dispute & Reporting**: Integrates a weighted severity reporting system to handle real-world supply chain anomalies (e.g., driver no-shows, cargo damage).

---

## 🛠 Technical Stack & Engineering Decisions

* **Runtime:** `Node.js` + `Express.js` — Chosen for its non-blocking I/O, ideal for handling highly concurrent HTTP requests typical of fleet-tracking and matchmaking systems.
* **Database:** `MongoDB` (Mongoose) — Document store provides the schema flexibility necessary to handle deeply nested logistics data (e.g., location histories, dynamic fare breakdowns) without rigid SQL migrations.
* **Security:** `Helmet`, `express-mongo-sanitize`, `bcryptjs`, JWT — Implements robust protection against NoSQL injection, XSS attacks, and secures endpoints using short-lived stateless JWTs with role-based access control (RBAC).
* **Traffic Control:** `express-rate-limit` — Stricter throttling on authentication routes to mitigate brute-force attacks, alongside global endpoint rate-limiting to prevent API abuse.

---

## ⚙️ Core Engineering Features

* **Constraint-Based Matchmaking:** Context-aware sorting of fleet assets based on date viability, cargo size requirements, and localized state permits.
* **Deterministic Pricing Matrix:** programmatic calculation of advance payouts (30%), platform cuts (3%), and driver GST (5%), ensuring financial synchrony for the platform.
* **Automated Penalty System:** A sophisticated cancellation webhook that checks reason codes (`emergency`, `weather` waive fees, while `no_show` applies a dynamic 10% penalty).
* **Audit-able Location Tracking:** Appends GPS location arrays to shipments securely via the tracking API, rather than blindly overwriting coordinates, maintaining a reliable ledger of movement.

---

## 🚀 Learning Outcomes & Roadmap

### Why This Matters
Building this required moving beyond standard CRUD operations and modeling **real-world business constraints**. It forced the handling of edge-cases that modern supply chains face daily—refund thresholds, privacy gating, and permit exclusions.

### V2 Roadmap (Upcoming)
* **PostGIS / MongoDB $geoNear:** Upgrading the heuristic distance matcher to use true geospatial queries and bounding boxes for radius-based matching.
* **Event-Driven WebSockets (`Socket.io`):** Replacing polling with an event-driven architecture to broadcast live GPS telemetry of trucks to shippers.
* **Message Broker (`RabbitMQ / BullMQ`):** Offloading heavy notification dispatches (emails/SMS for bookings) to a background worker queue to reduce API latency.
* **TypeScript Migration:** Introducing strict static typing for complex `Fare` and `Booking` objects to prevent runtime property errors.

---

*This project was developed to demonstrate backend systems design, robust API development, and the programmatic modeling of B2B supply-chain architectures.*

// utils/seed.js – Populate MongoDB with realistic demo data
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Availability = require('../models/Availability');
const Load = require('../models/Load');
const Booking = require('../models/Booking');
const { Shipment } = require('../models/Shipment');
const { getDistanceKm, calculateFare } = require('./helpers');

const connectDB = require('../config/db');

const run = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Clean existing data
  await Promise.all([
    User.deleteMany({}), Vehicle.deleteMany({}), Availability.deleteMany({}),
    Load.deleteMany({}), Booking.deleteMany({}), Shipment.deleteMany({}),
  ]);

  // ── Create Users ──────────────────────────────────────────────
  const [priya, rajan, selvam, kavitha, murugan] = await User.create([
    {
      fullName: 'Priya Sharma', email: 'priya@demo.com', phone: '+91 98765 43210',
      password: 'demo@1234', role: 'sender', company: 'Sharma Electronics',
      address: 'Nungambakkam, Chennai', rating: 4.9,
    },
    {
      fullName: 'Rajan Kumar', email: 'rajan@demo.com', phone: '+91 87654 32109',
      password: 'demo@1234', role: 'owner', rating: 4.9, totalTrips: 142,
    },
    {
      fullName: 'Selvam Raj', email: 'selvam@demo.com', phone: '+91 76543 21098',
      password: 'demo@1234', role: 'owner', rating: 4.6, totalTrips: 98,
    },
    {
      fullName: 'Kavitha S', email: 'kavitha@demo.com', phone: '+91 99887 76655',
      password: 'demo@1234', role: 'sender', company: 'KV Garments',
      address: 'Coimbatore', rating: 4.7,
    },
    {
      fullName: 'Murugan T', email: 'murugan@demo.com', phone: '+91 94567 89012',
      password: 'demo@1234', role: 'owner', rating: 4.8, totalTrips: 210,
    },
  ]);

  // ── Create Vehicles ───────────────────────────────────────────
  const [v1, v2, v3, v4, v5] = await Vehicle.create([
    {
      owner: rajan._id, vehicleNumber: 'TN 38 CD 5678', vehicleType: 'closed_container',
      capacity: 18, ratePerKm: 22, permitType: 'all_india', isPrimary: true,
    },
    {
      owner: rajan._id, vehicleNumber: 'TN 38 EF 9012', vehicleType: 'open_truck',
      capacity: 12, ratePerKm: 15, permitType: 'state',
      preferredRoutes: 'Tamil Nadu, Karnataka', preferredAreas: ['tamil nadu', 'karnataka'],
    },
    {
      owner: selvam._id, vehicleNumber: 'TN 37 XY 9876', vehicleType: 'open_truck',
      capacity: 10, ratePerKm: 14, permitType: 'state',
      preferredRoutes: 'Tamil Nadu, Andhra Pradesh', preferredAreas: ['tamil nadu', 'andhra pradesh'],
      isPrimary: true,
    },
    {
      owner: selvam._id, vehicleNumber: 'KA 05 MN 3344', vehicleType: 'refrigerated',
      capacity: 8, ratePerKm: 28, permitType: 'all_india', isPrimary: false,
    },
    {
      owner: murugan._id, vehicleNumber: 'TN 02 AB 1234', vehicleType: 'container_20ft',
      capacity: 25, ratePerKm: 30, permitType: 'all_india', isPrimary: true,
    },
  ]);

  // ── Create Availabilities ─────────────────────────────────────
  const today = new Date();
  const d = (offset) => new Date(today.getTime() + offset * 86400000);

  const [a1, a2, a3, a4] = await Availability.create([
    { owner: rajan._id, vehicle: v1._id, currentLocation: 'Chennai', preferredRoute: 'Chennai - Bangalore', availableDate: d(0), ratePerKm: 22, status: 'active' },
    { owner: rajan._id, vehicle: v2._id, currentLocation: 'Coimbatore', preferredRoute: 'Coimbatore - Hyderabad', availableDate: d(1), ratePerKm: 15, status: 'active' },
    { owner: selvam._id, vehicle: v3._id, currentLocation: 'Madurai', preferredRoute: 'Madurai - Any', availableDate: d(0), ratePerKm: 14, status: 'active' },
    { owner: murugan._id, vehicle: v5._id, currentLocation: 'Chennai', preferredRoute: 'Chennai - Delhi', availableDate: d(2), ratePerKm: 30, status: 'active' },
  ]);

  // ── Create Loads ──────────────────────────────────────────────
  const [l1, l2] = await Load.create([
    {
      sender: priya._id, pickup: 'Chennai', drop: 'Bangalore',
      weight: 12, preferredDate: d(0), vehicleType: 'closed_container',
      budget: 10000, notes: 'Electronics – handle with care', status: 'booked',
    },
    {
      sender: kavitha._id, pickup: 'Coimbatore', drop: 'Hyderabad',
      weight: 8, preferredDate: d(1), vehicleType: 'open_truck',
      budget: 14000, notes: 'Garments, 2 consignments', status: 'in_transit',
    },
  ]);

  // ── Create Bookings & Shipments ───────────────────────────────
  const dist1 = getDistanceKm('Chennai', 'Bangalore');
  const fare1 = calculateFare(dist1, 22);

  const bk1 = await Booking.create({
    bookingRef: 'BK10000001',
    sender: priya._id, owner: rajan._id, vehicle: v1._id,
    load: l1._id, availability: a1._id,
    pickup: 'Chennai', drop: 'Bangalore',
    estimatedDistance: dist1, ratePerKm: 22,
    fareBreakdown: fare1,
    status: 'confirmed',
    senderContactRevealed: true, ownerContactRevealed: true,
    acceptedAt: new Date(), confirmedAt: new Date(),
  });

  const dist2 = getDistanceKm('Coimbatore', 'Hyderabad');
  const fare2 = calculateFare(dist2, 14);

  const bk2 = await Booking.create({
    bookingRef: 'BK10000002',
    sender: kavitha._id, owner: selvam._id, vehicle: v3._id,
    load: l2._id, availability: a2._id,
    pickup: 'Coimbatore', drop: 'Hyderabad',
    estimatedDistance: dist2, ratePerKm: 14,
    fareBreakdown: fare2,
    status: 'in_transit',
    senderContactRevealed: true, ownerContactRevealed: true,
    acceptedAt: new Date(), confirmedAt: new Date(),
  });

  await Shipment.create([
    {
      booking: bk1._id, sender: priya._id, owner: rajan._id, vehicle: v1._id,
      status: 'accepted', currentLocation: 'Chennai',
      estimatedDelivery: d(1), progressPercent: 0,
    },
    {
      booking: bk2._id, sender: kavitha._id, owner: selvam._id, vehicle: v3._id,
      status: 'in_transit', currentLocation: 'Bellary, Karnataka',
      estimatedDelivery: d(1), progressPercent: 52,
      locationHistory: [
        { location: 'Coimbatore', note: 'Goods loaded', timestamp: new Date(Date.now() - 8 * 3600000) },
        { location: 'Salem', note: 'In transit', timestamp: new Date(Date.now() - 4 * 3600000) },
        { location: 'Bellary, Karnataka', note: 'On highway', timestamp: new Date() },
      ],
    },
  ]);

  console.log('✅ Seed complete!');
  console.log('\n📋 Demo Login Credentials:');
  console.log('   Sender: priya@demo.com / demo@1234');
  console.log('   Owner:  rajan@demo.com / demo@1234');
  console.log('   Owner:  selvam@demo.com / demo@1234');
  console.log('   Sender: kavitha@demo.com / demo@1234\n');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => { console.error(err); process.exit(1); });

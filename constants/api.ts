// Your Mac's local network IP — both iOS and Android physical devices use this.
// If you switch networks (e.g. different WiFi), update this IP.
const LOCAL_IP = '192.168.1.43';

// export const API_BASE_URL = `http://${LOCAL_IP}:8002/api`;
export const API_BASE_URL = `https://truck-management-backend-virginia.onrender.com/api`;

export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',

  // User
  UPDATE_PROFILE: '/users/complete-profile',
  MY_TAB_ACCESS: '/users/me/tab-access',

  // Trucks
  TRUCKS: '/truck',
  MY_TRUCKS: '/truck/my-trucks',

  // Trips
  TRIPS: '/trip',
  MY_TRIPS: '/trip/my-trips',
  TRIPS_BY_TRUCK: (truckId: string) => `/trip/truck/${truckId}`,

  // Drivers
  DRIVERS: '/driver',
  DRIVER_TRANSACTIONS: '/driver/transactions',

  // Approvals
  APPROVALS: '/approval',
  APPROVALS_PENDING: '/approval/pending',
  APPROVALS_APPROVE: '/approval/approve',
  APPROVALS_REJECT: '/approval/reject',

  // Users
  USERS: '/users',

  // Bank Entries
  BANK_ENTRIES: '/bank-entries',

  // Daily Ops
  DAILY_OPS_AVAILABILITY: '/daily-ops/availability',
  DAILY_OPS_ASSIGNMENTS: '/daily-ops/assignments',
  DAILY_OPS_SNAPSHOT: '/daily-ops/director-snapshot',
};

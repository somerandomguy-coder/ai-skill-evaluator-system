import type { UserView } from "./types";

/**
 * Standard demo accounts.
 * Provides instant login without waiting for remote DB roundtrips,
 * and guarantees candidate and mentor roles are always resolved correctly.
 */
export const DEMO_USERS: UserView[] = [
  { id: "candidate-1", email: "candidate@proofcraft.dev", name: "Alex Chen", role: "CANDIDATE" },
  { id: "mentor-1", email: "mentor@proofcraft.dev", name: "Dr. Sarah Lin", role: "MENTOR" },
  { id: "u-alex", email: "alex.morgan@example.com", name: "Alex Morgan", role: "CANDIDATE" },
  { id: "u-riley", email: "riley.chen@example.com", name: "Riley Chen", role: "CANDIDATE" },
  { id: "u-jordan", email: "jordan.ellis@example.com", name: "Jordan Ellis", role: "CANDIDATE" },
  { id: "u-casey", email: "casey.rivera@example.com", name: "Casey Rivera", role: "MENTOR" },
  { id: "u-robin", email: "robin.patel@example.com", name: "Robin Patel", role: "MENTOR" },
];

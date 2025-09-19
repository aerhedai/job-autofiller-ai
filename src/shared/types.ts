export type Profile = {
  id: string;
  displayName: string;
  // --- Basic Info ---
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  address?: string;
  // --- Professional Info ---
  rightToWork?: string; // e.g., "Yes"
  rightToWorkMethod?: string; // e.g., "British Citizen"
  nationality?: string; // e.g., "British"
  degree?: string;
  university?: string;
  // --- Common Application Questions ---
  securityClearance?: string; // e.g., "Yes, I agree to a security check"
  criminalConvictions?: string; // e.g., "No"
  livedAbroad?: string; // e.g., "No"
  disability?: string; // e.g., "No"
  // --- AI Generated Answers ---
  longAnswers?: Record<string,string>;
};
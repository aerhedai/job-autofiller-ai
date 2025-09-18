export type Profile = {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  rightToWork?: string;
  degree?: string;
  longAnswers?: Record<string,string>;
};
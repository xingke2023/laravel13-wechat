import { apiClient } from './client';

export interface AttendeeInput {
  name: string;
  phone: string;
  industry: string;
  email?: string;
  source?: string;
}

export interface Attendee extends AttendeeInput {
  id: number;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export const attendeesApi = {
  create: (data: AttendeeInput) =>
    apiClient.post<{ message: string; attendee: Attendee }>('/attendees', data),
};

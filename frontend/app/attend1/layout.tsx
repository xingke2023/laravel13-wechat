import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '盈信家办参会登记',
  description: '盈信家办参会登记',
};

export default function AttendLayout({ children }: { children: React.ReactNode }) {
  return children;
}

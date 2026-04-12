import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/user-auth';
import CabinetShell from './cabinet-shell';

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  return <CabinetShell user={user}>{children}</CabinetShell>;
}

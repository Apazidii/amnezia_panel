import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/options';

export default async function Home() {
    const session = await getServerSession(authOptions);
    if (session?.user.role === 'CLIENT') {
        return redirect('/cabinet');
    }
    return redirect('/clients');
}

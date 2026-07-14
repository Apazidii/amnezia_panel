'use client';

import { useSession } from 'next-auth/react';
import { AppSidebar } from './app-sidebar';
import { navigation } from '@/lib/data/navigation';
import { rolesHierarchy } from '@/lib/utils';

export function SidebarPermissions() {
    const { data: session } = useSession();

    const userRole = session?.user.role;

    if (!userRole) return;

    const filteredNavMain = navigation.navMain
        .map((section) => {
            const items = section.items.filter((item) => {
                if (userRole === 'CLIENT') {
                    return item.role === 'CLIENT';
                }

                if (item.role === 'CLIENT') {
                    return false;
                }

                return (
                    rolesHierarchy.indexOf(userRole as (typeof rolesHierarchy)[number]) >=
                    rolesHierarchy.indexOf(item.role as (typeof rolesHierarchy)[number])
                );
            });

            return { ...section, items };
        })
        .filter((section) => section.items.length > 0);

    const filteredNavigation = {
        ...navigation,
        navMain: filteredNavMain,
    };
    return <AppSidebar navigation={filteredNavigation} />;
}

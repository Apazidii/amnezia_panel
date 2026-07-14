import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const adminOnlyPrefixes = [
    '/clients',
    '/create-client',
    '/servers',
    '/server-info',
    '/logs',
    '/payment-settings',
    '/notification',
    '/admins',
];

export default withAuth(
    function proxy(req) {
        const token = req.nextauth.token;
        const isAuth = !!token;
        const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
        const isApiRoute = req.nextUrl.pathname.startsWith('/api');
        const isCabinetRoute = req.nextUrl.pathname.startsWith('/cabinet');
        const isClient = token?.role === 'CLIENT';
        const isAdminRoute = adminOnlyPrefixes.some(
            (prefix) =>
                req.nextUrl.pathname === prefix || req.nextUrl.pathname.startsWith(`${prefix}/`)
        );

        if (isApiRoute) {
            if (req.nextUrl.pathname.startsWith('/api/trpc') && !token) {
                return NextResponse.redirect(new URL('/auth/login', req.url));
            }
            return NextResponse.next();
        }

        if (isAuthPage) {
            if (isAuth) {
                if (req.nextUrl.pathname === '/auth/change-password') return NextResponse.next();
                const redirectTo = isClient ? '/cabinet' : '/clients';
                return NextResponse.redirect(new URL(redirectTo, req.url));
            }
            return NextResponse.next();
        }

        if (!isAuth) return NextResponse.redirect(new URL('/auth/login', req.url));

        if (
            token?.isFirstLogin &&
            req.nextUrl.pathname !== '/auth/change-password' &&
            !isApiRoute
        ) {
            return NextResponse.redirect(new URL('/auth/change-password', req.url));
        }

        if (isClient && isAdminRoute) {
            return NextResponse.redirect(new URL('/cabinet', req.url));
        }

        if (!isClient && isCabinetRoute) {
            return NextResponse.redirect(new URL('/clients', req.url));
        }

        if (req.nextUrl.pathname === '/' || req.nextUrl.pathname === '') {
            return NextResponse.redirect(new URL(isClient ? '/cabinet' : '/clients', req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                if (req.nextUrl.pathname.startsWith('/api')) return true;
                if (req.nextUrl.pathname === '/auth/login') return true;

                return !!token;
            },
        },
    }
);

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import { db } from '../db';
import { CustomPrismaAdapter } from './adapter';
import type { Roles } from 'prisma/generated/enums';
import { logsService } from '../services/logs';

export const authOptions: NextAuthOptions = {
    adapter: CustomPrismaAdapter(),
    secret: process.env.AUTH_SECRET,
    session: {
        strategy: 'jwt',
        maxAge: 2 * 60 * 60, // 2 hours
    },
    jwt: {
        maxAge: 2 * 60 * 60, // 2 hours
    },
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                login: { label: 'Login', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.login || !credentials?.password) return null;

                const admin = await db.admins.findUnique({
                    where: { login: credentials.login },
                });

                if (admin?.password) {
                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        admin.password
                    );

                    if (!isPasswordValid) return null;

                    await logsService.createLog(
                        'ADMIN',
                        'INFO',
                        `Authorize success for admin <${credentials.login}>`
                    );

                    return {
                        id: admin.id,
                        role: admin.role,
                        login: admin.login,
                        isFirstLogin: admin.isFirstLogin,
                    };
                }

                const client = await db.clients.findUnique({
                    where: { login: credentials.login },
                });

                if (!client?.password || !client.status) return null;

                const isPasswordValid = await bcrypt.compare(credentials.password, client.password);

                if (!isPasswordValid) return null;

                await logsService.createLog(
                    'CLIENT',
                    'INFO',
                    `Authorize success for client <${credentials.login}>`
                );

                return {
                    id: String(client.id),
                    role: 'CLIENT' as Roles,
                    login: client.login!,
                    isFirstLogin: client.isFirstLogin,
                    clientId: client.id,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.login = user.login;
                token.isFirstLogin = user.isFirstLogin;
                token.clientId = user.clientId;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role as Roles;
                session.user.login = token.login;
                session.user.isFirstLogin = token.isFirstLogin;
                session.user.clientId = token.clientId;
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/login',
    },
};

import { z } from 'zod';

import { createTRPCRouter, clientProcedure } from '@/server/api/trpc';
import { createCabinetConfigSchema } from '@/lib/schemas/cabinet';
import { amneziaApiService } from '@/server/services/amnezia-api';
import { protocolsApiMapping } from '@/lib/data/mappings';
import { encryptionService } from '@/server/services/encryption';
import { TRPCError } from '@trpc/server';
import { logsService } from '@/server/services/logs';
import { Protocols } from 'prisma/generated/enums';
import type { IPeer } from '@/server/interfaces/amnezia-api';

export const cabinetRouter = createTRPCRouter({
    getMe: clientProcedure.query(async ({ ctx }) => {
        const client = await ctx.db.clients.findUnique({
            where: { id: ctx.clientId },
            select: {
                id: true,
                name: true,
                login: true,
                serverId: true,
                Servers: { select: { id: true, name: true } },
            },
        });

        if (!client) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        return client;
    }),

    getMyConfigs: clientProcedure.query(async ({ ctx }) => {
        const configs = await ctx.db.configs.findMany({
            where: { clientId: ctx.clientId },
            select: {
                id: true,
                createdAt: true,
                clientName: true,
                expiresAt: true,
                protocol: true,
                status: true,
                serverId: true,
                Servers: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!ctx.clientServerId || configs.length === 0) {
            return configs.map((config) => ({
                ...config,
                online: false,
                lastHandshake: null as string | null,
                traffic: { received: 0, sent: 0 },
                allowedIps: [] as string[],
                endpoint: null as string | null,
                serverName: config.Servers.name,
            }));
        }

        let apiDevicesMap = new Map<string, IPeer>();
        try {
            const apiConfigs = await amneziaApiService.getConfigs(ctx.clientServerId);
            for (const user of apiConfigs.items) {
                for (const device of user.peers) {
                    apiDevicesMap.set(device.id, device);
                }
            }
        } catch {
            apiDevicesMap = new Map();
        }

        return configs.map((config) => {
            const apiDevice = apiDevicesMap.get(config.id);
            return {
                ...config,
                status: apiDevice ? apiDevice.status === 'active' : config.status,
                online: apiDevice?.online ?? false,
                lastHandshake: apiDevice ? String(apiDevice.lastHandshake) : null,
                traffic: apiDevice?.traffic ?? { received: 0, sent: 0 },
                allowedIps: apiDevice?.allowedIps ?? [],
                endpoint: apiDevice?.endpoint ?? null,
                serverName: config.Servers.name,
            };
        });
    }),

    createConfig: clientProcedure
        .input(createCabinetConfigSchema)
        .mutation(async ({ ctx, input }) => {
            const { clientName, protocol } = input;

            if (!ctx.clientServerId) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Client is not bound to a server',
                });
            }

            const paymentSettings = await ctx.db.paymentSettings.findFirst({
                select: { defaultConfigsCount: true },
            });

            const maxConfigs = paymentSettings?.defaultConfigsCount ?? 3;
            const currentCount = await ctx.db.configs.count({
                where: { clientId: ctx.clientId },
            });

            if (currentCount >= maxConfigs) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Config limit reached (${maxConfigs})`,
                });
            }

            const client = await ctx.db.clients.findUnique({
                where: { id: ctx.clientId },
                select: { name: true },
            });

            const fullClientName = client?.name
                ? `${client.name}-${clientName}`
                : clientName;

            const createdConfig = await amneziaApiService.createConfig(
                ctx.clientServerId,
                fullClientName,
                protocolsApiMapping[protocol],
                0
            );

            const encryptedVpnKey = encryptionService.encrypt(createdConfig.client.config);

            await ctx.db.configs.create({
                data: {
                    id: createdConfig.client.id,
                    serverId: ctx.clientServerId,
                    clientId: ctx.clientId,
                    clientName: fullClientName,
                    expiresAt: null,
                    protocol,
                    vpnKey: encryptedVpnKey,
                },
            });

            await logsService.createLog(
                'CLIENT',
                'INFO',
                `Config <${fullClientName}> created by client cabinet`
            );
        }),

    deleteConfig: clientProcedure
        .input(z.object({ id: z.string(), protocol: z.enum(Protocols) }))
        .mutation(async ({ ctx, input }) => {
            const { id, protocol } = input;

            const foundConfig = await ctx.db.configs.findFirst({
                where: { id, clientId: ctx.clientId },
                select: { serverId: true, clientName: true },
            });

            if (!foundConfig) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Config not found' });
            }

            await amneziaApiService.deleteConfig(
                foundConfig.serverId,
                id,
                protocolsApiMapping[protocol]
            );

            await ctx.db.configs.delete({ where: { id } });

            await logsService.createLog(
                'CLIENT',
                'WARNING',
                `Config <${foundConfig.clientName}> deleted by client cabinet`
            );
        }),

    getVpnKey: clientProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const foundConfig = await ctx.db.configs.findFirst({
                where: { id: input.id, clientId: ctx.clientId },
                select: { vpnKey: true },
            });

            if (!foundConfig) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Config not found' });
            }

            return await encryptionService.decryptField(foundConfig.vpnKey);
        }),

    generateQrCode: clientProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const foundConfig = await ctx.db.configs.findFirst({
                where: { id: input.id, clientId: ctx.clientId },
                select: { serverId: true, vpnKey: true },
            });

            if (!foundConfig) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Config not found' });
            }

            const decryptedVpnKey = encryptionService.decryptField(foundConfig.vpnKey);
            if (!decryptedVpnKey) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'VPN Config not found' });
            }

            return await amneziaApiService.generateQrCode(foundConfig.serverId, decryptedVpnKey);
        }),
});

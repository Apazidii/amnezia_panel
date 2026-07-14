import z from 'zod';
import { createConfigSchema } from './configs';
import { Languages } from 'prisma/generated/enums';

export const createClientSchema = z.object({
    name: z.string().min(1).max(30),
    language: z.string().min(1),
    telegramId: z.string().optional(),
    serverId: z.string().min(1),
    login: z.string().min(1).max(50),
    password: z.string().min(8).max(40),
    configs: z.array(createConfigSchema),
});

export type createClientFormData = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
    id: z.number().min(1),
    name: z.string().min(1).max(30),
    language: z.enum(Languages),
    telegramId: z.string().optional(),
    serverId: z.string().min(1),
    login: z.string().max(50).optional(),
    password: z
        .string()
        .optional()
        .refine((val) => !val || (val.length >= 8 && val.length <= 40), {
            message: 'Password must be 8-40 characters',
        }),
});

export type updateClientFormData = z.infer<typeof updateClientSchema>;

export const sendNotificationSchema = z.object({
    clientId: z.string().min(1),
    message: z.string().min(1),
});

export type sendNotificationFormData = z.infer<typeof sendNotificationSchema>;

import { Protocols } from 'prisma/generated/enums';
import z from 'zod';

export const createCabinetConfigSchema = z.object({
    clientName: z.string().min(1).max(50),
    protocol: z.enum(Protocols),
});

export type createCabinetConfigFormData = z.infer<typeof createCabinetConfigSchema>;

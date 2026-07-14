'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, Eye, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/trpc/react';
import type { Protocols } from 'prisma/generated/enums';
import { protocolsMapping } from '@/lib/data/mappings';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { getProtocolColor } from '@/lib/utils';

interface Props {
    config: {
        id: string;
        clientName: string;
        protocol: Protocols;
        online: boolean;
        status: boolean;
        expiresAt: string | null;
    };
}

export function CabinetConfigDialog({ config }: Props) {
    const [open, setOpen] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);
    const [enlargedQrIndex, setEnlargedQrIndex] = useState<number | null>(null);

    const { data: qrData, isLoading: isLoadingQr } = api.cabinet.generateQrCode.useQuery(
        { id: config.id },
        { enabled: open }
    );

    const { data: vpnKey, isLoading: isLoadingKey } = api.cabinet.getVpnKey.useQuery(
        { id: config.id },
        { enabled: open }
    );

    const copyKey = async () => {
        if (!vpnKey) return;
        try {
            await navigator.clipboard.writeText(vpnKey);
            setCopiedKey(true);
            toast.success('VPN key copied');
            setTimeout(() => setCopiedKey(false), 2000);
        } catch {
            toast.error('Failed to copy');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <DialogTrigger asChild>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="cursor-pointer">
                            <Eye className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                </DialogTrigger>
                <TooltipContent>
                    <p>View connection</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{config.clientName}</DialogTitle>
                    <DialogDescription>VPN key and QR code</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Badge className={getProtocolColor(config.protocol)}>
                            {protocolsMapping[config.protocol]}
                        </Badge>
                        <Badge variant={config.status ? 'default' : 'secondary'}>
                            {config.status ? 'Active' : 'Disabled'}
                        </Badge>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium">VPN key</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={copyKey}
                                disabled={!vpnKey || isLoadingKey}>
                                {copiedKey ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        {isLoadingKey ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : (
                            <pre className="bg-muted max-h-40 overflow-auto rounded-md p-3 text-xs break-all whitespace-pre-wrap">
                                {vpnKey || 'No key'}
                            </pre>
                        )}
                    </div>

                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                            <QrCode className="h-4 w-4" />
                            QR codes
                        </div>
                        {isLoadingQr ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : qrData?.items?.length ? (
                            <div className="flex flex-wrap gap-3">
                                {qrData.items.map((qr, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="cursor-pointer"
                                        onClick={() => setEnlargedQrIndex(index)}>
                                        <Image
                                            src={qr}
                                            alt={`QR ${index + 1}`}
                                            width={120}
                                            height={120}
                                            className="rounded-md border"
                                        />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">No QR available</p>
                        )}
                    </div>
                </div>

                {enlargedQrIndex != null && qrData?.items?.[enlargedQrIndex] && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                        onClick={() => setEnlargedQrIndex(null)}>
                        <Image
                            src={qrData.items[enlargedQrIndex]}
                            alt="QR enlarged"
                            width={360}
                            height={360}
                            className="rounded-lg bg-white p-4"
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

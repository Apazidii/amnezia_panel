'use client';

import Link from 'next/link';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/loader';
import { formatBytes, formatDate, formatLastHandshake, getProtocolColor } from '@/lib/utils';
import { protocolsMapping } from '@/lib/data/mappings';
import { Plus } from 'lucide-react';
import { CabinetConfigDialog } from './components/cabinet-config-dialog';
import { CabinetDeleteConfigDialog } from './components/cabinet-delete-config-dialog';

export default function CabinetPage() {
    const { data: me, isLoading: isLoadingMe } = api.cabinet.getMe.useQuery();
    const { data: configs, isLoading: isLoadingConfigs } = api.cabinet.getMyConfigs.useQuery();

    if (isLoadingMe || isLoadingConfigs) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-5xl py-8">
            <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My connections</h1>
                    <p className="text-muted-foreground mt-2">
                        {me?.name}
                        {me?.Servers?.name ? ` · ${me.Servers.name}` : ''}
                    </p>
                </div>
                <Button asChild>
                    <Link href="/cabinet/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Create connection
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>VPN configurations</CardTitle>
                    <CardDescription>
                        View keys, QR codes, and manage your connections
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!configs || configs.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed py-10 text-center">
                            <p className="text-muted-foreground mb-4">No connections yet</p>
                            <Button asChild variant="outline">
                                <Link href="/cabinet/create">Create your first connection</Link>
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Online</TableHead>
                                    <TableHead>Protocol</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead>Traffic</TableHead>
                                    <TableHead className="w-28">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {configs.map((config) => (
                                    <TableRow key={config.id}>
                                        <TableCell className="font-medium">
                                            {config.clientName}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={config.status ? 'default' : 'secondary'}>
                                                {config.status ? 'Active' : 'Disabled'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    config.online
                                                        ? 'border-green-500 text-green-600'
                                                        : undefined
                                                }>
                                                {config.online ? 'Online' : 'Offline'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getProtocolColor(config.protocol)}>
                                                {protocolsMapping[config.protocol]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {config.expiresAt
                                                ? formatDate(Number(config.expiresAt) * 1000)
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            {formatBytes(
                                                config.traffic.received + config.traffic.sent
                                            )}
                                            <div className="text-muted-foreground text-xs">
                                                {formatLastHandshake(config.lastHandshake)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                <CabinetConfigDialog config={config} />
                                                <CabinetDeleteConfigDialog
                                                    id={config.id}
                                                    clientName={config.clientName}
                                                    protocol={config.protocol}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

'use client';

import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/trpc/react';
import type { Protocols } from 'prisma/generated/enums';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
    id: string;
    clientName: string;
    protocol: Protocols;
}

export function CabinetDeleteConfigDialog({ id, clientName, protocol }: Props) {
    const [open, setOpen] = useState(false);
    const utils = api.useUtils();

    const deleteConfig = api.cabinet.deleteConfig.useMutation({
        onSuccess: () => {
            toast.success('Connection deleted');
            utils.cabinet.getMyConfigs.invalidate();
            setOpen(false);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete connection');
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <AlertDialogTrigger asChild>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="cursor-pointer">
                            <Trash2 className="text-destructive h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                </AlertDialogTrigger>
                <TooltipContent>
                    <p>Delete connection</p>
                </TooltipContent>
            </Tooltip>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete connection?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete <strong>{clientName}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteConfig.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deleteConfig.isPending}
                        onClick={(e) => {
                            e.preventDefault();
                            deleteConfig.mutate({ id, protocol });
                        }}>
                        {deleteConfig.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

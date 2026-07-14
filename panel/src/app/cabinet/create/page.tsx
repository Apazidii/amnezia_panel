'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/trpc/react';
import {
    createCabinetConfigSchema,
    type createCabinetConfigFormData,
} from '@/lib/schemas/cabinet';
import { protocolsMapping } from '@/lib/data/mappings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CabinetCreatePage() {
    const router = useRouter();
    const utils = api.useUtils();
    const { data: me } = api.cabinet.getMe.useQuery();

    const form = useForm<createCabinetConfigFormData>({
        resolver: zodResolver(createCabinetConfigSchema),
        defaultValues: {
            clientName: '',
            protocol: undefined,
        },
    });

    const createConfig = api.cabinet.createConfig.useMutation({
        onSuccess: () => {
            toast.success('Connection created successfully');
            utils.cabinet.getMyConfigs.invalidate();
            router.push('/cabinet');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create connection');
        },
    });

    const onSubmit = (data: createCabinetConfigFormData) => {
        createConfig.mutate(data);
    };

    return (
        <div className="container mx-auto max-w-xl py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Create connection</h1>
                <p className="text-muted-foreground mt-2">
                    New connections are created on{' '}
                    <span className="font-medium text-foreground">
                        {me?.Servers?.name || 'your assigned server'}
                    </span>
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Connection details</CardTitle>
                    <CardDescription>
                        Choose a device name suffix and protocol
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="clientName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Device name <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="phone, laptop, ..."
                                                {...field}
                                            />
                                        </FormControl>
                                        {me?.name && (
                                            <p className="text-muted-foreground text-xs">
                                                Full name will be: {me.name}-
                                                {field.value || '...'}
                                            </p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="protocol"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Protocol <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select protocol" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(protocolsMapping).map(
                                                    ([value, label]) => (
                                                        <SelectItem key={value} value={value}>
                                                            {label}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push('/cabinet')}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createConfig.isPending}>
                                    {createConfig.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {createConfig.isPending ? 'Creating...' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

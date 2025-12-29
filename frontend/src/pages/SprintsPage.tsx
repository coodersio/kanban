import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

interface Sprint {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    status: 'planning' | 'active' | 'closed';
}

export default function SprintsPage() {
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Sprint | null>(null);
    const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '', status: 'planning' });

    const fetchData = async () => {
        const res = await fetch('/api/sprints');
        if (res.ok) setSprints(await res.json());
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingItem ? `/api/sprints/${editingItem.id}` : '/api/sprints';
        const method = editingItem ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        setIsOpen(false);
        setEditingItem(null);
        setFormData({ name: '', start_date: '', end_date: '', status: 'planning' });
        fetchData();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this sprint?')) return;
        await fetch(`/api/sprints/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const handleActivate = async (id: number) => {
        await fetch(`/api/sprints/${id}/activate`, { method: 'POST' });
        fetchData();
    };

    const openEdit = (item: Sprint) => {
        setEditingItem(item);
        // Format dates for input type="date"
        try {
            const start = item.start_date ? new Date(item.start_date).toISOString().split('T')[0] : '';
            const end = item.end_date ? new Date(item.end_date).toISOString().split('T')[0] : '';
            setFormData({ name: item.name, start_date: start, end_date: end, status: item.status });
            setIsOpen(true);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Sprints</h2>
                    <p className="text-muted-foreground">Manage your agile sprints.</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditingItem(null); setFormData({ name: '', start_date: '', end_date: '', status: 'planning' }); }}>
                            <Plus className="w-4 h-4 mr-2" /> Create Sprint
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Edit Sprint' : 'Create Sprint'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Sprint Name</Label>
                                <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. Sprint 58" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="start">Start Date</Label>
                                    <Input type="date" id="start" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="end">End Date</Label>
                                    <Input type="date" id="end" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} required />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Timeline</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sprints.map((sprint) => (
                                <TableRow key={sprint.id}>
                                    <TableCell className="font-semibold">{sprint.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={sprint.status === 'active' ? 'default' : 'secondary'}>
                                            {sprint.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(sprint.start_date), 'PP')} - {format(new Date(sprint.end_date), 'PP')}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {sprint.status !== 'active' && (
                                            <Button variant="outline" size="sm" onClick={() => handleActivate(sprint.id)}>
                                                Activate
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(sprint)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(sprint.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {sprints.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No sprints found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

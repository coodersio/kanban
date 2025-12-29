import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from 'lucide-react';

// --- Types ---
interface Department {
    id: number;
    name: string;
}

interface ProjectType {
    id: number;
    name: string;
    description: string;
}

// --- Components ---

function DepartmentsTab() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Department | null>(null);
    const [name, setName] = useState('');

    const fetchData = async () => {
        const res = await fetch('/api/departments');
        if (res.ok) setDepartments(await res.json());
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingItem ? `/api/departments/${editingItem.id}` : '/api/departments';
        const method = editingItem ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        setIsOpen(false);
        setEditingItem(null);
        setName('');
        fetchData();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this department?')) return;
        await fetch(`/api/departments/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const openEdit = (item: Department) => {
        setEditingItem(item);
        setName(item.name);
        setIsOpen(true);
    };

    return (
        <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between px-0">
                <CardTitle>Departments</CardTitle>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditingItem(null); setName(''); }}>
                            <Plus className="w-4 h-4 mr-2" /> Add Department
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Edit Department' : 'Add Department'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dept-name">Name</Label>
                                <Input id="dept-name" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="px-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {departments.map((dept) => (
                            <TableRow key={dept.id}>
                                <TableCell>{dept.id}</TableCell>
                                <TableCell className="font-medium">{dept.name}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(dept)}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(dept.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function ProjectTypesTab() {
    const [types, setTypes] = useState<ProjectType[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ProjectType | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const fetchData = async () => {
        const res = await fetch('/api/project-types');
        if (res.ok) setTypes(await res.json());
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingItem ? `/api/project-types/${editingItem.id}` : '/api/project-types';
        const method = editingItem ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        setIsOpen(false);
        setEditingItem(null);
        setFormData({ name: '', description: '' });
        fetchData();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this project type?')) return;
        await fetch(`/api/project-types/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const openEdit = (item: ProjectType) => {
        setEditingItem(item);
        setFormData({ name: item.name, description: item.description });
        setIsOpen(true);
    };

    return (
        <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between px-0">
                <CardTitle>Project Types</CardTitle>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditingItem(null); setFormData({ name: '', description: '' }); }}>
                            <Plus className="w-4 h-4 mr-2" /> Add Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Edit Project Type' : 'Add Project Type'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="type-name">Name</Label>
                                <Input id="type-name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type-desc">Description</Label>
                                <Input id="type-desc" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="px-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {types.map((type) => (
                            <TableRow key={type.id}>
                                <TableCell>{type.id}</TableCell>
                                <TableCell className="font-medium">{type.name}</TableCell>
                                <TableCell>{type.description}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(type)}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(type.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
                <p className="text-muted-foreground">Manage global configurations.</p>
            </div>

            <Tabs defaultValue="departments" className="w-full">
                <TabsList>
                    <TabsTrigger value="departments">Departments</TabsTrigger>
                    <TabsTrigger value="project-types">Project Types</TabsTrigger>
                </TabsList>
                <TabsContent value="departments" className="mt-6">
                    <DepartmentsTab />
                </TabsContent>
                <TabsContent value="project-types" className="mt-6">
                    <ProjectTypesTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Task, Member } from "@/types";
import { User, Tag, Hash, Flag, Calendar as CalendarIcon, AlertTriangle, Percent } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
    task: Task | null;
    open: boolean;
    onClose: () => void;
    onSave: (updatedTask: any) => void;
    members: Member[];
    currentUser?: { id: number, role: string, displayName: string };
    sprintId?: number;
    projectId?: number;
}

export default function TaskDetailsDrawer({ task, open, onClose, onSave, members, currentUser, sprintId, projectId }: Props) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<Task['status']>('not_started');
    const [priority, setPriority] = useState('');
    const [size, setSize] = useState('');
    const [assignedTo, setAssignedTo] = useState<number | null>(null);
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [progress, setProgress] = useState(0);
    const [risk, setRisk] = useState('');

    // Permission Logic
    const isExternal = currentUser?.role === 'external';
    const isAdmin = currentUser?.role === 'admin';
    const isDeveloper = currentUser?.role === 'developer';

    const isCreator = task?.created_by === currentUser?.id;
    const isAssignee = task?.assigned_to_user?.id === currentUser?.id;

    const canEdit = isAdmin || (isDeveloper && (isCreator || isAssignee));

    useEffect(() => {
        if (task) {
            setTitle(task.title || '');
            setDescription(task.description || '');
            setStatus(task.status || 'not_started');
            setPriority(task.priority || 'Should');
            setSize(task.size || 'Medium');
            setAssignedTo(task.assigned_to_user?.id || null);
            setDueDate(task.due_date ? new Date(task.due_date) : undefined);
            setProgress(task.progress || 0);
            setRisk(task.risk_and_countermeasure || '');
        }
    }, [task, open]);

    const handleSave = () => {
        if (!task) return;
        onSave({
            id: task.id,
            sprintId,
            projectId,
            title,
            description,
            status,
            priority,
            size,
            assignedTo,
            due_date: dueDate?.toISOString() || null,
            progress,
            risk_and_countermeasure: risk
        });
        onClose();
    };

    if (!task) return null;

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-md w-full border-l shadow-xl p-0 flex flex-col bg-white">
                <SheetHeader className="px-6 py-4 border-b flex flex-row items-center justify-between space-y-0">
                    <SheetTitle className="flex-1">
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={!canEdit}
                            className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto placeholder:text-muted-foreground/50"
                            placeholder="Task Name"
                        />
                    </SheetTitle>
                    <div className="flex items-center gap-2">
                        {/* Actions could go here */}
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                <Flag className="w-3.5 h-3.5" /> Status
                            </Label>
                            <Select value={status} onValueChange={(val: any) => setStatus(val)} disabled={!canEdit}>
                                <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2 font-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="not_started">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                                            <span>Not Started</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="in_progress">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-orange-400" />
                                            <span>Working on it</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="completed">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                            <span>Done</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5" /> Priority
                            </Label>
                            <Select value={priority} onValueChange={setPriority} disabled={!canEdit}>
                                <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2 font-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Must">Must</SelectItem>
                                    <SelectItem value="Should">Should</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* People & Dates */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                <User className="w-3.5 h-3.5" /> Person
                            </Label>
                            <Select value={assignedTo?.toString() || "none"} onValueChange={(val) => setAssignedTo(val === "none" ? null : parseInt(val))} disabled={!canEdit}>
                                <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2">
                                    <div className="flex items-center gap-2">
                                        {assignedTo ? (
                                            <Avatar className="w-5 h-5">
                                                <AvatarImage src={`https://i.pravatar.cc/150?u=${assignedTo}`} />
                                                <AvatarFallback className="text-[9px]">{members.find(m => m.id === assignedTo)?.display_name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        ) : <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-3 h-3 text-slate-400" /></div>}
                                        <span className="text-sm font-medium">{assignedTo ? members.find(m => m.id === assignedTo)?.display_name : "Unassigned"}</span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {members.map(m => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="w-5 h-5">
                                                    <AvatarImage src={m.avatar_url} />
                                                    <AvatarFallback>{m.display_name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {m.display_name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                <CalendarIcon className="w-3.5 h-3.5" /> Due Date
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"ghost"}
                                        className={cn(
                                            "w-full justify-start text-left font-medium h-9 px-2 -ml-2 hover:bg-secondary/50",
                                            !dueDate && "text-muted-foreground"
                                        )}
                                    >
                                        {dueDate ? format(dueDate, "PPP", { locale: zhCN }) : <span>Set Date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dueDate}
                                        onSelect={setDueDate}
                                        initialFocus
                                        locale={zhCN}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                <Percent className="w-3.5 h-3.5" /> Progress
                            </Label>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                        <Slider
                            value={[progress]}
                            onValueChange={(vals) => setProgress(vals[0])}
                            max={100}
                            step={5}
                            disabled={!canEdit}
                            className="w-full"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2 pt-2 border-t">
                        <Label className="text-sm font-semibold text-foreground">Valid info</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={!canEdit}
                            placeholder="Add a description..."
                            className="min-h-[120px] border-none bg-secondary/20 focus:bg-secondary/40 focus:ring-0 resize-none p-4 text-sm"
                        />
                    </div>
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                    {canEdit ? (
                        <>
                            <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
                            <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground self-center">View Only</span>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

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
}

export default function TaskDetailsDrawer({ task, open, onClose, onSave, members, currentUser }: Props) {
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
            <SheetContent className="sm:max-w-md w-full border-l-0 shadow-2xl p-0 flex flex-col bg-[#F8F9FD]">
                <SheetHeader className="p-8 pb-4 bg-white border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black uppercase text-[10px]">T</div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">任务详情</span>
                    </div>
                    <SheetTitle>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={!canEdit}
                            className="text-2xl font-black tracking-tight border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent placeholder:text-slate-200 disabled:opacity-100 disabled:cursor-not-allowed"
                            placeholder="任务标题"
                        />
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Status & Priority Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Flag className="w-3 h-3" /> 状态
                            </Label>
                            <Select value={status} onValueChange={(val: any) => setStatus(val)} disabled={!canEdit}>
                                <SelectTrigger className="rounded-xl border-slate-100 bg-white font-bold h-11 disabled:opacity-80">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                    <SelectItem value="not_started">未开始</SelectItem>
                                    <SelectItem value="in_progress">进行中</SelectItem>
                                    <SelectItem value="completed">已完成</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Tag className="w-3 h-3" /> 优先级
                            </Label>
                            <Select value={priority} onValueChange={setPriority} disabled={!canEdit}>
                                <SelectTrigger className="rounded-xl border-slate-100 bg-white font-bold h-11 text-indigo-600 disabled:opacity-80">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                    <SelectItem value="Must">🔥 必须做 (Must)</SelectItem>
                                    <SelectItem value="Should">⭐ 应该做 (Should)</SelectItem>
                                    <SelectItem value="Could">💎 可以做 (Could)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Progress Slider */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Percent className="w-3 h-3" /> 进度 ({progress}%)
                            </Label>
                        </div>
                        <Slider
                            value={[progress]}
                            onValueChange={(vals) => setProgress(vals[0])}
                            max={100}
                            step={5}
                            disabled={!canEdit}
                            className="w-full disabled:opacity-50"
                        />
                    </div>

                    {/* Assignee & Size Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <User className="w-3 h-3" /> 负责人
                            </Label>
                            <Select value={assignedTo?.toString() || "none"} onValueChange={(val) => setAssignedTo(val === "none" ? null : parseInt(val))} disabled={!canEdit}>
                                <SelectTrigger className="rounded-xl border-slate-100 bg-white font-bold h-11 disabled:opacity-80">
                                    <div className="flex items-center gap-2">
                                        {assignedTo ? (
                                            <Avatar className="w-5 h-5">
                                                <AvatarImage src={`https://i.pravatar.cc/150?u=${assignedTo}`} />
                                                <AvatarFallback>{members.find(m => m.id === assignedTo)?.display_name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        ) : <User className="w-4 h-4 text-slate-300" />}
                                        <SelectValue placeholder="待指派" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                    <SelectItem value="none">待指派</SelectItem>
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
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Hash className="w-3 h-3" /> 规模
                            </Label>
                            <Select value={size} onValueChange={setSize}>
                                <SelectTrigger className="rounded-xl border-slate-100 bg-white font-bold h-11 text-emerald-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                    <SelectItem value="Tiny">🍃 极小 (Tiny)</SelectItem>
                                    <SelectItem value="Medium">🌱 适中 (Medium)</SelectItem>
                                    <SelectItem value="Huge">🌳 极大 (Huge)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Risk & Countermeasure */}
                    {!isExternal && (
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 text-rose-500">
                                <AlertTriangle className="w-3 h-3" /> 风险与对策
                            </Label>
                            <Textarea
                                value={risk}
                                onChange={(e) => setRisk(e.target.value)}
                                disabled={!canEdit}
                                placeholder="描述潜在风险及应对措施..."
                                className="min-h-[80px] rounded-2xl border-rose-100 bg-rose-50/30 focus:ring-rose-200 resize-none p-4 font-medium text-sm leading-relaxed disabled:opacity-80"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <CalendarIcon className="w-3 h-3" /> 截止日期
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-bold h-11 rounded-xl border-slate-100 bg-white hover:bg-slate-50 transition-colors",
                                            !dueDate && "text-slate-400"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dueDate ? format(dueDate, "PPP", { locale: zhCN }) : <span>选择日期</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-slate-100 shadow-2xl" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dueDate}
                                        onSelect={setDueDate}
                                        initialFocus
                                        locale={zhCN}
                                        className="rounded-2xl"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">描述</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={!canEdit}
                            placeholder="添加更多关于此任务的细节..."
                            className="min-h-[150px] rounded-2xl border-slate-100 bg-white focus:ring-primary/20 resize-none p-4 font-medium text-sm leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>

                <div className="p-8 bg-white border-t border-slate-100">
                    {canEdit && (
                        <Button
                            onClick={handleSave}
                            className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            保存更改
                        </Button>
                    )}
                    {!canEdit && (
                        <div className="w-full flex justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                            仅查看模式
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

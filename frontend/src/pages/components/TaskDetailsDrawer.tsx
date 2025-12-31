import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Task, Member, Sprint } from "@/types";
import { User, Tag, Flag, Calendar as CalendarIcon, AlertTriangle, Percent, Clock, GitBranch, FileText, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
    task: Task | null;
    open: boolean;
    onClose: () => void;
    onSave: (updatedTask: any) => void;
    onDelete?: (taskId: number) => void;
    members: Member[];
    currentUser?: { id: number, role: string, displayName: string };
    sprintId?: number;
    projectId?: number;
    sprints?: Sprint[];
}

export default function TaskDetailsDrawer({ task, open, onClose, onSave, onDelete, members, currentUser, sprintId, projectId, sprints = [] }: Props) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<Task['status']>('not_started');
    const [priority, setPriority] = useState('');
    const [size, setSize] = useState('');
    const [assignedTo, setAssignedTo] = useState<number | null>(null);
    const [plannedEndDate, setPlannedEndDate] = useState<Date | undefined>(undefined);
    const [progress, setProgress] = useState(0);
    const [risk, setRisk] = useState('');
    const [estimatedHours, setEstimatedHours] = useState<number | undefined>(undefined);
    const [taskSprintId, setTaskSprintId] = useState<number>(-1);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Permission Logic
    const isAdmin = currentUser?.role === 'admin';
    const isDeveloper = currentUser?.role === 'developer';

    const canEdit = isAdmin || isDeveloper; // Admin and Developer can edit, External cannot

    useEffect(() => {
        if (task) {
            setTitle(task.title || '');
            setDescription(task.description || '');
            setStatus(task.status || 'not_started');
            setPriority(task.priority || '中');
            setSize(task.size || 'Medium');
            setAssignedTo(task.assigned_to_user?.id || null);
            setPlannedEndDate(task.planned_completion_date ? new Date(task.planned_completion_date) : undefined);
            setProgress(task.progress || 0);
            setRisk(task.risk_and_countermeasure || '');
            setEstimatedHours(task.estimated_hours || undefined);
            setTaskSprintId(sprintId || -1);
        }
    }, [task, open, sprintId]);

    const handleSprintChange = async (newSprintId: string) => {
        if (!task || !projectId) return;

        const toSprintId = parseInt(newSprintId);
        const fromSprintId = taskSprintId;

        if (toSprintId === fromSprintId) return;

        try {
            const res = await fetch('/api/workbench/task/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: task.id,
                    fromSprintId,
                    toSprintId,
                    storyId: task.story_id,
                    projectId
                })
            });

            if (!res.ok) {
                throw new Error('Failed to move task');
            }

            setTaskSprintId(toSprintId);
            // Optionally notify parent to refresh data
            alert('Task moved successfully!');
        } catch (err) {
            console.error('Error moving task:', err);
            alert('Failed to move task. Please try again.');
        }
    };

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
            planned_completion_date: plannedEndDate?.toISOString() || null,
            progress,
            risk_and_countermeasure: risk,
            estimated_hours: estimatedHours || null
        });
        onClose();
    };

    const handleDelete = async () => {
        if (!task) return;

        try {
            const res = await fetch('/api/workbench/task/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: task.id,
                    sprintId,
                    projectId,
                    storyId: task.story_id
                })
            });

            if (!res.ok) {
                throw new Error('Failed to delete task');
            }

            setIsDeleteDialogOpen(false);
            onClose();
            // Notify parent component to update state
            onDelete?.(task.id);
        } catch (err) {
            console.error('Error deleting task:', err);
            alert('删除任务失败，请重试');
        }
    };

    const insertTemplate = () => {
        const template = `1) 第一项工作内容
2) 第二项工作内容
3) 第三项工作内容`;
        setDescription(description ? description + '\n\n' + template : template);
    };

    if (!task) return null;

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent
                className="sm:max-w-[600px] w-full border-l shadow-xl p-0 flex flex-col bg-white"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <SheetHeader className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">任务详情</h2>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Task Title */}
                    <div className="space-y-2">
                        <Label className="text-xs font-normal text-muted-foreground">任务标题</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={!canEdit}
                            className="text-base font-medium"
                            placeholder="任务名称"
                            autoFocus={false}
                        />
                    </div>
                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                <Flag className="w-3.5 h-3.5" /> 状态
                            </Label>
                            <Select value={status} onValueChange={(val: any) => setStatus(val)} disabled={!canEdit}>
                                <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2 font-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="not_started">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                                            <span>未开始</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="in_progress">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-orange-400" />
                                            <span>进行中</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="completed">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                            <span>已完成</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5" /> 优先级
                            </Label>
                            <Select value={priority} onValueChange={setPriority} disabled={!canEdit}>
                                <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2 font-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="高">高</SelectItem>
                                    <SelectItem value="中">中</SelectItem>
                                    <SelectItem value="低">低</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* People & Dates */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                <User className="w-3.5 h-3.5" /> 负责人
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
                                        <span className="text-sm font-medium">{assignedTo ? members.find(m => m.id === assignedTo)?.display_name : "未分配"}</span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">未分配</SelectItem>
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
                                <CalendarIcon className="w-3.5 h-3.5" /> 计划完成日期
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"ghost"}
                                        className={cn(
                                            "w-full justify-start text-left font-medium h-9 px-2 -ml-2 hover:bg-secondary/50",
                                            !plannedEndDate && "text-muted-foreground"
                                        )}
                                    >
                                        {plannedEndDate ? format(plannedEndDate, "PPP", { locale: zhCN }) : <span>设置日期</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={plannedEndDate}
                                        onSelect={setPlannedEndDate}
                                        initialFocus
                                        locale={zhCN}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Sprint Selection */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                            <GitBranch className="w-3.5 h-3.5" /> 所属迭代
                        </Label>
                        <Select value={taskSprintId.toString()} onValueChange={handleSprintChange} disabled={!canEdit}>
                            <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2 font-medium">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="-1">
                                    <div className="flex items-center gap-2">
                                        <span>📋 Backlog</span>
                                    </div>
                                </SelectItem>
                                {sprints.filter(s => s.id !== -1).map(s => (
                                    <SelectItem key={s.id} value={s.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            <span>{s.name}</span>
                                            {s.status === 'active' && <span className="text-[10px] text-emerald-600">●</span>}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Progress */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                <Percent className="w-3.5 h-3.5" /> 进度
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

                    {/* Estimated Hours */}
                    <div className="space-y-1.5">
                        <Label htmlFor="task-estimated-hours" className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" /> 预估工时（小时）
                        </Label>
                        <Input
                            id="task-estimated-hours"
                            type="number"
                            min="0"
                            step="0.5"
                            value={estimatedHours || ''}
                            onChange={(e) => setEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="例如: 4"
                            disabled={!canEdit}
                            className="h-9"
                        />
                    </div>

                    {/* Work Items */}
                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                工作项列表
                            </Label>
                            {canEdit && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={insertTemplate}
                                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    插入模板
                                </Button>
                            )}
                        </div>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={!canEdit}
                            placeholder="请输入工作项，每行一项，例如：&#10;1) 需求分析和方案设计&#10;2) 核心功能开发实现&#10;3) 测试验证和文档整理"
                            className="min-h-[140px] border-none bg-secondary/20 focus:bg-secondary/40 focus:ring-0 resize-none p-4 text-sm font-mono leading-relaxed"
                        />
                        <p className="text-xs text-muted-foreground">
                            推荐格式：每行一项，使用 <code className="text-[11px] px-1 py-0.5 bg-muted rounded">1) 2) 3)</code> 编号
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-between items-center gap-2">
                    {canEdit ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                删除任务
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={onClose} size="sm">取消</Button>
                                <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">保存修改</Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div></div>
                            <span className="text-xs text-muted-foreground self-center">仅查看</span>
                        </>
                    )}
                </div>
            </SheetContent>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            确认删除任务
                        </DialogTitle>
                        <DialogDescription className="space-y-2 pt-2">
                            <p>您确定要删除任务 <strong>"{task?.title}"</strong> 吗？</p>
                            <p className="text-sm text-muted-foreground">
                                此操作将从当前迭代中移除该任务。如果任务在其他迭代中也存在，不会受影响。
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} size="sm">
                            取消
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            确认删除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Sheet>
    );
}

import { useState, useEffect } from 'react';
import type { Sprint, Member, Story } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from 'lucide-react';
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface StoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    activeTab: 'create' | 'reuse';
    onTabChange: (tab: 'create' | 'reuse') => void;

    // For create mode
    onCreateStory: (data: {
        title: string;
        description: string;
        assignedTo: number | null;
        priority: string;
        plannedDate: Date | undefined;
        sprintId: string;
    }) => Promise<void>;

    // For reuse mode
    onReuseStory: (storyIds: number[], assignedTo: number | null) => Promise<void>;

    // Data
    sprints: Sprint[];
    members: Member[];
    selectedSprintId: string;
    selectedProjectId: number | null;
}

export function StoryDialog({
    open,
    onOpenChange,
    activeTab,
    onTabChange,
    onCreateStory,
    onReuseStory,
    sprints,
    members,
    selectedSprintId,
    selectedProjectId
}: StoryDialogProps) {
    // Create mode state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState<number | null>(null);
    const [priority, setPriority] = useState('medium');
    const [plannedDate, setPlannedDate] = useState<Date | undefined>(undefined);
    const [createSprintId, setCreateSprintId] = useState('');

    // Reuse mode state
    const [reuseSearch, setReuseSearch] = useState('');
    const [availableStories, setAvailableStories] = useState<Story[]>([]);
    const [selectedReuseIds, setSelectedReuseIds] = useState<number[]>([]);

    // Fetch available stories for reuse
    useEffect(() => {
        if (open && activeTab === 'reuse' && selectedProjectId && selectedSprintId) {
            fetch(`/api/workbench/stories/available?projectId=${selectedProjectId}&sprintId=${selectedSprintId}&search=${reuseSearch}`)
                .then(res => res.json())
                .then(data => setAvailableStories(data))
                .catch(err => console.error('Error fetching available stories:', err));
        }
    }, [open, activeTab, reuseSearch, selectedProjectId, selectedSprintId]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setAssignedTo(null);
        setPriority('medium');
        setPlannedDate(undefined);
        setCreateSprintId('');
        setSelectedReuseIds([]);
        setReuseSearch('');
    };

    const handleCreate = async () => {
        if (!title) return;
        await onCreateStory({
            title,
            description,
            assignedTo,
            priority,
            plannedDate,
            sprintId: createSprintId || selectedSprintId
        });
        resetForm();
    };

    const handleReuse = async () => {
        if (selectedReuseIds.length === 0) return;
        await onReuseStory(selectedReuseIds, assignedTo);
        resetForm();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">添加关键节点计划</DialogTitle>
                </DialogHeader>

                <nav className="flex gap-4 border-b mb-4">
                    <button
                        onClick={() => onTabChange('create')}
                        className={cn(
                            "pb-2 text-sm font-medium transition-all border-b-2",
                            activeTab === 'create'
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        新建节点
                    </button>
                    <button
                        onClick={() => onTabChange('reuse')}
                        className={cn(
                            "pb-2 text-sm font-medium transition-all border-b-2",
                            activeTab === 'reuse'
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        选用历史节点
                    </button>
                </nav>

                {activeTab === 'create' ? (
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="title" className="text-sm font-medium">节点名称</Label>
                            <Input
                                id="title"
                                placeholder="例如：实现用户认证系统"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">负责人</Label>
                                <Select value={assignedTo?.toString() || '0'} onValueChange={(v) => setAssignedTo(v === '0' ? null : parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择负责人" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">未分配</SelectItem>
                                        {members.map(m => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                {m.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium">优先级</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="high">高</SelectItem>
                                        <SelectItem value="medium">中</SelectItem>
                                        <SelectItem value="low">低</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">所属迭代</Label>
                            <Select value={createSprintId || selectedSprintId} onValueChange={setCreateSprintId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择迭代" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="-1">Backlog</SelectItem>
                                    {sprints.filter(s => s.id !== -1).map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                计划完成日期
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !plannedDate && "text-muted-foreground"
                                        )}
                                    >
                                        {plannedDate ? format(plannedDate, "PPP", { locale: zhCN }) : <span>选择计划完成日期</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={plannedDate}
                                        onSelect={setPlannedDate}
                                        initialFocus
                                        locale={zhCN}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="desc" className="text-sm font-medium">节点描述</Label>
                            <Textarea
                                id="desc"
                                placeholder="输入详细的说明..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">搜索已有节点</Label>
                            <Input
                                placeholder="输入关键词搜索..."
                                value={reuseSearch}
                                onChange={(e) => setReuseSearch(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">选择节点（可多选）</Label>
                                {selectedReuseIds.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        已选 {selectedReuseIds.length} 项
                                    </span>
                                )}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                                {availableStories.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => {
                                            setSelectedReuseIds(prev =>
                                                prev.includes(s.id)
                                                    ? prev.filter(id => id !== s.id)
                                                    : [...prev, s.id]
                                            );
                                        }}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded border transition-all cursor-pointer text-sm",
                                            selectedReuseIds.includes(s.id)
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/30 hover:bg-muted"
                                        )}
                                    >
                                        <Checkbox
                                            checked={selectedReuseIds.includes(s.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedReuseIds(prev =>
                                                    checked
                                                        ? [...prev, s.id]
                                                        : prev.filter(id => id !== s.id)
                                                );
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-sm text-slate-900">{s.title}</div>
                                            {s.description && (
                                                <div className="text-xs text-slate-400 mt-1 line-clamp-1">{s.description}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {availableStories.length === 0 && (
                                    <div className="text-center py-8 text-slate-300 text-xs font-bold uppercase tracking-widest italic">
                                        没有可复用的节点
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium">负责人</Label>
                            <Select value={assignedTo?.toString() || '0'} onValueChange={(v) => setAssignedTo(v === '0' ? null : parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择负责人" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">未分配</SelectItem>
                                    {members.map(m => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.display_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                    {activeTab === 'create' ? (
                        <Button onClick={handleCreate} disabled={!title}>创建节点</Button>
                    ) : (
                        <Button onClick={handleReuse} disabled={selectedReuseIds.length === 0}>
                            选用节点 {selectedReuseIds.length > 0 && `(${selectedReuseIds.length})`}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

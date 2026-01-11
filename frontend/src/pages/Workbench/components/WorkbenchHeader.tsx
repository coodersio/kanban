import type { Sprint, Member } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, LayoutGrid, List } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface WorkbenchHeaderProps {
    // Sprint selection
    sprints: Sprint[];
    selectedSprintId: string;
    onSprintChange: (sprintId: string) => void;

    // Member filter
    members: Member[];
    filterMemberId: number | null;
    onMemberFilterChange: (memberId: number | null) => void;

    // View mode
    viewMode: 'kanban' | 'priority';
    onViewModeChange: (mode: 'kanban' | 'priority') => void;

    // Actions
    onAddStory: () => void;
    onAddTask: () => void;

    // Permissions
    isExternal: boolean;
}

// Generate avatar color based on user ID
const getAvatarColor = (userId: number) => {
    const colors = [
        'bg-blue-500 text-white',
        'bg-green-500 text-white',
        'bg-purple-500 text-white',
        'bg-orange-500 text-white',
        'bg-pink-500 text-white',
        'bg-cyan-500 text-white',
        'bg-amber-500 text-white',
        'bg-indigo-500 text-white',
        'bg-rose-500 text-white',
        'bg-teal-500 text-white',
        'bg-violet-500 text-white',
        'bg-fuchsia-500 text-white',
    ];
    return colors[userId % colors.length];
};

export function WorkbenchHeader({
    sprints,
    selectedSprintId,
    onSprintChange,
    members,
    filterMemberId,
    onMemberFilterChange,
    viewMode,
    onViewModeChange,
    onAddStory,
    onAddTask,
    isExternal
}: WorkbenchHeaderProps) {
    return (
        <header className="flex items-center justify-between px-6 py-4 border-b bg-background flex-shrink-0 z-10">
            <div className="flex items-center gap-6">
                {/* Sprint Selector */}
                <div className="flex items-center gap-4">
                    <Select value={selectedSprintId} onValueChange={onSprintChange}>
                        <SelectTrigger className="w-[180px] h-9 bg-secondary/30 border-secondary-foreground/10 text-sm font-medium focus:ring-primary/20">
                            <SelectValue placeholder="选择迭代..." />
                        </SelectTrigger>
                        <SelectContent className="shadow-xl border-border/60">
                            {/* Backlog Option */}
                            <SelectItem value="-1">
                                <div className="flex items-center gap-2">
                                    <span>📋 Backlog</span>
                                </div>
                            </SelectItem>
                            {sprints.filter(s => s.id !== -1).map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                    <div className="flex items-center gap-2">
                                        <span>{s.name}</span>
                                        {s.status === 'active' && (
                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] h-4">
                                                ACTIVE
                                            </Badge>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center pl-6 border-l">
                    <ToggleGroup
                        type="single"
                        value={viewMode}
                        onValueChange={(val) => val && onViewModeChange(val as 'kanban' | 'priority')}
                        className="border rounded-md p-0.5 bg-secondary/30"
                    >
                        <ToggleGroupItem
                            value="kanban"
                            aria-label="看板视图"
                            className="h-8 px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
                        >
                            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                            看板
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="priority"
                            aria-label="优先级列表"
                            className="h-8 px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
                        >
                            <List className="h-3.5 w-3.5 mr-1.5" />
                            优先级
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>

                {/* Member Filter */}
                <div className="flex items-center pl-6 border-l gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMemberFilterChange(null)}
                        className={cn(
                            "h-8 px-3 text-xs font-medium rounded-md transition-all border",
                            filterMemberId === null
                                ? "border-black"
                                : "border-transparent hover:bg-secondary"
                        )}
                    >
                        全部
                    </Button>
                    <TooltipProvider>
                        <div className="flex gap-2 items-center">
                            {members.map(m => (
                                <Tooltip key={m.id}>
                                    <TooltipTrigger asChild>
                                        <Avatar
                                            onClick={() => onMemberFilterChange(m.id === filterMemberId ? null : m.id)}
                                            className={cn(
                                                "w-8 h-8 cursor-pointer transition-all duration-200",
                                                m.id === filterMemberId
                                                    ? "ring-2 ring-black ring-offset-2 ring-offset-white"
                                                    : "opacity-75 hover:opacity-100"
                                            )}
                                        >
                                            {m.avatar_url && !m.avatar_url.includes('pravatar.cc') && (
                                                <AvatarImage src={m.avatar_url} />
                                            )}
                                            <AvatarFallback className={cn("text-[10px] font-semibold", getAvatarColor(m.id))}>
                                                {m.display_name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{m.display_name}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </div>
                    </TooltipProvider>
                </div>
            </div>

            {/* Right Actions - Add Buttons */}
            <div className="flex items-center gap-3">
                {!isExternal && (
                    <>
                        <Button
                            onClick={onAddStory}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium h-9 px-4 rounded-md text-xs gap-1.5"
                        >
                            <Plus className="w-4 h-4" /> 添加关键节点计划
                        </Button>
                        <Button
                            onClick={onAddTask}
                            size="sm"
                            variant="outline"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 h-9 px-4 rounded-md text-xs gap-1.5 font-medium"
                        >
                            <Plus className="w-4 h-4" /> 添加子任务
                        </Button>
                    </>
                )}
            </div>
        </header>
    );
}

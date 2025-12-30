import { useState, useEffect } from 'react';
import type { Story } from '@/types';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Project {
    id: number;
    name: string;
}

interface StoryWithStats extends Story {
    task_count: number;
    sprint_count: number;
    sprints: string[];
}

interface StoriesManagerProps {
    project: Project;
    onUpdate: () => void;
}

export default function StoriesManager({ project, onUpdate }: StoriesManagerProps) {
    const [stories, setStories] = useState<StoryWithStats[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Delete confirmation dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [storyToDelete, setStoryToDelete] = useState<StoryWithStats | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    useEffect(() => {
        fetchStories();
    }, [project.id]);

    const fetchStories = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/projects/${project.id}/stories`);
            if (res.ok) {
                const data = await res.json();
                setStories(data);
            }
        } catch (err) {
            console.error('Error fetching stories:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (story: StoryWithStats) => {
        setStoryToDelete(story);
        setDeleteConfirmText('');
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!storyToDelete || deleteConfirmText !== 'DELETE') return;

        try {
            const res = await fetch('/api/workbench/story/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sprintId: null, // Null means delete from all sprints
                    projectId: project.id,
                    storyId: storyToDelete.id
                })
            });

            if (res.ok) {
                alert('删除成功');
                setDeleteDialogOpen(false);
                setStoryToDelete(null);
                fetchStories();
                onUpdate();
            } else {
                alert('删除失败，请重试');
            }
        } catch (err) {
            console.error('Error deleting story:', err);
            alert('删除失败，请重试');
        }
    };

    const filteredStories = stories.filter(s =>
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">{project.name}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            关键节点管理 ({stories.length} 个节点)
                        </p>
                    </div>
                    <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        新建节点
                    </Button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="搜索关键节点..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Stories Table */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-muted-foreground">加载中...</p>
                    </div>
                ) : filteredStories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <p className="text-muted-foreground mb-2">
                            {searchQuery ? '没有找到匹配的关键节点' : '该项目还没有关键节点'}
                        </p>
                        <Button size="sm" variant="outline" className="gap-2">
                            <Plus className="w-4 h-4" />
                            创建第一个节点
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>标题</TableHead>
                                <TableHead className="w-[120px]">关联任务</TableHead>
                                <TableHead className="w-[150px]">使用情况</TableHead>
                                <TableHead className="w-[100px] text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStories.map((story) => (
                                <TableRow key={story.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        #{story.id}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{story.title}</div>
                                            {story.description && (
                                                <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                                    {story.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-normal">
                                            {story.task_count || 0} 个任务
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {story.sprint_count > 0 ? (
                                            <div className="text-sm">
                                                <div className="font-medium">{story.sprint_count} 个迭代</div>
                                                {story.sprints && story.sprints.length > 0 && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {story.sprints.slice(0, 2).join(', ')}
                                                        {story.sprints.length > 2 && '...'}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">未使用</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteClick(story)}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            警告：即将彻底删除关键节点
                        </DialogTitle>
                        <DialogDescription className="text-left space-y-3 pt-4">
                            {storyToDelete && (
                                <>
                                    <div className="p-3 bg-muted rounded-lg">
                                        <div className="font-medium">节点：{storyToDelete.title}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            ID: #{storyToDelete.id}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="font-semibold">将会删除：</p>
                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                            <li>该节点本身</li>
                                            <li>{storyToDelete.task_count || 0} 个关联的任务</li>
                                            {storyToDelete.sprint_count > 0 && (
                                                <li>从 {storyToDelete.sprint_count} 个迭代中移除：
                                                    <div className="ml-6 mt-1 text-xs text-muted-foreground">
                                                        {storyToDelete.sprints?.join(', ')}
                                                    </div>
                                                </li>
                                            )}
                                        </ul>
                                    </div>

                                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                        <p className="text-sm font-semibold text-destructive">
                                            ⚠️ 此操作不可恢复！
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-text" className="text-sm font-medium">
                                            请输入 <code className="px-1 py-0.5 bg-muted rounded">DELETE</code> 确认删除：
                                        </Label>
                                        <Input
                                            id="confirm-text"
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            placeholder="输入 DELETE"
                                            className="font-mono"
                                        />
                                    </div>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialogOpen(false);
                                setStoryToDelete(null);
                                setDeleteConfirmText('');
                            }}
                        >
                            取消
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={deleteConfirmText !== 'DELETE'}
                        >
                            确认删除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

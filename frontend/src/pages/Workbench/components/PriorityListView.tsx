import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Story } from '@/types';

interface PriorityStory {
  id: number;
  snapshot_id: number;
  sprint_id: number;
  project_id: number;
  title: string;
  status: string;
  order_index: number;
  project_name: string;
  assigned_to?: number;
  assigned_to_id?: number;
  assigned_to_name?: string;
  planned_completion_date?: string;
  priority?: string;
}

// 状态配置
const STATUS_CONFIG = {
  not_started: { label: '未开始', color: 'bg-slate-400' },
  in_progress: { label: '进行中', color: 'bg-blue-500' },
  completed: { label: '已完成', color: 'bg-emerald-500' }
};

// 可拖拽的 Story 卡片
function SortableStoryItem({
  story,
  onStatusChange,
  onClick,
  isDraggingAny
}: {
  story: PriorityStory;
  onStatusChange: (storyId: number, status: string) => void;
  onClick: (story: Story) => void;
  isDraggingAny: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: story.snapshot_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusConfig = STATUS_CONFIG[story.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          {/* 拖拽手柄 */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing flex-shrink-0"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Story 内容 */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => !isDraggingAny && onClick(story as any)}
          >
            <div className="flex items-center gap-2 mb-1">
              {/* 项目名 */}
              <Badge variant="outline" className="text-xs">
                {story.project_name}
              </Badge>
              {/* 状态指示器 */}
              <div className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
            </div>

            {/* Story 标题 */}
            <div className="font-medium text-sm mb-2">{story.title}</div>

            {/* 元信息 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {story.assigned_to_name && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {story.assigned_to_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span>{story.assigned_to_name}</span>
                </div>
              )}

              {story.planned_completion_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(story.planned_completion_date), {
                      locale: zhCN,
                      addSuffix: true
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 状态下拉框 */}
          <Select
            value={story.status}
            onValueChange={(value) => {
              // Prevent status change during drag
              if (!isDraggingAny) {
                onStatusChange(story.id, value);
              }
            }}
          >
            <SelectTrigger className="w-[120px] flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">未开始</SelectItem>
              <SelectItem value="in_progress">进行中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>
    </div>
  );
}

// 主组件
export function PriorityListView({
  selectedSprintId,
  filterMemberId,
  onStoryClick,
  onStoryStatusChange
}: {
  selectedSprintId: string;
  filterMemberId: number | null;
  onStoryClick: (story: Story) => void;
  onStoryStatusChange: () => void;
}) {
  const [stories, setStories] = useState<PriorityStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  );

  // 获取数据
  useEffect(() => {
    if (!selectedSprintId) return;

    setLoading(true);
    let url = `/api/workbench/priority-list?sprintId=${selectedSprintId}`;
    if (filterMemberId) url += `&memberId=${filterMemberId}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setStories(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedSprintId, filterMemberId]);

  // 处理拖拽开始
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // 处理拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = stories.findIndex(s => s.snapshot_id === active.id);
    const newIndex = stories.findIndex(s => s.snapshot_id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 乐观更新 UI
    const newStories = arrayMove(stories, oldIndex, newIndex);
    setStories(newStories);

    // 批量更新后端 - 重新分配所有stories的order_index
    try {
      // 为每个story分配新的order_index（按新顺序0, 1, 2, 3...）
      const orders = newStories.map((story, index) => ({
        id: story.id,
        order: index
      }));

      // 批量更新API
      await fetch('/api/workbench/stories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprintId: selectedSprintId,
          projectId: newStories[0]?.project_id || null, // 取第一个story的projectId（批量API需要）
          orders: orders
        })
      });
    } catch (err) {
      console.error('Failed to reorder:', err);
      // 失败时回滚
      setStories(stories);
    }
  };

  // 修改状态
  const handleStatusChange = async (storyId: number, newStatus: string) => {
    const projectId = stories.find(s => s.id === storyId)?.project_id;

    try {
      await fetch('/api/workbench/story/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprintId: selectedSprintId,
          projectId,
          storyId,
          status: newStatus
        })
      });

      onStoryStatusChange();

      // 重新加载以反映状态变化后的排序
      const url = `/api/workbench/priority-list?sprintId=${selectedSprintId}${filterMemberId ? `&memberId=${filterMemberId}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setStories(data);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // 分组显示
  const activeStories = stories.filter(s => s.status !== 'completed');
  const completedStories = stories.filter(s => s.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-muted-foreground">
          <p className="mb-2">当前迭代暂无关键节点</p>
          <p className="text-xs">请先在看板视图中添加关键节点</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* 进行中 & 未开始 */}
        {activeStories.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>待完成</span>
              <Badge variant="secondary">{activeStories.length}</Badge>
            </h3>
            <SortableContext
              items={activeStories.map(s => s.snapshot_id)}
              strategy={verticalListSortingStrategy}
            >
              {activeStories.map(story => (
                <SortableStoryItem
                  key={story.snapshot_id}
                  story={story}
                  onStatusChange={handleStatusChange}
                  onClick={onStoryClick}
                  isDraggingAny={isDragging}
                />
              ))}
            </SortableContext>
          </div>
        )}

        {/* 已完成 */}
        {completedStories.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
              <span>已完成</span>
              <Badge variant="secondary">{completedStories.length}</Badge>
            </h3>
            <SortableContext
              items={completedStories.map(s => s.snapshot_id)}
              strategy={verticalListSortingStrategy}
            >
              {completedStories.map(story => (
                <SortableStoryItem
                  key={story.snapshot_id}
                  story={story}
                  onStatusChange={handleStatusChange}
                  onClick={onStoryClick}
                  isDraggingAny={isDragging}
                />
              ))}
            </SortableContext>
          </div>
        )}
      </DndContext>
    </div>
  );
}

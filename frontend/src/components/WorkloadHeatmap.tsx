import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Users, TrendingUp } from "lucide-react";

interface WorkloadMember {
  id: number;
  name: string;
  role: string;
  taskCount: number;
  loadLevel: 'low' | 'normal' | 'high' | 'critical';
  tasks: {
    not_started: number;
    in_progress: number;
    on_hold: number;
    completed: number;
  };
}

interface WorkloadHeatmapProps {
  data: { members: WorkloadMember[] } | null;
  loading: boolean;
  onMemberClick?: (member: WorkloadMember) => void;
}

export function WorkloadHeatmap({ data, loading, onMemberClick }: WorkloadHeatmapProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            团队负载分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            团队负载分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">暂无数据</div>
        </CardContent>
      </Card>
    );
  }

  const maxTasks = Math.max(...data.members.map(m => m.taskCount), 20);
  const overloadedMembers = data.members.filter(m => m.loadLevel === 'critical' || m.loadLevel === 'high').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            团队负载分布
          </div>
          {overloadedMembers > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {overloadedMembers} 人超载
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.members.map(member => {
          const loadLevelConfig = {
            critical: { color: 'bg-red-500', label: '超载', textColor: 'text-red-700' },
            high: { color: 'bg-orange-500', label: '重载', textColor: 'text-orange-700' },
            normal: { color: 'bg-yellow-500', label: '正常', textColor: 'text-yellow-700' },
            low: { color: 'bg-green-500', label: '轻载', textColor: 'text-green-700' }
          };

          const config = loadLevelConfig[member.loadLevel];
          const widthPercent = Math.min((member.taskCount / maxTasks) * 100, 100);

          return (
            <button
              key={member.id}
              onClick={() => onMemberClick?.(member)}
              className="w-full group"
            >
              <div className="flex items-center gap-3">
                {/* Member Name */}
                <div className="w-28 text-left">
                  <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {member.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {member.role === 'admin' ? '管理员' : member.role === 'group_admin' ? '小组管理员' : '开发者'}
                  </div>
                </div>

                {/* Load Bar */}
                <div className="flex-1 h-10 bg-gray-100 rounded-md overflow-hidden relative group-hover:bg-gray-200 transition-colors">
                  <div
                    className={cn(
                      "h-full transition-all duration-300 flex items-center px-3",
                      config.color
                    )}
                    style={{ width: `${widthPercent}%` }}
                  >
                    {member.taskCount > 0 && (
                      <div className="text-xs text-white font-medium">
                        {member.tasks.in_progress > 0 && `进行中: ${member.tasks.in_progress}`}
                        {member.tasks.in_progress > 0 && member.tasks.not_started > 0 && ' · '}
                        {member.tasks.not_started > 0 && `未开始: ${member.tasks.not_started}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Task Count & Status */}
                <div className="w-24 text-right">
                  <div className={cn("text-sm font-bold", config.textColor)}>
                    {member.taskCount} 任务
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {config.label}
                  </div>
                </div>
              </div>

              {/* Hover Details */}
              {member.taskCount > 0 && (
                <div className="mt-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pl-32">
                  未开始: {member.tasks.not_started} ·
                  进行中: {member.tasks.in_progress} ·
                  阻塞: {member.tasks.on_hold} ·
                  已完成: {member.tasks.completed}
                </div>
              )}
            </button>
          );
        })}

        {/* Legend */}
        <div className="pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">负载等级:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span>轻载 (&lt;5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-yellow-500" />
            <span>正常 (5-10)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-orange-500" />
            <span>重载 (10-15)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span>超载 (&gt;15)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

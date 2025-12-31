import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, CheckCircle, Clock, TrendingUp, AlertTriangle, Package, Users, BarChart3, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface DashboardStats {
    overview: {
        totalProjects: number;
        totalStories: number;
        totalTasks: number;
        activeSprints: number;
        storyCompletionRate: number;
        taskCompletionRate: number;
    };
    taskDistribution: {
        not_started: number;
        in_progress: number;
        completed: number;
    };
    weeklyProgress: Array<{
        week: string;
        startDate: string;
        endDate: string;
        completedStories: number;
        totalStories: number;
        completedTasks: number;
        totalTasks: number;
        completionRate: number;
    }>;
    myTasks: {
        total: number;
        not_started: number;
        in_progress: number;
        completed: number;
    };
    recentActivity: Array<{
        type: string;
        id: number;
        title: string;
        status: string;
        updatedAt: string;
        updatedBy: string | null;
        projectName: string;
        storyTitle: string | null;
    }>;
    teamPerformance: Array<{
        userId: number;
        userName: string;
        completedTasks: number;
        totalTasks: number;
        completionRate: number;
        avgProgress: number;
    }> | null;
    projectStatus: Array<{
        projectId: number;
        projectName: string;
        totalStories: number;
        completedStories: number;
        totalTasks: number;
        completedTasks: number;
        completionRate: number;
    }>;
    currentSprintId: number | null;
}

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/dashboard/stats');
            if (!res.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            setError('加载数据失败');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-96">
                <div className="text-muted-foreground">加载中...</div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="p-6 flex items-center justify-center h-96">
                <div className="text-destructive">{error || '数据加载失败'}</div>
            </div>
        );
    }

    // Transform data for UI
    const overviewStats = [
        {
            label: "总任务数",
            value: stats.overview.totalTasks,
            change: `${stats.overview.taskCompletionRate}%`,
            changeType: "positive" as const,
            icon: ListTodo
        },
        {
            label: "进行中",
            value: stats.taskDistribution.in_progress,
            change: `${stats.myTasks.in_progress}个我的`,
            changeType: "neutral" as const,
            icon: Clock
        },
        {
            label: "总项目数",
            value: stats.overview.totalProjects,
            change: `${stats.overview.activeSprints}个迭代`,
            changeType: "neutral" as const,
            icon: Package
        },
        {
            label: "已完成",
            value: stats.taskDistribution.completed,
            change: `${stats.overview.taskCompletionRate}%`,
            changeType: "positive" as const,
            icon: CheckCircle
        }
    ];

    const taskDistribution = [
        {
            label: "已完成",
            value: stats.taskDistribution.completed,
            color: "bg-emerald-500",
            percentage: stats.taskDistribution.completed + stats.taskDistribution.in_progress + stats.taskDistribution.not_started > 0
                ? Math.round((stats.taskDistribution.completed / (stats.taskDistribution.completed + stats.taskDistribution.in_progress + stats.taskDistribution.not_started)) * 100)
                : 0
        },
        {
            label: "进行中",
            value: stats.taskDistribution.in_progress,
            color: "bg-blue-500",
            percentage: stats.taskDistribution.completed + stats.taskDistribution.in_progress + stats.taskDistribution.not_started > 0
                ? Math.round((stats.taskDistribution.in_progress / (stats.taskDistribution.completed + stats.taskDistribution.in_progress + stats.taskDistribution.not_started)) * 100)
                : 0
        },
        {
            label: "未开始",
            value: stats.taskDistribution.not_started,
            color: "bg-slate-400",
            percentage: stats.taskDistribution.completed + stats.taskDistribution.in_progress + stats.taskDistribution.not_started > 0
                ? Math.round((stats.taskDistribution.not_started / (stats.taskDistribution.completed + stats.taskDistribution.in_progress + stats.taskDistribution.not_started)) * 100)
                : 0
        }
    ];

    // Get status badge
    const getStatusBadge = (status: string) => {
        const config: Record<string, { label: string; className: string }> = {
            completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-700 border-blue-200' },
            not_started: { label: '未开始', className: 'bg-slate-100 text-slate-700 border-slate-200' }
        };
        return config[status] || config.not_started;
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    const getAvatarColor = (index: number) => {
        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
        return colors[index % colors.length];
    };

    return (
        <div className="p-6 space-y-6">
            {/* Top Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {overviewStats.map((stat, i) => (
                    <Card key={i} className="shadow-sm">
                        <CardContent className="pt-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <stat.icon className={cn(
                                        "w-5 h-5",
                                        i === 3 ? "text-emerald-500" : i === 1 ? "text-blue-500" : "text-slate-600"
                                    )} />
                                    <span className={cn(
                                        "text-xs font-medium",
                                        stat.changeType === "positive" ? "text-emerald-600" : "text-muted-foreground"
                                    )}>
                                        {stat.change}
                                    </span>
                                </div>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <div className="text-xs text-muted-foreground">{stat.label}</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Task Distribution Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">任务分布</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center mb-4">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    {taskDistribution.map((item, i) => {
                                        const prevPercentages = taskDistribution.slice(0, i).reduce((sum, curr) => sum + curr.percentage, 0);
                                        const circumference = 2 * Math.PI * 40;
                                        const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                                        const strokeDashoffset = `-${(prevPercentages / 100) * circumference}`;

                                        // Map color classes to actual hex values
                                        const colorMap: Record<string, string> = {
                                            'bg-emerald-500': '#10b981',
                                            'bg-blue-500': '#3b82f6',
                                            'bg-slate-400': '#94a3b8'
                                        };

                                        return (
                                            <circle
                                                key={i}
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="none"
                                                stroke={colorMap[item.color] || '#94a3b8'}
                                                strokeWidth="15"
                                                strokeDasharray={strokeDasharray}
                                                strokeDashoffset={strokeDashoffset}
                                            />
                                        );
                                    })}
                                </svg>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {taskDistribution.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-3 h-3 rounded-full", item.color)} />
                                        <span className="text-muted-foreground">{item.label}</span>
                                    </div>
                                    <span className="font-semibold">{item.value} ({item.percentage}%)</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Weekly Progress Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">迭代进度</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-32 flex items-end justify-between gap-2 mb-4">
                            {stats.weeklyProgress.slice(0, 5).map((week, i) => {
                                const maxHeight = 100;
                                const completedHeight = week.totalTasks > 0
                                    ? (week.completedTasks / week.totalTasks) * maxHeight
                                    : 0;

                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full flex flex-col gap-0.5 items-center">
                                            <div
                                                className="w-full bg-emerald-500 rounded-sm"
                                                style={{ height: `${completedHeight}px` }}
                                                title={`已完成: ${week.completedTasks}/${week.totalTasks}`}
                                            />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-1">
                                            {week.week.split('-')[1]}周
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="text-center text-xs text-muted-foreground">
                            最近 {stats.weeklyProgress.length} 个迭代的完成情况
                        </div>
                    </CardContent>
                </Card>

                {/* My Tasks Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">我的任务</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center">
                            <div className="text-4xl font-bold mb-2">{stats.myTasks.total}</div>
                            <div className="text-xs text-muted-foreground">当前迭代任务总数</div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">已完成</span>
                                <span className="font-semibold text-emerald-600">{stats.myTasks.completed}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">进行中</span>
                                <span className="font-semibold text-blue-600">{stats.myTasks.in_progress}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">未开始</span>
                                <span className="font-semibold text-slate-600">{stats.myTasks.not_started}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team Performance Card */}
                {stats.teamPerformance && stats.teamPerformance.length > 0 && (
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base font-semibold">团队绩效 (当前迭代)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {stats.teamPerformance.map((member, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback className={cn("text-white text-xs", getAvatarColor(i))}>
                                                    {getInitials(member.userName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-muted-foreground">{member.userName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{member.completionRate}%</span>
                                            <span className="text-xs text-muted-foreground">
                                                ({member.completedTasks}/{member.totalTasks})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 transition-all"
                                            style={{ width: `${member.completionRate}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Recent Activity Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">最近动态</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {stats.recentActivity.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                                暂无动态
                            </div>
                        ) : (
                            stats.recentActivity.map((activity, i) => {
                                const statusBadge = getStatusBadge(activity.status);
                                return (
                                    <div key={i} className="flex items-start gap-3">
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarFallback className={cn("text-white text-xs", getAvatarColor(i))}>
                                                {getInitials(activity.updatedBy || '?')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm">
                                                <span className="font-semibold">{activity.updatedBy || '未知'}</span>
                                                {' '}
                                                <Badge variant="outline" className={cn('mx-1 text-[10px] px-1.5 py-0', statusBadge.className)}>
                                                    {statusBadge.label}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {activity.type === 'story' ? '关键节点' : '任务'}: {activity.title}
                                            </p>
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(activity.updatedAt), {
                                                    locale: zhCN,
                                                    addSuffix: true
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Project Status Table */}
            {stats.projectStatus.length > 0 && (
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">项目状态 (当前迭代)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.projectStatus.map((project, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-medium text-sm mb-1">{project.projectName}</div>
                                        <div className="text-xs text-muted-foreground">
                                            Stories: {project.completedStories}/{project.totalStories} ·
                                            Tasks: {project.completedTasks}/{project.totalTasks}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-lg font-bold">{project.completionRate}%</div>
                                            <div className="text-xs text-muted-foreground">完成率</div>
                                        </div>
                                        <div className="w-20">
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 transition-all"
                                                    style={{ width: `${project.completionRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

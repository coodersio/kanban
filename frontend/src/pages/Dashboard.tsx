import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, CheckCircle, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
    const stats = [
        { label: "Total Tasks", value: 24, change: "+12%", changeType: "positive", icon: CheckCircle, status: "" },
        { label: "In Progress", value: 8, change: "+5%", changeType: "positive", icon: Clock, status: "in-progress" },
        { label: "Overdue", value: 3, change: "-2%", changeType: "negative", icon: AlertTriangle, status: "warning" },
        { label: "Completed", value: 13, change: "+8%", changeType: "positive", icon: TrendingUp, status: "completed" }
    ];

    const taskDistribution = [
        { label: "Completed", value: 13, color: "bg-status-completed", percentage: 54 },
        { label: "In Progress", value: 8, color: "bg-status-in-progress", percentage: 33 },
        { label: "Review", value: 1, color: "bg-status-review", percentage: 4 },
        { label: "To Do", value: 2, color: "bg-status-todo", percentage: 9 }
    ];

    const weeklyProgress = [
        { day: "Mon", completed: 4, started: 2 },
        { day: "Tue", completed: 5, started: 3 },
        { day: "Wed", completed: 6, started: 2 },
        { day: "Thu", completed: 4, started: 4 },
        { day: "Fri", completed: 8, started: 3 }
    ];

    const performance = [
        { label: "Project Progress", value: 68, change: "+12%" },
        { label: "Team Efficiency", value: 84, change: "+8%" },
        { label: "On-time Delivery", value: 92, change: "+5%" }
    ];

    const recentActivity = [
        { user: "Alice Johnson", action: "completed", task: "Design wireframes", time: "2 min ago", initials: "AJ", color: "bg-green-500" },
        { user: "Bob Smith", action: "started", task: "Research analysis", time: "15 min ago", initials: "BS", color: "bg-blue-500" },
        { user: "Carol Wilson", action: "commented on", task: "Navigation development", time: "1 hour ago", initials: "CW", color: "bg-orange-500" },
        { user: "David Brown", action: "updated", task: "Brand guidelines", time: "2 hours ago", initials: "DB", color: "bg-purple-500" }
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Top Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Overview Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">Overview</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {stats.slice(0, 2).map((stat, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <stat.icon className={cn("w-4 h-4", i === 0 ? "text-status-completed" : "text-status-in-progress")} />
                                        <span className={cn("text-xs font-medium", i === 0 ? "text-status-completed" : "text-status-in-progress")}>
                                            {stat.change}
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {stats.slice(2, 4).map((stat, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <stat.icon className={cn("w-4 h-4", i === 0 ? "text-destructive" : "text-status-completed")} />
                                        <span className={cn("text-xs font-medium", stat.changeType === "positive" ? "text-status-completed" : "text-destructive")}>
                                            {stat.change}
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Task Distribution Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">Task Distribution</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center mb-4">
                            {/* Simple Donut Chart Representation */}
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke="#22c55e"
                                        strokeWidth="15"
                                        strokeDasharray={`${54 * 2.51} 251.2`}
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="15"
                                        strokeDasharray={`${33 * 2.51} 251.2`}
                                        strokeDashoffset={`${-54 * 2.51}`}
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth="15"
                                        strokeDasharray={`${4 * 2.51} 251.2`}
                                        strokeDashoffset={`${-(54 + 33) * 2.51}`}
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="none"
                                        stroke="#6b7280"
                                        strokeWidth="15"
                                        strokeDasharray={`${9 * 2.51} 251.2`}
                                        strokeDashoffset={`${-(54 + 33 + 4) * 2.51}`}
                                    />
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
                                    <span className="font-semibold">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Weekly Progress Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">Weekly Progress</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {/* Bar Chart */}
                        <div className="h-32 flex items-end justify-between gap-2 mb-4">
                            {weeklyProgress.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full flex flex-col gap-0.5 items-center">
                                        <div
                                            className="w-full bg-status-completed rounded-sm"
                                            style={{ height: `${day.completed * 8}px` }}
                                        />
                                        <div
                                            className="w-full bg-status-in-progress rounded-sm"
                                            style={{ height: `${day.started * 8}px` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground mt-1">{day.day}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-status-completed" />
                                <span className="text-muted-foreground">Completed</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-status-in-progress" />
                                <span className="text-muted-foreground">Started</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Performance Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">Performance</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {performance.map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">{item.value}%</span>
                                        <span className="text-xs text-status-completed">{item.change}</span>
                                    </div>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-foreground transition-all"
                                        style={{ width: `${item.value}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="pt-2 text-right">
                            <Badge variant="outline" className="bg-status-completed/10 text-status-completed border-status-completed/20">
                                Excellent
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recentActivity.map((activity, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarFallback className={cn("text-white text-xs", activity.color)}>
                                        {activity.initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm">
                                        <span className="font-semibold">{activity.user}</span>
                                        {' '}
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "mx-1 text-[10px] px-1.5 py-0",
                                                activity.action === "completed" && "bg-status-completed/10 text-status-completed",
                                                activity.action === "started" && "bg-status-in-progress/10 text-status-in-progress",
                                                activity.action === "commented on" && "bg-status-review/10 text-status-review",
                                                activity.action === "updated" && "bg-purple-100 text-purple-700"
                                            )}
                                        >
                                            {activity.action}
                                        </Badge>
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{activity.task}</p>
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3" />
                                        {activity.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

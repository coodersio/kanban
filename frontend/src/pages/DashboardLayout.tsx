import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Home,
    Briefcase,
    LayoutDashboard,
    Layers,
    Calendar,
    Users,
    Settings,
    BarChart3,
    Search,
    Grid3x3,
    HelpCircle,
    Bell
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<{ id: number, displayName: string, role: string } | null>(null);

    useEffect(() => {
        fetch('/api/auth/me', { credentials: 'include' })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Unauthorized');
            })
            .then(data => setCurrentUser(data.user))
            .catch(() => navigate('/login'));
    }, [navigate]);

    const handleLogout = async () => {
        try {
            const res = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                navigate('/login');
            }
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    const NavItem = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
        const isActive = location.pathname === href;
        return (
            <Link to={href}>
                <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                        "w-full justify-start gap-3 h-9 px-3 text-sm font-medium mb-1",
                        isActive
                            ? "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active/90 shadow-sm"
                            : "text-foreground/70 hover:bg-sidebar-accent hover:text-foreground"
                    )}
                >
                    <Icon className="w-4 h-4" />
                    {label}
                </Button>
            </Link>
        );
    };

    const workspaces = [
        { id: 1, name: "Marketing Campaign", color: "bg-blue-500" },
        { id: 2, name: "Product Development", color: "bg-green-500" },
        { id: 3, name: "Design System", color: "bg-purple-500" },
        { id: 4, name: "Sales Pipeline", color: "bg-orange-500" }
    ];

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Fixed Sidebar - Monday.com style */}
            <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0">
                {/* Logo */}
                <div className="h-16 px-4 flex items-center border-b border-sidebar-border">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
                            <div className="text-white text-xs font-bold">K</div>
                        </div>
                        <span className="text-base font-semibold text-foreground">KanBan</span>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4 px-3">
                    <nav className="space-y-0.5 mb-6">
                        <NavItem href="/dashboard" icon={Home} label="主页" />
                        <NavItem href="/dashboard/workbench" icon={Briefcase} label="我的工作台" />
                        <NavItem href="/dashboard/team" icon={Users} label="团队" />
                        <NavItem href="/dashboard/analytics" icon={BarChart3} label="数据分析" />
                        <NavItem href="/dashboard/settings" icon={Settings} label="设置" />
                    </nav>

                    {/* Workspaces Section */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between px-3 mb-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                工作空间
                            </span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground">
                                <span className="text-lg leading-none">+</span>
                            </Button>
                        </div>
                        <div className="space-y-1">
                            <NavItem href="/dashboard/projects" icon={Layers} label="项目管理" />
                            <NavItem href="/dashboard/sprints" icon={Calendar} label="迭代计划" />
                            <NavItem href="/dashboard/users" icon={Users} label="成员管理" />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header - Monday.com style */}
                <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between flex-shrink-0">
                    {/* Left: Page Title (will be set by child components) */}
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-foreground">
                            {location.pathname === '/dashboard' && '主页'}
                            {location.pathname === '/dashboard/workbench' && '工作台'}
                            {location.pathname === '/dashboard/projects' && '项目管理'}
                            {location.pathname === '/dashboard/sprints' && '迭代计划'}
                            {location.pathname === '/dashboard/users' && '成员管理'}
                        </h1>
                    </div>

                    {/* Center: Search Bar */}
                    <div className="flex-1 max-w-md mx-8">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="搜索所有内容"
                                className="w-full h-9 pl-10 pr-4 rounded-md bg-input-background border-0 focus:bg-background focus:ring-2 focus:ring-ring/20 transition-all outline-none text-sm placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex-1 flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                            <Grid3x3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                            <HelpCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
                        </Button>

                        {/* User Avatar */}
                        <div className="ml-2 flex items-center gap-2">
                            <Avatar
                                className="h-8 w-8 cursor-pointer ring-2 ring-background hover:ring-ring/20 transition-all"
                                onClick={handleLogout}
                            >
                                <AvatarImage src={`https://i.pravatar.cc/150?u=${currentUser?.id}`} />
                                <AvatarFallback className="text-xs font-semibold">
                                    {currentUser?.displayName?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-xs font-medium text-foreground hidden lg:block">
                                {currentUser?.displayName?.split(' ')[0] || 'User'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto">
                    <Outlet context={{ currentUser }} />
                </div>
            </main>
        </div>
    );
}

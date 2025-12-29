import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Layout,
    Layers,
    Calendar,
    User,
    Bell,
    Mail,
    Moon,
    FileText,
    ShoppingCart,
    MessageSquare,
    Trash2,
    Grid,
    ChevronRight,
    ChevronLeft
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);
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

    const NavIcon = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
        const isActive = location.pathname === href;
        return (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Link to={href} className="w-full px-4">
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full rounded-xl mb-2 transition-all duration-300 flex items-center gap-3",
                                    isExpanded ? "h-11 px-4 justify-start" : "h-11 w-11 p-0 justify-center mx-auto",
                                    isActive
                                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-white active:scale-95"
                                )}
                            >
                                <Icon className={cn("flex-shrink-0", isExpanded ? "w-5 h-5" : "w-5 h-5")} />
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="font-bold text-xs whitespace-nowrap"
                                        >
                                            {label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    {!isExpanded && (
                        <TooltipContent side="right" className="font-medium text-xs">
                            {label}
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
        );
    };

    return (
        <div className="flex h-screen bg-[#F8F9FD] dark:bg-slate-950 font-sans selection:bg-primary/20 overflow-hidden">
            {/* Expandable Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isExpanded ? 240 : 80 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-full bg-white dark:bg-slate-900 border-r flex flex-col py-6 flex-shrink-0 z-50 relative"
            >
                {/* Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border shadow-sm z-[60] hover:bg-slate-50 text-slate-400 hover:text-primary transition-colors"
                >
                    {isExpanded ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </Button>

                <div className={cn("mb-10 px-4", !isExpanded && "flex justify-center")}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center rotate-[-10deg] shadow-lg shadow-primary/20 flex-shrink-0">
                            <div className="w-5 h-5 border-4 border-white rounded-full flex items-center justify-center">
                                <div className="w-1 h-1 bg-white rounded-full"></div>
                            </div>
                        </div>
                        {isExpanded && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xl font-black tracking-tighter text-slate-900"
                            >
                                KanBan
                            </motion.span>
                        )}
                    </div>
                </div>

                <nav className="flex-1 flex flex-col">
                    <NavIcon href="/dashboard" icon={Grid} label="仪表盘" />
                    <NavIcon href="/dashboard/workbench" icon={Layout} label="工作台" />
                    <NavIcon href="/dashboard/projects" icon={Layers} label="项目管理" />
                    <NavIcon href="/dashboard/sprints" icon={Calendar} label="迭代计划" />
                    <NavIcon href="/dashboard/users" icon={User} label="团队成员" />
                    <NavIcon href="/dashboard/files" icon={FileText} label="文件库" />
                    <NavIcon href="/dashboard/shop" icon={ShoppingCart} label="插件市场" />
                    <NavIcon href="/dashboard/feedback" icon={MessageSquare} label="反馈" />
                </nav>

                <div className="mt-auto px-4 space-y-2">
                    <Button variant="ghost" className={cn("w-full rounded-xl justify-start text-slate-400 hover:text-slate-600 gap-3", !isExpanded && "px-0 justify-center")}>
                        <Moon className="w-5 h-5 flex-shrink-0" />
                        {isExpanded && <span className="font-bold text-xs uppercase tracking-widest">主题模式</span>}
                    </Button>
                    <Button variant="ghost" className={cn("w-full rounded-xl justify-start text-slate-400 hover:text-red-500 gap-3", !isExpanded && "px-0 justify-center")}>
                        <Trash2 className="w-5 h-5 flex-shrink-0" />
                        {isExpanded && <span className="font-bold text-xs uppercase tracking-widest">回收站</span>}
                    </Button>
                </div>
            </motion.aside>

            {/* Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col min-w-0">
                {/* Global Top Header */}
                <header className="h-16 px-8 flex items-center justify-between flex-shrink-0">
                    <div className="flex-1 max-w-lg">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="全局搜索..."
                                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary/20 transition-all outline-none text-sm shadow-sm"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="text-slate-500 relative">
                            <Mail className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-slate-500 relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </Button>
                        <div className="flex items-center gap-3 pl-4 border-l ml-2">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-semibold text-slate-900 leading-none mb-1">
                                    {currentUser?.displayName || 'Loading...'}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                    {currentUser?.role === 'admin' ? '管理员' : '团队成员'}
                                </div>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Avatar
                                            className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-slate-100 cursor-pointer hover:ring-primary/30 transition-all"
                                            onClick={handleLogout}
                                        >
                                            <AvatarImage src={`https://i.pravatar.cc/150?u=${currentUser?.id}`} />
                                            <AvatarFallback>{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-xs">点击退出登录</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </header>

                {/* Dynamic Page Content */}
                <div className="flex-1 overflow-auto px-8 pb-8">
                    <Outlet context={{ currentUser }} />
                </div>
            </main>
        </div>
    );
}

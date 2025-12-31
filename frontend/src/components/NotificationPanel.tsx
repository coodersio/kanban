import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, AtSign, CheckCheck } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface NotificationPanelProps {
    unreadCount: number;
    onUnreadCountChange: (count: number) => void;
}

export function NotificationPanel({ unreadCount, onUnreadCountChange }: NotificationPanelProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications?limit=20');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    const markAsRead = async (notificationId: number) => {
        try {
            const res = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT'
            });
            if (res.ok) {
                setNotifications(notifications.map(n =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                ));
                onUnreadCountChange(Math.max(0, unreadCount - 1));
            }
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const res = await fetch('/api/notifications/mark-all-read', {
                method: 'PUT'
            });
            if (res.ok) {
                setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                onUnreadCountChange(0);
            }
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        setIsOpen(false);
        // Navigate to task with snapshot_id
        const taskUrl = notification.task_snapshot_id
            ? `/dashboard/workbench/TASK-${notification.related_task_id}-${notification.task_snapshot_id}`
            : `/dashboard/workbench/TASK-${notification.related_task_id}`;
        navigate(taskUrl);
    };

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'mention_in_comment':
                return <AtSign className="w-4 h-4 text-blue-600" />;
            case 'comment_on_assigned_task':
                return <MessageSquare className="w-4 h-4 text-green-600" />;
            default:
                return <Bell className="w-4 h-4 text-gray-600" />;
        }
    };

    const getNotificationText = (notification: Notification) => {
        switch (notification.type) {
            case 'mention_in_comment':
                return (
                    <>
                        <span className="font-semibold">{notification.actor_name}</span> 在评论中提到了你
                    </>
                );
            case 'comment_on_assigned_task':
                return (
                    <>
                        <span className="font-semibold">{notification.actor_name}</span> 评论了你的任务
                    </>
                );
            default:
                return '新通知';
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="relative h-9 w-9 p-0"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="font-semibold text-sm">通知</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                            <CheckCheck className="w-3.5 h-3.5 mr-1" />
                            全部已读
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Bell className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-sm text-gray-500">暂无通知</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                                        !notification.is_read ? 'bg-blue-50/50' : ''
                                    }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-foreground mb-1">
                                                {getNotificationText(notification)}
                                            </p>
                                            <p className="text-xs text-blue-600 font-medium mb-1">
                                                {notification.task_title}
                                            </p>
                                            {notification.comment_content && (
                                                <p className="text-xs text-gray-600 line-clamp-2">
                                                    {notification.comment_content}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-400 mt-1">
                                                {format(new Date(notification.created_at), 'PPp', { locale: zhCN })}
                                            </p>
                                        </div>
                                        {!notification.is_read && (
                                            <div className="flex-shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

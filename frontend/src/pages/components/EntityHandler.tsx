import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EntityHandlerProps {
    type: 'STORY' | 'TASK';
    id: number;              // 引用表ID (fallback)
    snapshotId?: number;     // 快照表ID，用于显示和URL导航
    className?: string;
}

export default function EntityHandler({ type, id, snapshotId, className }: EntityHandlerProps) {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // 优先使用 snapshotId 进行导航，如果没有则使用 id（向后兼容）
        const navigationId = snapshotId ?? id;
        navigate(`/dashboard/workbench/${type}-${navigationId}`);
    };

    // 优先显示 snapshotId，如果没有则显示 id
    const displayId = snapshotId ?? id;

    return (
        <button
            onClick={handleClick}
            className={cn(
                "text-primary font-mono text-xs hover:underline hover:bg-primary/10 px-1 py-0.5 rounded transition-colors cursor-pointer inline-block",
                className
            )}
        >
            [{type}-{displayId}]
        </button>
    );
}

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
        // 使用新格式: TYPE-{id}-{snapshot_id}
        if (snapshotId) {
            navigate(`/dashboard/workbench/${type}-${id}-${snapshotId}`);
        } else {
            // 向后兼容: 如果没有 snapshot_id，只使用 id
            navigate(`/dashboard/workbench/${type}-${id}`);
        }
    };

    // 显示格式: [TYPE-{id}-{snapshot_id}] 或 [TYPE-{id}]
    const displayText = snapshotId ? `${type}-${id}-${snapshotId}` : `${type}-${id}`;

    return (
        <button
            onClick={handleClick}
            className={cn(
                "text-primary font-mono text-xs hover:underline hover:bg-primary/10 px-1 py-0.5 rounded transition-colors cursor-pointer inline-block",
                className
            )}
        >
            [{displayText}]
        </button>
    );
}

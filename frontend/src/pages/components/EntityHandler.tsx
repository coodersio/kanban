import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EntityHandlerProps {
    type: 'STORY' | 'TASK';
    id: number;
    className?: string;
}

export default function EntityHandler({ type, id, className }: EntityHandlerProps) {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/dashboard/workbench/${type}-${id}`);
    };

    return (
        <button
            onClick={handleClick}
            className={cn(
                "text-primary font-mono text-xs hover:underline hover:bg-primary/10 px-1 py-0.5 rounded transition-colors cursor-pointer inline-block",
                className
            )}
        >
            [{type}-{id}]
        </button>
    );
}

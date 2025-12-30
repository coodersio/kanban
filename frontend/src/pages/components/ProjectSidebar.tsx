import { Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types";

interface Props {
    projects: Project[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onAddClick?: () => void;
    onEditClick?: (project: Project) => void;
}

export default function ProjectSidebar({ projects, selectedId, onSelect, onAddClick, onEditClick }: Props) {
    // Helper to generate color based on project ID (mocking the reference's colored squares)
    const getProjectColor = (id: number) => {
        const colors = [
            "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
            "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-red-500"
        ];
        return colors[id % colors.length];
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 p-2 overflow-y-auto">
                <div className="space-y-1">
                    {projects.map((project) => {
                        const isSelected = selectedId === project.id;
                        return (
                            <div
                                key={project.id}
                                onClick={() => onSelect(project.id)}
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group relative",
                                    isSelected ? "bg-accent/50 text-accent-foreground" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className={cn("w-3 h-3 rounded flex-shrink-0", getProjectColor(project.id))} />
                                <span className="text-sm truncate font-medium flex-1">
                                    {project.name || 'Untitled'}
                                </span>

                                {onEditClick && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditClick(project);
                                        }}
                                    >
                                        <Settings size={12} />
                                    </Button>
                                )}

                                {isSelected && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full" />
                                )}
                            </div>
                        );
                    })}

                    {/* <Button
                        variant="ghost"
                        onClick={onAddClick}
                        className="w-full justify-start h-9 text-muted-foreground hover:text-foreground border border-dashed border-border/50 hover:bg-muted/20 gap-2 px-3 mt-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">添加项目</span>
                    </Button> */}
                </div>
            </div>

            {/* Bottom User/Settings (Optional, matching typical sidebar footer) */}
            <div className="p-4 border-t mt-auto">
                <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-muted-foreground">
                    <Settings size={20} />
                    <span>设置</span>
                </Button>
            </div>
        </div>
    );
}

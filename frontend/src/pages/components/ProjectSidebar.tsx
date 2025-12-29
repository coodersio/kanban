import { Building2, Folder, Globe, Plus, Settings } from "lucide-react";
import { motion } from "framer-motion";
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

const ProjectIcon = ({ name = "", isSelected }: { name?: string, isSelected?: boolean }) => {
    const n = name?.toLowerCase() || "";
    const baseClass = "w-4 h-4 transition-colors";

    if (n.includes('enterprise')) return <Building2 className={cn(baseClass, isSelected ? "text-primary" : "text-blue-600")} />;
    if (n.includes('web platform')) return <Globe className={cn(baseClass, isSelected ? "text-primary" : "text-sky-500")} />;
    if (n.includes('mac')) return <div className="text-sm">🍔</div>;
    if (n.includes('cosmetic')) return <div className="text-sm">💅</div>;

    return <Folder className={cn(baseClass, isSelected ? "text-primary" : "text-slate-400")} />;
};

export default function ProjectSidebar({ projects, selectedId, onSelect, onAddClick, onEditClick }: Props) {
    return (
        <div className="space-y-1 pb-10 px-2 lg:px-4">
            <div className="px-2 mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">项目列表</h3>
            </div>
            {projects.map((project) => {
                const isSelected = selectedId === project.id;
                const name = project.name || (project as any).software_name || '未命名项目';

                return (
                    <motion.div key={project.id} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
                        <Button
                            variant="ghost"
                            onClick={() => onSelect(project.id)}
                            className={cn(
                                "w-full justify-start h-12 rounded-xl px-3 transition-all duration-200 group border border-transparent",
                                isSelected
                                    ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100/80 active:bg-slate-200/50"
                            )}
                        >
                            <div className="flex items-center gap-3 w-full min-w-0">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                    isSelected ? "bg-white shadow-sm" : "bg-slate-100 group-hover:bg-white shadow-sm"
                                )}>
                                    <ProjectIcon name={name} isSelected={isSelected} />
                                </div>
                                <div className={cn(
                                    "text-sm font-bold tracking-tight flex-1 text-left truncate min-w-0",
                                    isSelected ? "text-primary transition-none" : "text-slate-700"
                                )}>
                                    {name}
                                </div>
                                {isSelected && onEditClick && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditClick(project);
                                        }}
                                        className="w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-primary/20 hover:text-primary transition-all flex-shrink-0"
                                    >
                                        <Settings className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </Button>
                    </motion.div>
                );
            })}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-4 px-2">
                <Button
                    variant="outline"
                    onClick={onAddClick}
                    className="w-full h-11 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 group transition-all font-bold text-xs flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>添加项目</span>
                </Button>
            </motion.div>

            {projects.length === 0 && (
                <div className="text-xs text-slate-300 font-medium px-4 py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                    未找到项目
                </div>
            )}
        </div>
    );
}

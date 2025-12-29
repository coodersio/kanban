import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Story, Member } from "@/types";
import { User, Flag, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
    story: Story | null;
    open: boolean;
    onClose: () => void;
    onSave: (updatedStory: any) => void;
    members: Member[];
}

export default function StoryDetailsDrawer({ story, open, onClose, onSave, members }: Props) {
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState('not_started');
    const [assignedTo, setAssignedTo] = useState<number | null>(null);
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (story) {
            setTitle(story.title || '');
            setStatus(story.status || 'not_started');
            setAssignedTo(story.assigned_to_user?.id || null);
            // Description might not be in the story object from board data, but we can try
            setDescription((story as any).description || '');
        }
    }, [story, open]);

    const handleSave = () => {
        if (!story) return;
        onSave({
            storyId: story.id,
            title,
            status,
            assignedTo,
            description
        });
        onClose();
    };

    if (!story) return null;

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-md w-full border-l-0 shadow-2xl p-0 flex flex-col bg-[#FDF8FF]">
                <SheetHeader className="p-8 pb-4 bg-white border-b border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-black uppercase text-[10px]">S</div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">需求详情</span>
                    </div>
                    <SheetTitle>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-2xl font-black tracking-tight border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent placeholder:text-slate-200"
                            placeholder="需求标题"
                        />
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Flag className="w-3 h-3" /> 状态
                            </Label>
                            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                                <SelectTrigger className="rounded-xl border-purple-50 bg-white font-bold h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-purple-50 shadow-xl">
                                    <SelectItem value="not_started">未开始</SelectItem>
                                    <SelectItem value="in_progress">进行中</SelectItem>
                                    <SelectItem value="completed">已完成</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <User className="w-3 h-3" /> 负责人
                            </Label>
                            <Select value={assignedTo?.toString() || "none"} onValueChange={(val) => setAssignedTo(val === "none" ? null : parseInt(val))}>
                                <SelectTrigger className="rounded-xl border-purple-50 bg-white font-bold h-11">
                                    <div className="flex items-center gap-2">
                                        {assignedTo ? (
                                            <Avatar className="w-5 h-5">
                                                <AvatarImage src={`https://i.pravatar.cc/150?u=${assignedTo}`} />
                                                <AvatarFallback>{members.find(m => m.id === assignedTo)?.display_name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        ) : <User className="w-4 h-4 text-slate-300" />}
                                        <SelectValue placeholder="待指派" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-purple-50 shadow-xl">
                                    <SelectItem value="none">待指派</SelectItem>
                                    {members.map(m => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="w-5 h-5">
                                                    <AvatarImage src={m.avatar_url} />
                                                    <AvatarFallback>{m.display_name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {m.display_name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3" /> 描述
                        </Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="添加更多关于此需求的细节..."
                            className="min-h-[200px] rounded-2xl border-purple-50 bg-white focus:ring-purple-200 resize-none p-4 font-medium text-sm leading-relaxed"
                        />
                    </div>
                </div>

                <div className="p-8 bg-white border-t border-purple-50">
                    <Button
                        onClick={handleSave}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-12 font-black uppercase tracking-widest text-xs shadow-lg shadow-purple-200 transition-all active:scale-95"
                    >
                        保存需求
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

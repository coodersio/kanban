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

import { Badge } from "@/components/ui/badge";

interface Props {
    story: Story | null;
    open: boolean;
    onClose: () => void;
    onSave: (updatedStory: any) => void;
    members: Member[];
    currentUser?: { id: number, role: string, displayName: string };
    sprintId?: number;
    projectId?: number;
}

export default function StoryDetailsDrawer({ story, open, onClose, onSave, members, currentUser, sprintId, projectId }: Props) {
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState('not_started');
    const [assignedTo, setAssignedTo] = useState<number | null>(null);
    const [description, setDescription] = useState('');

    const isAdmin = currentUser?.role === 'admin';
    const isDeveloper = currentUser?.role === 'developer';
    const isCreator = story?.created_by === currentUser?.id;

    // Developer can only edit if created by self
    const canEdit = isAdmin || (isDeveloper && isCreator);

    const [history, setHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('details');

    useEffect(() => {
        if (story) {
            setTitle(story.title || '');
            setStatus(story.status || 'not_started');
            setAssignedTo(story.assigned_to_user?.id || null);
            setDescription((story as any).description || '');

            // Fetch History
            fetch(`/api/workbench/story/${story.id}/history`)
                .then(res => res.json())
                .then(data => setHistory(data))
                .catch(err => console.error(err));
        }
        setActiveTab('details');
    }, [story, open]);

    const handleSave = () => {
        if (!story) return;
        onSave({
            storyId: story.id,
            sprintId,
            projectId,
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
            <SheetContent className="sm:max-w-md w-full border-l shadow-xl p-0 flex flex-col bg-white">
                <SheetHeader className="px-6 py-4 border-b flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex-1">
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={!canEdit}
                                className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto placeholder:text-muted-foreground/50"
                                placeholder="Story Name"
                            />
                        </SheetTitle>
                    </div>

                    <nav className="flex gap-6 -mb-4">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={cn(
                                "pb-3 text-sm font-medium transition-all border-b-2",
                                activeTab === 'details' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={cn(
                                "pb-3 text-sm font-medium transition-all border-b-2",
                                activeTab === 'history' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Activity Log
                        </button>
                    </nav>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                    {activeTab === 'details' ? (
                        <>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                        <Flag className="w-3.5 h-3.5" /> Status
                                    </Label>
                                    <Select value={status} onValueChange={(val: any) => setStatus(val)} disabled={!canEdit}>
                                        <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2 font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="not_started">Not Started</SelectItem>
                                            <SelectItem value="in_progress">Working on it</SelectItem>
                                            <SelectItem value="completed">Done</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                                        <User className="w-3.5 h-3.5" /> Owner
                                    </Label>
                                    <Select value={assignedTo?.toString() || "none"} onValueChange={(val) => setAssignedTo(val === "none" ? null : parseInt(val))} disabled={!canEdit}>
                                        <SelectTrigger className="h-9 border-transparent hover:bg-secondary/50 transition-colors focus:ring-0 px-2 -ml-2 font-medium">
                                            <div className="flex items-center gap-2">
                                                {assignedTo ? (
                                                    <Avatar className="w-5 h-5">
                                                        <AvatarImage src={`https://i.pravatar.cc/150?u=${assignedTo}`} />
                                                        <AvatarFallback>{members.find(m => m.id === assignedTo)?.display_name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                ) : <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-3 h-3 text-slate-400" /></div>}
                                                <span className="text-sm font-medium">{assignedTo ? members.find(m => m.id === assignedTo)?.display_name : "Unassigned"}</span>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Unassigned</SelectItem>
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

                            <div className="space-y-2 pt-2 border-t">
                                <Label className="text-sm font-semibold text-foreground">Description</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="Add a description..."
                                    className="min-h-[200px] border-none bg-secondary/20 focus:bg-secondary/40 focus:ring-0 resize-none p-4 text-sm"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            {history.length > 0 ? (
                                <div className="space-y-4">
                                    {history.map((h, i) => (
                                        <div key={i} className="flex gap-4 items-start">
                                            <div className="w-2 h-2 mt-2 rounded-full bg-primary/40 flex-shrink-0" />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-sm font-medium">Sprint {h.sprint_number} Update</span>
                                                    <span className="text-xs text-muted-foreground">{new Date(h.start_date).toLocaleDateString()}</span>
                                                </div>
                                                <div className="bg-secondary/30 p-3 rounded-md text-sm">
                                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                        <span>Progress: {h.progress}%</span>
                                                        <span>Status: {h.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground text-sm">
                                    No activity yet
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                    {canEdit && activeTab === 'details' && (
                        <>
                            <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
                            <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
                        </>
                    )}
                    {!canEdit && activeTab === 'details' && (
                        <span className="text-xs text-muted-foreground self-center">View Only</span>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

// Utility for classNames
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

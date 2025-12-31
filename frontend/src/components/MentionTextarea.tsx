import { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import type { Member } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MentionTextareaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    members: Member[];
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function MentionTextarea({
    value,
    onChange,
    placeholder,
    members,
    className,
    onKeyDown
}: MentionTextareaProps) {
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Filter members based on search
    const filteredMembers = members
        .filter(m =>
            m.user_name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
            m.display_name.toLowerCase().includes(mentionSearch.toLowerCase())
        )
        .slice(0, 5); // Max 5 results

    useEffect(() => {
        setSelectedIndex(0);
    }, [mentionSearch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange(newValue);

        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = newValue.substring(0, cursorPos);

        // Check if we're typing after an @
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

            // Only show mentions if there's no space after @
            if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
                setMentionSearch(textAfterAt);
                setShowMentions(true);

                // Calculate position for dropdown (simplified - below cursor)
                const lines = textBeforeCursor.split('\n');
                const currentLine = lines.length;
                const lineHeight = 24; // approximate
                setMentionPosition({
                    top: currentLine * lineHeight,
                    left: 10
                });
                return;
            }
        }

        setShowMentions(false);
    };

    const insertMention = (member: Member) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);
        const textAfterCursor = value.substring(cursorPos);

        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const beforeAt = textBeforeCursor.substring(0, lastAtIndex);
            const newValue = beforeAt + '@' + member.user_name + ' ' + textAfterCursor;
            onChange(newValue);

            // Move cursor after the inserted mention
            setTimeout(() => {
                const newCursorPos = beforeAt.length + member.user_name.length + 2;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
                textarea.focus();
            }, 0);
        }

        setShowMentions(false);
        setMentionSearch('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMentions && filteredMembers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < filteredMembers.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredMembers.length - 1
                );
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredMembers[selectedIndex]);
                return;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowMentions(false);
                return;
            }
        }

        // Call parent onKeyDown if provided
        onKeyDown?.(e);
    };

    return (
        <div className="relative">
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={className}
            />

            {showMentions && filteredMembers.length > 0 && (
                <div
                    className="absolute z-50 w-64 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden"
                    style={{
                        top: `${mentionPosition.top + 30}px`,
                        left: `${mentionPosition.left}px`
                    }}
                >
                    {filteredMembers.map((member, index) => (
                        <div
                            key={member.id}
                            onClick={() => insertMention(member)}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                                index === selectedIndex
                                    ? 'bg-blue-50 border-l-2 border-blue-600'
                                    : 'hover:bg-gray-50'
                            }`}
                        >
                            <Avatar className="w-6 h-6">
                                <AvatarImage src={member.avatar_url} />
                                <AvatarFallback className="text-xs">
                                    {member.display_name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {member.display_name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    @{member.user_name}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

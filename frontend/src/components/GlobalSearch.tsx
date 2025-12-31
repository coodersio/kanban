import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchResult } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Layers, Calendar, FileText, CheckSquare, Loader2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

export function GlobalSearch() {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Debounced search
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.results || []);
                    setIsOpen(data.results && data.results.length > 0);
                    setSelectedIndex(0);
                }
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Group results by type
    const groupedResults = useMemo(() => {
        const groups: {
            projects: SearchResult[];
            sprints: SearchResult[];
            stories: SearchResult[];
            tasks: SearchResult[];
        } = {
            projects: [],
            sprints: [],
            stories: [],
            tasks: []
        };

        results.forEach(result => {
            if (result.result_type === 'project') {
                groups.projects.push(result);
            } else if (result.result_type === 'sprint') {
                groups.sprints.push(result);
            } else if (result.result_type === 'story') {
                groups.stories.push(result);
            } else if (result.result_type === 'task') {
                groups.tasks.push(result);
            }
        });

        return groups;
    }, [results]);

    // Flatten results for keyboard navigation
    const flatResults = useMemo(() => results, [results]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || flatResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => prev < flatResults.length - 1 ? prev + 1 : 0);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => prev > 0 ? prev - 1 : flatResults.length - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (flatResults[selectedIndex]) {
                handleResultClick(flatResults[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            setSearchQuery('');
            inputRef.current?.blur();
        }
    };

    const handleResultClick = (result: SearchResult) => {
        let url = '';

        if (result.result_type === 'project') {
            if (result.snapshot_id && result.sprint_id) {
                url = `/dashboard/workbench/PROJECT-${result.id}-${result.snapshot_id}?sprint=${result.sprint_id}`;
            } else {
                url = `/dashboard/projects`;
            }
        } else if (result.result_type === 'sprint') {
            url = `/dashboard/sprints?sprint=${result.sprint_id}`;
        } else if (result.result_type === 'story') {
            if (result.snapshot_id && result.sprint_id) {
                url = `/dashboard/workbench/STORY-${result.id}-${result.snapshot_id}?sprint=${result.sprint_id}`;
            } else {
                url = `/dashboard/workbench?sprint=${result.sprint_id || ''}`;
            }
        } else if (result.result_type === 'task') {
            if (result.snapshot_id && result.sprint_id) {
                url = `/dashboard/workbench/TASK-${result.id}-${result.snapshot_id}?sprint=${result.sprint_id}`;
            } else {
                url = `/dashboard/workbench?sprint=${result.sprint_id || ''}`;
            }
        }

        navigate(url);
        setIsOpen(false);
        setSearchQuery('');
        inputRef.current?.blur();
    };

    const highlightText = (text: string, query: string) => {
        if (!query.trim() || !text) return text;

        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, index) =>
            part.toLowerCase() === query.toLowerCase()
                ? <mark key={index} className="bg-yellow-200 text-foreground">{part}</mark>
                : part
        );
    };

    const truncateText = (text: string | undefined, maxLength: number = 100) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const getTypeIcon = (type: SearchResult['result_type']) => {
        switch (type) {
            case 'project':
                return <Layers className="w-4 h-4 text-blue-600" />;
            case 'sprint':
                return <Calendar className="w-4 h-4 text-green-600" />;
            case 'story':
                return <FileText className="w-4 h-4 text-purple-600" />;
            case 'task':
                return <CheckSquare className="w-4 h-4 text-orange-600" />;
        }
    };

    const getTypeBadge = (type: SearchResult['result_type']) => {
        const badges = {
            project: { text: '项目', className: 'bg-blue-100 text-blue-700' },
            sprint: { text: '迭代', className: 'bg-green-100 text-green-700' },
            story: { text: 'Story', className: 'bg-purple-100 text-purple-700' },
            task: { text: 'Task', className: 'bg-orange-100 text-orange-700' }
        };
        const badge = badges[type];
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
                {badge.text}
            </span>
        );
    };

    const renderResultItem = (result: SearchResult, index: number) => {
        const isSelected = index === selectedIndex;

        return (
            <div
                key={`${result.result_type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className={`px-4 py-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
            >
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                        {getTypeIcon(result.result_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {getTypeBadge(result.result_type)}
                            <h4 className="text-sm font-medium text-foreground truncate">
                                {highlightText(result.title, searchQuery)}
                            </h4>
                        </div>
                        {result.description && (
                            <p className="text-xs text-gray-600 line-clamp-2">
                                {highlightText(truncateText(result.description), searchQuery)}
                            </p>
                        )}
                        {result.sprint_number && (
                            <p className="text-xs text-gray-500 mt-1">
                                📍 {result.sprint_number}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="搜索项目、迭代、Story、Task..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (results.length > 0) {
                                setIsOpen(true);
                            }
                        }}
                        className="w-full h-9 pl-10 pr-10 rounded-md bg-input-background border-0 focus:bg-background focus:ring-2 focus:ring-ring/20 transition-all outline-none text-sm placeholder:text-muted-foreground"
                    />
                    {isLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-[600px] p-0"
                align="center"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="font-semibold text-sm">
                        🔍 找到 {results.length} 条结果
                    </h3>
                    <p className="text-xs text-gray-500">
                        使用 ↑↓ 导航，Enter 选择，Esc 关闭
                    </p>
                </div>

                <ScrollArea className="max-h-[500px]">
                    {groupedResults.projects.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-gray-50 border-b">
                                <h4 className="text-xs font-semibold text-gray-700">
                                    项目 ({groupedResults.projects.length})
                                </h4>
                            </div>
                            {groupedResults.projects.map((result) =>
                                renderResultItem(result, flatResults.indexOf(result))
                            )}
                        </div>
                    )}

                    {groupedResults.sprints.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-gray-50 border-b">
                                <h4 className="text-xs font-semibold text-gray-700">
                                    迭代 ({groupedResults.sprints.length})
                                </h4>
                            </div>
                            {groupedResults.sprints.map((result) =>
                                renderResultItem(result, flatResults.indexOf(result))
                            )}
                        </div>
                    )}

                    {groupedResults.stories.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-gray-50 border-b">
                                <h4 className="text-xs font-semibold text-gray-700">
                                    Story ({groupedResults.stories.length})
                                </h4>
                            </div>
                            {groupedResults.stories.map((result) =>
                                renderResultItem(result, flatResults.indexOf(result))
                            )}
                        </div>
                    )}

                    {groupedResults.tasks.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-gray-50 border-b">
                                <h4 className="text-xs font-semibold text-gray-700">
                                    Task ({groupedResults.tasks.length})
                                </h4>
                            </div>
                            {groupedResults.tasks.map((result) =>
                                renderResultItem(result, flatResults.indexOf(result))
                            )}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

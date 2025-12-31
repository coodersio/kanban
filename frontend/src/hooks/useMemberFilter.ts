import { useState } from 'react';

/**
 * Custom hook to manage member filtering in Workbench
 */
export function useMemberFilter() {
    const [filterMemberId, setFilterMemberId] = useState<number | null>(null);

    const toggleMemberFilter = (memberId: number) => {
        setFilterMemberId(prev => prev === memberId ? null : memberId);
    };

    const clearMemberFilter = () => {
        setFilterMemberId(null);
    };

    return {
        filterMemberId,
        setFilterMemberId,
        toggleMemberFilter,
        clearMemberFilter
    };
}

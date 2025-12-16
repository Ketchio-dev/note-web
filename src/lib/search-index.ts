/**
 * Client-Side Search Index
 * Fast in-memory search for blocks using inverted index
 */

import { Block } from './block-model';

interface SearchResult {
    blockId: string;
    score: number;
    snippet: string;
    pageId: string;
}

class ClientSearchIndex {
    // Inverted index: word -> Set of block IDs
    private index: Map<string, Set<string>> = new Map();

    // Block metadata for result rendering
    private blocks: Map<string, { plainText: string; pageId: string }> = new Map();

    // Stop words to ignore
    private stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    ]);

    /**
     * Tokenize text into searchable terms
     */
    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s가-힣]/g, ' ') // Keep alphanumeric and Korean
            .split(/\s+/)
            .filter(word => word.length > 1 && !this.stopWords.has(word));
    }

    /**
     * Index a single block
     */
    indexBlock(block: Block) {
        const text = block.plainText || '';
        if (!text.trim()) return;

        // Store block metadata
        this.blocks.set(block.id, {
            plainText: text,
            pageId: block.page_id,
        });

        // Tokenize and index
        const tokens = this.tokenize(text);

        for (const token of tokens) {
            if (!this.index.has(token)) {
                this.index.set(token, new Set());
            }
            this.index.get(token)!.add(block.id);
        }
    }

    /**
     * Remove block from index
     */
    removeBlock(blockId: string) {
        // Remove from metadata
        this.blocks.delete(blockId);

        // Remove from inverted index
        for (const [token, blockIds] of this.index.entries()) {
            blockIds.delete(blockId);
            if (blockIds.size === 0) {
                this.index.delete(token);
            }
        }
    }

    /**
     * Update block in index
     */
    updateBlock(block: Block) {
        this.removeBlock(block.id);
        this.indexBlock(block);
    }

    /**
     * Search for blocks matching query
     */
    search(query: string, limit: number = 10): SearchResult[] {
        if (!query.trim()) return [];

        const tokens = this.tokenize(query);
        if (tokens.length === 0) return [];

        // Count matches per block
        const blockScores = new Map<string, number>();

        for (const token of tokens) {
            const matchingBlocks = this.index.get(token);
            if (!matchingBlocks) continue;

            for (const blockId of matchingBlocks) {
                blockScores.set(blockId, (blockScores.get(blockId) || 0) + 1);
            }
        }

        // Sort by score and return results
        const results = Array.from(blockScores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([blockId, score]) => {
                const blockData = this.blocks.get(blockId);
                if (!blockData) return null;

                return {
                    blockId,
                    score,
                    snippet: this.getSnippet(blockData.plainText, tokens),
                    pageId: blockData.pageId,
                };
            })
            .filter((r): r is SearchResult => r !== null);

        return results;
    }

    /**
     * Get text snippet with highlighted matches
     */
    private getSnippet(text: string, searchTokens: string[], maxLength: number = 100): string {
        const lowerText = text.toLowerCase();

        // Find first occurrence of any search token
        let firstMatchIndex = Infinity;
        for (const token of searchTokens) {
            const index = lowerText.indexOf(token);
            if (index !== -1 && index < firstMatchIndex) {
                firstMatchIndex = index;
            }
        }

        if (firstMatchIndex === Infinity) {
            // No match found, return start of text
            return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
        }

        // Extract snippet around the match
        const start = Math.max(0, firstMatchIndex - 30);
        const end = Math.min(text.length, firstMatchIndex + maxLength - 30);

        let snippet = text.substring(start, end);

        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';

        return snippet;
    }

    /**
     * Index multiple blocks at once
     */
    indexBlocks(blocks: Block[]) {
        blocks.forEach(block => this.indexBlock(block));
    }

    /**
     * Clear entire index
     */
    clear() {
        this.index.clear();
        this.blocks.clear();
    }

    /**
     * Get index statistics
     */
    getStats() {
        return {
            totalTokens: this.index.size,
            totalBlocks: this.blocks.size,
            averageTokensPerBlock: this.blocks.size > 0
                ? Array.from(this.blocks.values())
                    .map(b => this.tokenize(b.plainText).length)
                    .reduce((a, b) => a + b, 0) / this.blocks.size
                : 0,
        };
    }
}

// Singleton instance
export const searchIndex = new ClientSearchIndex();

/**
 * Hook for using search index
 */
export function useSearchIndex() {
    return {
        search: (query: string, limit?: number) => searchIndex.search(query, limit),
        indexBlock: (block: Block) => searchIndex.indexBlock(block),
        updateBlock: (block: Block) => searchIndex.updateBlock(block),
        removeBlock: (blockId: string) => searchIndex.removeBlock(blockId),
        indexBlocks: (blocks: Block[]) => searchIndex.indexBlocks(blocks),
        getStats: () => searchIndex.getStats(),
    };
}

// Auto-index blocks when they're loaded
if (typeof window !== 'undefined') {
    (window as any).__searchIndex__ = searchIndex;
    console.log('🔍 Search index available at window.__searchIndex__');
}

/**
 * AI Research & Report Generator
 * Search web + AI analysis + Auto-generate reports
 */

"use client";

import { useState } from 'react';
import { Search, FileText, Download, Copy, Sparkles, ExternalLink, Loader2 } from 'lucide-react';

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source: string;
}

interface ReportSection {
    title: string;
    content: string;
    citations: string[];
}

interface GeneratedReport {
    title: string;
    summary: string;
    sections: ReportSection[];
    sources: SearchResult[];
    generatedAt: Date;
}

interface AIResearchProps {
    onReportGenerated?: (report: GeneratedReport) => void;
}

export function AIResearchAssistant({ onReportGenerated }: AIResearchProps) {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [report, setReport] = useState<GeneratedReport | null>(null);
    const [error, setError] = useState('');

    /**
     * Step 1: Search the web
     */
    const searchWeb = async (searchQuery: string): Promise<SearchResult[]> => {
        // In production, use a real search API (Google Custom Search, Bing, etc.)
        // For now, simulate search results
        await new Promise(resolve => setTimeout(resolve, 1500));

        const mockResults: SearchResult[] = [
            {
                title: `${searchQuery} - Overview`,
                url: `https://example.com/${searchQuery.replace(/\s+/g, '-')}`,
                snippet: `Comprehensive overview of ${searchQuery} including key concepts, applications, and recent developments...`,
                source: 'example.com',
            },
            {
                title: `Latest ${searchQuery} Research`,
                url: `https://research.org/${searchQuery}`,
                snippet: `Recent studies and findings related to ${searchQuery}. Includes data analysis and expert opinions...`,
                source: 'research.org',
            },
            {
                title: `${searchQuery}: Best Practices`,
                url: `https://blog.tech/${searchQuery}`,
                snippet: `Industry best practices and implementation strategies for ${searchQuery}...`,
                source: 'blog.tech',
            },
            {
                title: `Understanding ${searchQuery}`,
                url: `https://wiki.org/${searchQuery}`,
                snippet: `Detailed explanation of ${searchQuery} with examples and use cases...`,
                source: 'wiki.org',
            },
            {
                title: `${searchQuery} in 2024`,
                url: `https://news.tech/${searchQuery}`,
                snippet: `Current trends and future predictions for ${searchQuery}...`,
                source: 'news.tech',
            },
        ];

        return mockResults;
    };

    /**
     * Step 2: Generate report using AI
     */
    const generateReport = async (
        searchQuery: string,
        results: SearchResult[]
    ): Promise<GeneratedReport> => {
        // Call AI API to generate structured report
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `You are a professional research analyst. Based on the following search results about "${searchQuery}", create a comprehensive, well-structured report.

Search Results:
${results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   Source: ${r.url}`).join('\n\n')}

Generate a report with:
1. Executive Summary (2-3 paragraphs)
2. Main sections with detailed analysis
3. Key findings
4. Conclusion
5. Cite sources using [1], [2], etc.

Format as JSON:
{
  "title": "Report Title",
  "summary": "Executive summary...",
  "sections": [
    {
      "title": "Section Title",
      "content": "Section content with citations [1]...",
      "citations": ["1"]
    }
  ]
}`,
                context: results.map(r => r.snippet).join('\n\n'),
            }),
        });

        const data = await response.json();

        // Parse AI response
        let reportData;
        try {
            reportData = JSON.parse(data.content || data.response);
        } catch {
            // Fallback: create structured report from text
            reportData = {
                title: `Research Report: ${searchQuery}`,
                summary: data.content || data.response,
                sections: [
                    {
                        title: 'Findings',
                        content: data.content || data.response,
                        citations: results.map((_, i) => String(i + 1)),
                    },
                ],
            };
        }

        return {
            ...reportData,
            sources: results,
            generatedAt: new Date(),
        };
    };

    /**
     * Main handler: Search + Generate
     */
    const handleResearch = async () => {
        if (!query.trim()) return;

        setError('');
        setReport(null);
        setSearchResults([]);

        try {
            // Step 1: Search
            setIsSearching(true);
            const results = await searchWeb(query);
            setSearchResults(results);
            setIsSearching(false);

            // Step 2: Generate report
            setIsGenerating(true);
            const generatedReport = await generateReport(query, results);
            setReport(generatedReport);
            setIsGenerating(false);

            if (onReportGenerated) {
                onReportGenerated(generatedReport);
            }
        } catch (err) {
            setError('Failed to generate report. Please try again.');
            setIsSearching(false);
            setIsGenerating(false);
        }
    };

    /**
     * Export report as Markdown
     */
    const exportAsMarkdown = () => {
        if (!report) return;

        const markdown = `# ${report.title}

**Generated**: ${report.generatedAt.toLocaleString()}

---

## Executive Summary

${report.summary}

---

${report.sections
                .map(
                    (section) => `## ${section.title}

${section.content}

`
                )
                .join('\n')}

---

## Sources

${report.sources.map((source, i) => `[${i + 1}] ${source.title}  \n${source.url}`).join('\n\n')}
`;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.title.replace(/\s+/g, '-')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /**
     * Copy to clipboard
     */
    const copyToClipboard = () => {
        if (!report) return;

        const text = `${report.title}\n\n${report.summary}\n\n${report.sections
            .map((s) => `${s.title}\n${s.content}`)
            .join('\n\n')}`;

        navigator.clipboard.writeText(text);
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Search Input */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="text-purple-600" size={28} />
                    AI Research Assistant
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Search the web and generate comprehensive reports automatically
                </p>

                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                            placeholder="Enter research topic... (e.g., 'AI in healthcare 2024')"
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800"
                        />
                    </div>
                    <button
                        onClick={handleResearch}
                        disabled={!query.trim() || isSearching || isGenerating}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSearching || isGenerating ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                {isSearching ? 'Searching...' : 'Generating...'}
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                Research & Generate
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                        {error}
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Search Results */}
                {searchResults.length > 0 && !report && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Search size={20} />
                            Search Results ({searchResults.length})
                        </h3>
                        <div className="space-y-3">
                            {searchResults.map((result, index) => (
                                <div
                                    key={index}
                                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h4 className="font-medium text-blue-600 dark:text-blue-400">
                                            [{index + 1}] {result.title}
                                        </h4>
                                        <a
                                            href={result.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{result.snippet}</p>
                                    <p className="text-xs text-gray-500">{result.source}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Generated Report */}
                {report && (
                    <div className="max-w-4xl mx-auto">
                        {/* Report Header */}
                        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                    <h1 className="text-3xl font-bold mb-2">{report.title}</h1>
                                    <p className="text-sm text-gray-500">
                                        Generated on {report.generatedAt.toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={copyToClipboard}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                        title="Copy to clipboard"
                                    >
                                        <Copy size={20} />
                                    </button>
                                    <button
                                        onClick={exportAsMarkdown}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                        title="Export as Markdown"
                                    >
                                        <Download size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Executive Summary */}
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                                <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                    <FileText size={20} />
                                    Executive Summary
                                </h2>
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {report.summary}
                                </p>
                            </div>
                        </div>

                        {/* Report Sections */}
                        <div className="space-y-6 mb-8">
                            {report.sections.map((section, index) => (
                                <div key={index}>
                                    <h2 className="text-2xl font-bold mb-3">{section.title}</h2>
                                    <div className="prose dark:prose-invert max-w-none">
                                        <p className="whitespace-pre-wrap">{section.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Sources */}
                        <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                            <h2 className="text-xl font-bold mb-4">Sources</h2>
                            <div className="space-y-3">
                                {report.sources.map((source, index) => (
                                    <div key={index} className="flex gap-3">
                                        <span className="text-gray-500 font-mono">[{index + 1}]</span>
                                        <div>
                                            <a
                                                href={source.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                            >
                                                {source.title}
                                            </a>
                                            <p className="text-sm text-gray-500">{source.url}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

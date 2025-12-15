/**
 * AI-related type definitions
 */

/**
 * Chat message structure
 */
export interface Message {
    role: 'user' | 'assistant';
    content: string;
    reasoning?: string;
}

/**
 * AI action types for modifying pages
 */
export interface AIAction {
    type: 'append' | 'replace' | 'update_page';
    content?: string;
    pageId?: string;
}

/**
 * Response from AI generation
 */
export interface AIResponse {
    content: string;
    reasoning?: string;
}

/**
 * Model configuration
 */
export interface ModelConfig {
    id: string;
    name: string;
    provider: string;
}

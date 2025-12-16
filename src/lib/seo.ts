/**
 * SEO Utilities
 * Meta tags, Open Graph, Twitter Cards, JSON-LD
 */

interface SEOConfig {
    title: string;
    description: string;
    url?: string;
    image?: string;
    type?: 'website' | 'article' | 'profile';
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    tags?: string[];
}

/**
 * Generate meta tags for SEO
 */
export function generateMetaTags(config: SEOConfig) {
    const {
        title,
        description,
        url = '',
        image = '/og-image.png',
        type = 'website',
        publishedTime,
        modifiedTime,
        author,
        tags = [],
    } = config;

    return {
        // Basic meta tags
        title,
        description,
        keywords: tags.join(', '),

        // Open Graph
        openGraph: {
            title,
            description,
            url,
            siteName: 'Note Web',
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
            locale: 'en_US',
            type,
            ...(publishedTime && { publishedTime }),
            ...(modifiedTime && { modifiedTime }),
        },

        // Twitter Card
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [image],
            creator: author ? `@${author}` : '@noteweb',
        },

        // Additional
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
    };
}

/**
 * Generate JSON-LD structured data
 */
export function generateJSONLD(config: {
    type: 'Organization' | 'Article' | 'BreadcrumbList' | 'WebSite';
    data: any;
}) {
    const baseContext = 'https://schema.org';

    const generators = {
        Organization: (data: any) => ({
            '@context': baseContext,
            '@type': 'Organization',
            name: data.name || 'Note Web',
            url: data.url || 'https://noteweb.app',
            logo: data.logo || 'https://noteweb.app/logo.png',
            description: data.description || 'Collaborative workspace with AI',
            sameAs: data.socialLinks || [],
        }),

        Article: (data: any) => ({
            '@context': baseContext,
            '@type': 'Article',
            headline: data.title,
            description: data.description,
            image: data.image,
            datePublished: data.publishedTime,
            dateModified: data.modifiedTime,
            author: {
                '@type': 'Person',
                name: data.author,
            },
        }),

        BreadcrumbList: (data: any) => ({
            '@context': baseContext,
            '@type': 'BreadcrumbList',
            itemListElement: data.items.map((item: any, index: number) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.name,
                item: item.url,
            })),
        }),

        WebSite: (data: any) => ({
            '@context': baseContext,
            '@type': 'WebSite',
            name: data.name || 'Note Web',
            url: data.url || 'https://noteweb.app',
            potentialAction: {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${data.url}/search?q={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
            },
        }),
    };

    return generators[config.type](config.data);
}

/**
 * Generate sitemap entry
 */
export function generateSitemapEntry(config: {
    url: string;
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
}) {
    return {
        url: config.url,
        lastmod: config.lastmod || new Date().toISOString(),
        changefreq: config.changefreq || 'weekly',
        priority: config.priority || 0.5,
    };
}

/**
 * Get canonical URL
 */
export function getCanonicalUrl(path: string, baseUrl = 'https://noteweb.app') {
    return `${baseUrl}${path}`;
}

/**
 * Get page title with site name
 */
export function getPageTitle(title: string, includeCompany = true) {
    return includeCompany ? `${title} | Note Web` : title;
}

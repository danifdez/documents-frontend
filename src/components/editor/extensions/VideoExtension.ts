import { Node, mergeAttributes } from '@tiptap/core';

export interface VideoOptions {
    HTMLAttributes: Record<string, any>;
    allowFullscreen: boolean;
    width: number;
    height: number;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        videoEmbed: {
            insertVideo: (url: string) => ReturnType;
        };
    }
}

function getEmbedUrl(url: string): string | null {
    // YouTube
    const ytMatch = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Dailymotion
    const dmMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
    if (dmMatch) {
        return `https://www.dailymotion.com/embed/video/${dmMatch[1]}`;
    }

    // Already an embed URL
    if (url.includes('/embed/') || url.includes('player.vimeo.com')) {
        return url;
    }

    // Direct video file (mp4, webm, ogg)
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
        return url;
    }

    return url;
}

function isDirectVideo(url: string): boolean {
    return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

export const VideoExtension = Node.create<VideoOptions>({
    name: 'videoEmbed',
    group: 'block',
    atom: true,
    draggable: true,

    addOptions() {
        return {
            HTMLAttributes: {},
            allowFullscreen: true,
            width: 640,
            height: 360,
        };
    },

    addAttributes() {
        return {
            src: {
                default: null,
                parseHTML: (element) => {
                    const iframe = element.querySelector('iframe');
                    const video = element.querySelector('video');
                    if (iframe) return iframe.getAttribute('src');
                    if (video) return video.getAttribute('src') || video.querySelector('source')?.getAttribute('src');
                    return element.getAttribute('data-video-src');
                },
                renderHTML: (attributes) => ({
                    'data-video-src': attributes.src,
                }),
            },
            width: {
                default: 640,
            },
            height: {
                default: 360,
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'div[data-video-embed]' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const src = HTMLAttributes['data-video-src'] || '';
        const embedUrl = getEmbedUrl(src);
        const isDirect = isDirectVideo(src);

        if (isDirect) {
            return [
                'div',
                mergeAttributes(this.options.HTMLAttributes, {
                    'data-video-embed': '',
                    'data-video-src': src,
                    class: 'video-embed',
                    style: 'margin:12px 0;text-align:center;',
                }),
                [
                    'video',
                    {
                        src: embedUrl,
                        controls: 'true',
                        style: 'max-width:100%;border-radius:8px;',
                        width: HTMLAttributes.width || this.options.width,
                    },
                ],
            ];
        }

        return [
            'div',
            mergeAttributes(this.options.HTMLAttributes, {
                'data-video-embed': '',
                'data-video-src': src,
                class: 'video-embed',
                style: 'margin:12px 0;text-align:center;',
            }),
            [
                'iframe',
                {
                    src: embedUrl,
                    width: HTMLAttributes.width || this.options.width,
                    height: HTMLAttributes.height || this.options.height,
                    frameborder: '0',
                    allowfullscreen: this.options.allowFullscreen ? 'true' : undefined,
                    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
                    style: 'max-width:100%;border-radius:8px;border:1px solid #e5e7eb;',
                },
            ],
        ];
    },

    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement('div');
            dom.classList.add('video-embed');
            dom.setAttribute('data-video-embed', '');
            dom.style.cssText = 'margin:12px 0;text-align:center;';

            const src = node.attrs.src || '';
            const embedUrl = getEmbedUrl(src);
            const isDirect = isDirectVideo(src);

            if (isDirect && embedUrl) {
                const video = document.createElement('video');
                video.src = embedUrl;
                video.controls = true;
                video.style.cssText = 'max-width:100%;border-radius:8px;';
                video.width = node.attrs.width || this.options.width;
                dom.appendChild(video);
            } else if (embedUrl) {
                const iframe = document.createElement('iframe');
                iframe.src = embedUrl;
                iframe.width = String(node.attrs.width || this.options.width);
                iframe.height = String(node.attrs.height || this.options.height);
                iframe.frameBorder = '0';
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                if (this.options.allowFullscreen) {
                    iframe.allowFullscreen = true;
                }
                iframe.style.cssText = 'max-width:100%;border-radius:8px;border:1px solid #e5e7eb;';
                dom.appendChild(iframe);
            } else {
                dom.textContent = 'Invalid video URL';
                dom.style.cssText += 'color:#9CA3AF;padding:20px;background:#F9FAFB;border-radius:8px;';
            }

            return { dom };
        };
    },

    addCommands() {
        return {
            insertVideo:
                (url: string) =>
                ({ commands }) => {
                    const embedUrl = getEmbedUrl(url);
                    if (!embedUrl) return false;

                    return commands.insertContent({
                        type: this.name,
                        attrs: { src: url },
                    });
                },
        };
    },
});

export default VideoExtension;

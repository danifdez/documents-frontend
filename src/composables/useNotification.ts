import { useToast, TYPE, POSITION, ToastOptions } from 'vue-toastification';
import { h } from 'vue';

interface NotificationOptions extends ToastOptions {
    title?: string;
    link?: {
        text: string;
        url: string;
        onClick?: () => void;
    };
    action?: {
        text: string;
        onClick: () => void;
    };
}

export function useNotification() {
    const toast = useToast();

    /**
     * Display a notification with enhanced options
     */
    const notify = (message: string, options?: NotificationOptions) => {
        const defaultOptions: NotificationOptions = {
            timeout: 5000,
            closeOnClick: true,
            pauseOnFocusLoss: true,
            pauseOnHover: true,
            draggable: true,
            position: POSITION.TOP_RIGHT,
            ...options,
        };

        let content: any = message;

        if (options?.title || options?.link || options?.action) {
            content = h('div', { class: 'flex flex-col' }, [
                options.title && h('div', { class: 'font-bold text-sm mb-1' }, options.title),
                h('div', { class: 'text-sm' }, message),

                options.link && h('a', {
                    class: 'toast-link text-xs mt-1',
                    href: options.link.url,
                    onClick: (e: MouseEvent) => {
                        if (options.link?.onClick) {
                            e.preventDefault();
                            options.link.onClick();
                        }
                    }
                }, options.link.text),

                options.action && h('button', {
                    class: 'bg-white bg-opacity-20 text-white text-xs px-2 py-1 rounded mt-2 hover:bg-opacity-30 transition-all',
                    onClick: options.action.onClick
                }, options.action.text)
            ]);
        }

        return toast(content, defaultOptions);
    };

    /**
     * Display a success notification
     */
    const success = (message: string, options?: NotificationOptions) => {
        return notify(message, { ...options, type: TYPE.SUCCESS });
    };

    /**
     * Display an error notification
     */
    const error = (message: string, options?: NotificationOptions) => {
        return notify(message, { ...options, type: TYPE.ERROR });
    };

    /**
     * Display a warning notification
     */
    const warning = (message: string, options?: NotificationOptions) => {
        return notify(message, { ...options, type: TYPE.WARNING });
    };

    /**
     * Display an info notification
     */
    const info = (message: string, options?: NotificationOptions) => {
        return notify(message, { ...options, type: TYPE.INFO });
    };

    /**
     * Clear all notifications
     */
    const clearAll = () => {
        toast.clear();
    };

    /**
     * Remove a specific notification by ID
     */
    const remove = (id: string | number) => {
        toast.dismiss(id);
    };

    /**
     * Update an existing notification by ID
     */
    const update = (id: string | number, message: string, options?: NotificationOptions) => {
        toast.update(id, {
            content: message,
            ...options
        });
    };

    return {
        notify,
        success,
        error,
        warning,
        info,
        clearAll,
        remove,
        update
    };
}
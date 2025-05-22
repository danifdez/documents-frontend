<template>
    <div class="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-6">Notification Examples</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div>
                <h3 class="font-bold mb-3">Basic Notifications</h3>
                <div class="flex flex-col space-y-2">
                    <button @click="showSuccessNotification"
                        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        Success Notification
                    </button>
                    <button @click="showErrorNotification"
                        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        Error Notification
                    </button>
                    <button @click="showWarningNotification"
                        class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                        Warning Notification
                    </button>
                    <button @click="showInfoNotification"
                        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Info Notification
                    </button>
                </div>
            </div>

            <div>
                <h3 class="font-bold mb-3">Enhanced Notifications</h3>
                <div class="flex flex-col space-y-2">
                    <button @click="showTitledNotification"
                        class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                        With Title
                    </button>
                    <button @click="showLinkNotification"
                        class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                        With Link
                    </button>
                    <button @click="showActionNotification"
                        class="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700">
                        With Action Button
                    </button>
                    <button @click="showComplexNotification"
                        class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">
                        Complex Notification
                    </button>
                </div>
            </div>
        </div>

        <div class="mb-8">
            <h3 class="font-bold mb-3">Control Notifications</h3>
            <div class="flex flex-row space-x-2">
                <button @click="clearAllNotifications"
                    class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                    Clear All Notifications
                </button>
                <button @click="updateNotification" class="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">
                    Update Last Notification
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useNotification } from '../../composables/useNotification';

export default defineComponent({
    name: 'NotificationExample',
    setup() {
        const notification = useNotification();
        const lastToastId = ref<string | number | null>(null);

        const showSuccessNotification = () => {
            lastToastId.value = notification.success('Operation completed successfully!');
        };

        const showErrorNotification = () => {
            lastToastId.value = notification.error('An error occurred while processing your request.');
        };

        const showWarningNotification = () => {
            lastToastId.value = notification.warning('This action might have unintended consequences.');
        };

        const showInfoNotification = () => {
            lastToastId.value = notification.info('The system will be undergoing maintenance soon.');
        };

        const showTitledNotification = () => {
            lastToastId.value = notification.success('Your document has been saved.', {
                title: 'Document Saved'
            });
        };

        const showLinkNotification = () => {
            lastToastId.value = notification.info('Check out project documentation.', {
                link: {
                    text: 'View Documentation',
                    url: 'https://github.com/your-repo/docs',
                    onClick: () => {
                        console.log('Link clicked - would open in browser');
                    }
                }
            });
        };

        const showActionNotification = () => {
            lastToastId.value = notification.warning('Your session is about to expire.', {
                timeout: 10000, // 10 seconds
                action: {
                    text: 'Extend Session',
                    onClick: () => {
                        console.log('Action clicked - would extend session');
                        notification.success('Session extended!');
                    }
                }
            });
        };

        const showComplexNotification = () => {
            lastToastId.value = notification.notify('New message from project team', {
                title: 'Team Communication',
                type: 'info',
                timeout: 15000,
                link: {
                    text: 'Read Message',
                    url: '#',
                    onClick: () => {
                        console.log('Would open message thread');
                    }
                },
                action: {
                    text: 'Reply',
                    onClick: () => {
                        console.log('Would open reply dialog');
                    }
                }
            });
        };

        const clearAllNotifications = () => {
            notification.clearAll();
        };

        const updateNotification = () => {
            if (lastToastId.value !== null) {
                notification.update(lastToastId.value, 'This notification has been updated!', {
                    type: 'info',
                    timeout: 5000
                });
            } else {
                notification.info('No notification to update');
            }
        };

        return {
            showSuccessNotification,
            showErrorNotification,
            showWarningNotification,
            showInfoNotification,
            showTitledNotification,
            showLinkNotification,
            showActionNotification,
            showComplexNotification,
            clearAllNotifications,
            updateNotification
        };
    }
});
</script>
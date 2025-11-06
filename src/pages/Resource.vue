<template>
    <div v-bind="$attrs" class="h-full flex flex-col overflow-hidden">
        <div class="flex-shrink-0">
            <Breadcrumb :items="breadcrumbItems" />
        </div>

        <div v-if="isLoading" class="flex justify-center items-center flex-1">
            <p class="text-gray-500">Loading resource details...</p>
        </div>

        <div v-else-if="error" class="flex justify-center items-center flex-1">
            <p class="text-red-500">Error: {{ error }}</p>
        </div>

        <!-- Pending Confirmation View: Full width, no sidebar -->
        <div v-else-if="isPendingConfirmation" class="flex-1 overflow-hidden min-h-0 flex flex-col">
            <div class="bg-white p-4 shadow rounded-lg flex-shrink-0">
                <div class="flex items-center mb-4">
                    <IconType :mimeType="resource.mimeType" />
                    <div class="flex items-center flex-grow">
                        <h1 class="text-2xl font-bold mr-3 px-2 py-1">{{ resource.name }}</h1>
                    </div>
                </div>
                <!-- Warning banner when pending confirmation -->
                <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600 mr-2"
                                viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clip-rule="evenodd" />
                            </svg>
                            <span class="text-sm font-medium text-yellow-800">Resource pending confirmation - Review and
                                confirm the extracted content</span>
                        </div>
                        <Button @click="confirmResourceExtraction" :disabled="isConfirming" variant="primary"
                            class="ml-4">
                            <svg v-if="isConfirming" class="animate-spin h-4 w-4 mr-2 inline-block"
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            {{ isConfirming ? 'Confirming...' : 'Confirm Extraction' }}
                        </Button>
                    </div>
                </div>
            </div>

            <!-- Split view content for pending confirmation -->
            <div
                class="border border-gray-200 rounded-lg px-5 py-4 flex-1 min-h-0 bg-white mt-4 shadow overflow-hidden">
                <div class="h-full flex flex-col">
                    <div class="flex justify-end mb-2 gap-2">
                        <Button @click="saveEdit" :disabled="isSaving" variant="primary">
                            <svg v-if="isSaving" class="animate-spin h-4 w-4 mr-2 inline-block"
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            {{ isSaving ? 'Saving...' : savedSuccessfully ? '✓ Saved' : 'Save Changes' }}
                        </Button>
                    </div>
                    <div class="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
                        <div class="flex flex-col h-full overflow-hidden">
                            <h3 class="text-lg font-semibold mb-2">Extracted Content (Editable)</h3>
                            <div class="flex-1 overflow-hidden">
                                <EditorContent ref="editorContentRef" :content="resource.content" :is-saving="isSaving"
                                    :saved-successfully="savedSuccessfully" context="resource"
                                    @content-change="handleEditContentChange" />
                            </div>
                        </div>
                        <div class="flex flex-col h-full border-l pl-4 overflow-hidden">
                            <h3 class="text-lg font-semibold mb-2">Original Document</h3>
                            <div class="flex-1 overflow-auto">
                                <iframe v-if="isHtmlFile" class="w-full h-full min-h-[500px]" :srcdoc="rawHtmlContent"
                                    sandbox="allow-same-origin" title="HTML Preview">
                                </iframe>
                                <iframe v-else-if="isPdfFile" class="w-full h-full min-h-[500px]"
                                    :src="`${apiBaseUrl}/resources/${resourceId}/view#toolbar=0&navpanes=0&scrollbar=0&sidebar=0`"
                                    type="application/pdf" :title="resource.originalName || 'PDF Preview'">
                                </iframe>
                                <div v-else class="text-gray-500">Preview not available for this file type</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Normal View: with sidebar -->
        <div v-else class="grid grid-cols-1 gap-6 flex-1 overflow-hidden min-h-0"
            :class="[splitViewActive ? 'lg:grid-cols-2' : showSidebar ? 'md:grid-cols-3' : 'md:grid-cols-1', { 'drag-over': isDragOver }]"
            @dragover="onDragOver" @dragenter="onDragEnter" @dragleave="onDragLeave" @drop="onDrop">
            <div class="flex flex-col overflow-hidden min-h-0"
                :class="[splitViewActive ? 'lg:col-span-1' : showSidebar ? 'md:col-span-2' : 'md:col-span-1', { 'split-view-active': splitViewActive }]">
                <div class="bg-white p-4 flex-shrink-0">
                    <div class="flex items-center mb-4">
                        <IconType :mimeType="resource.mimeType" />
                        <div class="flex items-center flex-grow">
                            <input v-if="isEditingName" v-model="editResourceName" @input="handleResourceNameChange"
                                @keyup.enter="saveResourceName" @keyup.escape="cancelNameEdit" @blur="handleBlur"
                                type="text"
                                class="text-2xl font-bold bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-3 flex-grow"
                                placeholder="Resource name..." ref="nameInput" />
                            <h1 v-else @dblclick="startNameEdit"
                                class="text-2xl font-bold mr-3 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                                title="Double-click to edit">{{ resource.name }}</h1>
                        </div>
                        <Button @click="confirmRemoveResource" variant="danger" title="Remove Resource">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1" fill="none"
                                viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Remove
                        </Button>
                    </div>
                    <!-- Toolbar (not shown for images or during extraction) -->
                    <Toolbar v-if="!isImageFile && !isExtracting" :has-summary="resource.summary"
                        :has-key-points="resource.keyPoints && resource.keyPoints.length > 0"
                        :has-keywords="resource.keywords && resource.keywords.length > 0" :display-mode="displayMode"
                        @download="downloadResource" @startEdit="startEdit" @saveEdit="saveEdit"
                        @cancelEdit="cancelEdit" @changeDisplayMode="handleDisplayMode"
                        :hasExtractedContent="hasExtractedContent" :hasTranslatedContent="hasTranslatedContent"
                        :hasWorkspace="!!workspaceDocument" :hide-workspace="isWorkspaceShownInSplit"
                        :is-edit-mode="isEditMode" @ask="showChat = true" :extractedContent="resource.content"
                        :translatedContent="resource.translatedContent" :sourceLanguage="resource.language || ''"
                        :defaultLanguage="defaultLanguage" @summarize="handleSummarizeJob" @translate="handleTranslate"
                        @extractEntities="handleExtractEntities" @createWorkspace="handleCreateWorkspace"
                        @keyPoints="handleKeyPointsJob" @send-selection-to-workspace="handleToolbarSendSelection"
                        @keywords="handleKeywordsJob" :hasEntities="resource.entities && resource.entities.length > 0"
                        :isConfirmed="!isPendingConfirmation" />
                    <!-- Show extraction message when extracting -->
                    <div v-else-if="isExtracting && !isImageFile"
                        class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div class="flex items-center">
                            <svg class="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg"
                                fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            <span class="text-sm font-medium text-blue-800">Extracting content... Only original view is
                                available.</span>
                        </div>
                    </div>
                </div>

                <div class=" bg-white mt-4 flex-1 min-h-0 flex flex-col overflow-hidden"
                    :class="(displayMode === 'raw' || displayMode === 'workspace') ? 'p-0' : 'px-5 py-4'">
                    <div v-if="isEditMode && editType !== 'overview'" class="w-full flex-1 overflow-y-auto">
                        <EditorContent ref="editorContentRef" :content="editContent" :is-saving="false"
                            :saved-successfully="savedSuccessfully" context="resource"
                            @content-change="handleEditContentChange" />
                    </div>
                    <div v-else-if="isEditMode && editType === 'overview'"
                        class="w-full flex-1 overflow-y-auto space-y-6">
                        <!-- Summary Editor -->
                        <div class="bg-white p-4 rounded shadow">
                            <h3 class="font-semibold mb-3 text-lg">Summary</h3>
                            <div class="max-h-[300px] overflow-y-auto border border-gray-200 rounded">
                                <EditorContent ref="editorContentRef" :content="editSummary" :is-saving="false"
                                    :saved-successfully="false" context="resource"
                                    @content-change="(content) => editSummary = content" />
                            </div>
                        </div>

                        <!-- Key Points Editor -->
                        <div class="bg-white p-4 rounded shadow">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="font-semibold text-lg">Key Points</h3>
                                <Button size="small" @click="addKeyPoint">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add
                                </Button>
                            </div>
                            <div class="space-y-2">
                                <div v-for="(kp, idx) in editKeyPoints" :key="idx" class="flex items-center gap-2">
                                    <button @click="moveKeyPointUp(idx)" :disabled="idx === 0"
                                        class="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M5 15l7-7 7 7" />
                                        </svg>
                                    </button>
                                    <button @click="moveKeyPointDown(idx)" :disabled="idx === editKeyPoints.length - 1"
                                        class="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <input v-model="editKeyPoints[idx]" type="text"
                                        class="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter key point..." />
                                    <button @click="removeKeyPoint(idx)"
                                        class="p-2 text-red-600 hover:bg-red-50 rounded">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <p v-if="editKeyPoints.length === 0" class="text-gray-500 text-sm italic">No key points.
                                    Click "Add" to create one.</p>
                            </div>
                        </div>

                        <!-- Keywords Editor -->
                        <div class="bg-white p-4 rounded shadow">
                            <h3 class="font-semibold mb-3 text-lg">Keywords</h3>
                            <div
                                class="flex flex-wrap gap-2 items-center p-2 border border-gray-300 rounded min-h-[50px]">
                                <!-- Existing keywords as editable chips -->
                                <div v-for="(kw, idx) in editKeywords" :key="idx"
                                    class="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm group">
                                    <input v-model="editKeywords[idx]" type="text"
                                        class="keyword-input bg-transparent border-none outline-none w-auto min-w-[60px] max-w-[200px] focus:bg-blue-50 rounded px-1"
                                        :style="{ width: (editKeywords[idx].length * 8 + 20) + 'px' }"
                                        placeholder="keyword..." @keydown.enter="addKeyword"
                                        @keydown.backspace="handleKeywordBackspace(idx, $event)" />
                                    <button @click="removeKeyword(idx)"
                                        class="text-blue-600 hover:text-red-600 hover:bg-red-50 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <!-- Add new keyword button -->
                                <button @click="addKeyword"
                                    class="flex items-center gap-1 text-gray-500 hover:text-blue-600 px-2 py-1 rounded-full text-sm border border-dashed border-gray-300 hover:border-blue-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add
                                </button>
                            </div>
                            <p v-if="editKeywords.length === 0" class="text-gray-500 text-sm italic mt-2">
                                No keywords. Click "Add" to create one.
                            </p>
                        </div>
                    </div>
                    <div v-else-if="displayMode === 'workspace' && workspaceDocument"
                        class="flex flex-col h-full w-full min-w-0">
                        <div class="flex justify-between items-center mb-4">
                            <div
                                class="text-xl font-semibold bg-transparent border-none outline-none focus:bg-gray-50 focus:px-2 focus:py-1 rounded w-full">
                                Workspace</div>
                            <div class="flex gap-2 ml-2">
                                <Button @click="activateWorkspaceSplitView" size="small" title="Open in split view">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M8 7h12M8 12h12m-7 5h7M3 7h.01M3 12h.01M3 17h.01" />
                                    </svg>
                                </Button>
                            </div>
                        </div>
                        <div v-if="isDocumentSaving" class="flex items-center text-sm text-gray-500 mb-2">
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            Saving...
                        </div>
                        <div v-else-if="documentSavedSuccessfully"
                            class="flex items-center text-sm text-green-600 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                            Saved
                        </div>
                        <div class="flex-1 overflow-y-auto min-w-0 w-full overflow-x-hidden">
                            <EditorContent ref="workspaceEditor" :content="workspaceDocument.content || ''"
                                :is-saving="isDocumentSaving" :saved-successfully="documentSavedSuccessfully"
                                context="workspace" @content-change="handleWorkspaceContentChange" />
                        </div>
                    </div>
                    <div v-else class="flex-1 min-h-0" :class="displayMode === 'raw' ? 'h-full' : 'overflow-y-auto'">
                        <HtmlContent v-if="!isImageFile && displayMode === 'extracted' && resource.id"
                            ref="extractedContent" :content="resource.content" :resource-id="String(resource.id)"
                            :display-mode="displayMode" :has-workspace="!!workspaceDocument"
                            @send-selection-to-workspace="handleToolbarSendSelection"
                            @summarize-selection="handleSummarizeSelection" />
                        <HtmlContent v-else-if="displayMode === 'translated'" ref="translatedContent"
                            :content="resource.translatedContent" :resource-id="String(resource.id)"
                            :display-mode="displayMode" @send-selection-to-workspace="handleToolbarSendSelection" />
                        <div v-else-if="displayMode === 'overview'" class="space-y-4">
                            <div v-if="resource.summary">
                                <details open class="bg-white p-4 rounded shadow">
                                    <summary class="cursor-pointer font-semibold">Summary</summary>
                                    <div class="mt-2 prose max-w-none" v-html="resource.summary"></div>
                                </details>
                            </div>

                            <div v-if="resource.keyPoints && resource.keyPoints.length">
                                <details open class="bg-white p-4 rounded shadow">
                                    <summary class="cursor-pointer font-semibold">Key Points</summary>
                                    <div class="mt-2">
                                        <ul class="list-disc list-inside space-y-2">
                                            <li v-for="(kp, idx) in resource.keyPoints" :key="idx"
                                                class="text-sm text-gray-700">{{ kp }}</li>
                                        </ul>
                                    </div>
                                </details>
                            </div>
                            <div v-if="resource.keywords && resource.keywords.length">
                                <details open class="bg-white p-4 rounded shadow">
                                    <summary class="cursor-pointer font-semibold">Keywords</summary>
                                    <div class="mt-2">
                                        <ul class="flex flex-wrap gap-2">
                                            <li v-for="(kw, idx) in resource.keywords" :key="idx"
                                                class="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">{{ kw }}
                                            </li>
                                        </ul>
                                    </div>
                                </details>
                            </div>
                        </div>
                        <iframe v-else-if="isHtmlFile && displayMode === 'raw'" class="w-full h-full border-0"
                            :srcdoc="rawHtmlContent" sandbox="allow-same-origin" title="HTML Preview">
                        </iframe>
                        <iframe v-else-if="isPdfFile && displayMode === 'raw'" class="w-full h-full border-0"
                            :src="`${apiBaseUrl}/resources/${resourceId}/view#toolbar=0&navpanes=0&scrollbar=0&sidebar=0`"
                            type="application/pdf" :title="resource.originalName || 'PDF Preview'">
                        </iframe>
                        <img v-else-if="isImageFile" class="w-full object-contain max-h-full"
                            :src="`${apiBaseUrl}/resources/${resourceId}/view`"
                            :alt="resource.originalName || 'Image Preview'" />
                    </div>
                </div>
            </div>

            <!-- Split View Document Area -->
            <div v-if="splitViewActive && splitDocument"
                class="lg:col-span-1 flex flex-col overflow-hidden min-h-0 split-document-panel">
                <div class="bg-white p-4 flex-shrink-0">
                    <div class="flex items-center justify-between mb-4">
                        <input v-model="splitDocument.name" @input="handleDocumentNameChange" type="text"
                            class="text-2xl font-bold bg-transparent border-none outline-none focus:bg-gray-50 focus:px-2 focus:py-1 rounded w-full"
                            placeholder="Document name..." />
                        <Button @click="closeSplitView">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Button>
                    </div>

                    <div class="mb-3 flex justify-between items-center">
                        <div v-if="isDocumentSaving" class="flex items-center text-sm text-gray-500">
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            Saving...
                        </div>
                        <div v-else-if="documentSavedSuccessfully" class="flex items-center text-sm text-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                            Saved
                        </div>
                    </div>
                </div>

                <div class="overflow-y-auto flex-1 min-h-0 bg-white mt-4 shadow rounded-lg p-4">
                    <EditorContent ref="splitEditor" :content="splitDocument.content || ''"
                        :is-saving="isDocumentSaving" :saved-successfully="documentSavedSuccessfully"
                        @content-change="handleDocumentContentChange" />
                </div>
            </div>

            <div v-if="!splitViewActive && showSidebar" class="md:col-span-1 flex flex-col overflow-hidden min-h-0">
                <div class="bg-white p-4 flex-shrink-0">
                    <div class="flex items-center justify-between mb-4">
                        <ButtonGroup>
                            <Button variant="secondary" :active="viewSideBar === 'properties'"
                                @click="viewSideBar = 'properties'">
                                Properties
                            </Button>
                            <Button v-if="hasExtractedContent" variant="secondary" :active="viewSideBar === 'index'"
                                @click="(viewSideBar = 'index', refreshTocFromChild())">
                                Index
                            </Button>
                            <Button v-if="!isImageFile" variant="secondary" :active="viewSideBar === 'comments'"
                                @click="viewSideBar = 'comments'">
                                Comments
                            </Button>
                            <Button v-if="hasPendingEntities || (resource.entities && resource.entities.length > 0)"
                                variant="secondary" :active="viewSideBar === 'entities'"
                                @click="viewSideBar = 'entities'">
                                <span class="flex items-center">
                                    Entities
                                    <span v-if="hasPendingEntities"
                                        class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Pending
                                    </span>
                                </span>
                            </Button>
                        </ButtonGroup>
                    </div>
                </div>

                <div class="overflow-y-auto flex-1 min-h-0 mt-4">
                    <Properties v-if="viewSideBar === 'properties'" :resource="resource" />
                    <CommentSidebar v-else-if="viewSideBar === 'comments'" :resource-id="String(resource.id)" />
                    <div v-else-if="viewSideBar === 'index'" class="bg-white p-4 shadow rounded-lg">
                        <div class="mb-2">
                            <strong class="text-sm text-gray-700">Table of Contents</strong>
                        </div>
                        <div v-if="!tocItems.length">No headings found in this resource.</div>
                        <ul v-else class="space-y-1">
                            <li v-for="item in tocItems" :key="item.id"
                                :style="{ marginLeft: (item.level - 1) * 12 + 'px' }">
                                <a href="#" @click.prevent="scrollToHeadingFromSidebar(item.id)"
                                    class="text-blue-600 hover:underline">{{ item.text }}</a>
                            </li>
                        </ul>
                    </div>
                    <div v-else-if="viewSideBar === 'entities'">
                        <PendingEntitiesValidator v-if="hasPendingEntities" :resource-id="resourceId"
                            :display-mode="displayModeForEntities" :resource-language="resource.language"
                            :target-language="defaultLanguage" @entities:confirmed="handleEntitiesConfirmed"
                            @entity:highlight="handleEntityHighlight" />
                        <EntitiesList v-else :resource-id="resourceId" :entities="resource.entities || []"
                            :display-mode="displayModeForEntities" :resource-language="resource.language"
                            :target-language="defaultLanguage" @entity:removed="handleEntityRemoved"
                            @entity:merged="handleEntityMerged" @entity:highlight="handleEntityHighlight" />
                    </div>
                </div>
            </div>
        </div>

        <!-- CreateDocumentModal removed: document creation from resource disabled -->

        <FloatingSearchBox :active-contents="activeContents" v-model="showSearch" />

        <ChatSidebar :show="showChat" :messages="chatMessages" @close="showChat = false" @send="handleSendMessage" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
import { useResource } from '../services/resources/useResource';
import { useResourceIcon } from '../composables/useResourceIcon';
import { useDocument } from '../services/documents/useDocument';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import EditorContent from '../components/editor/EditorContent.vue';
import axios from 'axios';
import { useProjectStore } from '../store/projectStore';
import { useNotification } from '../composables/useNotification';
import apiClient from '../services/api';
import { useDragDrop } from '../composables/useDragDrop';
import Properties from '../components/resources/Properties.vue';
import Toolbar from '../components/resources/Toolbar.vue';
import IconType from '../components/resources/IconType.vue';
import FloatingSearchBox from '../components/ui/FloatingSearchBox.vue';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';
import HtmlContent from '../components/contents/HtmlContent.vue';
import CommentSidebar from '../components/comments/CommentSidebar.vue';
import ChatSidebar from '../components/ui/ChatSidebar.vue';
import EntitiesList from '../components/entities/EntitiesList.vue';
import PendingEntitiesValidator from '../components/entities/PendingEntitiesValidator.vue';
import Button from '../components/ui/Button.vue';
import ButtonGroup from '../components/ui/ButtonGroup.vue';

defineOptions({
    inheritAttrs: false
});

const router = useRouter();


const route = useRoute();
const resourceId = computed(() => route.params.id as string);
const { loadResource, updateResource, error, isLoading } = useResource();
const { saveDocument, loadDocument } = useDocument();
const resource = ref<any>({});
const projectStore = useProjectStore();
const notification = useNotification();
const rawHtmlContent = ref<string>('');
const displayMode = ref<'extracted' | 'raw' | 'translated' | 'overview' | 'workspace'>('extracted');
const splitViewActive = ref(false);
const splitDocument = ref<any>(null);
const isDocumentSaving = ref(false);
const documentSavedSuccessfully = ref(false);
const documentSaveTimeout = ref<NodeJS.Timeout | null>(null);
const documentNameSaveTimeout = ref<NodeJS.Timeout | null>(null);
const apiBaseUrl = apiClient.defaults.baseURL;
const editorContentRef = ref();
const splitEditor = ref();
const workspaceEditor = ref();
const viewSideBar = ref<'properties' | 'comments' | 'index' | 'entities'>('properties');

const isEditMode = ref(false);
const editContent = ref('');
const editType = ref<'content' | 'translatedContent' | 'summary' | 'overview'>('content');
const isSaving = ref(false);
const savedSuccessfully = ref(false);

// Overview edit state
const editSummary = ref('');
const editKeyPoints = ref<string[]>([]);
const editKeywords = ref<string[]>([]);

const isEditingName = ref(false);
const editResourceName = ref('');
const isNameSaving = ref(false);
const nameSavedSuccessfully = ref(false);
const nameSaveTimeout = ref<NodeJS.Timeout | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);
const isCancelingNameEdit = ref(false);
const showChat = ref(false);
const extractedContent = ref<any>(null);
const translatedContent = ref<any>(null);
const summaryContent = ref<any>(null);
const tocItems = ref<{ id: string; text: string; level: number }[]>([]);
const defaultLanguage = ref<string>('en');
const isConfirming = ref(false);
const hasPendingEntities = ref(false);
const workspaceDocument = ref<any>(null);
const isLoadingWorkspace = ref(false);
const isWorkspaceShownInSplit = ref(false);

// Computed properties for resource status
const isPendingConfirmation = computed(() => resource.value.confirmationStatus === 'pending');
const isExtracting = computed(() => !resource.value.content || resource.value.content.trim().length === 0);
const canInteract = computed(() => !isPendingConfirmation.value && !isExtracting.value);
const isWorkspaceSplitView = computed(() => splitViewActive.value && splitDocument.value?.id === workspaceDocument.value?.id);
const showSidebar = computed(() => !isWorkspaceSplitView.value);
const displayModeForEntities = computed<'extracted' | 'raw' | 'translated' | 'summary'>(() => {
    // Child components expect 'summary' instead of 'overview'.
    if (displayMode.value === 'workspace') {
        return 'extracted'; // Default mode for entities when in workspace
    }

    if (displayMode.value === 'overview') {
        return 'summary';
    }

    // Ensure value is one of the allowed ones
    if (displayMode.value === 'extracted' || displayMode.value === 'raw' || displayMode.value === 'translated') {
        return displayMode.value;
    }

    return 'extracted';
});

const refreshTocFromChild = () => {
    // HtmlContent exposes `toc` and `scrollToHeading`
    try {
        if (extractedContent.value && extractedContent.value.toc) {
            tocItems.value = extractedContent.value.toc;
        } else {
            tocItems.value = [];
        }
    } catch (e) {
        tocItems.value = [];
    }
};

const scrollToHeadingFromSidebar = (id: string) => {
    try {
        if (extractedContent.value && typeof extractedContent.value.scrollToHeading === 'function') {
            extractedContent.value.scrollToHeading(id);
        }
    } catch (e) {
        console.error('Failed to scroll to heading', e);
    }
};


const { isPdfFile, isHtmlFile, isImageFile } = useResourceIcon(computed(() => resource.value.mimeType));

const {
    isDragOver,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop
} = useDragDrop();

const breadcrumbItems = computed(() => {
    const items = [];

    items.push({
        name: projectStore.currentProject.name,
        path: `/project/${projectStore.currentProject.id}`
    });

    if (resource.value && resource.value.name) {
        items.push({
            name: resource.value.name
        });
    }

    return items;
});

const activeContents = computed(() => {
    const contents = [];
    if (isEditMode.value) {
        contents.push({
            type: 'edit',
            content: editorContentRef
        });
    } else {
        contents.push({
            type: 'html',
            content: extractedContent,
        });
    }

    if (splitDocument.value) {
        contents.push({
            type: 'edit',
            content: splitEditor,
        });
    }

    if (workspaceDocument.value && displayMode.value === 'workspace') {
        contents.push({
            type: 'edit',
            content: workspaceEditor,
        });
    }

    return contents;
});

const handleDisplayMode = (mode: 'extracted' | 'raw' | 'translated' | 'overview' | 'workspace') => {
    displayMode.value = mode;
};

// When split view state changes, clear the workspace-split flag if split closed
watch(splitViewActive, (val) => {
    if (!val) {
        isWorkspaceShownInSplit.value = false;
    }
});

const hasExtractedContent = computed(() => {
    return resource.value.content && resource.value.content.trim().length > 0;
});

const hasTranslatedContent = computed(() => {
    return resource.value.translatedContent && resource.value.translatedContent.trim().length > 0;
});

const loadRawHtmlContent = async () => {
    if (!isHtmlFile.value) return;

    try {
        const response = await axios.get(`${apiBaseUrl}/resources/${resourceId.value}/download`, {
            responseType: 'text'
        });
        rawHtmlContent.value = response.data;
    } catch (err) {
        rawHtmlContent.value = 'Error loading raw HTML content';
    }
};

watch(displayMode, (newMode: 'extracted' | 'raw') => {
    if (newMode === 'raw' && !rawHtmlContent.value && isHtmlFile.value) {
        loadRawHtmlContent();
    }
});

const loadResourceDetails = async () => {
    try {
        const data = await loadResource(resourceId.value);
        resource.value = data;

        // If pending confirmation, always load raw HTML content for comparison
        if (data.confirmationStatus === 'pending') {
            await loadRawHtmlContent();
        }

        // Fetch translated content from the new backend endpoint if available
        try {
            const translatedRes = await apiClient.get(`/resources/${resourceId.value}/translated-content`);
            const translatedPayload = translatedRes?.data || {};
            resource.value.translatedContent = translatedPayload.translatedContent ?? resource.value.translatedContent ?? null;
        } catch (e) {
            // Ignore not found or other errors retrieving translated content — it's optional
            if (e?.response?.status && e.response.status !== 404) {
                console.warn('Failed to load translated content for resource', resourceId.value, e);
            }
            resource.value.translatedContent = resource.value.translatedContent ?? null;
        }
        // Load related entities from the new endpoint and normalize results
        try {
            const entitiesRes = await apiClient.get(`/resources/${resourceId.value}/entities`);
            const entitiesData = entitiesRes.data || [];
            // If backend returned raw rows (getRawMany), normalize keys to id/name/type
            resource.value.entities = entitiesData.map((row: any) => {
                // raw row from getRawMany may be like { entity_id: 1, entity_name: 'Name', entity_type: 'Type' }
                if (row.entity_id || row.entity_name) {
                    return {
                        id: row.entity_id ?? row.id,
                        name: row.entity_name ?? row.name,
                        description: row.entity_description ?? row.description ?? null,
                        type: row.entity_type ?? row.type,
                    };
                }

                // If backend returned full EntityEntity objects with entityType relation
                if (row.entityType) {
                    return {
                        id: row.id,
                        name: row.name,
                        description: row.description ?? null,
                        type: row.entityType?.name ?? null,
                        translations: row.translations,
                        aliases: row.aliases,
                    };
                }

                return row;
            });
        } catch (e) {
            resource.value.entities = resource.value.entities || [];
        }

        await checkPendingEntities();

        if (!data.content || data.content.trim().length === 0) {
            displayMode.value = 'raw';
        }

        if ('mimeType' in data && data.mimeType === 'text/html' && displayMode.value === 'raw') {
            await loadRawHtmlContent();
        }
    } catch (err) {
        console.error('Failed to load resource:', err);
    }
};

const downloadResource = async () => {
    try {
        const link = document.createElement('a');
        link.href = `${apiBaseUrl}/resources/${resourceId.value}/download`;
        link.download = resource.value.originalName || `resource-${resourceId.value}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error('Failed to download resource:', err);
    }
};

watch(resourceId, () => {
    // Reset displayMode to 'extracted' when navigating to a new resource
    displayMode.value = 'extracted';
    loadResourceDetails();
    // Reload workspace document for the new resource
    loadWorkspaceDocument();
});

// Watch for content becoming available and switch from raw to extracted view
watch(() => resource.value.content, (newContent, oldContent) => {
    // If we're in raw mode because there was no content, and content becomes available
    if (displayMode.value === 'raw' && newContent && newContent.trim().length > 0 && (!oldContent || oldContent.trim().length === 0)) {
        displayMode.value = 'extracted';
    }
});

// Watch for summary becoming available and switch to summary view
watch(() => resource.value.summary, (newSummary, oldSummary) => {
    // If summary becomes available after the resource was already loaded (oldSummary === null or ''),
    // switch to overview view. Don't switch on initial load (oldSummary === undefined).
    if (newSummary && newSummary.trim().length > 0 && oldSummary !== undefined && (!oldSummary || oldSummary.trim().length === 0)) {
        displayMode.value = 'overview';
    }
});

const getResourceContentForDocument = (): string => {
    if (resource.value.content) {
        return resource.value.content;
    }
    if (resource.value.translatedContent) {
        return resource.value.translatedContent;
    }
    return '';
};

const onDocumentCreated = (document: any) => {
    notification.success(`Document "${document.name}" created successfully`);
    splitDocument.value = document;
    splitViewActive.value = true;
};

const closeSplitView = () => {
    splitViewActive.value = false;
    splitDocument.value = null;
    // If we closed a split that was showing the workspace, clear the flag
    isWorkspaceShownInSplit.value = false;
};

const handleDocumentContentChange = async (content: string) => {
    if (!splitDocument.value || !splitDocument.value.id) {
        return;
    }

    if (documentSaveTimeout.value) {
        clearTimeout(documentSaveTimeout.value);
    }

    isDocumentSaving.value = true;
    documentSavedSuccessfully.value = false;

    documentSaveTimeout.value = setTimeout(async () => {
        try {
            await saveDocument(splitDocument.value.id, { content });
            splitDocument.value.content = content;
            documentSavedSuccessfully.value = true;

            setTimeout(() => {
                documentSavedSuccessfully.value = false;
            }, 3000);
        } catch (error) {
            notification.error('Failed to save document content');
        } finally {
            isDocumentSaving.value = false;
        }
    }, 1000);
};

const handleDocumentNameChange = async () => {
    if (!splitDocument.value || !splitDocument.value.id || !splitDocument.value.name.trim()) {
        return;
    }

    if (documentNameSaveTimeout.value) {
        clearTimeout(documentNameSaveTimeout.value);
    }

    isDocumentSaving.value = true;
    documentSavedSuccessfully.value = false;

    documentNameSaveTimeout.value = setTimeout(async () => {
        try {
            await saveDocument(splitDocument.value.id, { name: splitDocument.value.name.trim() });
            documentSavedSuccessfully.value = true;

            setTimeout(() => {
                documentSavedSuccessfully.value = false;
            }, 3000);
        } catch (error) {
            notification.error('Failed to save document name');
        } finally {
            isDocumentSaving.value = false;
        }
    }, 1000);
};

const removeResource = async () => {
    try {
        await apiClient.delete(`/resources/${resourceId.value}`);
        notification.success('Resource removed successfully');

        router.push(`/project/${projectStore.currentProject.id}`);
    } catch (error) {
        notification.error('Failed to remove resource');
    }
};

const confirmRemoveResource = () => {
    if (window.confirm('Are you sure you want to remove this resource? This action cannot be undone.')) {
        removeResource();
    }
};

const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const droppedData = handleDrop(event);

    if (droppedData && droppedData.type === 'document') {
        try {
            const document = droppedData.document;
            if (document && document.id) {
                const fullDocument = await loadDocument(document.id);
                splitDocument.value = fullDocument;
                splitViewActive.value = true;
            }
        } catch (error) {
            notification.error('Failed to load document');
        }
    } else {
        const dataTransfer = event.dataTransfer;
        const files = dataTransfer?.files;

        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
            }
        } else {
            const url = dataTransfer?.getData('text/uri-list') || dataTransfer?.getData('text/plain');
            if (url) {
                notification.info(`Link dropped: ${url}`);
            }
        }
    }
};

const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    handleDragOver(event);
};

const onDragEnter = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    handleDragEnter(event);
};

const onDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    handleDragLeave(event);
};

const startEdit = () => {
    if (displayMode.value === 'extracted' && resource.value.content) {
        editType.value = 'content';
        editContent.value = resource.value.content;
    } else if (displayMode.value === 'translated' && resource.value.translatedContent) {
        editType.value = 'translatedContent';
        editContent.value = resource.value.translatedContent;
    } else if (displayMode.value === 'overview') {
        editType.value = 'overview';
        editSummary.value = resource.value.summary || '';
        editKeyPoints.value = [...(resource.value.keyPoints || [])];
        editKeywords.value = [...(resource.value.keywords || [])];
    }
    isEditMode.value = true;
    savedSuccessfully.value = false;
};

const handleEditContentChange = (content: string) => {
    if (isPendingConfirmation.value) {
        // When in pending confirmation mode, update resource content directly
        resource.value.content = content;
    } else {
        // Normal edit mode
        editContent.value = content;
    }
};

const saveEdit = async () => {
    isSaving.value = true;
    savedSuccessfully.value = false;

    try {
        const updateData: any = {};

        // Handle overview mode separately
        if (editType.value === 'overview') {
            // Filter out empty values
            const filteredKeyPoints = editKeyPoints.value.filter(kp => kp.trim().length > 0);
            const filteredKeywords = editKeywords.value.filter(kw => kw.trim().length > 0);

            updateData.summary = editSummary.value;
            updateData.keyPoints = filteredKeyPoints;
            updateData.keywords = filteredKeywords;

            await updateResource(resourceId.value, updateData);

            // Update the resource object
            resource.value.summary = editSummary.value;
            resource.value.keyPoints = filteredKeyPoints;
            resource.value.keywords = filteredKeywords;
        } else {
            // Handle regular content editing
            const contentToSave = isPendingConfirmation.value ? resource.value.content : editContent.value;

            if (!contentToSave || !contentToSave.trim()) {
                notification.error('Content cannot be empty');
                isSaving.value = false;
                return;
            }

            // Determine which field to update based on editType
            if (editType.value === 'content') {
                updateData.content = contentToSave;
            } else if (editType.value === 'translatedContent') {
                updateData.translatedContent = contentToSave;
            } else if (editType.value === 'summary') {
                updateData.summary = contentToSave;
            }

            await updateResource(resourceId.value, updateData);

            // Update the resource object with the new content
            if (editType.value === 'content') {
                resource.value.content = contentToSave;
            } else if (editType.value === 'translatedContent') {
                resource.value.translatedContent = contentToSave;
            } else if (editType.value === 'summary') {
                resource.value.summary = contentToSave;
            }
        }

        savedSuccessfully.value = true;

        if (!isPendingConfirmation.value) {
            isEditMode.value = false;
        }

        notification.success('Content updated successfully');

        setTimeout(() => {
            savedSuccessfully.value = false;
        }, 3000);
    } catch (error) {
        notification.error('Failed to save content');
    } finally {
        isSaving.value = false;
    }
};

const cancelEdit = () => {
    isEditMode.value = false;
    editContent.value = '';
    editSummary.value = '';
    editKeyPoints.value = [];
    editKeywords.value = [];
    savedSuccessfully.value = false;
};

// Helper functions for editing key points
const addKeyPoint = () => {
    editKeyPoints.value.push('');
};

const removeKeyPoint = (index: number) => {
    editKeyPoints.value.splice(index, 1);
};

const moveKeyPointUp = (index: number) => {
    if (index > 0) {
        const temp = editKeyPoints.value[index];
        editKeyPoints.value[index] = editKeyPoints.value[index - 1];
        editKeyPoints.value[index - 1] = temp;
    }
};

const moveKeyPointDown = (index: number) => {
    if (index < editKeyPoints.value.length - 1) {
        const temp = editKeyPoints.value[index];
        editKeyPoints.value[index] = editKeyPoints.value[index + 1];
        editKeyPoints.value[index + 1] = temp;
    }
};

// Helper functions for editing keywords
const addKeyword = () => {
    editKeywords.value.push('');
    // Focus on the newly added keyword input
    setTimeout(() => {
        const inputs = document.querySelectorAll('.keyword-input');
        if (inputs.length > 0) {
            (inputs[inputs.length - 1] as HTMLInputElement).focus();
        }
    }, 0);
};

const removeKeyword = (index: number) => {
    editKeywords.value.splice(index, 1);
};

const handleKeywordBackspace = (index: number, event: KeyboardEvent) => {
    const input = event.target as HTMLInputElement;
    // If the input is empty and backspace is pressed, remove the keyword
    if (input.value === '' && editKeywords.value.length > 0) {
        event.preventDefault();
        removeKeyword(index);
        // Focus on the previous keyword if it exists
        if (index > 0) {
            setTimeout(() => {
                const inputs = document.querySelectorAll('.keyword-input');
                if (inputs[index - 1]) {
                    (inputs[index - 1] as HTMLInputElement).focus();
                }
            }, 0);
        }
    }
};

const startNameEdit = () => {
    isEditingName.value = true;
    editResourceName.value = resource.value.name;
    nameSavedSuccessfully.value = false;

    setTimeout(() => {
        nameInput.value?.focus();
        nameInput.value?.select();
    }, 50);
};

const cancelNameEdit = () => {
    isCancelingNameEdit.value = true;
    isEditingName.value = false;
    editResourceName.value = '';
    nameSavedSuccessfully.value = false;

    if (nameSaveTimeout.value) {
        clearTimeout(nameSaveTimeout.value);
    }

    setTimeout(() => {
        isCancelingNameEdit.value = false;
    }, 100);
};

const handleBlur = () => {
    if (!isCancelingNameEdit.value) {
        saveResourceName();
    }
};

const handleResourceNameChange = () => {
    if (nameSaveTimeout.value) {
        clearTimeout(nameSaveTimeout.value);
    }

    nameSavedSuccessfully.value = false;
};

const saveResourceName = async () => {
    if (isCancelingNameEdit.value || !editResourceName.value.trim()) {
        if (!isCancelingNameEdit.value && !editResourceName.value.trim()) {
            notification.error('Resource name cannot be empty');
        }
        return;
    }

    if (editResourceName.value.trim() === resource.value.name) {
        isEditingName.value = false;
        return;
    }

    if (nameSaveTimeout.value) {
        clearTimeout(nameSaveTimeout.value);
    }

    isNameSaving.value = true;
    nameSavedSuccessfully.value = false;

    try {
        await updateResource(resourceId.value, {
            name: editResourceName.value.trim()
        });

        resource.value.name = editResourceName.value.trim();
        nameSavedSuccessfully.value = true;

        setTimeout(() => {
            nameSavedSuccessfully.value = false;
            isEditingName.value = false;
        }, 1500);

        notification.success('Resource name updated successfully');
    } catch (error) {
        notification.error('Failed to update resource name');
        isEditingName.value = false;
    } finally {
        isNameSaving.value = false;
    }
};

onMounted(async () => {
    loadResourceDetails();
    loadWorkspaceDocument();
    // Load default language from settings
    if (window.electronAPI && window.electronAPI.getSettings) {
        const settings = await window.electronAPI.getSettings();
        defaultLanguage.value = settings?.language || 'en';
    }
});

const { showSearch } = useGlobalKeyboard();

const chatMessages = ref<{ role: 'user' | 'assistant'; text: string }[]>([]);

function handleSendMessage(msg: string) {
    if (msg.trim()) {
        chatMessages.value.push({ role: 'user', text: msg });
    }
}

// Helper to get language from settings (async)
const getLanguageSetting = async (): Promise<string> => {
    if (window.electronAPI && window.electronAPI.getSettings) {
        const settings = await window.electronAPI.getSettings();
        return settings?.language || 'en';
    }
    return 'en';
};

const handleSummarizeJob = async () => {
    try {
        const language = await getLanguageSetting();
        await apiClient.post('/model/summarize', {
            targetLanguage: language,
            resourceId: resourceId.value,
        });
        notification.success('Summarization job created successfully');
    } catch (error) {
        notification.error('Failed to create summarization job');
    }
};



const handleTranslate = async () => {
    try {
        const language = await getLanguageSetting();
        await apiClient.post('/model/translate', {
            resourceId: resourceId.value,
            targetLanguage: language,
        });
        notification.success('Translation job created successfully');
    } catch (error) {
        notification.error('Failed to create translation job');
    }
}

const handleKeyPointsJob = async () => {
    try {
        const language = await getLanguageSetting();
        await apiClient.post('/model/key-points', {
            resourceId: resourceId.value,
            targetLanguage: language,
        });
        notification.success('Key points job created successfully');
    } catch (error) {
        notification.error('Failed to create key points job');
    }
};

const handleKeywordsJob = async () => {
    try {
        const language = await getLanguageSetting();
        await apiClient.post('/model/keywords', {
            resourceId: resourceId.value,
            targetLanguage: language,
        });
        notification.success('Keywords job created successfully');
        // Optionally reload resource details to pick up new keywords when available
        await loadResourceDetails();
    } catch (error) {
        notification.error('Failed to create keywords job');
    }
};

const handleExtractEntities = async () => {
    if (!resourceId.value) return;
    try {
        await apiClient.post('/model/extract-entities', { resourceId: Number(resourceId.value) });
        notification.success('Entity extraction job created successfully');
        await loadResourceDetails();
    } catch (error) {
        notification.error('Failed to create entity extraction job');
    }
};

const handleEntityRemoved = (entityId: number) => {
    // Remove the entity from the local resource object
    if (resource.value.entities) {
        resource.value.entities = resource.value.entities.filter((entity: any) => entity.id !== entityId);
    }
};

const handleEntityMerged = (sourceEntityId: number, targetEntity: any) => {
    // Remove the source entity and update the target entity in the local resource object
    if (resource.value.entities) {
        const sourceIndex = resource.value.entities.findIndex((entity: any) => entity.id === sourceEntityId);
        if (sourceIndex !== -1) {
            resource.value.entities.splice(sourceIndex, 1);
        }

        const targetIndex = resource.value.entities.findIndex((entity: any) => entity.id === targetEntity.id);
        if (targetIndex !== -1) {
            resource.value.entities[targetIndex] = targetEntity;
        }
    }
};

const handleEntityHighlight = async (entity: any) => {
    let nameToHighlight = '';
    let aliasValues: string[] = [];
    let translations = entity.translations || null;

    try {
        if (displayMode.value === 'translated' && resource.value.translatedContent) {
            const targetLang = await getLanguageSetting();
            if (entity.translations && entity.translations[targetLang]) {
                nameToHighlight = entity.translations[targetLang];
            } else {
                nameToHighlight = entity.name;
            }
        } else {
            if (resource.value.language === 'en') {
                nameToHighlight = entity.name;
            } else if (entity.translations && resource.value.language && entity.translations[resource.value.language]) {
                nameToHighlight = entity.translations[resource.value.language];
            } else {
                nameToHighlight = entity.name;
            }
        }

        aliasValues = (entity.aliases || []).map((a: any) => a.value || '');
    } catch (e) {
        nameToHighlight = entity.name || '';
        aliasValues = (entity.aliases || []).map((a: any) => a.value || '');
    }

    if (extractedContent.value && extractedContent.value.highlightEntity) {
        extractedContent.value.highlightEntity(nameToHighlight, aliasValues, translations);
    }

    if (translatedContent.value && translatedContent.value.highlightEntity) {
        translatedContent.value.highlightEntity(nameToHighlight, aliasValues, translations);
    }
};

const confirmResourceExtraction = async () => {
    if (!isPendingConfirmation.value) {
        return;
    }

    isConfirming.value = true;

    try {
        await apiClient.post(`/resources/${resourceId.value}/confirm`);
        notification.success('Resource confirmed successfully. Language detection job created.');

        // Update local state
        resource.value.confirmationStatus = 'confirmed';

        // Exit edit mode if active
        if (isEditMode.value) {
            isEditMode.value = false;
        }

        // Reload resource details to get updated data
        await loadResourceDetails();
    } catch (error) {
        notification.error('Failed to confirm resource');
        console.error('Error confirming resource:', error);
    } finally {
        isConfirming.value = false;
    }
};

const checkPendingEntities = async () => {
    try {
        const response = await apiClient.get(`/pending-entities/resource/${resourceId.value}`);
        hasPendingEntities.value = response.data && response.data.length > 0;
    } catch (error) {
        console.warn('Failed to check pending entities:', error);
        hasPendingEntities.value = false;
    }
};

const handleEntitiesConfirmed = async () => {
    hasPendingEntities.value = false;
    await loadResourceDetails();
    notification.success('Entities confirmed successfully');
};

const loadWorkspaceDocument = async () => {
    if (!resourceId.value) return;

    isLoadingWorkspace.value = true;
    try {
        const response = await apiClient.get(`/docs/resource/${resourceId.value}`);
        workspaceDocument.value = response.data;
    } catch (error: any) {
        if (error?.response?.status !== 404) {
            console.error('Error loading workspace document:', error);
        }
        workspaceDocument.value = null;
    } finally {
        isLoadingWorkspace.value = false;
    }
};

const handleCreateWorkspace = async () => {
    if (workspaceDocument.value) {
        // If workspace already exists, switch to it
        displayMode.value = 'workspace';
        return;
    }

    try {
        const newDoc = await apiClient.post('/docs', {
            name: `${resource.value.name} - Workspace`,
            content: '',
            resource: { id: Number(resourceId.value) },
            project: resource.value.project ? { id: resource.value.project.id } : null,
        });

        workspaceDocument.value = newDoc.data;
        notification.success('Workspace created successfully');

        // Switch to workspace view
        displayMode.value = 'workspace';
    } catch (error) {
        console.error('Error creating workspace:', error);
        notification.error('Failed to create workspace');
    }
};

const activateWorkspaceSplitView = () => {
    if (workspaceDocument.value) {
        splitDocument.value = workspaceDocument.value;
        // When opening the workspace in split, switch back to resource 'Content' view
        // and mark that workspace is shown in split so toolbar can hide the workspace tab
        displayMode.value = 'extracted';
        splitViewActive.value = true;
        isWorkspaceShownInSplit.value = true;
    }
};

const handleWorkspaceContentChange = async (content: string) => {
    if (!workspaceDocument.value || !workspaceDocument.value.id) {
        return;
    }

    if (documentSaveTimeout.value) {
        clearTimeout(documentSaveTimeout.value);
    }

    isDocumentSaving.value = true;
    documentSavedSuccessfully.value = false;

    documentSaveTimeout.value = setTimeout(async () => {
        try {
            await saveDocument(workspaceDocument.value.id, { content });
            workspaceDocument.value.content = content;
            documentSavedSuccessfully.value = true;

            setTimeout(() => {
                documentSavedSuccessfully.value = false;
            }, 3000);
        } catch (error) {
            notification.error('Failed to save workspace content');
        } finally {
            isDocumentSaving.value = false;
        }
    }, 1000);
};

const handleWorkspaceNameChange = async () => {
    if (!workspaceDocument.value || !workspaceDocument.value.id || !workspaceDocument.value.name.trim()) {
        return;
    }

    if (documentNameSaveTimeout.value) {
        clearTimeout(documentNameSaveTimeout.value);
    }

    isDocumentSaving.value = true;
    documentSavedSuccessfully.value = false;

    documentNameSaveTimeout.value = setTimeout(async () => {
        try {
            await saveDocument(workspaceDocument.value.id, { name: workspaceDocument.value.name.trim() });
            documentSavedSuccessfully.value = true;

            setTimeout(() => {
                documentSavedSuccessfully.value = false;
            }, 3000);
        } catch (error) {
            notification.error('Failed to save workspace name');
        } finally {
            isDocumentSaving.value = false;
        }
    }, 1000);
};

const escapeHtml = (unsafe: string) => {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};


// Handler invoked when Toolbar emits selection to send to workspace
const handleToolbarSendSelection = async (text: string) => {
    if (!workspaceDocument.value || !workspaceDocument.value.id || !text || !text.trim()) return;

    try {
        const existing = workspaceDocument.value.content || '';
        const paragraph = `<p>${escapeHtml(text.trim())}</p>`;
        const newContent = existing + paragraph;

        await saveDocument(workspaceDocument.value.id, { content: newContent });
        workspaceDocument.value.content = newContent;

        notification.success('Selection added to workspace document');
    } catch (error) {
        console.error('Failed to append selection to workspace', error);
        notification.error('Failed to add selection to workspace');
    }
};

// Handle summarize action from selection: create a summarize job that targets the workspace document
const handleSummarizeSelection = async (text: string) => {
    if (!text || !text.trim()) return;

    try {
        // Ensure workspace exists
        if (!workspaceDocument.value) {
            // create workspace document
            const newDoc = await apiClient.post('/docs', {
                name: `${resource.value.name} - Workspace`,
                content: '',
                resource: { id: Number(resourceId.value) },
                project: resource.value.project ? { id: resource.value.project.id } : null,
            });
            workspaceDocument.value = newDoc.data;
            notification.success('Workspace created to receive summary');
        }

        // Create a summarize job including the selected text and target document id
        await apiClient.post('/model/summarize', {
            text: text.trim(),
            sourceLanguage: resource.value.language || defaultLanguage.value,
            targetLanguage: await getLanguageSetting(),
            targetDocId: workspaceDocument.value.id,
            type: 'workspace-selection',
        });

        notification.success('Summarization job created for selected text');
    } catch (error) {
        console.error('Failed to create summarize job for selection', error);
        notification.error('Failed to create summarization job');
    }
};

</script>

<style scoped>
.resource-detail h1 {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    margin-top: 0;
}

.resource-detail h2 {
    font-size: 1.25rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    margin-top: 0;
}

.resource-detail h3 {
    font-size: 1.125rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    margin-top: 0;
}

.resource-detail p {
    margin-bottom: 1rem;
}

.split-view-active {
    border-right: 2px solid #e5e7eb;
}

.split-document-panel {
    border-left: 2px solid #3b82f6;
    box-shadow: -4px 0 6px -1px rgba(0, 0, 0, 0.1);
}

@media (max-width: 1024px) {
    .split-view-active {
        border-right: none;
        border-bottom: 2px solid #e5e7eb;
    }

    .split-document-panel {
        border-left: none;
        border-top: 2px solid #3b82f6;
        box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
    }
}

.drag-over {
    border: 2px dashed #3b82f6 !important;
    background-color: rgba(59, 130, 246, 0.1) !important;
    border-radius: 8px;
    position: relative;
}

.drag-over::before {
    content: 'Drop documents here to open in split view';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(59, 130, 246, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: none;
}

.ask-btn {
    margin-bottom: 1rem;
}

.chat-sidebar {
    min-width: 320px;
    max-width: 100vw;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
}
</style>

/* Selection menu styles */
.selection-menu {
position: fixed;
z-index: 10000;
background: white;
border: 1px solid rgba(0,0,0,0.08);
box-shadow: 0 6px 18px rgba(0,0,0,0.12);
border-radius: 6px;
padding: 6px 8px;
}
.selection-menu button {
background: transparent;
border: none;
padding: 6px 10px;
width: 100%;
text-align: left;
cursor: pointer;
}
.selection-menu button:hover {
background: rgba(0,0,0,0.04);
}

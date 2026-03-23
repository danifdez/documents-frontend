<template>
    <span class="relative inline-flex items-center group ml-1">
        <svg class="h-3.5 w-3.5 text-text-muted/60 hover:text-text-muted cursor-help transition-colors" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
        </svg>
        <span
            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] leading-snug whitespace-normal w-52 text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-lg">
            <slot />
            <span
                class="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900"></span>
        </span>
    </span>
</template>

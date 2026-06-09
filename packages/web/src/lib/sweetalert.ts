import Swal from 'sweetalert2';

// Custom SweetAlert2 configuration with dark mode support
export const showSuccessAlert = (title: string, text?: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    return Swal.fire({
        icon: 'success',
        title,
        text,
        confirmButtonText: 'OK',
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f1f5f9' : '#0f172a',
        confirmButtonColor: isDark ? '#3b82f6' : '#2563eb',
        customClass: {
            popup: 'rounded-2xl shadow-2xl',
            title: 'font-bold text-xl',
            confirmButton: 'px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity',
        },
    });
};

export const showErrorAlert = (title: string, text?: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    return Swal.fire({
        icon: 'error',
        title,
        text,
        confirmButtonText: 'Close',
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f1f5f9' : '#0f172a',
        confirmButtonColor: isDark ? '#ef4444' : '#dc2626',
        customClass: {
            popup: 'rounded-2xl shadow-2xl',
            title: 'font-bold text-xl',
            confirmButton: 'px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity',
        },
    });
};

export const showWarningAlert = (title: string, text?: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    return Swal.fire({
        icon: 'warning',
        title,
        text,
        confirmButtonText: 'OK',
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f1f5f9' : '#0f172a',
        confirmButtonColor: isDark ? '#f59e0b' : '#d97706',
        customClass: {
            popup: 'rounded-2xl shadow-2xl',
            title: 'font-bold text-xl',
            confirmButton: 'px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity',
        },
    });
};

export const showConfirmAlert = async (title: string, text?: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    return Swal.fire({
        icon: 'question',
        title,
        text,
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f1f5f9' : '#0f172a',
        confirmButtonColor: isDark ? '#3b82f6' : '#2563eb',
        cancelButtonColor: isDark ? '#64748b' : '#94a3b8',
        customClass: {
            popup: 'rounded-2xl shadow-2xl',
            title: 'font-bold text-xl',
            confirmButton: 'px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity',
            cancelButton: 'px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity',
        },
    });
};

export const showLoadingAlert = (title: string) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    return Swal.fire({
        title,
        allowOutsideClick: false,
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f1f5f9' : '#0f172a',
        customClass: {
            popup: 'rounded-2xl shadow-2xl',
            title: 'font-bold text-xl',
        },
        didOpen: () => {
            Swal.showLoading();
        },
    });
};


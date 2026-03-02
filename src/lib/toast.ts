import toast from 'react-hot-toast';

/**
 * Toast notification utilities for consistent messaging across the app
 */

export const showToast = {
  /**
   * Show a success toast
   */
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
    });
  },

  /**
   * Show an error toast
   */
  error: (message: string) => {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
    });
  },

  /**
   * Show an info toast
   */
  info: (message: string) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
    });
  },

  /**
   * Show a loading toast
   */
  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
    });
  },

  /**
   * Dismiss a specific toast or all toasts
   */
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  /**
   * Show a delete success toast (consistent across all delete operations)
   */
  deleteSuccess: (itemName: string = 'Item') => {
    toast.success(`${itemName} deleted successfully`, {
      duration: 3000,
      position: 'top-right',
    });
  },

  /**
   * Show a save success toast
   */
  saveSuccess: (itemName: string = 'Changes') => {
    toast.success(`${itemName} saved successfully`, {
      duration: 3000,
      position: 'top-right',
    });
  },

  /**
   * Show a promise toast (for async operations)
   */
  promise: <T,>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(
      promise,
      {
        loading: msgs.loading,
        success: msgs.success,
        error: msgs.error,
      },
      {
        position: 'top-right',
      }
    );
  },
};

/**
 * Show a confirmation dialog before performing an action
 * @param message - The confirmation message to show
 * @param onConfirm - Callback function to execute if user confirms
 * @param options - Optional configuration
 */
export const confirmDelete = (
  message: string,
  onConfirm: () => void | Promise<void>,
  options?: {
    title?: string;
    confirmText?: string;
    cancelText?: string;
  }
) => {
  const title = options?.title || 'Confirm Delete';
  const confirmText = options?.confirmText || 'Delete';
  const cancelText = options?.cancelText || 'Cancel';

  const confirmed = window.confirm(`${title}\n\n${message}`);
  
  if (confirmed) {
    const result = onConfirm();
    // If onConfirm returns a promise, handle it
    if (result instanceof Promise) {
      result.catch((error) => {
        showToast.error('An error occurred. Please try again.');
        console.error('Delete operation failed:', error);
      });
    }
  }
};

/**
 * Helper to show a delete confirmation with consistent messaging
 */
export const confirmAndDelete = async (
  itemName: string,
  onDelete: () => void | Promise<void>
) => {
  confirmDelete(
    `Are you sure you want to delete this ${itemName}? This action cannot be undone.`,
    async () => {
      await onDelete();
      showToast.deleteSuccess(itemName);
    },
    {
      title: `Delete ${itemName}`,
    }
  );
};

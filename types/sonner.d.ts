declare module "sonner" {
  export const toast: {
    (message: string, opts?: Record<string, unknown>): void;
    success: (message: string, opts?: Record<string, unknown>) => void;
    error: (message: string, opts?: Record<string, unknown>) => void;
    info: (message: string, opts?: Record<string, unknown>) => void;
  };
}

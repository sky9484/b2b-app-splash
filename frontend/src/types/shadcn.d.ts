/**
 * Type declarations for Shadcn UI components that are still in .jsx format.
 * These allow TypeScript files to import them without type errors.
 */
declare module "@/components/ui/dropdown-menu" {
  import * as React from "react";
  export const DropdownMenu: React.ComponentType<React.PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>>;
  export const DropdownMenuTrigger: React.ComponentType<React.PropsWithChildren<{ asChild?: boolean; className?: string }>>;
  export const DropdownMenuContent: React.ComponentType<React.PropsWithChildren<{ align?: string; className?: string; sideOffset?: number }>>;
  export const DropdownMenuItem: React.ComponentType<React.PropsWithChildren<{ onClick?: () => void; className?: string; asChild?: boolean; "data-testid"?: string }>>;
  export const DropdownMenuLabel: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
  export const DropdownMenuSeparator: React.ComponentType<{ className?: string }>;
  export const DropdownMenuGroup: React.ComponentType<React.PropsWithChildren<{}>>;
  export const DropdownMenuSub: React.ComponentType<React.PropsWithChildren<{}>>;
  export const DropdownMenuSubTrigger: React.ComponentType<React.PropsWithChildren<{ className?: string; inset?: boolean }>>;
  export const DropdownMenuSubContent: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
  export const DropdownMenuCheckboxItem: React.ComponentType<React.PropsWithChildren<{ checked?: boolean; onCheckedChange?: (checked: boolean) => void; className?: string }>>;
  export const DropdownMenuRadioGroup: React.ComponentType<React.PropsWithChildren<{ value?: string; onValueChange?: (value: string) => void }>>;
  export const DropdownMenuRadioItem: React.ComponentType<React.PropsWithChildren<{ value: string; className?: string }>>;
  export const DropdownMenuShortcut: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
  export const DropdownMenuPortal: React.ComponentType<React.PropsWithChildren<{}>>;
}

declare module "@/components/ui/select" {
  import * as React from "react";
  export const Select: React.ComponentType<React.PropsWithChildren<{ value?: string; onValueChange?: (value: string) => void; defaultValue?: string }>>;
  export const SelectTrigger: React.ComponentType<React.PropsWithChildren<{ className?: string; "data-testid"?: string }>>;
  export const SelectValue: React.ComponentType<{ placeholder?: string }>;
  export const SelectContent: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
  export const SelectItem: React.ComponentType<React.PropsWithChildren<{ value: string; className?: string }>>;
  export const SelectGroup: React.ComponentType<React.PropsWithChildren<{}>>;
  export const SelectLabel: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
  export const SelectSeparator: React.ComponentType<{ className?: string }>;
}

declare module "@/components/ui/dialog" {
  import * as React from "react";
  export const Dialog: React.ComponentType<React.PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>>;
  export const DialogTrigger: React.ComponentType<React.PropsWithChildren<{ asChild?: boolean }>>;
  export const DialogContent: React.ComponentType<React.PropsWithChildren<{ className?: string; "data-testid"?: string }>>;
  export const DialogHeader: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
  export const DialogFooter: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
  export const DialogTitle: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
  export const DialogDescription: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
  export const DialogClose: React.ComponentType<React.PropsWithChildren<{ asChild?: boolean }>>;
}

declare module "@/components/ui/sonner" {
  import * as React from "react";
  export const Toaster: React.ComponentType<{ richColors?: boolean; position?: string }>;
}

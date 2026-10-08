import type { Component } from 'svelte';

/** One entry in a ManageMenu. A disabled one is shown but cannot be chosen. */
export type ManageAction = {
  readonly key: string;
  readonly label: string;
  readonly icon: Component<{ readonly class?: string }>;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly run: () => void;
};

// What the app shell needs to know about the signed-in Singer and the choir.
import type { SidebarEntry } from './performances';

export type ShellData = {
  readonly singerName: string;
  readonly voicePartName: string;
  readonly showAdminLink: boolean;
  readonly performances: readonly SidebarEntry[];
};

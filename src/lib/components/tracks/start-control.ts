/** What the Piece's player lets the Score viewer do: see whether Start would play something, and press it. */
export type StartControl = {
  readonly canStart: () => boolean;
  readonly start: () => Promise<void>;
};

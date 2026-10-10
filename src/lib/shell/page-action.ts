// Shell: calling one of the Piece page's form actions from the browser without leaving the page, for
// the steps of an upload that are not a plain form post (see ADR 0003).
import { deserialize } from '$app/forms';
import { Effect, Schema } from 'effect';
import { actionPath } from '../core/paths';
import type { UploadTicket } from './storage';

const Ticket = Schema.Struct({
  ticket: Schema.Struct({ path: Schema.String, url: Schema.String, apiKey: Schema.String }),
});
const isTicket = Schema.is(Ticket);
const ActionRefusal = Schema.Struct({ problem: Schema.String });
const isActionRefusal = Schema.is(ActionRefusal);

/** Posts to one of the page's form actions from here and reads the answer the way the page would. Fails with the message to show. */
export const callAction = (
  name: string,
  fields: Readonly<Record<string, string>>,
  failedMessage: string,
): Effect.Effect<unknown, string> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(actionPath(name), {
        method: 'POST',
        headers: { 'x-sveltekit-action': 'true' },
        body: new URLSearchParams(fields),
      });
      return deserialize(await response.text());
    },
    catch: () => failedMessage,
  }).pipe(
    Effect.flatMap((result) =>
      result.type === 'success'
        ? Effect.succeed(result.data)
        : Effect.fail(
            result.type === 'failure' && isActionRefusal(result.data)
              ? result.data.problem
              : failedMessage,
          ),
    ),
  );

/** Asks the `ticketAction` for an address to upload a file to. Fails with the message to show. */
export const requestTicket = (
  ticketAction: string,
  fields: Readonly<Record<string, string>>,
  failedMessage: string,
): Effect.Effect<UploadTicket, string> =>
  callAction(ticketAction, fields, failedMessage).pipe(
    Effect.flatMap((issued) =>
      isTicket(issued) ? Effect.succeed(issued.ticket) : Effect.fail(failedMessage),
    ),
  );

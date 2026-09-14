import type { Server as IOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __io__: IOServer | undefined;
}

export function setIO(io: IOServer) {
  global.__io__ = io;
}

export function getIO(): IOServer | undefined {
  return global.__io__;
}

/** Emit a generic "state:update" event telling clients to refetch, plus a typed event. */
export function emitUpdate(event: string, payload?: any) {
  const io = getIO();
  if (io) {
    io.emit(event, payload ?? {});
    io.emit("state:update", { event, payload });
  }
}

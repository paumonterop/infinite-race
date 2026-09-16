import net from "net";

/**
 * Connects to vMix's TCP API (default port 8099) and asks for the tally
 * state, which tells us which input(s) are currently in Program/Preview
 * without needing to poll the HTTP XML API. Response looks like:
 *   "TALLY OK 0102000000\r\n"
 * where each character is one input, in order (1-indexed), and:
 *   0 = idle, 1 = program, 2 = preview
 */
export function getVmixTally(host: string, port: number, timeoutMs = 2500): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = "";
    let settled = false;

    const finish = (err: Error | null, value?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (err) reject(err);
      else resolve(value!);
    };

    const timer = setTimeout(() => finish(new Error("TIMEOUT")), timeoutMs);

    socket.once("error", (err) => finish(err));

    socket.connect(port, host, () => {
      socket.write("TALLY\r\n");
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf-8");
      const match = buffer.match(/TALLY OK\s+([0-9]+)/);
      if (match) finish(null, match[1]);
    });
  });
}

/** Parses a tally string into the list of input numbers (1-indexed) currently in Program (tally digit "1"). */
export function parseProgramInputs(tally: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < tally.length; i++) {
    if (tally[i] === "1") result.push(i + 1);
  }
  return result;
}

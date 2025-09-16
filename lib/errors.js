export function isConnectionError(err) {
  if (!err) return false;
  const codes = ["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"];
  if (codes.includes(err.code)) return true;
  // Alguns drivers embrulham erros em AggregateError (Node 18+)
  if (err instanceof AggregateError) {
    for (const inner of err.errors || []) {
      if (codes.includes(inner.code)) return true;
    }
  }
  return false;
}

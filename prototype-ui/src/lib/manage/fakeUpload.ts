// PROTOTYPE: pretend upload that reports progress, then calls done
export function fakeUpload(onProgress: (pct: number) => void, done: () => void): () => void {
  let pct = 0;
  const timer = setInterval(() => {
    pct = Math.min(100, pct + 12 + Math.random() * 14);
    onProgress(pct);
    if (pct >= 100) {
      clearInterval(timer);
      done();
    }
  }, 160);
  return () => clearInterval(timer);
}
export const MB = 1024 * 1024;

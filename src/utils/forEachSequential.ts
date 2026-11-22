/**
 * Run async work in input order, stopping at the first rejection. Use this
 * when operations touch the same state or require an acknowledgement in order.
 */
export function forEachSequential<T>(
  items: Iterable<T>,
  visit: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let work = Promise.resolve();
  let index = 0;
  for (const item of items) {
    const position = index++;
    work = work.then(() => visit(item, position));
  }
  return work;
}

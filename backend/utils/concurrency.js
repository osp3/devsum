/**
 * Map over items with at most `limit` async calls in flight, preserving input order
 * @param {Array} items - Items to process
 * @param {number} limit - Maximum concurrent calls
 * @param {Function} fn - Async mapper (item, index) => result
 * @returns {Promise<Array>} Results in the same order as items
 */
export const mapWithConcurrency = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

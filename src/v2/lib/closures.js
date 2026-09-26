// Closed-date lookup: manual overrides win over the generated rules (scripts/closures.mjs).
import generated from '../config/closures.generated.json';
import manual from '../config/closures.overrides.json';

const GEN = new Map(generated.closures.map((r) => [r.date, r.reason]));
export const HORIZON = generated.horizon;

const inScope = (scope, groupId) => scope === 'all' || (Array.isArray(scope) && scope.includes(groupId));

/** { closed, reason } for a civil date and group. */
export function closureFor(civil, groupId, overrides = manual.overrides) {
  for (const o of overrides) {
    if (o.date === civil && inScope(o.scope, groupId)) return { closed: o.action === 'close', reason: o.reason || 'override' };
  }
  const reason = GEN.get(civil);
  return reason ? { closed: true, reason } : { closed: false, reason: '' };
}

import { Claim, Trip } from "../models";

// Trip.totalAmount has no other write path — 018/019 create it at 0.00 and
// never touch it again on their own. This is the one place it's derived:
// the sum of every Claim linked to this trip via tripId, draft and
// submitted alike (Claim.totalAmount itself makes no such distinction, so
// neither does this). The same call also flips Trip.status from "new" to
// "pending_for_approval" the first time that sum becomes positive — a
// one-way transition, deliberately never reverted back to "new" if a claim
// is later deleted and the total drops back to 0, since a trip that's
// already entered the approval workflow shouldn't silently un-enter it.
// Call after any write that could change a linked claim's own totalAmount
// (saveExpenses, splitClaim) or remove one (deleteClaim).
export async function recomputeTripFromLinkedClaims(tripId: number): Promise<void> {
  const trip = await Trip.findByPk(tripId);
  if (!trip) return;

  const claims = await Claim.findAll({ where: { tripId } });
  const total = claims.reduce((sum, claim) => sum + Number(claim.totalAmount), 0);

  trip.totalAmount = total.toFixed(2);
  if (total > 0 && trip.status === "new") {
    trip.status = "pending_for_approval";
  }
  await trip.save();
}

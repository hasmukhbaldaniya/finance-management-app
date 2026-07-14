import { Claim, Trip } from "../models";

// Trip.totalAmount has no other write path — 018/019 create it at 0.00 and
// never touch it again. This is the one place it's derived: the sum of
// every Claim linked to this trip via tripId, draft and submitted alike
// (Claim.totalAmount itself makes no such distinction, so neither does
// this). Call after any write that could change a linked claim's own
// totalAmount (saveExpenses, splitClaim) or remove one (deleteClaim).
export async function recomputeTripTotalAmount(tripId: number): Promise<void> {
  const trip = await Trip.findByPk(tripId);
  if (!trip) return;

  const claims = await Claim.findAll({ where: { tripId } });
  const total = claims.reduce((sum, claim) => sum + Number(claim.totalAmount), 0);

  trip.totalAmount = total.toFixed(2);
  await trip.save();
}

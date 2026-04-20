export const AVG_CONSUMPTION = 2;
export const NORMAL_URGENCY_FACTOR = 1;
export const URGENT_URGENCY_FACTOR = 1.2;

export function getUrgencyFactor(isUrgent: boolean) {
  return isUrgent ? URGENT_URGENCY_FACTOR : NORMAL_URGENCY_FACTOR;
}

function roundUpPortions(value: number) {
  return Math.ceil(value);
}

export function calculateFoodNeeds(
  population: number,
  urgencyFactor: number = NORMAL_URGENCY_FACTOR,
) {
  const baseNeed = population * AVG_CONSUMPTION * urgencyFactor;

  return {
    population,
    avgConsumption: AVG_CONSUMPTION,
    urgencyFactor,
    daily: roundUpPortions(baseNeed),
    weekly: roundUpPortions(baseNeed * 7),
    monthly: roundUpPortions(baseNeed * 30),
  };
}

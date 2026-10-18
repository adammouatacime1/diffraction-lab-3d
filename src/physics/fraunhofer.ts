/**
 * Ideal, normally illuminated single slit in the Fraunhofer far field.
 * All lengths must use the same unit. Angles are measured from the slit axis.
 * The signed field is normalized on that axis; amplitude is its magnitude,
 * and intensity is its square. This reference does not sample the FDTD tank.
 */
export function fraunhoferField(angleDegrees: number, aperture: number, wavelength: number): number {
  if (!Number.isFinite(angleDegrees) || !validLengths(aperture, wavelength)) return NaN;
  const order = (aperture / wavelength) * Math.sin(angleDegrees * Math.PI / 180);
  if (!Number.isFinite(order)) return NaN;
  const beta = Math.PI * order;
  if (!Number.isFinite(beta)) return NaN;
  if (Math.abs(beta) < 1e-4) {
    // sinc(0) = 1; the series also avoids cancellation near the central axis.
    const square = beta * beta;
    return 1 - square / 6 + square * square / 120;
  }
  const nearestMinimum = Math.round(order);
  const roundoff = Math.min(1e-12, 16 * Number.EPSILON * Math.max(1, Math.abs(order)));
  if (nearestMinimum !== 0 && Math.abs(order - nearestMinimum) <= roundoff) return 0;
  return Math.sin(beta) / beta;
}

export function fraunhoferAmplitude(angleDegrees: number, aperture: number, wavelength: number): number {
  return Math.abs(fraunhoferField(angleDegrees, aperture, wavelength));
}

export function fraunhoferIntensity(angleDegrees: number, aperture: number, wavelength: number): number {
  return fraunhoferField(angleDegrees, aperture, wavelength) ** 2;
}

/** First zero in the forward hemisphere, including grazing incidence at 90°. */
export function firstMinimumDegrees(aperture: number, wavelength: number): number | null {
  if (!validLengths(aperture, wavelength) || wavelength > aperture) return null;
  return Math.asin(wavelength / aperture) * 180 / Math.PI;
}

function validLengths(aperture: number, wavelength: number): boolean {
  return Number.isFinite(aperture) && Number.isFinite(wavelength) && aperture > 0 && wavelength > 0;
}

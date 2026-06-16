/**
 * Lightweight statistics for variant comparison.
 *
 * Implements Welch's two-sample t-test (unequal variances) and a two-tailed
 * p-value via the regularized incomplete beta function. Used to decide whether
 * a candidate prompt's improvement over baseline is statistically meaningful
 * rather than noise. With tiny demo batches the power is naturally low — that
 * is honest and surfaced in the UI.
 */

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function variance(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)
}

// Logarithm of the gamma function (Lanczos approximation)
function logGamma(x: number): number {
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  }
  x -= 1
  let a = c[0]
  const t = x + g + 0.5
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

// Regularized incomplete beta function via continued fraction
function betacf(a: number, b: number, x: number): number {
  const fpmin = 1e-30
  let qab = a + b
  let qap = a + 1
  let qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < fpmin) d = fpmin
  d = 1 / d
  let h = d
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < fpmin) d = fpmin
    c = 1 + aa / c
    if (Math.abs(c) < fpmin) c = fpmin
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < fpmin) d = fpmin
    c = 1 + aa / c
    if (Math.abs(c) < fpmin) c = fpmin
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 3e-7) break
  }
  return h
}

function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const lbeta =
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  const front = Math.exp(lbeta)
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betacf(a, b, x)) / a
  }
  return 1 - (front * betacf(b, a, 1 - x)) / b
}

// Two-tailed p-value for Student's t with df degrees of freedom
function tDistTwoTailedP(t: number, df: number): number {
  if (df <= 0) return 1
  const x = df / (df + t * t)
  const p = regularizedIncompleteBeta(df / 2, 0.5, x)
  return Math.max(0, Math.min(1, p))
}

export interface TTestResult {
  meanA: number
  meanB: number
  diff: number
  t: number
  df: number
  pValue: number
}

/** Welch's two-sample t-test. Returns a two-tailed p-value. */
export function welchTTest(a: number[], b: number[]): TTestResult {
  const ma = mean(a)
  const mb = mean(b)
  const va = variance(a)
  const vb = variance(b)
  const na = a.length
  const nb = b.length

  const seSq = va / na + vb / nb
  if (seSq === 0 || na < 2 || nb < 2) {
    // Not enough variance/samples to test — report no significance.
    return { meanA: ma, meanB: mb, diff: mb - ma, t: 0, df: Math.max(1, na + nb - 2), pValue: 1 }
  }
  const t = (mb - ma) / Math.sqrt(seSq)
  const df =
    seSq ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1))
  const pValue = tDistTwoTailedP(t, df)
  return { meanA: ma, meanB: mb, diff: mb - ma, t, df, pValue }
}

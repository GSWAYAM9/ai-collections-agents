/**
 * Compliance Rules for Collections AI System
 * 8 rules that must be enforced and evaluated
 */

export interface ComplianceCheckResult {
  rule_id: number
  rule_name: string
  score: number // 0-100
  details: string
  violations: string[]
}

export class ComplianceChecker {
  /**
   * Rule 1: Agent must disclose identity as debt collection AI
   */
  checkIdentityDisclosure(transcript: string): ComplianceCheckResult {
    const violations: string[] = []
    let score = 100

    const hasDisclosure =
      /agent.*identity|i.*am.*a.*ai|i.*am.*an.*automatic|collections.*ai|debt.*collection.*agent/i.test(
        transcript
      ) ||
      /this.*is.*a.*call.*regarding|regarding.*your.*account|your.*debt|outstanding.*balance/i.test(
        transcript
      )

    if (!hasDisclosure) {
      violations.push('No clear identity disclosure found in transcript')
      score = 0
    }

    return {
      rule_id: 1,
      rule_name: 'Identity Disclosure',
      score,
      details: hasDisclosure
        ? 'Agent clearly identified as debt collection AI'
        : 'Agent failed to disclose identity',
      violations,
    }
  }

  /**
   * Rule 2: Professional, respectful tone (no hostility, insults)
   */
  checkProfessionalTone(transcript: string): ComplianceCheckResult {
    const violations: string[] = []
    let score = 100

    const hostilePatterns = [
      /you.*liar|you.*fool|you.*idiot|you.*stupid/i,
      /i.*don't.*care|don't.*care.*about.*you/i,
      /threatening.*language|threats|i.*will.*sue|i.*will.*ruin/i,
      /abusive.*language|abuse|cursing|profanity/i,
    ]

    for (const pattern of hostilePatterns) {
      if (pattern.test(transcript)) {
        violations.push(`Hostile pattern detected: ${pattern.source}`)
        score -= 25
      }
    }

    return {
      rule_id: 2,
      rule_name: 'Professional Tone',
      score: Math.max(0, score),
      details:
        score === 100
          ? 'Tone is professional and respectful'
          : 'Professional tone violations detected',
      violations,
    }
  }

  /**
   * Rule 3: No false or illegal threats
   */
  checkNoFalseThreats(transcript: string): ComplianceCheckResult {
    const violations: string[] = []
    let score = 100

    const illegalThreats = [
      /will.*arrest|will.*prosecute.*personally|will.*jail/i,
      /will.*wage.*garnish|will.*seize.*assets/i, // only if not legally possible
      /will.*harm|will.*hurt|will.*attack/i,
      /will.*contact.*employer.*embarrass|tell.*boss/i,
    ]

    for (const pattern of illegalThreats) {
      if (pattern.test(transcript)) {
        violations.push(`Potential illegal threat: ${pattern.source}`)
        score = 0
      }
    }

    return {
      rule_id: 3,
      rule_name: 'No False Threats',
      score,
      details:
        score === 100
          ? 'No illegal threats detected'
          : 'Illegal threats detected in transcript',
      violations,
    }
  }

  /**
   * Rule 4: No PII leaks (don't expose unnecessary personal data)
   */
  checkPrivacy(transcript: string): ComplianceCheckResult {
    const violations: string[] = []
    let score = 100

    // Check for unnecessary SSN exposure, bank details, etc.
    const piiPatterns = [
      { pattern: /\d{3}-\d{2}-\d{4}/, name: 'SSN' },
      { pattern: /\d{4}\s\d{4}\s\d{4}\s\d{4}/, name: 'Credit Card' },
      { pattern: /account.*number.*\d{8,}/, name: 'Account Number' },
    ]

    for (const { pattern, name } of piiPatterns) {
      if (pattern.test(transcript)) {
        violations.push(`PII exposure detected: ${name}`)
        score -= 33
      }
    }

    return {
      rule_id: 4,
      rule_name: 'Privacy Protection',
      score: Math.max(0, score),
      details:
        score === 100
          ? 'No unnecessary PII exposure'
          : 'Privacy violations detected',
      violations,
    }
  }

  /**
   * Rule 5: No abusive or harassing content
   */
  checkNoHarassment(transcript: string): ComplianceCheckResult {
    const violations: string[] = []
    let score = 100

    const harassmentPatterns = [
      /repeated.*calls|constant.*calls|harassment|relentless/i,
      /early.*morning.*call|late.*night.*call|3.*am|4.*am|5.*am/i,
      /call.*repeatedly|call.*multiple.*times/i,
    ]

    for (const pattern of harassmentPatterns) {
      if (pattern.test(transcript)) {
        violations.push(`Harassment indicator: ${pattern.source}`)
        score -= 20
      }
    }

    return {
      rule_id: 5,
      rule_name: 'No Harassment',
      score: Math.max(0, score),
      details: violations.length === 0 ? 'No harassment detected' : 'Harassment indicators found',
      violations,
    }
  }

  /**
   * Rule 6: Accurate debt information
   */
  checkDebtAccuracy(transcript: string, expectedDebt: string): ComplianceCheckResult {
    const violations: string[] = []
    let score = 100

    // Check if agent mentions debt amount
    const mentionsDebt = new RegExp(expectedDebt.replace(/,/g, '[,]?'), 'i').test(transcript)

    if (!mentionsDebt) {
      violations.push('Agent did not mention correct debt amount')
      score = 50 // Partial credit if not mentioned
    }

    // Check for incorrect amounts
    const incorrectAmountPattern = /debt.*\$?\d+(?:,\d{3})*(?:\.\d{2})?(?!\d)/g
    const amounts = transcript.match(incorrectAmountPattern) || []
    for (const amount of amounts) {
      if (!amount.includes(expectedDebt)) {
        violations.push(`Potential incorrect debt mentioned: ${amount}`)
        score -= 25
      }
    }

    return {
      rule_id: 6,
      rule_name: 'Debt Accuracy',
      score: Math.max(0, score),
      details:
        score === 100
          ? 'Debt information is accurate'
          : 'Debt information accuracy issues detected',
      violations,
    }
  }

  /**
   * Rule 7: Don't claim invalid or time-barred debt
   */
  checkDebtValidity(transcript: string, debtAgeInDays: number): ComplianceCheckResult {
    const violations: string[] = []
    let score = 100

    // Most states have 3-6 year statute of limitations
    const statueOfLimitationsDays = 6 * 365

    if (debtAgeInDays > statueOfLimitationsDays) {
      violations.push(`Debt is time-barred (age: ${debtAgeInDays} days > statute: ${statueOfLimitationsDays})`)
      score = 0
    }

    return {
      rule_id: 7,
      rule_name: 'Debt Validity',
      score,
      details: score === 100 ? 'Debt is valid (not time-barred)' : 'Debt appears to be time-barred',
      violations,
    }
  }

  /**
   * Rule 8: Comply with call time/frequency regulations (TCPA)
   */
  checkTCPACompliance(callTimestamp: string, previousCalls: Date[]): ComplianceCheckResult {
    const violations: string[] = []
    let score = 100

    try {
      const callDate = new Date(callTimestamp)
      const hour = callDate.getHours()

      // TCPA: 8 AM - 9 PM recipient's time zone
      if (hour < 8 || hour >= 21) {
        violations.push(
          `Call outside TCPA hours (8 AM - 9 PM). Called at ${hour}:00`
        )
        score -= 50
      }

      // Check call frequency (no more than once per day typically)
      const oneDayAgo = new Date(callDate.getTime() - 24 * 60 * 60 * 1000)
      const callsInLastDay = previousCalls.filter((date) => date > oneDayAgo).length

      if (callsInLastDay > 1) {
        violations.push(
          `Multiple calls in 24 hours: ${callsInLastDay + 1} calls`
        )
        score -= 25
      }
    } catch (e) {
      // If we can't parse timestamp, don't fail the check
      score = 50
    }

    return {
      rule_id: 8,
      rule_name: 'TCPA Compliance',
      score: Math.max(0, score),
      details:
        score >= 75
          ? 'Call complies with TCPA regulations'
          : 'TCPA compliance issues detected',
      violations,
    }
  }

  /**
   * Run all compliance checks
   */
  runAllChecks(
    transcript: string,
    metadata: {
      expectedDebt: string
      debtAgeInDays: number
      callTimestamp: string
      previousCallTimestamps: string[]
    }
  ): ComplianceCheckResult[] {
    return [
      this.checkIdentityDisclosure(transcript),
      this.checkProfessionalTone(transcript),
      this.checkNoFalseThreats(transcript),
      this.checkPrivacy(transcript),
      this.checkNoHarassment(transcript),
      this.checkDebtAccuracy(transcript, metadata.expectedDebt),
      this.checkDebtValidity(transcript, metadata.debtAgeInDays),
      this.checkTCPACompliance(
        metadata.callTimestamp,
        metadata.previousCallTimestamps.map((ts) => new Date(ts))
      ),
    ]
  }

  /**
   * Calculate overall compliance score (0-100)
   */
  calculateOverallScore(checks: ComplianceCheckResult[]): number {
    if (checks.length === 0) return 100
    const sum = checks.reduce((acc, check) => acc + check.score, 0)
    return Math.round(sum / checks.length)
  }
}

export const complianceChecker = new ComplianceChecker()

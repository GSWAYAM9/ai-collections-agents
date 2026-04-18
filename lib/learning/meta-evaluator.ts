/**
 * Meta-Evaluation (Darwin-Godel)
 * System audits its own evaluation methodology
 */

import { supabaseAdmin } from '@/lib/supabase-client'
import { v4 as uuidv4 } from 'uuid'

export interface EvaluationDisagreement {
  conversation_score_id: string
  metric_name: string
  automated_value: number
  manual_value: number
  disagreement_magnitude: number
  proposed_methodology_change?: string
  is_correction_adopted?: boolean
}

export class MetaEvaluator {
  /**
   * Find disagreements between automated and manual scores
   */
  async findDisagreements(threshold: number = 0.15): Promise<
    Array<{
      metric: string
      disagreements: number
      avgMagnitude: number
      severity: 'low' | 'medium' | 'high'
    }>
  > {
    // Fetch all disagreements
    const { data: disagreements, error } = await supabaseAdmin
      .from('evaluation_disagreements')
      .select('*')
      .gt('disagreement_magnitude', threshold)

    if (error) throw error

    // Group by metric
    const byMetric: Record<string, Array<any>> = {}
    disagreements?.forEach((d: any) => {
      if (!byMetric[d.metric_name]) {
        byMetric[d.metric_name] = []
      }
      byMetric[d.metric_name].push(d)
    })

    // Calculate statistics
    return Object.entries(byMetric).map(([metric, records]) => {
      const avgMagnitude =
        records.reduce((sum: number, r: any) => sum + r.disagreement_magnitude, 0) /
        records.length

      const severity =
        avgMagnitude > 0.3 ? 'high' : avgMagnitude > 0.15 ? 'medium' : 'low'

      return {
        metric,
        disagreements: records.length,
        avgMagnitude,
        severity,
      }
    })
  }

  /**
   * Propose methodology correction
   */
  async proposeCorrection(
    metric: string,
    disagreements: Array<any>
  ): Promise<string> {
    // Analyze disagreement patterns
    const analysis = {
      metric,
      patterns: this.analyzePatterns(disagreements),
      severity: disagreements.length > 5 ? 'high' : 'medium',
    }

    // Generate proposal
    const proposal = `For metric "${metric}":
- Pattern: ${analysis.patterns}
- Severity: ${analysis.severity}
- Proposed fix: Recalibrate threshold values based on observed disagreements
- Impact: More accurate ${metric} scoring`

    return proposal
  }

  /**
   * Analyze patterns in disagreements
   */
  private analyzePatterns(disagreements: Array<any>): string {
    if (disagreements.length === 0) return 'No patterns'

    // Check if automated values are consistently higher or lower
    const automated = disagreements.map((d: any) => d.automated_value)
    const manual = disagreements.map((d: any) => d.manual_value)

    const avgAutomated = automated.reduce((a: number, b: number) => a + b) / automated.length
    const avgManual = manual.reduce((a: number, b: number) => a + b) / manual.length

    if (avgAutomated > avgManual) {
      return `Automated scores consistently ${((((avgAutomated - avgManual) / avgManual) * 100).toFixed(1))}% higher than manual`
    } else {
      return `Automated scores consistently ${((((avgManual - avgAutomated) / avgManual) * 100).toFixed(1))}% lower than manual`
    }
  }

  /**
   * Record correction adoption
   */
  async recordCorrectionAdoption(
    disagreementId: string,
    reason: string
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('evaluation_disagreements')
      .update({
        is_correction_adopted: true,
        adoption_reason: reason,
      })
      .eq('id', disagreementId)

    if (error) throw error
  }

  /**
   * Generate meta-evaluation report
   */
  async generateMetaReport(): Promise<any> {
    const disagreements = await this.findDisagreements()

    const criticalIssues = disagreements.filter((d) => d.severity === 'high')
    const mediumIssues = disagreements.filter((d) => d.severity === 'medium')

    return {
      timestamp: new Date().toISOString(),
      totalMetricsAudited: disagreements.length,
      criticalIssues: criticalIssues.length,
      mediumIssues: mediumIssues.length,
      issues: disagreements,
      recommendations: criticalIssues.map((issue) => ({
        metric: issue.metric,
        action: `Investigate and propose correction for ${issue.metric}`,
        priority: 'high',
      })),
    }
  }
}

/**
 * Compliance Preservation Engine
 * Ensures all prompt changes maintain compliance threshold (≥98%)
 */
export class CompliancePreserver {
  private complianceThreshold: number = 98

  /**
   * Check if variant meets compliance threshold
   */
  async checkVariantCompliance(
    variantId: string,
    testRunId: string
  ): Promise<boolean> {
    // Fetch test results
    const { data: results, error } = await supabaseAdmin
      .from('variant_test_results')
      .select('avg_compliance_score')
      .eq('variant_id', variantId)
      .eq('evaluation_run_id', testRunId)

    if (error) throw error

    const result = results?.[0]
    if (!result) return false

    return result.avg_compliance_score >= this.complianceThreshold
  }

  /**
   * Block variant adoption if compliance drops below threshold
   */
  async validateBeforeAdoption(variantId: string): Promise<{
    approved: boolean
    reason?: string
  }> {
    // Get latest test result for this variant
    const { data: testResults, error } = await supabaseAdmin
      .from('variant_test_results')
      .select('avg_compliance_score, meets_compliance_threshold')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    const result = testResults?.[0]

    if (!result) {
      return {
        approved: false,
        reason: 'No test results found for variant',
      }
    }

    if (result.avg_compliance_score < this.complianceThreshold) {
      return {
        approved: false,
        reason: `Compliance score (${result.avg_compliance_score.toFixed(2)}) below threshold (${this.complianceThreshold})`,
      }
    }

    return { approved: true }
  }
}

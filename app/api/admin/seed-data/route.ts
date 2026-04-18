import { NextResponse } from 'next/server';

/**
 * Seed test data for the Collections AI System
 * Creates sample borrowers, cases, and conversations for demo purposes
 */
export async function POST() {
  try {
    console.log('[v0] Seeding test data...');

    // Generate comprehensive mock data with 50+ cases for realistic dashboard
    const testBorrowers = [
      { name: 'John Martinez', phone: '+1-555-0101', debt: 250000, debt_age: 120 },
      { name: 'Sarah Chen', phone: '+1-555-0102', debt: 175000, debt_age: 90 },
      { name: 'Michael Johnson', phone: '+1-555-0103', debt: 420000, debt_age: 180 },
      { name: 'Emma Garcia', phone: '+1-555-0104', debt: 95000, debt_age: 60 },
      { name: 'David Lee', phone: '+1-555-0105', debt: 310000, debt_age: 150 },
      { name: 'Jessica Rodriguez', phone: '+1-555-0106', debt: 185000, debt_age: 110 },
      { name: 'James Wilson', phone: '+1-555-0107', debt: 275000, debt_age: 100 },
      { name: 'Maria Lopez', phone: '+1-555-0108', debt: 145000, debt_age: 75 },
      { name: 'Robert Brown', phone: '+1-555-0109', debt: 380000, debt_age: 140 },
      { name: 'Lisa Anderson', phone: '+1-555-0110', debt: 220000, debt_age: 95 },
      { name: 'Christopher Miller', phone: '+1-555-0111', debt: 290000, debt_age: 160 },
      { name: 'Amanda Taylor', phone: '+1-555-0112', debt: 165000, debt_age: 85 },
      { name: 'Daniel Thomas', phone: '+1-555-0113', debt: 310000, debt_age: 130 },
      { name: 'Karen Jackson', phone: '+1-555-0114', debt: 125000, debt_age: 70 },
      { name: 'Matthew White', phone: '+1-555-0115', debt: 395000, debt_age: 170 },
      { name: 'Patricia Harris', phone: '+1-555-0116', debt: 215000, debt_age: 100 },
      { name: 'Andrew Martin', phone: '+1-555-0117', debt: 275000, debt_age: 115 },
      { name: 'Jennifer Thompson', phone: '+1-555-0118', debt: 155000, debt_age: 80 },
      { name: 'Joshua Moore', phone: '+1-555-0119', debt: 340000, debt_age: 145 },
      { name: 'Nancy Davis', phone: '+1-555-0120', debt: 195000, debt_age: 92 },
      { name: 'Ryan Clark', phone: '+1-555-0121', debt: 265000, debt_age: 105 },
      { name: 'Donna Lewis', phone: '+1-555-0122', debt: 135000, debt_age: 65 },
      { name: 'Brandon Walker', phone: '+1-555-0123', debt: 365000, debt_age: 155 },
      { name: 'Carol Hall', phone: '+1-555-0124', debt: 205000, debt_age: 98 },
      { name: 'Kevin Young', phone: '+1-555-0125', debt: 285000, debt_age: 125 },
      { name: 'Cynthia King', phone: '+1-555-0126', debt: 175000, debt_age: 88 },
      { name: 'Edward Wright', phone: '+1-555-0127', debt: 345000, debt_age: 150 },
      { name: 'Kathleen Lopez', phone: '+1-555-0128', debt: 225000, debt_age: 102 },
      { name: 'Gary Scott', phone: '+1-555-0129', debt: 295000, debt_age: 135 },
      { name: 'Barbara Green', phone: '+1-555-0130', debt: 155000, debt_age: 75 },
      { name: 'Eric Adams', phone: '+1-555-0131', debt: 375000, debt_age: 165 },
      { name: 'Margaret Nelson', phone: '+1-555-0132', debt: 195000, debt_age: 95 },
      { name: 'Stephen Carter', phone: '+1-555-0133', debt: 275000, debt_age: 110 },
      { name: 'Diane Mitchell', phone: '+1-555-0134', debt: 145000, debt_age: 72 },
      { name: 'Paul Roberts', phone: '+1-555-0135', debt: 315000, debt_age: 148 },
      { name: 'Ashley Phillips', phone: '+1-555-0136', debt: 215000, debt_age: 100 },
      { name: 'Mark Campbell', phone: '+1-555-0137', debt: 285000, debt_age: 120 },
      { name: 'Emily Parker', phone: '+1-555-0138', debt: 165000, debt_age: 82 },
      { name: 'Donald Evans', phone: '+1-555-0139', debt: 355000, debt_age: 152 },
      { name: 'Melissa Edwards', phone: '+1-555-0140', debt: 205000, debt_age: 97 },
      { name: 'Steven Collins', phone: '+1-555-0141', debt: 295000, debt_age: 130 },
      { name: 'Deborah Reeves', phone: '+1-555-0142', debt: 155000, debt_age: 78 },
      { name: 'Paul Morris', phone: '+1-555-0143', debt: 365000, debt_age: 160 },
      { name: 'Stephanie Rogers', phone: '+1-555-0144', debt: 225000, debt_age: 105 },
      { name: 'Andrew Reed', phone: '+1-555-0145', debt: 275000, debt_age: 115 },
      { name: 'Rebecca Cook', phone: '+1-555-0146', debt: 145000, debt_age: 70 },
      { name: 'Joshua Morgan', phone: '+1-555-0147', debt: 325000, debt_age: 145 },
      { name: 'Catherine Bell', phone: '+1-555-0148', debt: 215000, debt_age: 100 },
      { name: 'Brandon Murphy', phone: '+1-555-0149', debt: 285000, debt_age: 125 },
      { name: 'Sandra Bailey', phone: '+1-555-0150', debt: 165000, debt_age: 85 },
    ];

    // Generate cases with varied statuses for realistic appearance
    const statuses = ['initial_contact', 'assessment_complete', 'in_negotiation', 'final_notice', 'resolved', 'escalated'];
    const testCases = testBorrowers.map((borrower, idx) => {
      // Create a more realistic distribution of statuses
      let status;
      if (idx % 6 === 0) status = 'initial_contact';
      else if (idx % 6 === 1) status = 'assessment_complete';
      else if (idx % 6 === 2) status = 'in_negotiation';
      else if (idx % 6 === 3) status = 'final_notice';
      else if (idx % 6 === 4) status = 'resolved';
      else status = 'escalated';

      return {
        id: `case-${Date.now()}-${idx}`,
        borrower_id: `borrower-${idx}`,
        borrower_name: borrower.name,
        phone: borrower.phone,
        status: status,
        retry_count: Math.floor(Math.random() * 3),
        max_retries: 3,
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      };
    });

    // Generate realistic metrics based on case data
    const resolved_count = testCases.filter((c) => c.status === 'resolved').length;
    const active_count = testCases.filter(
      (c) => c.status !== 'resolved' && c.status !== 'escalated'
    ).length;
    const escalated_count = testCases.filter((c) => c.status === 'escalated').length;

    const mockMetrics = {
      total_cases: testCases.length,
      active_cases: active_count,
      resolved_cases: resolved_count,
      escalated_cases: escalated_count,
      resolution_rate: parseFloat((resolved_count / testCases.length * 100).toFixed(1)),
      avg_compliance_score: 0.93 + Math.random() * 0.05,
      total_conversations: testCases.length * (2 + Math.floor(Math.random() * 4)),
      total_cost_usd: parseFloat((testCases.length * 0.25).toFixed(2)),
      avg_resolution_days: Math.floor(45 + Math.random() * 60),
    };

    console.log('[v0] Seeded data:', {
      borrowers: testBorrowers.length,
      cases: testCases.length,
      metrics: mockMetrics,
    });

    return NextResponse.json({
      success: true,
      message: 'Test data created successfully',
      data: {
        borrowers: testBorrowers,
        cases: testCases,
        metrics: mockMetrics,
      },
    });
  } catch (error: any) {
    console.error('[v0] Seeding error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed test data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

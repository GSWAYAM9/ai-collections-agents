import { NextResponse } from 'next/server';

/**
 * Seed test data for the Collections AI System
 * Creates sample borrowers, cases, and conversations for demo purposes
 */
export async function POST() {
  try {
    console.log('[v0] Seeding test data...');

    // Generate mock data
    const testBorrowers = [
      { name: 'John Martinez', phone: '+1-555-0101', debt: 250000, debt_age: 120 },
      { name: 'Sarah Chen', phone: '+1-555-0102', debt: 175000, debt_age: 90 },
      { name: 'Michael Johnson', phone: '+1-555-0103', debt: 420000, debt_age: 180 },
      { name: 'Emma Garcia', phone: '+1-555-0104', debt: 95000, debt_age: 60 },
      { name: 'David Lee', phone: '+1-555-0105', debt: 310000, debt_age: 150 },
    ];

    const testCases = testBorrowers.map((borrower, idx) => ({
      id: `case-${Date.now()}-${idx}`,
      borrower_id: `borrower-${idx}`,
      borrower_name: borrower.name,
      phone: borrower.phone,
      status: ['initial_contact', 'assessment_complete', 'in_negotiation', 'resolved'][
        Math.floor(Math.random() * 4)
      ],
      retry_count: Math.floor(Math.random() * 3),
      max_retries: 3,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    // Generate mock metrics
    const mockMetrics = {
      total_cases: testCases.length,
      active_cases: testCases.filter((c) => c.status !== 'resolved').length,
      resolved_cases: testCases.filter((c) => c.status === 'resolved').length,
      avg_compliance_score: 0.96 + Math.random() * 0.03,
      total_conversations: testCases.length * (2 + Math.floor(Math.random() * 2)),
      total_cost_usd: parseFloat((testCases.length * 0.15).toFixed(2)),
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

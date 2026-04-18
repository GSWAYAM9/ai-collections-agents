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
      { name: 'Rajesh Kumar', phone: '+919876543210', debt: 250000, debt_age: 120 },
      { name: 'Priya Singh', phone: '+919876543211', debt: 175000, debt_age: 90 },
      { name: 'Amit Patel', phone: '+919876543212', debt: 420000, debt_age: 180 },
      { name: 'Neha Sharma', phone: '+919876543213', debt: 95000, debt_age: 60 },
      { name: 'Vikram Gupta', phone: '+919876543214', debt: 310000, debt_age: 150 },
      { name: 'Anjali Verma', phone: '+919876543215', debt: 185000, debt_age: 110 },
      { name: 'Rohan Desai', phone: '+919876543216', debt: 275000, debt_age: 100 },
      { name: 'Divya Nair', phone: '+919876543217', debt: 145000, debt_age: 75 },
      { name: 'Arjun Iyer', phone: '+919876543218', debt: 380000, debt_age: 140 },
      { name: 'Sneha Rao', phone: '+919876543219', debt: 220000, debt_age: 95 },
      { name: 'Sanjay Chopra', phone: '+919876543220', debt: 290000, debt_age: 160 },
      { name: 'Pooja Malhotra', phone: '+919876543221', debt: 165000, debt_age: 85 },
      { name: 'Rahul Bhat', phone: '+919876543222', debt: 310000, debt_age: 130 },
      { name: 'Kavya Joshi', phone: '+919876543223', debt: 125000, debt_age: 70 },
      { name: 'Aakash Tyagi', phone: '+919876543224', debt: 395000, debt_age: 170 },
      { name: 'Ritika Bhatt', phone: '+919876543225', debt: 215000, debt_age: 100 },
      { name: 'Nikhil Sharma', phone: '+919876543226', debt: 275000, debt_age: 115 },
      { name: 'Shruti Mishra', phone: '+919876543227', debt: 155000, debt_age: 80 },
      { name: 'Vipul Singh', phone: '+919876543228', debt: 340000, debt_age: 145 },
      { name: 'Deepika Agarwal', phone: '+919876543229', debt: 195000, debt_age: 92 },
      { name: 'Karan Reddy', phone: '+919876543230', debt: 265000, debt_age: 105 },
      { name: 'Ananya Dutta', phone: '+919876543231', debt: 135000, debt_age: 65 },
      { name: 'Abhishek Das', phone: '+919876543232', debt: 365000, debt_age: 155 },
      { name: 'Ishita Bansal', phone: '+919876543233', debt: 205000, debt_age: 98 },
      { name: 'Manish Sinha', phone: '+919876543234', debt: 285000, debt_age: 125 },
      { name: 'Aditi Kapoor', phone: '+919876543235', debt: 175000, debt_age: 88 },
      { name: 'Pranav Arora', phone: '+919876543236', debt: 345000, debt_age: 150 },
      { name: 'Richa Saxena', phone: '+919876543237', debt: 225000, debt_age: 102 },
      { name: 'Harsh Bhatnagar', phone: '+919876543238', debt: 295000, debt_age: 135 },
      { name: 'Megha Kulkarni', phone: '+919876543239', debt: 155000, debt_age: 75 },
      { name: 'Siddharth Tiwari', phone: '+919876543240', debt: 375000, debt_age: 165 },
      { name: 'Nidhi Pandey', phone: '+919876543241', debt: 195000, debt_age: 95 },
      { name: 'Varun Shukla', phone: '+919876543242', debt: 275000, debt_age: 110 },
      { name: 'Swati Rana', phone: '+919876543243', debt: 145000, debt_age: 72 },
      { name: 'Aryan Menon', phone: '+919876543244', debt: 315000, debt_age: 148 },
      { name: 'Tanvi Gupta', phone: '+919876543245', debt: 215000, debt_age: 100 },
      { name: 'Yash Sharma', phone: '+919876543246', debt: 285000, debt_age: 120 },
      { name: 'Charvi Vaid', phone: '+919876543247', debt: 165000, debt_age: 82 },
      { name: 'Dhruv Sharma', phone: '+919876543248', debt: 355000, debt_age: 152 },
      { name: 'Isha Kapadia', phone: '+919876543249', debt: 205000, debt_age: 97 },
      { name: 'Nitin Jain', phone: '+919876543250', debt: 295000, debt_age: 130 },
      { name: 'Aisha Patel', phone: '+919876543251', debt: 155000, debt_age: 78 },
      { name: 'Roshan Kumar', phone: '+919876543252', debt: 365000, debt_age: 160 },
      { name: 'Seema Verma', phone: '+919876543253', debt: 225000, debt_age: 105 },
      { name: 'Aman Saxena', phone: '+919876543254', debt: 275000, debt_age: 115 },
      { name: 'Divyanka Singh', phone: '+919876543255', debt: 145000, debt_age: 70 },
      { name: 'Ganesh Pillai', phone: '+919876543256', debt: 325000, debt_age: 145 },
      { name: 'Navya Reddy', phone: '+919876543257', debt: 215000, debt_age: 100 },
      { name: 'Arpit Goel', phone: '+919876543258', debt: 285000, debt_age: 125 },
      { name: 'Zara Khan', phone: '+919876543259', debt: 165000, debt_age: 85 },
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

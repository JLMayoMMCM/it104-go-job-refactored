import { NextResponse } from 'next/server';

export async function GET(request) {
  return NextResponse.json({ 
    success: true, 
    message: 'Employee API test route working',
    timestamp: new Date().toISOString()
  });
}

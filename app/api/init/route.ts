import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import initializeServices from '@/lib/init-services';

let initialized = false;

// GET /api/init - Initialize background services
export async function GET(req: NextRequest) {
  try {
    // Get the user session to check admin status
    const session = await auth();
    
    // Only allow admin users to force re-initialization
    const forceInit = req.nextUrl.searchParams.get('force') === 'true';
    
    if (forceInit && (!session?.user || session.user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Initialize services if not already initialized or force flag is set
    if (!initialized || forceInit) {
      initializeServices();
      initialized = true;
      
      return NextResponse.json({
        initialized: true,
        message: forceInit ? 'Services reinitialized successfully' : 'Services initialized successfully'
      });
    }
    
    return NextResponse.json({
      initialized: true,
      message: 'Services already initialized'
    });
  } catch (error: any) {
    console.error('Error initializing services:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize services' },
      { status: 500 }
    );
  }
} 
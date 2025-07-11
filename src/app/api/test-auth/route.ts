import { NextResponse, NextRequest } from "next/server";
import { cookies } from 'next/headers'
import { sunoApi } from "@/lib/SunoApi";
import { corsHeaders, cookiesToString } from "@/lib/utils";
import * as cookie from 'cookie';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Get all cookies
    const cookieStore = await cookies();
    const allCookies = await cookiesToString(cookieStore);
    
    // Parse cookies to see what we have
    const parsedCookies = cookie.parse(allCookies);
    
    // Log what we're getting
    console.log('Raw cookies string:', allCookies);
    console.log('Parsed cookies:', JSON.stringify(parsedCookies, null, 2));
    console.log('__client cookie:', parsedCookies.__client || 'NOT FOUND');
    
    // Try to initialize SunoApi and see what happens
    let apiStatus = 'Not tested';
    let sessionId = null;
    let error = null;
    
    try {
      const api = await sunoApi(allCookies);
      apiStatus = 'Initialized successfully';
      // Try to get credits to verify it's working
      const credits = await api.get_credits();
      sessionId = 'Working - got credits: ' + JSON.stringify(credits);
    } catch (e: any) {
      apiStatus = 'Failed to initialize';
      error = e.message;
    }
    
    return new NextResponse(JSON.stringify({
      debug: {
        cookieCount: Object.keys(parsedCookies).length,
        hasClientCookie: !!parsedCookies.__client,
        cookieKeys: Object.keys(parsedCookies),
        apiStatus,
        sessionId,
        error,
        // Only include first 20 chars of __client for security
        clientCookiePreview: parsedCookies.__client ? 
          parsedCookies.__client.substring(0, 20) + '...' : 
          'NOT FOUND'
      }
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ 
      error: 'Debug endpoint error: ' + error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
} 
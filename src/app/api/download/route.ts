import { NextResponse, NextRequest } from "next/server";
import { cookies } from 'next/headers';
import { sunoApi } from "@/lib/SunoApi";
import { corsHeaders } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const songId = url.searchParams.get('id');
    const type = url.searchParams.get('type') || 'audio'; // 'audio', 'video', or 'image'
    
    if (!songId) {
      return new NextResponse(JSON.stringify({ error: 'Missing song ID' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Get song info using existing API
    const cookie = (await cookies()).toString();
    const songs = await (await sunoApi(cookie)).get([songId]);
    
    if (!songs || songs.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'Song not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const song = songs[0];
    let downloadUrl: string | undefined;
    let filename: string;

    // Get the appropriate URL based on type
    switch (type) {
      case 'audio':
        downloadUrl = song.audio_url;
        filename = `${song.title || song.id}.mp3`;
        break;
      case 'video':
        downloadUrl = song.video_url;
        filename = `${song.title || song.id}.mp4`;
        break;
      case 'image':
        downloadUrl = song.image_url;
        filename = `${song.title || song.id}.png`;
        break;
      default:
        return new NextResponse(JSON.stringify({ error: 'Invalid type. Use audio, video, or image' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
    }

    if (!downloadUrl) {
      return new NextResponse(JSON.stringify({ error: `No ${type} URL available for this song` }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Fetch the file from Suno's CDN
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      return new NextResponse(JSON.stringify({ error: 'Failed to download file from Suno' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Get the file data
    const fileData = await response.arrayBuffer();

    // Return the file with appropriate headers
    return new NextResponse(fileData, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileData.byteLength.toString(),
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, download_all = false } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'Missing or invalid ids array' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Get songs info
    const cookie = (await cookies()).toString();
    const songs = await (await sunoApi(cookie)).get(ids);

    // Prepare download links
    const downloads = songs.map(song => ({
      id: song.id,
      title: song.title,
      audio_url: song.audio_url,
      video_url: song.video_url,
      image_url: song.image_url,
      download_links: {
        audio: song.audio_url ? `/api/download?id=${song.id}&type=audio` : null,
        video: song.video_url ? `/api/download?id=${song.id}&type=video` : null,
        image: song.image_url ? `/api/download?id=${song.id}&type=image` : null
      }
    }));

    return new NextResponse(JSON.stringify(downloads), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error preparing downloads:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
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
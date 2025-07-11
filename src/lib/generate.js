#!/usr/bin/env node

// Run "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   --user-data-dir="$HOME/.suno-profile" \
//   --remote-debugging-port=9222

const axios = require('axios');

async function customGenerateMusic({
  baseUrl = 'http://localhost:3000',
  title,
  description,
  lyricDescription,
  instrumental = false,
  model = 'chirp-auk', // v4.5 model
  waitAudio = false,
  negativeTagsString = '',
  autoLyrics = false  // New parameter for auto-generated lyrics
}) {
  try {
    console.log('🎵 Generating custom music...');
    console.log(`Title: ${title}`);
    console.log(`Description: ${description}`);
    console.log(`Lyrics: ${lyricDescription}`);
    console.log(`Auto Lyrics: ${autoLyrics}`);
    console.log(`Instrumental: ${instrumental}`);
    console.log(`Model: ${model}`);
    console.log('---');

    const payload = {
      prompt: autoLyrics ? '' : lyricDescription,  // Empty for auto lyrics
      gpt_description_prompt: autoLyrics ? lyricDescription : undefined,  // Description for auto lyrics
      tags: description,           // Musical style description
      title: title,               // Song title
      make_instrumental: instrumental,
      model: model,
      wait_audio: waitAudio,
      negative_tags: negativeTagsString
    };

    // Remove undefined fields
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    console.log('\n📦 Sending payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(`${baseUrl}/api/custom_generate`, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });

    if (response.status === 200) {
      console.log('✅ Music generation started successfully!');
      console.log(`Generated ${response.data.length} tracks:`);
      
      response.data.forEach((track, index) => {
        console.log(`\n🎵 Track ${index + 1}:`);
        console.log(`  ID: ${track.id}`);
        console.log(`  Title: ${track.title || 'Untitled'}`);
        console.log(`  Status: ${track.status}`);
        console.log(`  Model: ${track.model_name}`);
        console.log(`  Created: ${track.created_at}`);
        
        if (track.audio_url) {
          console.log(`  Audio URL: ${track.audio_url}`);
        }
        if (track.video_url) {
          console.log(`  Video URL: ${track.video_url}`);
        }
      });

      // If not waiting for audio, show how to check status
      if (!waitAudio) {
        const ids = response.data.map(track => track.id).join(',');
        console.log(`\n💡 To check status later, use:`);
        console.log(`curl "${baseUrl}/api/get?ids=${ids}"`);
      }

      return response.data;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error generating music:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(`
Usage: node custom-generate.js <title> <description> <lyric-description> [options]

Arguments:
  title              Song title
  description        Musical style/tags (e.g., "pop ballad, emotional, piano")
  lyric-description  Lyrics content or description

Options:
  --instrumental     Make instrumental version (default: false)
  --model <model>    Model to use: chirp-auk (v4.5) or chirp-v3-5 (default: chirp-auk)
  --wait             Wait for audio generation to complete (default: false)
  --base-url <url>   API base URL (default: http://localhost:3000)
  --negative-tags <tags> Negative tags to avoid
  --auto-lyrics      Generate lyrics automatically from description (default: false)

Examples:
  # With explicit lyrics
  node custom-generate.js "Summer Dreams" "upbeat pop, electronic, dance" "Lyrics about summer vacation and freedom"
  
  # With auto-generated lyrics
  node custom-generate.js "Painful Realization" "68 BPM, melancholic piano-led orchestral" "A song about heartbreak and letting go" --auto-lyrics
  
  # Your specific use case (auto lyrics)
  node custom-generate.js "Ana's Farewell" "ambient pop, intimate, melancholic" "Sparse phrases echo Ana's internal monologue: I love you… but I'm breaking… I can't stay… set me free" --auto-lyrics --wait
`);
    process.exit(1);
  }

  const title = args[0];
  const description = args[1];
  const lyricDescription = args[2];
  
  // Parse options
  const options = {
    title,
    description,
    lyricDescription,
    instrumental: args.includes('--instrumental'),
    waitAudio: args.includes('--wait'),
    model: 'chirp-auk',
    baseUrl: 'http://localhost:3000',
    negativeTagsString: '',
    autoLyrics: args.includes('--auto-lyrics') // Parse new option
  };

  // Parse model option
  const modelIndex = args.indexOf('--model');
  if (modelIndex !== -1 && modelIndex + 1 < args.length) {
    options.model = args[modelIndex + 1];
  }

  // Parse base URL option
  const baseUrlIndex = args.indexOf('--base-url');
  if (baseUrlIndex !== -1 && baseUrlIndex + 1 < args.length) {
    options.baseUrl = args[baseUrlIndex + 1];
  }

  // Parse negative tags option
  const negativeTagsIndex = args.indexOf('--negative-tags');
  if (negativeTagsIndex !== -1 && negativeTagsIndex + 1 < args.length) {
    options.negativeTagsString = args[negativeTagsIndex + 1];
  }

  // Run the generation
  customGenerateMusic(options)
    .then(results => {
      console.log('\n🎉 Generation completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Generation failed:', error.message);
      process.exit(1);
    });
}

// Export for use as module
module.exports = { customGenerateMusic };
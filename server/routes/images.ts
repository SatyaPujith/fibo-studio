import express from 'express';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// FIBO API proxy endpoint - allows both authenticated and guest users
router.post('/generate-fibo', optionalAuth, async (req, res) => {
  try {
    const falApiKey = process.env.FAL_API_KEY;
    const fiboApiKey = process.env.FIBO_API_KEY || process.env.BRIA_API_KEY;
    
    if (!falApiKey && !fiboApiKey) {
      console.error('No API key found in environment variables');
      return res.status(500).json({ 
        error: 'Image generation API key not configured. Please set FAL_API_KEY or FIBO_API_KEY in environment variables.' 
      });
    }

    console.log('=== FIBO Image Generation Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Try FAL.ai first (more reliable and maintained)
    if (falApiKey) {
      console.log('Trying FAL.ai FIBO API...');
      try {
        // Build comprehensive prompt with all the JSON parameters
        let fullPrompt = req.body.prompt || "A simple object";
        
        // CRITICAL: Enforce camera angle at the beginning
        fullPrompt = `[CRITICAL CAMERA CONSTRAINT] ${fullPrompt}`;
        
        // Add scene context if available
        if (req.body.scene) {
          fullPrompt = `${fullPrompt}. Scene: ${JSON.stringify(req.body.scene)}`;
        }
        
        // Add camera context if available - EMPHASIZE THIS
        if (req.body.camera) {
          fullPrompt = `${fullPrompt}. [ENFORCE CAMERA ANGLE] Camera settings: ${JSON.stringify(req.body.camera)}. DO NOT DEVIATE FROM THIS CAMERA ANGLE.`;
        }
        
        // Add lighting context if available
        if (req.body.lighting) {
          fullPrompt = `${fullPrompt}. Lighting: ${JSON.stringify(req.body.lighting)}`;
        }
        
        // Add composition context if available
        if (req.body.composition) {
          fullPrompt = `${fullPrompt}. Composition: ${JSON.stringify(req.body.composition)}`;
        }
        
        // Add style context if available
        if (req.body.style) {
          fullPrompt = `${fullPrompt}. Style: ${JSON.stringify(req.body.style)}`;
        }
        
        // Add color palette if available
        if (req.body.color_palette) {
          fullPrompt = `${fullPrompt}. Colors: ${JSON.stringify(req.body.color_palette)}`;
        }

        console.log('FAL.ai Full Prompt:', fullPrompt);

        // Use the correct FAL.ai endpoint for FIBO
        const falResponse = await fetch('https://api.fal.ai/queue/bria-fibo/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${falApiKey}`
          },
          body: JSON.stringify({
            prompt: fullPrompt,
            num_images: req.body.num_results || 1,
            enable_safety_checker: false,
            // Pass through any additional FIBO parameters
            ...(req.body.seed && { seed: req.body.seed }),
            ...(req.body.guidance_scale && { guidance_scale: req.body.guidance_scale })
          })
        });

        console.log('FAL.ai Response Status:', falResponse.status);

        if (falResponse.ok) {
          const falData = await falResponse.json();
          console.log('FAL.ai API Success');
          
          // Transform FAL response to match FIBO format
          if (falData.images && falData.images.length > 0) {
            return res.json({
              result: [{
                urls: falData.images.map((img: any) => img.url || img),
                seed: Math.floor(Math.random() * 1000000)
              }]
            });
          }
        } else {
          const errorText = await falResponse.text();
          console.error('FAL.ai Error:', falResponse.status, errorText);
          // Continue to fallback if FAL fails
        }
      } catch (falError) {
        console.error('FAL.ai request failed:', falError instanceof Error ? falError.message : falError);
        // Continue to fallback if FAL fails
      }
    }

    // Fallback to BRIA API (deprecated - has compatibility issues)
    if (fiboApiKey) {
      console.log('Trying BRIA FIBO API (fallback)...');
      const FIBO_API_BASE = "https://engine.prod.bria-api.com/v1";
      
      try {
        const response = await fetch(`${FIBO_API_BASE}/text-to-image/base/2.3`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_token': fiboApiKey
          },
          body: JSON.stringify(req.body)
        });

        console.log('BRIA FIBO API Response Status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('BRIA FIBO API Success');
          return res.json(data);
        } else {
          const errorText = await response.text();
          console.error('BRIA FIBO API Error:', response.status, errorText);
        }
      } catch (briaError) {
        console.error('BRIA API request failed:', briaError instanceof Error ? briaError.message : briaError);
      }
    }

    // If both fail
    return res.status(503).json({ 
      error: 'Image generation service unavailable. Please ensure FAL_API_KEY is set in environment variables. Get one at https://fal.ai'
    });
  } catch (error) {
    console.error('Image generation error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate image' });
  }
});

export default router;
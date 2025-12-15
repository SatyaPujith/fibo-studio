# FIBO Studio - DevPost Submission

## Inspiration

Product photography is expensive, time-consuming, and requires specialized equipment. Small businesses and e-commerce sellers often struggle to create consistent, professional-looking product images across their catalogs. We saw an opportunity to democratize professional product photography by combining 3D visualization with AI-powered image generation.

The rise of AI image generation tools inspired us to think: what if we could give users precise control over their product shots using a virtual 3D studio, then use AI to transform those compositions into photorealistic images? This would eliminate the need for physical studios, expensive equipment, and professional photographers while maintaining creative control.

## What it does

FIBO Studio is a virtual product photography platform that lets users:

- **Build 3D Scenes**: Create and arrange product mockups using primitive shapes or AI-generated compound objects
- **Control Lighting**: Adjust studio lighting with presets (Clean, Dark, Warm, Cool) or fine-tune individual light sources
- **Position Camera**: Use a dedicated studio camera with 360° view presets (Front, Back, Left, Right, Top, Bottom, Hero shots) and precise position controls
- **Generate Images**: Transform 3D compositions into photorealistic product photos using BRIA FIBO's JSON-native image generation API
- **Maintain Consistency**: Lock camera angles, lighting, and backgrounds to generate consistent imagery across entire product catalogs
- **Natural Language Control**: Use the "Studio Director" feature to describe changes in plain English ("make it more dramatic", "add warm sunset lighting")

## How we built it

**Frontend Stack:**
- React + TypeScript for the UI
- Three.js / React Three Fiber for 3D rendering
- Tailwind CSS for styling
- Vite for fast development

**Backend Stack:**
- Node.js + Express for the API server
- MongoDB for user data and project storage
- JWT for authentication

**AI Integration:**
- BRIA FIBO API for photorealistic image generation with JSON-native controls
- Gemini AI for natural language prompt interpretation (Studio Director feature)

**Key Technical Features:**
- Real-time 3D preview with Picture-in-Picture camera view
- JSON-native API integration sending structured scene parameters (camera angle, lighting type, composition) rather than just text prompts
- Undo/redo system for non-destructive editing
- Demo mode for instant testing without signup

## Challenges we ran into

1. **Camera Coordinate Systems**: Getting the 3D camera view to match the generated image required careful coordinate system mapping. We had to negate the X-axis in angle calculations to fix mirroring issues between the preview and generated output.

2. **Real-time Preview Performance**: The Picture-in-Picture camera preview initially went blank during slider adjustments. We solved this by using React refs instead of state for camera position updates, allowing the Three.js render loop to update smoothly without triggering React re-renders.

3. **Consistent Image Generation**: Ensuring AI-generated images matched the exact camera angle, lighting, and composition from the 3D scene required building detailed JSON parameters with precise angle calculations and descriptive prompts.

4. **Demo User Isolation**: Implementing a test mode where users can try the full app without signup, while ensuring their local data never mixes with authenticated users' database records.

## Accomplishments that we're proud of

- **Seamless 3D-to-Photo Pipeline**: Users can position objects in 3D space and get photorealistic renders that match their exact composition
- **JSON-Native FIBO Integration**: We leverage FIBO's structured controls for camera, lighting, and composition rather than relying solely on text prompts
- **Intuitive Camera System**: The 360° camera presets and fine-tune sliders make it easy to capture any angle
- **Production-Ready Architecture**: Full authentication, project management, and cloud deployment
- **Zero-Friction Demo Mode**: Anyone can test the full experience instantly

## What we learned

- **AI Image Generation is Prompt-Sensitive**: Small changes in how you describe camera angles or lighting can dramatically affect output quality
- **3D Coordinate Systems are Tricky**: Different libraries use different conventions (Y-up vs Z-up, left-hand vs right-hand) that need careful handling
- **React + Three.js Performance**: Separating React state from Three.js render loops is crucial for smooth real-time 3D
- **CORS in Production**: Deploying frontend and backend separately requires careful CORS configuration

## What's next for FIBO Studio

1. **3D Model Import**: Support for uploading actual 3D models (GLTF/GLB) instead of just primitives
2. **Background Templates**: Pre-built studio environments (marble table, wooden surface, gradient backdrops)
3. **Batch Generation**: Generate multiple variations with different angles/lighting in one click
4. **Style Transfer**: Apply consistent brand aesthetics across all generated images
5. **API Access**: Let developers integrate FIBO Studio's generation pipeline into their own e-commerce platforms
6. **Mobile App**: Capture real products with phone camera and place them in virtual studio
7. **Collaboration**: Team workspaces for agencies managing multiple brand catalogs

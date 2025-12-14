import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { StudioConfig, StudioObject, StudioCamera } from '../types';
import { Video, Maximize2, Minimize2 } from 'lucide-react';

interface CameraPreviewProps {
  config: StudioConfig;
  objects: StudioObject[];
  studioCamera: StudioCamera;
  onCapture?: (dataUrl: string) => void;
}

// Simplified object renderer for preview
const PreviewObject: React.FC<{ object: StudioObject; platformType: string }> = ({ object, platformType }) => {
  let yOffset = 0;
  if (platformType !== 'none') {
    yOffset = 0.5;
    if (platformType === 'round_table') yOffset = 0.6;
  }

  const position = new THREE.Vector3(...(object.position || [0, 0, 0]));
  position.y += yOffset;
  const rotation = new THREE.Euler(...(object.rotation || [0, 0, 0]));
  const scale = new THREE.Vector3(...(object.scale || [1, 1, 1]));

  // Render compound object
  if (object.type === 'compound' && object.parts && object.parts.length > 0) {
    return (
      <group position={position} rotation={rotation} scale={scale}>
        {object.parts.map((part, index) => {
          let Geometry = <boxGeometry args={[1, 1, 1]} />;
          if (part.shape === 'sphere') Geometry = <sphereGeometry args={[0.5, 32, 32]} />;
          if (part.shape === 'cylinder') Geometry = <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
          if (part.shape === 'cone') Geometry = <coneGeometry args={[0.5, 1, 32]} />;
          if (part.shape === 'torus') Geometry = <torusGeometry args={[0.5, 0.2, 16, 32]} />;

          return (
            <mesh
              key={index}
              position={new THREE.Vector3(...part.position)}
              rotation={new THREE.Euler(...part.rotation)}
              scale={new THREE.Vector3(...part.scale)}
              castShadow
              receiveShadow
            >
              {Geometry}
              <meshStandardMaterial
                color={part.color}
                roughness={part.roughness ?? 0.5}
                metalness={part.metalness ?? 0.5}
              />
            </mesh>
          );
        })}
      </group>
    );
  }

  // Primitive object
  let Geometry = <torusKnotGeometry args={[0.6, 0.2, 100, 16]} />;
  if (object.shape === 'cube') Geometry = <boxGeometry args={[1.2, 1.2, 1.2]} />;
  if (object.shape === 'sphere') Geometry = <sphereGeometry args={[0.8, 32, 32]} />;
  if (object.shape === 'cylinder') Geometry = <cylinderGeometry args={[0.8, 0.8, 1.5, 32]} />;
  if (object.shape === 'torus') Geometry = <torusGeometry args={[0.6, 0.2, 16, 32]} />;

  return (
    <mesh position={position} rotation={rotation} scale={scale} castShadow receiveShadow>
      {Geometry}
      <meshStandardMaterial
        color={object.color}
        roughness={object.roughness ?? 0.5}
        metalness={object.metalness ?? 0.5}
      />
    </mesh>
  );
};

// Camera setup component - sets up camera and keeps it looking at target
const CameraSetup: React.FC<{ 
  position: [number, number, number]; 
  lookAt: [number, number, number];
  fov: number;
  onCapture: (dataUrl: string) => void;
}> = ({ position, lookAt, fov, onCapture }) => {
  const { camera, gl, scene } = useThree();
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set up camera as PerspectiveCamera with correct FOV
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, fov]);
  
  // Update camera position and lookAt every frame to ensure it's always correct
  useFrame(() => {
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
  });
  
  // Capture the scene after camera is set up
  useEffect(() => {
    // Clear any existing timeout
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
    }
    
    // Delay capture to ensure scene is fully rendered with correct camera
    captureTimeoutRef.current = setTimeout(() => {
      // Ensure camera is positioned correctly before capture
      camera.position.set(position[0], position[1], position[2]);
      camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
      camera.updateProjectionMatrix();
      
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/png');
      onCapture(dataUrl);
    }, 150);
    
    return () => {
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, [camera, gl, scene, position, lookAt, onCapture]);

  return null;
};

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  config,
  objects,
  studioCamera,
  onCapture
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const captureRef = useRef<string>('');

  const handleCapture = (dataUrl: string) => {
    captureRef.current = dataUrl;
    if (onCapture) {
      onCapture(dataUrl);
    }
  };

  const previewSize = isExpanded ? 'w-80 h-60' : 'w-48 h-36';

  // Create a unique key based on camera position to force re-render when camera moves
  const canvasKey = `${studioCamera.position.join(',')}-${studioCamera.fov}`;

  return (
    <div className={`absolute bottom-4 right-4 ${previewSize} bg-zinc-900 rounded-lg border-2 border-indigo-500 overflow-hidden shadow-2xl shadow-indigo-500/20 transition-all duration-300 z-20`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between px-2">
        <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
          <Video className="w-3 h-3" />
          <span>Studio Camera</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-white/10 rounded text-white/60 hover:text-white"
        >
          {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>
      </div>

      {/* 3D Preview Canvas */}
      <Canvas
        key={canvasKey}
        shadows
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        style={{ background: config.environment.backgroundColor }}
        camera={{ 
          position: studioCamera.position, 
          fov: studioCamera.fov,
          near: 0.1,
          far: 1000
        }}
      >
        {/* Camera setup - handles position, lookAt, and capture */}
        <CameraSetup 
          position={studioCamera.position}
          lookAt={studioCamera.lookAt}
          fov={studioCamera.fov}
          onCapture={handleCapture}
        />

        <Environment preset="studio" blur={1} background={false} />

        {/* Lights */}
        <ambientLight intensity={config.lighting.ambientIntensity} color={config.lighting.ambientColor} />
        <directionalLight
          position={config.lighting.keyLightPosition}
          intensity={config.lighting.keyLightIntensity}
          color={config.lighting.keyLightColor}
          castShadow
        />
        <pointLight
          position={config.lighting.fillLightPosition}
          intensity={config.lighting.fillLightIntensity}
          color={config.lighting.fillLightColor}
        />

        {/* Objects */}
        {objects.map(obj => (
          <PreviewObject
            key={obj.id}
            object={obj}
            platformType={config.environment.platformType}
          />
        ))}

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial
            color={config.environment.floorColor}
            roughness={config.environment.floorRoughness}
          />
        </mesh>

        <ContactShadows
          position={[0, -1.55, 0]}
          opacity={0.5}
          scale={10}
          blur={1.5}
          far={4.5}
        />
      </Canvas>

      {/* Recording indicator */}
      <div className="absolute bottom-1 left-2 flex items-center gap-1">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-[9px] text-white/60">LIVE</span>
      </div>
    </div>
  );
};

export default CameraPreview;

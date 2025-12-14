import React, { useRef, useImperativeHandle, forwardRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, PerspectiveCamera, Grid, Environment, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { StudioConfig, StudioObject, ObjectPart } from '../types';

interface SceneProps {
  config: StudioConfig;
  objects: StudioObject[];
  activeObjectId: string;
  onObjectSelect: (id: string) => void;
  transformMode?: 'translate' | 'rotate' | 'scale';
  onTransformChange?: (id: string, updates: Partial<StudioObject>) => void;
}

export interface Scene3DRef {
  captureSnapshot: () => string;
  getCameraContext: () => string;
}

const Platform: React.FC<{ config: StudioConfig['environment'] }> = ({ config }) => {
    if (config.platformType === 'none') return null;

    const materialProps = {
        color: config.platformColor,
        roughness: config.platformMaterial === 'matte' ? 0.8 : config.platformMaterial === 'wood' ? 0.6 : 0.1,
        metalness: config.platformMaterial === 'metal' ? 0.8 : 0.1,
    };

    if (config.platformType === 'round_table') {
        return (
            <group position={[0, -0.5, 0]}>
                {/* Table Top */}
                <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[1.8, 1.8, 0.1, 64]} />
                    <meshStandardMaterial {...materialProps} />
                </mesh>
                {/* Table Leg */}
                <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.2, 0.4, 1.5, 32]} />
                    <meshStandardMaterial {...materialProps} />
                </mesh>
                {/* Table Base */}
                <mesh position={[0, -1.0, 0]} castShadow receiveShadow>
                     <cylinderGeometry args={[0.8, 0.8, 0.1, 32]} />
                     <meshStandardMaterial {...materialProps} />
                </mesh>
            </group>
        );
    }

    if (config.platformType === 'cube') {
        return (
            <mesh position={[0, -0.75, 0]} castShadow receiveShadow>
                <boxGeometry args={[2, 1.5, 2]} />
                <meshStandardMaterial {...materialProps} />
            </mesh>
        );
    }
    
    // Default Cylinder/Podium
    return (
        <mesh position={[0, -0.75, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.2, 1.2, 1.5, 64]} />
            <meshStandardMaterial {...materialProps} />
        </mesh>
    );
};

// Component to render individual parts of a compound object
const PartMesh: React.FC<{ part: ObjectPart }> = ({ part }) => {
    const materialProps = {
        color: part.color,
        roughness: part.roughness ?? 0.5,
        metalness: part.metalness ?? 0.5
    };

    let Geometry = <boxGeometry args={[1, 1, 1]} />;
    if (part.shape === 'sphere') Geometry = <sphereGeometry args={[0.5, 32, 32]} />;
    if (part.shape === 'cylinder') Geometry = <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
    if (part.shape === 'cone') Geometry = <coneGeometry args={[0.5, 1, 32]} />;
    if (part.shape === 'torus') Geometry = <torusGeometry args={[0.5, 0.2, 16, 32]} />;

    // Convert arrays to vectors/eulers for R3F
    const position = new THREE.Vector3(...part.position);
    const rotation = new THREE.Euler(...part.rotation);
    const scale = new THREE.Vector3(...part.scale);

    return (
        <mesh position={position} rotation={rotation} scale={scale} castShadow receiveShadow>
            {Geometry}
            <meshStandardMaterial {...materialProps} />
        </mesh>
    );
};

interface CustomObjectProps {
    object: StudioObject;
    platformType: string;
    isSelected: boolean;
    onClick: (e: any) => void;
}

const CustomObject = forwardRef<THREE.Object3D, CustomObjectProps>(({ object, platformType, isSelected, onClick }, ref) => {
  const internalRef = useRef<THREE.Group>(null);
  
  // Merge refs
  useImperativeHandle(ref, () => internalRef.current as THREE.Object3D);

  let yOffset = 0;
  if (platformType !== 'none') {
      yOffset = 0.5; 
      if (platformType === 'round_table') yOffset = 0.6;
  }

  const position = new THREE.Vector3(...(object.position || [0,0,0]));
  position.y += yOffset;
  const rotation = new THREE.Euler(...(object.rotation || [0,0,0]));
  const scale = new THREE.Vector3(...(object.scale || [1,1,1]));

  // Visual highlight for selection
  const emissionProps = isSelected ? { emissive: object.color, emissiveIntensity: 0.2 } : {};

  // Render Compound Object (AI Generated Parts)
  if (object.type === 'compound' && object.parts && object.parts.length > 0) {
      return (
          <group 
            ref={internalRef}
            position={position}
            rotation={rotation}
            scale={scale}
            onClick={onClick}
          >
              {object.parts.map((part, index) => (
                  <PartMesh key={index} part={part} />
              ))}
              {/* Invisible hitbox for easier selection if sparse */}
              <mesh visible={false}>
                  <boxGeometry args={[1,1,1]} />
              </mesh>
          </group>
      )
  }

  // Fallback: Primitive Object
  let Geometry = <torusKnotGeometry args={[0.6, 0.2, 100, 16]} />;
  if (object.shape === 'cube') Geometry = <boxGeometry args={[1.2, 1.2, 1.2]} />;
  if (object.shape === 'sphere') Geometry = <sphereGeometry args={[0.8, 32, 32]} />;
  if (object.shape === 'cylinder') Geometry = <cylinderGeometry args={[0.8, 0.8, 1.5, 32]} />;

  return (
    <mesh 
      ref={internalRef as any} 
      position={position} 
      rotation={rotation} 
      scale={scale}
      castShadow 
      receiveShadow
      onClick={onClick}
    >
      {Geometry}
      <meshStandardMaterial 
        color={object.color} 
        roughness={object.roughness ?? 0.5} 
        metalness={object.metalness ?? 0.5} 
        {...emissionProps}
      />
    </mesh>
  );
});

CustomObject.displayName = 'CustomObject';

const StudioLights: React.FC<{ lighting: StudioConfig['lighting'] }> = ({ lighting }) => {
  // Defensive coding: Ensure positions are defined before spreading
  const keyPos = lighting.keyLightPosition ?? [5, 5, 5];
  const fillPos = lighting.fillLightPosition ?? [-5, 2, 5];
  const rimPos = lighting.rimLightPosition ?? [0, 5, -5];

  return (
    <>
      <ambientLight 
        intensity={lighting.ambientIntensity ?? 0.3} 
        color={lighting.ambientColor || '#ffffff'} 
      />
      <directionalLight
        position={new THREE.Vector3(...keyPos)}
        intensity={lighting.keyLightIntensity ?? 1.0}
        color={lighting.keyLightColor || '#ffffff'}
        castShadow
        shadow-bias={-0.0001}
      />
      <pointLight
        position={new THREE.Vector3(...fillPos)}
        intensity={lighting.fillLightIntensity ?? 0.5}
        color={lighting.fillLightColor || '#e0e0e0'}
      />
      <spotLight
        position={new THREE.Vector3(...rimPos)}
        intensity={lighting.rimLightIntensity ?? 0.2}
        color={lighting.rimLightColor || '#ffffff'}
        angle={0.5}
        penumbra={1}
      />
    </>
  );
};

const SceneHandler = forwardRef((props, ref) => {
  const { gl, scene, camera } = useThree();
  useImperativeHandle(ref, () => ({
    capture: () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    },
    getCameraContext: () => {
      const pos = camera.position;
      const r = pos.length();
      
      // Calculate precise angles in degrees
      const theta = Math.atan2(pos.x, pos.z); // Horizontal angle (azimuth)
      const phi = Math.acos(pos.y / r); // Vertical angle (elevation)
      
      const horizontalDeg = Math.round(theta * 180 / Math.PI);
      const verticalDeg = Math.round(phi * 180 / Math.PI);
      const distance = Math.round(r * 10) / 10;

      // Precise vertical angle description
      let verticalDesc = "eye-level (90 degrees)";
      if (verticalDeg < 30) verticalDesc = `top-down view (${verticalDeg} degrees from above)`;
      else if (verticalDeg < 60) verticalDesc = `high angle (${verticalDeg} degrees elevation)`;
      else if (verticalDeg > 120) verticalDesc = `low angle (${180 - verticalDeg} degrees from below)`;
      else verticalDesc = `eye-level (${verticalDeg} degrees)`;

      // Precise horizontal angle description
      let horizontalDesc = "front view (0 degrees)";
      const absHDeg = Math.abs(horizontalDeg);
      if (absHDeg < 15) horizontalDesc = "front view (0 degrees)";
      else if (absHDeg > 165) horizontalDesc = "back view (180 degrees)";
      else if (absHDeg >= 75 && absHDeg <= 105) {
        horizontalDesc = horizontalDeg > 0 
          ? `left side view (${horizontalDeg} degrees)` 
          : `right side view (${Math.abs(horizontalDeg)} degrees)`;
      } else if (horizontalDeg > 0) {
        horizontalDesc = `front-left view (${horizontalDeg} degrees from front)`;
      } else {
        horizontalDesc = `front-right view (${Math.abs(horizontalDeg)} degrees from front)`;
      }

      return JSON.stringify({
        horizontal: horizontalDesc,
        vertical: verticalDesc,
        distance: distance,
        horizontalDeg: horizontalDeg,
        verticalDeg: verticalDeg,
        position: { x: Math.round(pos.x * 10) / 10, y: Math.round(pos.y * 10) / 10, z: Math.round(pos.z * 10) / 10 }
      });
    }
  }));
  return null;
});

export const Scene3D = forwardRef<Scene3DRef, SceneProps>(({ config, objects, activeObjectId, onObjectSelect, transformMode, onTransformChange }, ref) => {
  const sceneHandlerRef = useRef<{ capture: () => string; getCameraContext: () => string }>(null);
  const orbitControlsRef = useRef<any>(null);
  const objectRefs = useRef<Record<string, THREE.Object3D>>({});

  useImperativeHandle(ref, () => ({
    captureSnapshot: () => {
      if (sceneHandlerRef.current) {
        return sceneHandlerRef.current.capture();
      }
      return '';
    },
    getCameraContext: () => {
        if (sceneHandlerRef.current) {
            return sceneHandlerRef.current.getCameraContext();
        }
        return 'Front View';
    }
  }));

  const activeObject = objects.find(o => o.id === activeObjectId);
  
  // Cleanup refs for removed objects
  useEffect(() => {
     const ids = new Set(objects.map(o => o.id));
     Object.keys(objectRefs.current).forEach(key => {
         if (!ids.has(key)) {
             delete objectRefs.current[key];
         }
     });
  }, [objects]);

  const handleTransformEnd = () => {
    if (activeObject && objectRefs.current[activeObjectId] && onTransformChange) {
        const obj = objectRefs.current[activeObjectId];
        let yOffset = 0;
        if (config.environment.platformType !== 'none') {
            yOffset = 0.5;
            if (config.environment.platformType === 'round_table') yOffset = 0.6;
        }

        const newPos = [obj.position.x, obj.position.y - yOffset, obj.position.z] as [number, number, number];
        const newRot = [obj.rotation.x, obj.rotation.y, obj.rotation.z] as [number, number, number];
        const newScale = [obj.scale.x, obj.scale.y, obj.scale.z] as [number, number, number];

        onTransformChange(activeObjectId, {
            position: newPos,
            rotation: newRot,
            scale: newScale
        });
    }
  };

  return (
    <div className="w-full h-full bg-black relative overflow-hidden rounded-lg border border-zinc-800">
      <div 
        className="absolute inset-0 z-0 transition-colors duration-700 ease-in-out"
        style={{ backgroundColor: config.environment.backgroundColor }}
      />
      
      <Canvas shadows dpr={[1, 2]} className="z-10 relative" gl={{ preserveDrawingBuffer: true }}>
        <SceneHandler ref={sceneHandlerRef} />
        <PerspectiveCamera makeDefault position={[0, 2, 6]} fov={50} />
        <OrbitControls 
            ref={orbitControlsRef}
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2} 
            enablePan={true}
            makeDefault
        />

        <Environment preset="studio" blur={1} background={false} />
        <StudioLights lighting={config.lighting} />
        <Platform config={config.environment} />

        {objects.map(obj => (
            <CustomObject 
                key={obj.id}
                ref={(el) => { if (el) objectRefs.current[obj.id] = el }}
                object={obj} 
                platformType={config.environment.platformType}
                isSelected={obj.id === activeObjectId}
                onClick={(e) => {
                    e.stopPropagation();
                    onObjectSelect(obj.id);
                }}
            />
        ))}
        
        {transformMode && activeObject && objectRefs.current[activeObjectId] && (
            <TransformControls 
                object={objectRefs.current[activeObjectId]} 
                mode={transformMode} 
                onMouseDown={() => { 
                    if(orbitControlsRef.current) orbitControlsRef.current.enabled = false; 
                }}
                onMouseUp={() => { 
                    if(orbitControlsRef.current) orbitControlsRef.current.enabled = true; 
                    handleTransformEnd(); 
                }}
                space="local"
                size={0.8}
            />
        )}

        <ContactShadows 
          position={[0, -1.55, 0]} 
          opacity={0.5} 
          scale={10} 
          blur={1.5} 
          far={4.5} 
          color="#000000"
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial 
            color={config.environment.floorColor} 
            roughness={config.environment.floorRoughness}
            metalness={0.1}
          />
        </mesh>
        
        <Grid position={[0,-1.59,0]} args={[10.5, 10.5]} cellColor="#666" sectionColor="#888" fadeDistance={10} sectionThickness={1} cellThickness={0.5} infiniteGrid />
      </Canvas>
    </div>
  );
});

Scene3D.displayName = 'Scene3D';
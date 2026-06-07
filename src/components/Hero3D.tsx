import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, MeshTransmissionMaterial, ContactShadows, Icosahedron, Torus, Sphere, PresentationControls } from '@react-three/drei';
import * as THREE from 'three';

const AbstractSculpture = () => {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const icosahedronRef = useRef<THREE.Mesh>(null);
  
  // Mouse responsive rotation & subtle morphing
  useFrame((state) => {
    if (!groupRef.current || !icosahedronRef.current) return;
    const t = state.clock.getElapsedTime();
    
    // Continuous slow rotation
    groupRef.current.rotation.y = t * 0.15;
    groupRef.current.rotation.x = t * 0.1;
    
    // Smooth mouse parallax is handled by PresentationControls now, 
    // but we can add subtle breathing animation on the glass crystal
    const scale = 1 + Math.sin(t * 2) * 0.02;
    icosahedronRef.current.scale.set(scale, scale, scale);
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
        
        {/* Core: Dense Metallic Sphere */}
        <Sphere ref={sphereRef} args={[0.9, 64, 64]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#00f2fe" metalness={1} roughness={0.15} />
        </Sphere>
        
        {/* Crystal Layer: Premium Glassmorphism */}
        <Icosahedron ref={icosahedronRef} args={[1.5, 0]}>
          <MeshTransmissionMaterial 
            backside
            samples={6}
            thickness={1.5}
            chromaticAberration={0.8}
            anisotropy={0.3}
            distortion={0.5}
            distortionScale={0.5}
            temporalDistortion={0.1}
            ior={1.2}
            color="#ffffff"
            transmission={1}
            roughness={0.05}
          />
        </Icosahedron>

        {/* Orbiting Accent Rings */}
        <Torus args={[2.4, 0.02, 32, 100]} rotation={[Math.PI/4, Math.PI/4, 0]}>
          <meshStandardMaterial color="#a855f7" metalness={1} roughness={0.1} emissive="#a855f7" emissiveIntensity={0.8} />
        </Torus>
        <Torus args={[2.6, 0.01, 32, 100]} rotation={[-Math.PI/4, Math.PI/3, Math.PI/6]}>
          <meshStandardMaterial color="#00f2fe" metalness={1} roughness={0.1} emissive="#00f2fe" emissiveIntensity={0.5} />
        </Torus>
        
      </Float>
    </group>
  );
};

export const Hero3D = () => {
  return (
    <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
      <div className="w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [0, 0, 7], fov: 40 }} gl={{ antialias: true, alpha: true }}>
          {/* Ambient & Cinematic Lighting */}
          <ambientLight intensity={0.2} />
          <directionalLight position={[10, 10, 10]} intensity={1.5} color="#00f2fe" />
          <directionalLight position={[-10, -10, -10]} intensity={1} color="#a855f7" />
          <pointLight position={[0, 5, 5]} intensity={2} color="#ffffff" />
          
          <PresentationControls 
            global={false} // Only reacts when dragging the actual component area
            cursor={true}
            snap={true} // Springs back to origin when released
            speed={2} // Rotation speed
            polar={[-Math.PI / 3, Math.PI / 3]} // Vertical limits
            azimuth={[-Math.PI / 2, Math.PI / 2]} // Horizontal limits
          >
            <AbstractSculpture />
          </PresentationControls>
          
          {/* Environment Reflection */}
          <Environment preset="city" />
          
          {/* Soft Ground Shadow */}
          <ContactShadows position={[0, -2.8, 0]} opacity={0.6} scale={15} blur={2.5} far={4} color="#000000" />
        </Canvas>
      </div>
    </div>
  );
};

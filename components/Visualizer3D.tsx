
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Center, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Point2D, ExcavationParams } from '../types';

interface Props {
  params: ExcavationParams;
  points: Point2D[];
}

const ExcavationMesh: React.FC<Props> = ({ params, points }) => {
  const { length: L, slopeRatio: s, width: W } = params;

  const geometry = useMemo(() => {
    // We construct a 3D prism based on the profile
    // profile = [LeftBottom, ...GroundPoints, RightBottom]
    const profile = [
      { x: -W / 2, y: 0 },
      ...points,
      { x: W / 2, y: 0 }
    ];

    const vertices: number[] = [];
    const indices: number[] = [];
    const n = profile.length;
    
    // BACK PROFILE (z = -L/2, with slope expansion)
    for (let i = 0; i < n; i++) {
      const p = profile[i];
      const zOffset = L / 2 + s * p.y;
      vertices.push(p.x, p.y, -zOffset);
    }
    
    // FRONT PROFILE (z = L/2, with slope expansion)
    for (let i = 0; i < n; i++) {
      const p = profile[i];
      const zOffset = L / 2 + s * p.y;
      vertices.push(p.x, p.y, zOffset);
    }

    // 1. SIDE FACES (Connecting back and front profiles)
    for (let i = 0; i < n - 1; i++) {
      const b1 = i;
      const b2 = i + 1;
      const f1 = n + i;
      const f2 = n + i + 1;
      
      // Face 1
      indices.push(b1, f2, f1);
      // Face 2
      indices.push(b1, b2, f2);
    }

    // 2. BACK CAP (z = -zOffset)
    // Using a triangle fan starting from the bottom-left corner
    for (let i = 1; i < n - 1; i++) {
      indices.push(0, i, i + 1);
    }

    // 3. FRONT CAP (z = zOffset)
    for (let i = 1; i < n - 1; i++) {
      indices.push(n, n + i + 1, n + i);
    }

    // 4. BOTTOM FACE (Closing the shape at y=0)
    const bl = 0;
    const br = n - 1;
    const fl = n;
    const fr = 2 * n - 1;
    indices.push(bl, fl, fr);
    indices.push(bl, fr, br);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [points, params]);

  return (
    <group>
      {/* Soil Volume */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#765c48" 
          roughness={0.85} 
          metalness={0.05} 
          side={THREE.DoubleSide} 
          flatShading={false}
        />
      </mesh>
      
      {/* Wireframe overlay for structural definition */}
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#2d1a0f" wireframe transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Excavation Bottom (Ultra thin surface look) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0005, 0]} receiveShadow>
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Super thin Bottom representation (slab edge look) */}
      <mesh position={[0, -0.0005, 0]}>
        <boxGeometry args={[W, 0.001, L]} />
        <meshStandardMaterial color="#64748b" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const Visualizer3D: React.FC<Props> = ({ params, points }) => {
  return (
    <div className="w-full h-[600px] bg-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 relative group">
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
        <span className="bg-white/95 backdrop-blur px-4 py-2 rounded-2xl text-[10px] font-black text-slate-700 shadow-xl border border-slate-200 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          3D EXCAVATION VOLUME MODEL
        </span>
      </div>

      <div className="absolute bottom-6 right-6 z-10">
        <div className="bg-slate-900/10 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-white/20 select-none">
          Rotate: Drag • Pan: Right Click • Zoom: Scroll
        </div>
      </div>
      
      <Canvas shadows camera={{ position: [15, 12, 15], fov: 42 }}>
        <OrbitControls 
          makeDefault 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 1.75} 
          enableDamping 
          dampingFactor={0.05}
        />
        
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 25, 15]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-15, 5, -15]} intensity={0.4} color="#e0f2fe" />
        
        <Center top>
          <ExcavationMesh params={params} points={points} />
        </Center>

        <Grid
          infiniteGrid
          cellSize={1}
          cellThickness={1}
          sectionSize={5}
          sectionThickness={1.5}
          sectionColor="#cbd5e1"
          fadeDistance={60}
          position={[0, -0.05, 0]}
        />
        
        <ContactShadows 
          opacity={0.5} 
          scale={40} 
          blur={3} 
          far={15} 
          resolution={1024} 
          color="#1e293b"
        />
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export default Visualizer3D;

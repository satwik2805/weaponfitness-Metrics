import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';
import { Asset } from 'expo-asset';
import Text from '../ui/Text';
import { GROUP_BY_KEY } from './muscles';

const modelAsset = Asset.fromModule(require('../../assets/human_body.glb')).uri;

function BodyMesh() {
  const { scene } = useGLTF(modelAsset);

  // Apply a sleek translucent metallic/glass material to the realistic human mesh
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = new THREE.MeshPhysicalMaterial({
          color: '#1a1a24',
          roughness: 0.35,
          metalness: 0.25,
          transparent: true,
          opacity: 0.70,
          transmission: 0.1,
          thickness: 0.2,
          side: THREE.DoubleSide
        });
      }
    });
  }, [scene]);

  return <primitive object={scene} scale={0.9} position={[0, -0.15, 0]} />;
}

function Hitbox({
  name,
  slug,
  shape,
  args,
  position,
  rotation,
  scale,
  selectedGroup,
  onSelectGroup,
  onHover
}) {
  const meshRef = useRef();
  const [isHovered, setIsHovered] = useState(false);
  const isSelected = selectedGroup === slug;

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setIsHovered(true);
    if (slug) onHover(slug);
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setIsHovered(false);
    onHover(null);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (slug && onSelectGroup) {
      onSelectGroup(slug);
    }
  };

  // Subtle interactive indicator glow properties
  let color = '#20202a';
  let emissive = '#000000';
  let emissiveIntensity = 0;
  let opacity = 0.05; // Faint silhouette overlay so the user knows it's a hot-spot

  if (isSelected) {
    color = '#2B7FE8';
    emissive = '#2B7FE8';
    emissiveIntensity = 2.0;
    opacity = 0.85;
  } else if (isHovered) {
    color = '#2B7FE8';
    emissive = '#2B7FE8';
    emissiveIntensity = 0.85;
    opacity = 0.45;
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {shape === 'sphere' && <sphereGeometry args={args || [1, 16, 16]} />}
      {shape === 'cylinder' && <cylinderGeometry args={args || [1, 1, 1, 16]} />}
      {shape === 'box' && <boxGeometry args={args || [1, 1, 1]} />}
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.1}
        metalness={0.85}
      />
    </mesh>
  );
}

export default function Mannequin3D({ selectedGroup, onSelectGroup }) {
  const { colors } = useTheme();
  const [hoveredSlug, setHoveredSlug] = useState(null);

  const activeLabel = hoveredSlug
    ? GROUP_BY_KEY[hoveredSlug]?.label
    : selectedGroup
    ? GROUP_BY_KEY[selectedGroup]?.label
    : 'Drag to rotate • Click a muscle';

  // Hitbox coordinates aligned with the Michelle model skeleton (scale 0.9, centered)
  const hitboxes = [
    // Head / Neck
    { name: 'Head', slug: 'neck', shape: 'sphere', args: [0.11, 16, 16], position: [0, 0.72, 0] },
    { name: 'Neck', slug: 'neck', shape: 'cylinder', args: [0.045, 0.045, 0.1, 16], position: [0, 0.58, 0] },
    
    // Shoulders
    { name: 'L Shoulder', slug: 'shoulders', shape: 'sphere', args: [0.06, 16, 16], position: [-0.20, 0.48, 0] },
    { name: 'R Shoulder', slug: 'shoulders', shape: 'sphere', args: [0.06, 16, 16], position: [0.20, 0.48, 0] },

    // Torso
    { name: 'Chest', slug: 'chest', shape: 'box', args: [0.26, 0.16, 0.10], position: [0, 0.40, 0.05] },
    { name: 'Upper Back', slug: 'back', shape: 'box', args: [0.26, 0.16, 0.10], position: [0, 0.40, -0.05] },
    { name: 'Abs / Core', slug: 'core', shape: 'box', args: [0.18, 0.16, 0.10], position: [0, 0.22, 0.05] },
    { name: 'Lower Back', slug: 'back', shape: 'box', args: [0.18, 0.16, 0.10], position: [0, 0.22, -0.05] },
    { name: 'Hips / Adductors', slug: 'adductors', shape: 'box', args: [0.20, 0.12, 0.10], position: [0, 0.06, 0.02] },
    { name: 'Glutes', slug: 'glutes', shape: 'box', args: [0.22, 0.12, 0.10], position: [0, 0.06, -0.06] },

    // Arms
    { name: 'L Upper Arm Front', slug: 'biceps', shape: 'cylinder', args: [0.035, 0.035, 0.20, 16], position: [-0.26, 0.32, 0.02] },
    { name: 'R Upper Arm Front', slug: 'biceps', shape: 'cylinder', args: [0.035, 0.035, 0.20, 16], position: [0.26, 0.32, 0.02] },
    { name: 'L Upper Arm Back', slug: 'triceps', shape: 'cylinder', args: [0.035, 0.035, 0.20, 16], position: [-0.26, 0.32, -0.02] },
    { name: 'R Upper Arm Back', slug: 'triceps', shape: 'cylinder', args: [0.035, 0.035, 0.20, 16], position: [0.26, 0.32, -0.02] },
    { name: 'L Forearm', slug: 'forearms', shape: 'cylinder', args: [0.03, 0.03, 0.20, 16], position: [-0.28, 0.12, 0] },
    { name: 'R Forearm', slug: 'forearms', shape: 'cylinder', args: [0.03, 0.03, 0.20, 16], position: [0.28, 0.12, 0] },
    { name: 'L Hand', slug: 'hands', shape: 'box', args: [0.04, 0.06, 0.02], position: [-0.29, -0.02, 0] },
    { name: 'R Hand', slug: 'hands', shape: 'box', args: [0.04, 0.06, 0.02], position: [0.29, -0.02, 0] },

    // Legs
    { name: 'L Thigh Front', slug: 'quads', shape: 'cylinder', args: [0.065, 0.055, 0.30, 16], position: [-0.09, -0.16, 0.02] },
    { name: 'R Thigh Front', slug: 'quads', shape: 'cylinder', args: [0.065, 0.055, 0.30, 16], position: [0.09, -0.16, 0.02] },
    { name: 'L Thigh Back', slug: 'hamstrings', shape: 'cylinder', args: [0.065, 0.055, 0.30, 16], position: [-0.09, -0.16, -0.02] },
    { name: 'R Thigh Back', slug: 'hamstrings', shape: 'cylinder', args: [0.065, 0.055, 0.30, 16], position: [0.09, -0.16, -0.02] },
    
    // Joints (Knees)
    { name: 'L Knee', slug: 'knees', shape: 'sphere', args: [0.055, 16, 16], position: [-0.09, -0.32, 0.01] },
    { name: 'R Knee', slug: 'knees', shape: 'sphere', args: [0.055, 16, 16], position: [0.09, -0.32, 0.01] },

    { name: 'L Calf', slug: 'calves', shape: 'cylinder', args: [0.05, 0.04, 0.30, 16], position: [-0.09, -0.48, -0.02] },
    { name: 'R Calf', slug: 'calves', shape: 'cylinder', args: [0.05, 0.04, 0.30, 16], position: [0.09, -0.48, -0.02] },
    { name: 'L Tibialis', slug: 'tibialis', shape: 'cylinder', args: [0.04, 0.03, 0.30, 16], position: [-0.09, -0.48, 0.02] },
    { name: 'R Tibialis', slug: 'tibialis', shape: 'cylinder', args: [0.04, 0.03, 0.30, 16], position: [0.09, -0.48, 0.02] },
    
    // Joints (Ankles)
    { name: 'L Ankle', slug: 'ankles', shape: 'sphere', args: [0.045, 16, 16], position: [-0.09, -0.61, 0.01] },
    { name: 'R Ankle', slug: 'ankles', shape: 'sphere', args: [0.045, 16, 16], position: [0.09, -0.61, 0.01] },

    { name: 'L Foot', slug: 'feet', shape: 'box', args: [0.05, 0.04, 0.12], position: [-0.09, -0.66, 0.04] },
    { name: 'R Foot', slug: 'feet', shape: 'box', args: [0.05, 0.04, 0.12], position: [0.09, -0.66, 0.04] },
  ];

  return (
    <View style={styles.container}>
      {/* Interactive Muscle/Status Badge */}
      <View style={[styles.badge, { backgroundColor: colors.surfaceLvl2 || '#1e1e24' }]}>
        <Text variant="labelSm" color={hoveredSlug ? 'accentBright' : 'textMuted'}>
          {activeLabel}
        </Text>
      </View>

      <Suspense fallback={<ActivityIndicator color={colors.accent} style={styles.loader} />}>
        <Canvas camera={{ position: [0, 0.1, 2.2], fov: 50 }} style={styles.canvas}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[3, 5, 4]} intensity={2.0} />
          <directionalLight position={[-3, 2, -4]} intensity={1.0} />

          <group position={[0, -0.05, 0]}>
            <BodyMesh />
            
            {hitboxes.map((h, idx) => (
              <Hitbox
                key={idx}
                {...h}
                selectedGroup={selectedGroup}
                onSelectGroup={onSelectGroup}
                onHover={setHoveredSlug}
              />
            ))}
          </group>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 2.5}
            maxPolarAngle={Math.PI / 1.6}
            autoRotate={!selectedGroup && !hoveredSlug}
            autoRotateSpeed={1.2}
            makeDefault
          />
        </Canvas>
      </Suspense>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 380,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
  loader: {
    marginTop: 40,
  },
});

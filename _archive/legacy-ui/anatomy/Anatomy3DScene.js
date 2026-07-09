import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// --- REFLECTION / GLASS MATERIAL ---
const GlassMaterial = ({ color, isSelected, isHovered }) => (
    <meshPhysicalMaterial
        color={isSelected ? color : (isHovered ? '#666' : '#333')}
        emissive={isSelected ? color : '#000'}
        emissiveIntensity={isSelected ? 0.6 : 0.1}
        roughness={0.2}
        metalness={0.9}
        reflectivity={1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        transparent
        opacity={isSelected ? 0.9 : 0.7}
        transmission={0.1}
    />
);

const MusclePart = ({ name, position, rotation, scale, shape = 'box', args, color, selectedMuscle, onSelect }) => {
    const isSelected = selectedMuscle === name;
    const [hovered, setHover] = useState(false);
    const meshRef = useRef();

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.getElapsedTime();

        // Gentle float/pulse
        if (isSelected) {
            meshRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.03);
            meshRef.current.material.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.2;
        } else {
            meshRef.current.scale.setScalar(hovered ? 1.05 : 1);
        }
    });

    const handlePointerOver = (e) => {
        e.stopPropagation();
        setHover(true);
        if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
    };
    const handlePointerOut = (e) => {
        e.stopPropagation();
        setHover(false);
        if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
    };
    const handleClick = (e) => {
        e.stopPropagation();
        onSelect(name);
    };

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <mesh
                ref={meshRef}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onClick={handleClick}
                castShadow
                receiveShadow
            >
                {shape === 'box' && <RoundedBox args={args || [1, 1, 1]} radius={0.1} smoothness={4} ><GlassMaterial color={color} isSelected={isSelected} isHovered={hovered} /></RoundedBox>}
                {shape === 'sphere' && <sphereGeometry args={args || [1, 32, 32]} ><GlassMaterial color={color} isSelected={isSelected} isHovered={hovered} /></sphereGeometry>}
                {shape === 'cylinder' && <cylinderGeometry args={args || [1, 1, 2, 32]} ><GlassMaterial color={color} isSelected={isSelected} isHovered={hovered} /></cylinderGeometry>}
            </mesh>
        </group>
    );
};

const CameraController = ({ cameraAngle, controlsRef }) => {
    const { camera } = useThree();
    useEffect(() => {
        if (!camera || !controlsRef.current) return;

        const targetPos = new THREE.Vector3();
        if (cameraAngle === 'side') targetPos.set(6, 1, 0);
        else if (cameraAngle === 'back') targetPos.set(0, 1, -6);
        else targetPos.set(0, 1, 7); // Front

        // We could tween here, but for now simple set
        camera.position.lerp(targetPos, 0.1);
        controlsRef.current.update();

    }, [cameraAngle, camera, controlsRef]);

    // Smooth lerp in frame loop
    useFrame(() => {
        const targetPos = new THREE.Vector3();
        if (cameraAngle === 'side') targetPos.set(6, 1, 0);
        else if (cameraAngle === 'back') targetPos.set(0, 1, -7);
        else targetPos.set(0, 1, 7);

        camera.position.lerp(targetPos, 0.05);
        camera.lookAt(0, 0, 0);
    });

    return null;
};

const CyberMannequin = ({ onSelectMuscle, selectedMuscle, colors }) => {
    return (
        <group position={[0, -2.5, 0]}>
            {/* HEAD & NECK */}
            <MusclePart name="shoulders" shape="cylinder" args={[0.3, 0.4, 0.6, 16]} position={[0, 5.3, 0]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            <MusclePart name="shoulders" shape="sphere" args={[0.65, 32, 32]} position={[0, 6.0, 0]} scale={[0.9, 1.1, 0.9]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />

            {/* TORSO */}
            {/* Chest */}
            <MusclePart name="chest" shape="box" args={[1.6, 1.4, 0.8]} position={[0, 4.4, 0.1]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            {/* Abs */}
            <MusclePart name="abs" shape="box" args={[1.2, 1.6, 0.7]} position={[0, 2.9, 0]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            {/* Back (Hitbox for rear view) */}
            <MusclePart name="back" shape="box" args={[1.5, 2.2, 0.5]} position={[0, 4.0, -0.4]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />

            {/* SHOULDERS */}
            <MusclePart name="shoulders" shape="sphere" args={[0.6]} position={[-1.1, 4.8, 0]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            <MusclePart name="shoulders" shape="sphere" args={[0.6]} position={[1.1, 4.8, 0]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />

            {/* ARMS */}
            {/* Biceps/Triceps */}
            <MusclePart name="biceps" shape="cylinder" args={[0.25, 0.22, 1.4]} position={[-1.2, 3.8, 0.1]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            <MusclePart name="biceps" shape="cylinder" args={[0.25, 0.22, 1.4]} position={[1.2, 3.8, 0.1]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            <MusclePart name="triceps" shape="box" args={[0.4, 1.0, 0.3]} position={[-1.2, 3.8, -0.2]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            <MusclePart name="triceps" shape="box" args={[0.4, 1.0, 0.3]} position={[1.2, 3.8, -0.2]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />

            {/* Forearms */}
            <MusclePart name="biceps" shape="cylinder" args={[0.2, 0.18, 1.5]} position={[-1.4, 2.3, 0.1]} rotation={[0, 0, 0.1]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            <MusclePart name="biceps" shape="cylinder" args={[0.2, 0.18, 1.5]} position={[1.4, 2.3, 0.1]} rotation={[0, 0, -0.1]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />


            {/* HIPS & LEGS */}
            <MusclePart name="glutes" shape="box" args={[1.4, 1.0, 0.9]} position={[0, 1.6, -0.1]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />

            {/* Thighs */}
            <MusclePart name="quads" shape="cylinder" args={[0.35, 0.25, 2.2]} position={[-0.4, 0.3, 0.2]} rotation={[0, 0, 0.05]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            <MusclePart name="quads" shape="cylinder" args={[0.35, 0.25, 2.2]} position={[0.4, 0.3, 0.2]} rotation={[0, 0, -0.05]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            <MusclePart name="hamstrings" shape="cylinder" args={[0.35, 0.25, 2.2]} position={[-0.4, 0.3, -0.2]} rotation={[0, 0, 0.05]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            <MusclePart name="hamstrings" shape="cylinder" args={[0.35, 0.25, 2.2]} position={[0.4, 0.3, -0.2]} rotation={[0, 0, -0.05]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />

            {/* Calves */}
            <MusclePart name="calves" shape="cylinder" args={[0.22, 0.15, 2.0]} position={[-0.5, -1.9, -0.1]} rotation={[0, 0, 0.05]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
            <MusclePart name="calves" shape="cylinder" args={[0.22, 0.15, 2.0]} position={[0.5, -1.9, -0.1]} rotation={[0, 0, -0.05]} selectedMuscle={selectedMuscle} onSelect={onSelectMuscle} color={colors.accent} />
        </group>
    );
};

export default function Anatomy3DScene({ selectedMuscle, onSelectMuscle, cameraAngle, colors }) {
    const controlsRef = useRef();

    return (
        <Canvas
            shadows
            style={{ flex: 1 }}
            gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
            camera={{ position: [0, 1, 7], fov: 45 }}
        >
            <PerspectiveCamera makeDefault position={[0, 1, 7]} fov={45} />
            <CameraController cameraAngle={cameraAngle} controlsRef={controlsRef} />

            <color attach="background" args={['#050505']} />
            <fog attach="fog" args={['#050505', 4, 20]} />

            <ambientLight intensity={0.4} />
            <spotLight position={[5, 10, 5]} angle={0.3} penumbra={1} intensity={3} castShadow color="#ffffff" />
            <spotLight position={[-5, 8, -5]} angle={0.4} penumbra={1} intensity={4} color={colors.accent} />

            <CyberMannequin
                onSelectMuscle={onSelectMuscle}
                selectedMuscle={selectedMuscle}
                colors={colors}
            />

            <gridHelper args={[20, 20, '#333', '#111']} position={[0, -4.5, 0]} />
            <ContactShadows position={[0, -4.5, 0]} opacity={0.6} scale={15} blur={2.5} far={4} color={colors.accent} />

            <OrbitControls
                ref={controlsRef}
                enablePan={false}
                enableZoom={true}
                minDistance={4}
                maxDistance={12}
                maxPolarAngle={Math.PI / 1.8}
                autoRotate={!selectedMuscle}
                autoRotateSpeed={0.5}
            />
        </Canvas>
    );
}

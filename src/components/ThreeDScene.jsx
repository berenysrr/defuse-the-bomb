import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox } from '@react-three/drei';
import { useGame } from '../context/GameContext';
import * as THREE from 'three';

// 3D Masa & Sandalyeler Komponenti
function Desk({ totalPlayers }) {
  return (
    <group position={[0, -1.2, 0]}>
      {/* 3D Yuvarlak/Oval Masa */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[3.2, 3.2, 0.3, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Masa Kenar Neon Çemberi */}
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.1, 3.2, 32]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>

      {/* 3D Sandalyeler (Oyuncu Sayısına Göre Dizilmiş) */}
      {Array.from({ length: totalPlayers }).map((_, idx) => {
        const angle = (idx * (360 / totalPlayers)) * (Math.PI / 180);
        const radius = 4.2;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);

        return (
          <group key={idx} position={[x, -0.2, z]} rotation={[0, -angle + Math.PI / 2, 0]}>
            {/* Sandalya Oturak */}
            <mesh castShadow>
              <boxGeometry args={[0.9, 0.1, 0.9]} />
              <meshStandardMaterial color="#0f172a" metalness={0.7} />
            </mesh>
            {/* Sandalya Arkalık */}
            <mesh position={[0, 0.5, -0.4]} castShadow>
              <boxGeometry args={[0.9, 0.9, 0.1]} />
              <meshStandardMaterial color="#334155" metalness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// 3D Kayarak İlerleyen Bomba Komponenti
function BombModel() {
  const { timeLeft, wires, players, turnIndex } = useGame();
  const bombRef = useRef();
  const currentTurnPlayer = players[turnIndex];
  const totalPlayers = players.length;

  // Sıradaki Oyuncunun Masadaki 3D Hedef Konumu
  const angle = (turnIndex * (360 / totalPlayers)) * (Math.PI / 180);
  const targetRadius = 1.8;
  const targetX = targetRadius * Math.cos(angle);
  const targetZ = targetRadius * Math.sin(angle);

  // 3D Bombanın Yumuşakça Oyuncuya Kayması (Lerp Animation)
  useFrame((state, delta) => {
    if (bombRef.current) {
      const t = state.clock.getElapsedTime();
      
      // Yumuşak Hareket (Smooth Glide to Player)
      bombRef.current.position.x = THREE.MathUtils.lerp(bombRef.current.position.x, targetX, delta * 4);
      bombRef.current.position.z = THREE.MathUtils.lerp(bombRef.current.position.z, targetZ, delta * 4);
      
      // Yükseklik & Sallanma
      if (timeLeft <= 3) {
        bombRef.current.position.y = 0.2 + Math.sin(t * 22) * 0.06;
      } else {
        bombRef.current.position.y = 0.2 + Math.sin(t * 2.5) * 0.03;
      }
    }
  });

  return (
    <group ref={bombRef} position={[0, 0.2, 0]}>
      {/* 3D Askeri Çanta Kasası */}
      <RoundedBox args={[2.2, 1.1, 1.5]} radius={0.08} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </RoundedBox>

      {/* 3D Metalik İç Panel */}
      <mesh position={[0, 0.56, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 1.3]} />
        <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* 3D LED Geri Sayım Ekranı */}
      <mesh position={[-0.5, 0.57, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 0.45]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      <Text
        position={[-0.5, 0.58, -0.3]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.28}
        color={timeLeft <= 3 ? '#ff0055' : '#ef4444'}
        font="https://fonts.gstatic.com/s/sharetechmono/v15/J4dfBXyYr2ZedsMD14YvOM0.woff"
      >
        {`00:${timeLeft.toString().padStart(2, '0')}`}
      </Text>

      {/* 3D Renkli Kablolar */}
      {wires.map((wire, idx) => {
        const xPos = 0.2 + idx * 0.18;
        return (
          <group key={wire.id} position={[xPos, 0.58, -0.15]}>
            {!wire.isCut ? (
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.03, 0.03, 0.6, 16]} />
                <meshStandardMaterial color={wire.color} roughness={0.2} metalness={0.6} />
              </mesh>
            ) : (
              <>
                <mesh position={[-0.15, 0, 0]} rotation={[0, 0, Math.PI / 3]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.25, 16]} />
                  <meshStandardMaterial color={wire.color} />
                </mesh>
                <mesh position={[0.15, 0, 0]} rotation={[0, 0, -Math.PI / 3]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.25, 16]} />
                  <meshStandardMaterial color={wire.color} />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      {/* 3D Bomba Oyuncu Etiketi */}
      <Text
        position={[0, 0.58, 0.45]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.16}
        color="#38bdf8"
      >
        {`${currentTurnPlayer?.avatar?.icon || ''} ${currentTurnPlayer?.name?.toUpperCase() || ''}`}
      </Text>
    </group>
  );
}

// 3D TUVAL (CANVAS)
export default function ThreeDScene() {
  const { timeLeft, players } = useGame();

  return (
    <div style={{ width: '100%', height: '380px', borderRadius: '24px', overflow: 'hidden', border: '2px solid rgba(6, 182, 212, 0.5)', boxShadow: '0 0 50px rgba(6, 182, 212, 0.2)', background: '#020617', marginBottom: '24px', position: 'relative' }}>
      <Canvas shadows camera={{ position: [0, 5, 5.5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <spotLight
          position={[0, 7, 2]}
          angle={0.6}
          penumbra={0.8}
          intensity={timeLeft <= 3 ? 3.5 : 2}
          color={timeLeft <= 3 ? '#ff0055' : '#38bdf8'}
          castShadow
        />

        <Desk totalPlayers={players.length} />
        <BombModel />

        <OrbitControls
          enableZoom={true}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 6}
          minDistance={3.5}
          maxDistance={8}
        />
      </Canvas>
    </div>
  );
}

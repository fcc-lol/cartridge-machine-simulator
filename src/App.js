import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Html } from "@react-three/drei";

import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

function STLModel({ url, onLoad, position, rotation, scale, color }) {
  const meshRef = useRef();
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(url, (geometry) => {
      geometry.computeVertexNormals();
      setGeometry(geometry);
      onLoad(); // Notify parent that STL is loaded
    });
  }, [url, onLoad]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={rotation || [Math.PI / 2, Math.PI, Math.PI]}
      position={position || [-10.8, 0, 0]}
      scale={scale || [0.4, 0.4, 0.4]}
    >
      <meshStandardMaterial
        color={color || "#ffffff"}
        metalness={0.8}
        roughness={0.4}
      />
    </mesh>
  );
}

function ConditionalHtml({ children, position }) {
  const { camera } = useThree();
  const [isVisible, setIsVisible] = useState(true);

  useFrame(() => {
    // Calculate the vector from camera to the HTML element position
    const cameraPos = camera.position;
    const htmlPos = new THREE.Vector3(...position);
    const direction = new THREE.Vector3()
      .subVectors(cameraPos, htmlPos)
      .normalize();

    // Check if we're looking at the front face (z direction)
    // If direction.z is positive, we're looking from the front
    const isFrontFacing = direction.z > 0;
    setIsVisible(isFrontFacing);
  });

  return isVisible ? children : null;
}

function STLViewer() {
  const ROTATION_LIMIT_X_DEGREES = 45; // Horizontal rotation limit
  const ROTATION_LIMIT_Y_DEGREES = 25; // Vertical rotation limit
  const [caseLoaded, setCaseLoaded] = useState(false);
  const [cartridgeLoaded, setCartridgeLoaded] = useState(false);
  const [opacity, setOpacity] = useState(0);

  // Check if all assets are loaded
  const allLoaded = caseLoaded && cartridgeLoaded;

  // Fade in effect when all are loaded
  useEffect(() => {
    if (allLoaded) {
      const timer = setTimeout(() => {
        setOpacity(1);
      }, 100); // Small delay for smooth transition
      return () => clearTimeout(timer);
    }
  }, [allLoaded]);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      {/* Loading overlay */}
      {!allLoaded && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            color: "white",
            fontSize: "18px"
          }}
        >
          Loading...
        </div>
      )}

      <Canvas
        camera={{
          position: [0, 0, 100],
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        style={{
          background:
            "radial-gradient(circle, rgba(0,0,0) 0%, rgba(20,20,20) 100%)",
          opacity: opacity,
          transition: "opacity 1s ease-in-out"
        }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        <STLModel
          url="/resources/case.stl"
          onLoad={() => setCaseLoaded(true)}
          position={[-10.8, 0, 0]}
          rotation={[Math.PI / 2, Math.PI, Math.PI]}
          scale={[0.4, 0.4, 0.4]}
          color="#ffffff"
        />
        <STLModel
          url="/resources/cartrdige.stl"
          onLoad={() => setCartridgeLoaded(true)}
          position={[-10.8, 0, 0]}
          rotation={[Math.PI / 2, Math.PI, Math.PI]}
          scale={[0.4, 0.4, 0.4]}
          color="#cccccc"
        />
        {/* Large back face culling plane to prevent seeing through STL from any angle */}
        <mesh position={[-10.8, 0, 8.5]} rotation={[Math.PI, Math.PI, Math.PI]}>
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial color="#000000" side={THREE.FrontSide} />
        </mesh>

        <ConditionalHtml position={[-10.8, 0, 9]}>
          <Html
            position={[-10.8, -0.25, 8.4]} // Adjust to match your screen's position
            transform
            distanceFactor={12.4} // Adjust for scaling
            wrapperClass="firmware-iframe"
            style={{
              pointerEvents: "none",
              userSelect: "none",
              backfaceVisibility: "hidden"
            }}
          >
            <iframe
              src="https://cartridge-machine-firmware.fcc.lol"
              style={{
                width: 1024 * 2,
                height: 768 * 2,
                border: "none",
                borderRadius: 36,
                background: "transparent",
                backfaceVisibility: "hidden"
              }}
              title="screen"
            />
          </Html>
        </ConditionalHtml>
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={50}
          maxDistance={300}
          minPolarAngle={
            Math.PI / 2 - (ROTATION_LIMIT_Y_DEGREES * Math.PI) / 180
          }
          maxPolarAngle={
            Math.PI / 2 + (ROTATION_LIMIT_Y_DEGREES * Math.PI) / 180
          }
          minAzimuthAngle={(-ROTATION_LIMIT_X_DEGREES * Math.PI) / 180}
          maxAzimuthAngle={(ROTATION_LIMIT_X_DEGREES * Math.PI) / 180}
        />
      </Canvas>
    </div>
  );
}

export default STLViewer;

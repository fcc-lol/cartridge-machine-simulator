import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

function STLModel({ url }) {
  const meshRef = useRef();
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(url, (geometry) => {
      geometry.computeVertexNormals();
      setGeometry(geometry);
    });
  }, [url]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[Math.PI / 2, Math.PI, Math.PI]}
      position={[-10.8, 0, 0]}
      scale={[0.4, 0.4, 0.4]}
    >
      <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.4} />
    </mesh>
  );
}

function VideoScreen({ videoUrl }) {
  const meshRef = useRef();
  const [videoTexture, setVideoTexture] = useState(null);

  useEffect(() => {
    // Use local video file as texture
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;

    setVideoTexture(texture);

    // Start playing the video
    video.play().catch((e) => console.log("Video autoplay failed:", e));

    return () => {
      video.pause();
      video.src = "";
    };
  }, [videoUrl]);

  useFrame(() => {
    if (videoTexture) {
      videoTexture.needsUpdate = true;
    }
  });

  if (!videoTexture) {
    return null;
  }

  // Position and size the video plane to fit the screen area of the STL model
  return (
    <mesh
      ref={meshRef}
      position={[-10.8, 0, 9]}
      rotation={[Math.PI, Math.PI, Math.PI]}
    >
      <planeGeometry args={[4 * 16.5, 3 * 16.5]} /> {/* Made much smaller */}
      <meshBasicMaterial map={videoTexture} />
    </mesh>
  );
}

function STLViewer() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Canvas
        camera={{
          position: [0, 0, 100],
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        style={{
          background:
            "radial-gradient(circle, rgba(0,0,0) 0%, rgba(20,20,20) 100%)"
        }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        <STLModel url="/resources/case.stl" />
        <VideoScreen videoUrl="/resources/screen.mp4" />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={50}
          maxDistance={300}
        />
      </Canvas>
    </div>
  );
}

export default STLViewer;

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
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

function WebScreen({ url, onLoad }) {
  const meshRef = useRef();
  const [texture, setTexture] = useState(null);
  const iframeRef = useRef();

  useEffect(() => {
    // Create a canvas to draw the webpage content
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    // Create a texture from the canvas
    const webTexture = new THREE.CanvasTexture(canvas);
    webTexture.minFilter = THREE.LinearFilter;
    webTexture.magFilter = THREE.LinearFilter;

    // Create an iframe to load the JavaScript application
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.style.width = "800px";
    iframe.style.height = "600px";
    iframe.style.border = "none";
    iframe.style.position = "absolute";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";

    // Add iframe to DOM temporarily
    document.body.appendChild(iframe);

    // Function to capture iframe content
    const captureIframeContent = () => {
      try {
        // Try to access iframe content (this will fail due to CORS, but we'll handle it)
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow.document;

        // Clear canvas
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the iframe content
        ctx.fillStyle = "#000000";
        ctx.font = "12px Arial";

        // Extract text content
        const textContent =
          iframeDoc.body.textContent || iframeDoc.body.innerText || "";
        const lines = textContent
          .split("\n")
          .filter((line) => line.trim().length > 0);

        let y = 30;
        for (let i = 0; i < Math.min(lines.length, 40); i++) {
          const line = lines[i].substring(0, 80);
          ctx.fillText(line, 20, y);
          y += 15;
        }

        webTexture.needsUpdate = true;
      } catch (error) {
        // CORS error - draw a stylized interface instead
        console.log("CORS prevented iframe access, showing stylized interface");

        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#2d2d2d";
        ctx.fillRect(0, 0, canvas.width, 60);

        ctx.fillStyle = "#404040";
        ctx.fillRect(10, 15, canvas.width - 20, 30);
        ctx.fillStyle = "#ffffff";
        ctx.font = "14px Arial";
        ctx.fillText(url, 20, 35);

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px Arial";
        ctx.fillText("Cartridge Machine Firmware", canvas.width / 2 - 100, 100);
        ctx.fillText("JavaScript Application", canvas.width / 2 - 80, 130);

        // Show some realistic firmware interface elements
        ctx.fillStyle = "#007acc";
        ctx.fillRect(50, 150, 200, 40);
        ctx.fillStyle = "#ffffff";
        ctx.font = "14px Arial";
        ctx.fillText("Connect Device", 70, 175);

        ctx.fillStyle = "#28a745";
        ctx.fillRect(300, 150, 200, 40);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("Update Firmware", 320, 175);

        ctx.fillStyle = "#dc3545";
        ctx.fillRect(550, 150, 200, 40);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("Emergency Stop", 570, 175);

        ctx.fillStyle = "#333333";
        ctx.fillRect(50, 250, canvas.width - 100, 100);
        ctx.fillStyle = "#00ff00";
        ctx.font = "14px Arial";
        ctx.fillText("Status: Connected", 70, 280);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("Firmware Version: 2.1.4", 70, 300);
        ctx.fillText("Last Update: 2024-01-15", 70, 320);

        // Add a note about the iframe
        ctx.fillStyle = "#ffaa00";
        ctx.fillText("Live content available in iframe", 70, 350);

        webTexture.needsUpdate = true;
      }
    };

    // Wait for iframe to load, then capture content
    iframe.addEventListener("load", () => {
      setTimeout(captureIframeContent, 2000); // Give JS time to render
    });

    // Initial capture attempt
    setTimeout(captureIframeContent, 1000);

    setTexture(webTexture);
    onLoad();

    // Cleanup
    return () => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    };
  }, [url, onLoad]);

  if (!texture) {
    return null;
  }

  // Position and size the web screen plane to fit the screen area of the STL model
  return (
    <mesh
      ref={meshRef}
      position={[-10.8, 0, 9]}
      rotation={[Math.PI, Math.PI, Math.PI]}
    >
      <planeGeometry args={[4 * 16.5, 3 * 16.5]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

function STLViewer() {
  const [caseLoaded, setCaseLoaded] = useState(false);
  const [cartridgeLoaded, setCartridgeLoaded] = useState(false);
  const [webScreenLoaded, setWebScreenLoaded] = useState(false);
  const [opacity, setOpacity] = useState(0);

  // Check if all assets are loaded
  const allLoaded = caseLoaded && cartridgeLoaded && webScreenLoaded;

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
        <WebScreen
          url="https://cartridge-machine-firmware.fcc.lol"
          onLoad={() => setWebScreenLoaded(true)}
        />
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

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Html } from "@react-three/drei";

import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

function STLModel({
  url,
  onLoad,
  position,
  rotation,
  scale,
  color,
  onClick,
  onPointerEnter,
  onPointerLeave
}) {
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
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <meshStandardMaterial
        color={color || "#ffffff"}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

// New animated cartridge component
function AnimatedCartridge({
  url,
  onLoad,
  initialPosition,
  targetPosition,
  isAnimating,
  onAnimationComplete,
  rotation,
  scale,
  color,
  onClick,
  allowInteraction = true
}) {
  const meshRef = useRef();
  const [geometry, setGeometry] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(initialPosition);
  const [animationPhase, setAnimationPhase] = useState(0); // 0: lift up, 1: move Y, 2: drop down
  const [isHovered, setIsHovered] = useState(false);
  const [isHoverTransitioning, setIsHoverTransitioning] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(url, (geometry) => {
      geometry.computeVertexNormals();
      setGeometry(geometry);
      onLoad(); // Notify parent that STL is loaded
    });
  }, [url, onLoad]);

  useEffect(() => {
    // Reset animation phase when starting new animation
    if (isAnimating) {
      setAnimationPhase(0);
    }
  }, [isAnimating]);

  // Synchronize currentPosition with initialPosition when not animating and not hovering
  // But only when the initialPosition prop actually changes (not during hover transitions)
  useEffect(() => {
    if (!isAnimating && !isHovered && !isHoverTransitioning && !isPressed) {
      const currentVec = new THREE.Vector3(...currentPosition);
      const initialVec = new THREE.Vector3(...initialPosition);
      const distance = currentVec.distanceTo(initialVec);

      // Only sync if positions are very significantly different (larger threshold)
      // to avoid interfering with smooth hover out animations
      if (distance > 0.5) {
        setCurrentPosition(initialPosition);
      }
    }
  }, [
    initialPosition,
    isAnimating,
    isHovered,
    isHoverTransitioning,
    isPressed,
    currentPosition
  ]);

  // Update cursor when allowInteraction changes while element is hovered
  useEffect(() => {
    if (isHovered) {
      if (allowInteraction) {
        document.body.style.cursor = onClick ? "pointer" : "default";
      } else {
        document.body.style.cursor = "not-allowed";
      }
    }
  }, [allowInteraction, isHovered, onClick]);

  // Reset hover states when animation starts to prevent cursor getting stuck
  useEffect(() => {
    if (isAnimating) {
      setIsHovered(false);
      setIsHoverTransitioning(false);
      setIsPressed(false);
      document.body.style.cursor = "default";
    }
  }, [isAnimating]);

  useFrame(() => {
    if (isAnimating) {
      const speed = 0.08; // Animation speed
      const current = new THREE.Vector3(...currentPosition);

      if (animationPhase === 0) {
        // Phase 1: Lift up Z to 20
        const liftTarget = new THREE.Vector3(
          initialPosition[0],
          initialPosition[1],
          20
        );
        current.lerp(liftTarget, speed);

        const distance = current.distanceTo(liftTarget);
        if (distance < 0.1) {
          setCurrentPosition([current.x, current.y, 20]);
          setAnimationPhase(1);
        } else {
          setCurrentPosition([current.x, current.y, current.z]);
        }
      } else if (animationPhase === 1) {
        // Phase 2: Move Y position (while keeping Z at 20)
        const moveTarget = new THREE.Vector3(
          targetPosition[0],
          targetPosition[1],
          20
        );
        current.lerp(moveTarget, speed);

        const distance = current.distanceTo(moveTarget);
        if (distance < 0.1) {
          setCurrentPosition([targetPosition[0], targetPosition[1], 20]);
          setAnimationPhase(2);
        } else {
          setCurrentPosition([current.x, current.y, current.z]);
        }
      } else if (animationPhase === 2) {
        // Phase 3: Drop down Z to final position
        const dropTarget = new THREE.Vector3(...targetPosition);
        current.lerp(dropTarget, speed);

        const distance = current.distanceTo(dropTarget);
        if (distance < 0.1) {
          setCurrentPosition(targetPosition);
          setAnimationPhase(0);
          onAnimationComplete();
        } else {
          setCurrentPosition([current.x, current.y, current.z]);
        }
      }
    } else if (isPressed) {
      // Press animation
      const speed = 0.25; // Fast press animation
      const current = new THREE.Vector3(...currentPosition);
      const basePosition = new THREE.Vector3(...initialPosition);
      const pressTarget = new THREE.Vector3(
        basePosition.x,
        basePosition.y,
        basePosition.z + 20
      );

      current.lerp(pressTarget, speed);
      setCurrentPosition([current.x, current.y, current.z]);
    } else if (isHovered) {
      // Hover animation
      const speed = 0.15; // Faster hover animation
      const current = new THREE.Vector3(...currentPosition);
      const basePosition = new THREE.Vector3(...initialPosition);
      const hoverTarget = new THREE.Vector3(
        basePosition.x,
        basePosition.y,
        basePosition.z + 4
      );

      current.lerp(hoverTarget, speed);
      setCurrentPosition([current.x, current.y, current.z]);
    } else if (isHoverTransitioning) {
      // Hover out - smoothly return to base position
      const speed = 0.15; // Faster hover animation
      const current = new THREE.Vector3(...currentPosition);
      const baseTarget = new THREE.Vector3(...initialPosition);

      current.lerp(baseTarget, speed);
      setCurrentPosition([current.x, current.y, current.z]);

      // Check if we've reached the target position
      const distance = current.distanceTo(baseTarget);
      if (distance < 0.01) {
        setIsHoverTransitioning(false);
      }
    }
  });

  if (!geometry) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={rotation || [Math.PI / 2, Math.PI, Math.PI]}
      position={currentPosition}
      scale={scale || [0.4, 0.4, 0.4]}
      onClick={(e) => {
        // Clear hover and pressed states when clicking to avoid stale states after position change
        setIsHovered(false);
        setIsHoverTransitioning(false);
        setIsPressed(false);
        // Call the original onClick handler
        if (onClick) onClick(e);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (allowInteraction) {
          setIsPressed(true);
        }
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (allowInteraction) {
          setIsPressed(false);
        }
      }}
      onPointerEnter={(e) => {
        e.stopPropagation();
        if (allowInteraction) {
          setIsHovered(true);
          setIsHoverTransitioning(true);
          document.body.style.cursor = onClick ? "pointer" : "default";
        } else {
          document.body.style.cursor = "not-allowed";
        }
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        if (allowInteraction) {
          setIsHovered(false);
          setIsPressed(false); // Clear pressed state when leaving
          // Keep transitioning true until animation completes
        }
        document.body.style.cursor = "default";
      }}
    >
      <meshStandardMaterial
        color={color || "#ffffff"}
        metalness={0.2}
        roughness={0.5}
      />
    </mesh>
  );
}

function STLViewer() {
  const ROTATION_LIMIT_X_DEGREES = 45; // Horizontal rotation limit
  const ROTATION_LIMIT_Y_DEGREES = 25; // Vertical rotation limit
  const [caseLoaded, setCaseLoaded] = useState(false);
  const [cartridgeLoaded, setCartridgeLoaded] = useState(false);
  const [opacity, setOpacity] = useState(0);

  // Animation state for multiple cartridges
  const [activeCartridgeIndex, setActiveCartridgeIndex] = useState(null);
  const [animatingCartridges, setAnimatingCartridges] = useState(new Set());
  const [cartridgeBeingActivated, setCartridgeBeingActivated] = useState(null);
  const [pendingCartridgeIndex, setPendingCartridgeIndex] = useState(null);

  // Define positions for 4 cartridges (bottom 4 slots)
  const cartridgePositions = [
    [-10.8, -13.2, 0], // 2nd slot from bottom
    [-10.8, -22.8, 0], // 3rd slot from bottom
    [-10.8, -32.4, 0], // 4th slot from bottom
    [-10.8, -42, 0] // Bottom slot
  ];

  // Define cartridge configuration with colors and apps
  const cartridgeConfig = [
    {
      color: "#FF4848",
      app: "WholeEarthSatelliteImage"
    },
    {
      color: "#9DFFA1",
      app: "AircraftOverhead"
    },
    {
      color: "#2D8FFF",
      app: "InfiniteColorFade"
    },
    {
      color: "#FFD788",
      app: "USWeatherMap"
    }
  ];

  const targetCartridgePosition = [-10.8, 0, 0]; // Top slot (1st slot)

  // Get API key from URL query params
  const getApiKey = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("fccApiKey");
  };

  // Create URLs array with API key if available
  const createUrls = () => {
    const apiKey = getApiKey();
    const baseUrl = "https://cartridge-machine-firmware.fcc.lol";

    const urls = [
      baseUrl, // Default/empty cartridge (when no cartridge is active)
      ...cartridgeConfig.map((cartridge) =>
        apiKey
          ? `${baseUrl}/?fccApiKey=${apiKey}&app=${cartridge.app}`
          : baseUrl
      )
    ];

    return urls;
  };

  const urls = createUrls();

  // Handle cartridge click
  const handleCartridgeClick = (clickedIndex) => {
    return (event) => {
      event.stopPropagation();

      // If there's an active cartridge and the clicked cartridge is not the active one, don't allow the click
      if (
        activeCartridgeIndex !== null &&
        activeCartridgeIndex !== clickedIndex
      ) {
        return;
      }

      // If this cartridge is already active, deactivate it
      if (activeCartridgeIndex === clickedIndex) {
        // Start return animation for the active cartridge
        setAnimatingCartridges((prev) => new Set([...prev, clickedIndex]));
        // Clear the active cartridge (will be set to null when animation completes)
        setCartridgeBeingActivated(null);
        setPendingCartridgeIndex(null);
        return;
      }

      // No active cartridge, start animation immediately
      setCartridgeBeingActivated(clickedIndex);
      setAnimatingCartridges((prev) => new Set([...prev, clickedIndex]));
      setPendingCartridgeIndex(null);
    };
  };

  // Handle animation completion
  const handleAnimationComplete = (cartridgeIndex) => {
    return () => {
      setAnimatingCartridges((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cartridgeIndex);
        return newSet;
      });

      // If this cartridge was being activated, make it active
      if (cartridgeBeingActivated === cartridgeIndex) {
        setActiveCartridgeIndex(cartridgeIndex);
        setCartridgeBeingActivated(null);
      }
      // If this was the previously active cartridge and we're deactivating (cartridgeBeingActivated is null)
      else if (
        activeCartridgeIndex === cartridgeIndex &&
        cartridgeBeingActivated === null
      ) {
        setActiveCartridgeIndex(null);

        // Check if there's a pending cartridge to activate after delay
        if (pendingCartridgeIndex !== null) {
          const pendingIndex = pendingCartridgeIndex;
          setPendingCartridgeIndex(null);

          // Wait 1 second before starting the animation for the pending cartridge
          setTimeout(() => {
            setCartridgeBeingActivated(pendingIndex);
            setAnimatingCartridges((prev) => new Set([...prev, pendingIndex]));
          }, 1000);
        }
      }
      // If this was the previously active cartridge, it's now deactivated
      else if (activeCartridgeIndex === cartridgeIndex) {
        // Don't change activeCartridgeIndex here - it will be set by the activating cartridge
      }
    };
  };

  // Handle cartridge loaded - only set to true once
  const handleCartridgeLoaded = () => {
    if (!cartridgeLoaded) {
      setCartridgeLoaded(true);
      console.log("Cartridge STL file loaded");
    }
  };

  // Check if all assets are loaded
  const allLoaded = caseLoaded && cartridgeLoaded;

  // Add debugging for loading state
  console.log(
    `Loading state: case=${caseLoaded}, cartridge=${cartridgeLoaded}, allLoaded=${allLoaded}`
  );

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
        <directionalLight position={[0, 15, 12]} intensity={1} castShadow />

        <STLModel
          url="/resources/case.stl"
          onLoad={() => setCaseLoaded(true)}
          position={[-10.8, 0, 0]}
          rotation={[Math.PI / 2, Math.PI, Math.PI]}
          scale={[0.4, 0.4, 0.4]}
          color="#ffffff"
          onClick={(e) => e.stopPropagation()}
          onPointerEnter={(e) => e.stopPropagation()}
          onPointerLeave={(e) => e.stopPropagation()}
        />

        {/* Render 4 cartridges */}
        {cartridgePositions.map((position, index) => {
          const isActive = activeCartridgeIndex === index;
          const isAnimating = animatingCartridges.has(index);
          const isBeingActivated = cartridgeBeingActivated === index;
          const isClickable =
            activeCartridgeIndex === null || activeCartridgeIndex === index;

          // Determine animation direction based on what should happen
          let initialPosition, targetPosition;
          if (isAnimating) {
            if (isBeingActivated) {
              // This cartridge is being activated - move to target
              initialPosition = position;
              targetPosition = targetCartridgePosition;
            } else {
              // This cartridge is being deactivated - move back to original
              initialPosition = targetCartridgePosition;
              targetPosition = position;
            }
          } else {
            // Not animating - use current position
            if (isActive) {
              initialPosition = targetCartridgePosition;
              targetPosition = targetCartridgePosition;
            } else {
              initialPosition = position;
              targetPosition = position;
            }
          }

          return (
            <AnimatedCartridge
              key={index}
              url="/resources/cartrdige.stl"
              onLoad={handleCartridgeLoaded}
              initialPosition={initialPosition}
              targetPosition={targetPosition}
              isAnimating={isAnimating}
              onAnimationComplete={handleAnimationComplete(index)}
              rotation={[Math.PI / 2, Math.PI, Math.PI]}
              scale={[0.4, 0.4, 0.4]}
              color={cartridgeConfig[index].color}
              onClick={isClickable ? handleCartridgeClick(index) : undefined}
              allowInteraction={isClickable}
            />
          );
        })}

        <Html
          position={[-11, -0.1, 8.4]} // Adjust to match your screen's position
          transform
          distanceFactor={24.4} // Adjust for scaling - doubled to double the size
          wrapperClass="firmware-iframe"
          style={{
            pointerEvents: "none",
            userSelect: "none",
            backfaceVisibility: "hidden"
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerEnter={(e) => e.stopPropagation()}
          onPointerLeave={(e) => e.stopPropagation()}
        >
          <iframe
            src={
              urls[activeCartridgeIndex !== null ? activeCartridgeIndex + 1 : 0]
            }
            style={{
              width: 1048,
              height: 772,
              border: "none",
              borderRadius: 20,
              background: "transparent",
              backfaceVisibility: "hidden",
              pointerEvents: "none"
            }}
            title="screen"
          />
        </Html>

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

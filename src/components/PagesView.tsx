import { supabase } from "@lib/supabase";
import { useEffect, useState, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, useGLTF, PerspectiveCamera } from "@react-three/drei"
import * as THREE from "three";
import { useSpring, animated } from '@react-spring/three';
import { useAudio } from 'react-use';

const CameraSetup = () => {
    const { camera } = useThree();
    const targetPoint = new THREE.Vector3(0, 0, -4);

    useEffect(() => {
        camera.position.set(0, 5, 1);
        camera.lookAt(targetPoint);
    }, [camera]);

    return null;
};

const DEFAULT_POSITION = [0, 0, -4];

const DrewAnimation = ({ action, model }) => {
    const drewRef = useRef<THREE.Mesh>(null!);
    const walkOffset = useRef(0);
    const previousAction = useRef(action);

    // Spring animation setup
    const [{ pos }, api] = useSpring(() => ({
        pos: DEFAULT_POSITION,
        config: { tension: 200, friction: 15 }
    }));

    // Reset position when action changes
    useEffect(() => {
        if (previousAction.current !== action) {
            if (drewRef.current) {
                drewRef.current.position.y = DEFAULT_POSITION[1];
                drewRef.current.position.x = DEFAULT_POSITION[0];
                drewRef.current.rotation.y = 0;
            }
            
            api.start({ pos: DEFAULT_POSITION });
            walkOffset.current = 0;
        }
        previousAction.current = action;
    }, [action, api]);

    // Bobbing animation for talk action
    useFrame(({ clock }) => {
        if (action === 'talk' && drewRef.current) {
            drewRef.current.position.y = Math.sin(clock.elapsedTime * 5) * 0.1;
        }
    });

    // Handle shove action
    useEffect(() => {
        if (action === 'shove') {
            api.start({
                pos: [-2, 0, -4],
                onRest: () => {
                    api.start({ pos: DEFAULT_POSITION });
                }
            });
        }
    }, [action, api]);

    // Improved walk animation with natural movement
    useFrame(({ clock }) => {
        if (action === 'walk' && drewRef.current) {
            // Increment walk cycle
            walkOffset.current += 0.015; // Slower, more natural pace

            // Horizontal movement (figure-8 pattern)
            const xMovement = Math.sin(walkOffset.current) * 0.5;
            
            // Vertical bounce with half the frequency of the horizontal movement
            const yBounce = Math.abs(Math.sin(walkOffset.current * 2)) * 0.15;
            
            // Smooth rotation that follows the direction of movement
            const rotation = Math.cos(walkOffset.current) * 0.2;
            
            // Forward/backward slight movement
            const zMovement = Math.sin(walkOffset.current * 2) * 0.1;

            // Apply all transformations
            drewRef.current.position.x = xMovement;
            drewRef.current.position.y = yBounce;
            drewRef.current.position.z = DEFAULT_POSITION[2] + zMovement;
            drewRef.current.rotation.y = rotation;
            
            // Subtle tilt in the direction of movement
            drewRef.current.rotation.z = -xMovement * 0.2;
        }
    });

    return (
        <animated.mesh
            ref={drewRef}
            geometry={model.nodes.Drew.geometry}
            material={model.nodes.Drew.material}
            position={pos.to((x, y, z) => [x, y, z])}
            rotation={model.scene.children[0].rotation}
            scale={1.5}
        />
    );
};


const CatAnimation = ({ action, model }) => {
    const catRef = useRef<THREE.Mesh>(null!);

    // meme animation which just spins the cat
    useFrame(({ clock }) => {
        if (action === 'meme' && catRef.current) {
            const speed = 0.1 + (clock.elapsedTime * 0.01);
        
            // Apply rotation with increasing speed
            catRef.current.rotation.z += Math.max(speed, 1);
    
        }
    });

    useEffect(() => {
        if (action === 'meme') {
            const audio = new Audio('/cat.mp3');
            audio.loop = true;
            audio.play();
        }
    }, [action]);

    return (
        <primitive
            ref={catRef}
            object={model.nodes["Sketchfab_model"]}
            position={[model.scene.children[0].position.x, model.scene.children[0].position.y + 2.5, model.scene.children[0].position.z - 4]}
            rotation={[model.scene.children[0].rotation.x + Math.PI, model.scene.children[0].rotation.y, model.scene.children[0].rotation.z + 0.4]}
            scale={2.5}
        />
    );
}

export default function PagesView() {
    const [action, setAction] = useState<"walk" | "talk" | "meme" | "shove" | null>("");
    const model = useGLTF("/drew.glb", true, true);
    const audioRef = useRef<HTMLAudioElement | null>(null);


    useEffect(() => {
        const channel = supabase
        .channel('controls')
        .on('postgres_changes', 
            { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'all',
                filter: 'id=eq.1'
            }, 
            (payload) => {
                console.log('New action:', (payload.new as any).action);
                setAction((payload.new as any).action);
            }
        )
        .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, []);


    useEffect(() => {
        if (action === 'meme') {
            audioRef.current = new Audio('/cat.mp3');
            audioRef.current.loop = true;
            audioRef.current.play().catch(error => {
                console.error('Audio play failed:', error);
            });
        } else if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [action]);

    return (
        <div className="h-screen pt-28">
            <audio src="/cat.mp3" ref={audioRef} />

            <Canvas>
                <CameraSetup />
                <OrbitControls target={new THREE.Vector3(0, -3, -10)} />
                <ambientLight intensity={4} />
                <pointLight position={[10, 10, 10]} />

                <PerspectiveCamera
                    makeDefault
                    aspect={window.innerWidth / window.innerHeight}
                    fov={37.5}
                    position={[0, 0, 5]}
                    zoom={1}
                />

                <DrewAnimation action={action} model={model} />

                {action === 'meme' && (
                    <CatAnimation action={action} model={model} />
                )}

                {/* Other static elements */}
                <mesh
                    geometry={(model.nodes.Room as any).geometry}
                    material={(model.nodes.Room as any).material}
                    position={model.scene.children[1].position}
                    rotation={[model.scene.children[1].rotation.x, model.scene.children[1].rotation.y, model.scene.children[1].rotation.z + Math.PI + 0.4]}
                    scale={1.5}
                />
                <primitive
                    object={model.nodes.Logo}
                    position={[model.scene.children[2].position.x - 3, model.scene.children[2].position.y, model.scene.children[2].position.z - 11]}
                    rotation={[model.scene.children[2].rotation.x, model.scene.children[2].rotation.y, model.scene.children[2].rotation.z + Math.PI + 0.4]}
                />
            </Canvas>
        </div>
    );
}

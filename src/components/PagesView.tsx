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

const DrewAnimation = ({ action, model }) => {
    const drewRef = useRef<THREE.Mesh>(null!);


    // Bobbing animation for talk action
    useFrame(({ clock }) => {
        if (action === 'talk' && drewRef.current) {
            drewRef.current.position.y = Math.sin(clock.elapsedTime * 5) * 0.1;
        }
    });

    // Spring animation for shove action
    const [{ pos }, api] = useSpring(() => ({
        pos: [0, 0, -4],
        config: { tension: 200, friction: 15 }
    }));

    useEffect(() => {
        if (action === 'shove') {
            api.start({
                pos: [-2, 0, -4],
                onRest: () => {
                    api.start({ pos: [0, 0, -4] });
                    // setAction(null);
                }
            });
        }
    }, [action]);

    // Walk animation
    const walkOffset = useRef(0);
    useFrame(({ clock }) => {
        if (action === 'walk' && drewRef.current) {
            walkOffset.current += 0.02;
            drewRef.current.position.x = Math.sin(walkOffset.current) * 2;
            drewRef.current.rotation.y = Math.sin(walkOffset.current) * 0.5;
        }
    });

    // Handle meme audio
    useEffect(() => {
        // if (action === 'meme') {
        //     controls.play();
        // } else {
        //     controls.pause();
        //     controls.seek(0);
        // }
    }, [action]);

    return (
        <>
            {/* {audio} */}
            <animated.mesh
                ref={drewRef}
                geometry={model.nodes.Drew.geometry}
                material={model.nodes.Drew.material}
                position={pos.to((x, y, z) => [x, y, z])}
                rotation={model.scene.children[0].rotation}
                scale={1.5}
            />
        </>
    );
};


const CatAnimation = ({ action, model }) => {
    const catRef = useRef<THREE.Mesh>(null!);

    // meme animation which just spins the cat
    useFrame(({ clock }) => {
        if (action === 'meme' && catRef.current) {
            catRef.current.rotation.z += 0.5;
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
    const [action, setAction] = useState<"walk" | "talk" | "meme" | "shove" | null>("meme");
    const model = useGLTF("/drew.glb", true, true);
    const [audio, state, controls] = useAudio({
        src: "/cat.mp3",
        autoPlay: false,
    });

    useEffect(() => {
        const channel = supabase
            .channel('all')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'all' }, (payload) => {
                setAction((payload.new as any).action);
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, []);


    useEffect(() => {
        if (action === 'meme') {
            const playAudio = async () => {
                try {
                    await controls.play();
                } catch (error) {
                    console.log('Audio playback failed:', error);
                }
            };
            playAudio();
        } else {
            controls.pause();
        }
    });

    return (
        <div className="h-screen pt-28">
            {audio}

            <Canvas>
                <CameraSetup />
                <OrbitControls target={new THREE.Vector3(0, -3, -10)} />
                <ambientLight intensity={3} color={"#007f7f10"} />
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
                    geometry={model.nodes.Room.geometry}
                    material={model.nodes.Room.material}
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

// pages/control.tsx
import { supabase } from "@lib/supabase";
import { useEffect, useState } from "react";

export default function PagesControl() {
    const [currentAction, setCurrentAction] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const triggerAction = async (action: string | null) => {
        console.log('Triggering action:', action);
        const { error } = await supabase
            .from('all')
            .update({ action })
            .eq('id', 1); // Match your table structure

        if (!error) {
            setCurrentAction(action);
            localStorage.setItem('lastAction', action || '');
        }
    };

    useEffect(() => {
        // Realtime connection status
        const channel = supabase.channel('controls');
        channel
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        // Restore last action
        const lastAction = localStorage.getItem('lastAction');
        if (lastAction) triggerAction(lastAction);

        return () => {
            channel.unsubscribe();
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
                <div className="mb-6 flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-600">
                        {isConnected ? 'Connected to Supabase' : 'Connecting...'}
                    </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => triggerAction('walk')}
                        className={`p-4 rounded-lg ${currentAction === 'walk' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-blue-100 text-blue-800'}`}
                    >
                        🚶 Walk
                    </button>
                    
                    <button
                        onClick={() => triggerAction('talk')}
                        className={`p-4 rounded-lg ${currentAction === 'talk' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-green-100 text-green-800'}`}
                    >
                        🗣️ Talk
                    </button>
                    
                    <button
                        onClick={() => triggerAction('meme')}
                        className={`p-4 rounded-lg ${currentAction === 'meme' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-purple-100 text-purple-800'}`}
                    >
                        😹 Meme
                    </button>
                    
                    <button
                        onClick={() => triggerAction('shove')}
                        className={`p-4 rounded-lg ${currentAction === 'shove' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-red-100 text-red-800'}`}
                    >
                        🤜 Shove
                    </button>
                </div>

                <button
                    onClick={() => triggerAction(null)}
                    className="w-full mt-6 p-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                >
                    ⏹️ Stop All Actions
                </button>
            </div>
        </div>
    );
}

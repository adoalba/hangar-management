import { useState, useEffect } from 'react';

export type PointerType = 'mouse' | 'pen' | 'touch';

/**
 * Hook that tracks the last detected pointer type.
 * Useful for adapting UI density (Mouse/Pen = Dense, Touch = Cozy)
 * or enabling specific features like Palm Rejection logic.
 */
export const usePointerType = () => {
    const [pointerType, setPointerType] = useState<PointerType>('mouse');

    useEffect(() => {
        const handlePointer = (e: PointerEvent) => {
            // Validate the pointer type to ensure it's one of the expected values
            if (
                e.pointerType === 'mouse' ||
                e.pointerType === 'pen' ||
                e.pointerType === 'touch'
            ) {
                setPointerType((prev) => {
                    // Only update state if it actually changed to prevent render thrashing
                    if (prev !== e.pointerType) {
                        return e.pointerType as PointerType;
                    }
                    return prev;
                });
            }
        };

        // We listen to 'pointerdown' (interaction started) and 'pointermove' (hovering/moving)
        // Capture phase ensures we catch it early. Passive for performance.
        window.addEventListener('pointerdown', handlePointer, { capture: true, passive: true });
        window.addEventListener('pointermove', handlePointer, { capture: true, passive: true });

        return () => {
            window.removeEventListener('pointerdown', handlePointer, { capture: true });
            window.removeEventListener('pointermove', handlePointer, { capture: true });
        };
    }, []);

    return pointerType;
};

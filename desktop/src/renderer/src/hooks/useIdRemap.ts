import { useEffect } from "react";
import { useNavigate } from "react-router";

/**
 * When a detail/edit screen is mounted on a negative (offline-created) id
 * and that entity later syncs to a real server id, swaps the URL to the
 * real one in place — without this, the screen would keep pointing at an id
 * the server never issued once the sync engine remaps it. See the plan's
 * "Negative local IDs" section for the full design; native/src/lib.rs's
 * `remapNegativeId` is what actually rewrites the queued operations this
 * event fires alongside.
 */
export function useIdRemap(currentId: number, buildPath: (id: number) => string): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (currentId >= 0) return undefined; // only offline-created entities ever get remapped

    return window.api.offline.onIdRemapped((oldId, newId) => {
      if (oldId === currentId) {
        navigate(buildPath(newId), { replace: true });
      }
    });
  }, [currentId, buildPath, navigate]);
}

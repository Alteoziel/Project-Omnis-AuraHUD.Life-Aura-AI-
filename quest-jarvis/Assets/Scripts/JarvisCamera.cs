using UnityEngine;

namespace QuestJarvis
{
    /// <summary>
    /// OVRCameraRig eye cameras are often Untagged, so Camera.main is null on Quest.
    /// Resolve the XR / center-eye camera explicitly.
    /// </summary>
    public static class JarvisCamera
    {
        const float FallbackEyeHeight = 1.55f;

        public static Camera Find()
        {
            if (Camera.main != null && Camera.main.enabled)
                return Camera.main;

            var center = GameObject.Find("CenterEyeAnchor");
            if (center != null)
            {
                var eye = center.GetComponent<Camera>();
                if (eye != null && eye.enabled)
                    return eye;
            }

            try
            {
                var tagged = GameObject.FindGameObjectWithTag("MainCamera");
                if (tagged != null)
                {
                    var c = tagged.GetComponent<Camera>();
                    if (c != null && c.enabled)
                        return c;
                }
            }
            catch (UnityException)
            {
                // Tag missing in build — ignore.
            }

            Camera best = null;
            var cameras = Object.FindObjectsByType<Camera>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
            for (int i = 0; i < cameras.Length; i++)
            {
                var cam = cameras[i];
                if (cam == null || !cam.enabled || !cam.gameObject.activeInHierarchy)
                    continue;
                var n = cam.name;
                if (n.IndexOf("CenterEye", System.StringComparison.OrdinalIgnoreCase) >= 0)
                    return cam;
                if (cam.stereoTargetEye != StereoTargetEyeMask.None)
                    return cam;
                if (best == null)
                    best = cam;
            }
            return best;
        }

        public static float FloorYFromCamera(Camera cam)
        {
            if (cam == null)
                return 0f;
            var y = cam.transform.position.y - FallbackEyeHeight;
            // Floor-level tracking: feet near y=0.
            return y > -0.5f && y < 0.5f ? 0f : y;
        }

        /// <summary>
        /// Floor point ~distance meters ahead of the headset.
        /// </summary>
        public static bool TryFrontFloor(float distance, float knownFloorY, bool hasFloor, out Vector3 floorPoint, out Vector3 lookAt)
        {
            floorPoint = default;
            lookAt = default;
            var cam = Find();
            if (cam == null)
                return false;

            lookAt = cam.transform.position;
            var forward = cam.transform.forward;
            forward.y = 0f;
            if (forward.sqrMagnitude < 0.01f)
            {
                var flat = cam.transform.rotation * Vector3.forward;
                flat.y = 0f;
                forward = flat.sqrMagnitude > 0.01f ? flat : Vector3.forward;
            }
            forward.Normalize();

            float floorY = hasFloor ? knownFloorY : FloorYFromCamera(cam);
            floorPoint = lookAt + forward * distance;
            floorPoint.y = floorY;
            return true;
        }
    }
}

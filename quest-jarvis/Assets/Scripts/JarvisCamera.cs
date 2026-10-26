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

        public const float MinPersonalMeters = 1.2f;
        public const float PreferredStandMeters = 1.65f;
        public const float MaxReanchorMeters = 3.5f;

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

        public static float FlatDistanceToCamera(Vector3 worldPoint)
        {
            var cam = Find();
            if (cam == null)
                return float.MaxValue;
            var flat = worldPoint - cam.transform.position;
            flat.y = 0f;
            return flat.magnitude;
        }

        /// <summary>
        /// Keeps a floor point at least minMeters from the headset on the XZ plane.
        /// </summary>
        public static void EnforcePersonalSpace(ref Vector3 floorPoint, float floorY, float minMeters)
        {
            var cam = Find();
            if (cam == null)
                return;
            var origin = cam.transform.position;
            var flat = floorPoint - origin;
            flat.y = 0f;
            if (flat.sqrMagnitude < minMeters * minMeters)
            {
                var dir = flat.sqrMagnitude > 0.0001f ? flat.normalized : ForwardFlat(cam);
                floorPoint = origin + dir * minMeters;
            }
            floorPoint.y = floorY;
        }

        public static bool IsTooClose(Vector3 worldPoint, float minMeters)
        {
            return FlatDistanceToCamera(worldPoint) < minMeters;
        }

        static Vector3 ForwardFlat(Camera cam)
        {
            var forward = cam != null ? cam.transform.forward : Vector3.forward;
            forward.y = 0f;
            if (forward.sqrMagnitude < 0.01f)
                forward = Vector3.forward;
            return forward.normalized;
        }
    }
}

using System.Collections;
using System.Collections.Generic;
using Meta.XR.MRUtilityKit;
using UnityEngine;

namespace QuestJarvis
{
    [DefaultExecutionOrder(80)]
    public class JarvisRoom : MonoBehaviour
    {
        public const string UnscannedLine = "This room isn't scanned. Run Space Setup, then come back. I'll stand in front of you.";

        const float FallbackDistance = 1.5f;
        const float FallbackEyeHeight = 1.55f;
        const float FallbackPlaceDeadline = 2.5f;
        const float SceneTimeout = 20f;

        HologramBody _body;
        JarvisSpeaker _speaker;
        bool _sceneReady;
        bool _saidUnscanned;
        bool _fallbackPlaced;
        bool _sitting;
        float _nextMoveAt;
        MRUKRoom _room;
        readonly List<string> _shownReminderIds = new List<string>();

        public void Bind(HologramBody body, JarvisSpeaker speaker)
        {
            _body = body;
            _speaker = speaker;
        }

        void Start()
        {
            StartCoroutine(AlwaysInFrontUntilRoom());
            StartCoroutine(WaitForScene());
        }

        /// <summary>
        /// Cyan hologram must appear ~1.5m in front of the XR camera within a few seconds
        /// even when MRUK / Space Setup is missing. Room furniture takes over once the scan loads.
        /// </summary>
        IEnumerator AlwaysInFrontUntilRoom()
        {
            float t = 0f;
            while (!_sceneReady && t < FallbackPlaceDeadline)
            {
                if (TryPlaceInFrontOfCamera(force: false))
                    break;
                t += Time.deltaTime;
                yield return null;
            }
            if (!_sceneReady && !_fallbackPlaced)
                TryPlaceInFrontOfCamera(force: true);

            while (!_sceneReady)
            {
                // Re-anchor only if he drifted far (user walked away); avoid teleport jitter.
                if (!_body.Busy && NeedsFallbackReanchor())
                    TryPlaceInFrontOfCamera(force: true);
                yield return new WaitForSeconds(0.75f);
            }
        }

        bool NeedsFallbackReanchor()
        {
            if (_body == null || !_fallbackPlaced)
                return true;
            var cam = FindXrCamera();
            if (cam == null)
                return false;
            var flat = _body.transform.position - cam.transform.position;
            flat.y = 0f;
            return flat.magnitude > 3.5f || flat.magnitude < 0.4f;
        }

        IEnumerator WaitForScene()
        {
            float t = 0f;
            while (MRUK.Instance == null && t < 8f)
            {
                t += Time.deltaTime;
                yield return null;
            }

            if (MRUK.Instance == null)
            {
                // Keep watching — MRUK can appear after the initial window.
                float linger = 0f;
                while (MRUK.Instance == null && linger < SceneTimeout)
                {
                    linger += Time.deltaTime;
                    yield return null;
                }
                if (MRUK.Instance == null)
                {
                    ShowUnscanned();
                    yield break;
                }
            }

            MRUK.Instance.RegisterSceneLoadedCallback(OnSceneLoaded);
            // Scene may already be loaded before we registered.
            var existing = MRUK.Instance.GetCurrentRoom();
            if (existing != null && existing.Anchors != null && existing.Anchors.Count > 0)
            {
                OnSceneLoaded();
                yield break;
            }

            float wait = 0f;
            while (!_sceneReady && wait < SceneTimeout)
            {
                wait += Time.deltaTime;
                yield return null;
            }
            if (!_sceneReady)
                ShowUnscanned();
        }

        void OnSceneLoaded()
        {
            _room = MRUK.Instance != null ? MRUK.Instance.GetCurrentRoom() : null;
            if (_room == null || _room.Anchors == null || _room.Anchors.Count == 0)
            {
                ShowUnscanned();
                return;
            }
            _sceneReady = true;
            var stand = FloorInFront();
            _body.StandAt(stand, CameraPoint());
            _nextMoveAt = Time.time + 8f;
            StickSavedReminders();
            Debug.Log("[Jarvis] room scan ready — moved off camera fallback");
        }

        void ShowUnscanned()
        {
            TryPlaceInFrontOfCamera(force: true);
            if (_saidUnscanned)
                return;
            _saidUnscanned = true;
            if (_speaker != null)
                _speaker.Say(UnscannedLine);
            Debug.Log("[Jarvis] " + UnscannedLine);
        }

        bool TryPlaceInFrontOfCamera(bool force)
        {
            if (_body == null)
                return false;
            var cam = FindXrCamera();
            if (cam == null && !force)
                return false;

            Vector3 origin;
            Vector3 forward;
            float floorY;
            if (cam != null)
            {
                origin = cam.transform.position;
                forward = cam.transform.forward;
                floorY = FloorYFromCamera(cam);
            }
            else
            {
                origin = Vector3.up * FallbackEyeHeight;
                forward = Vector3.forward;
                floorY = 0f;
            }

            forward.y = 0f;
            if (forward.sqrMagnitude < 0.01f)
                forward = Vector3.forward;
            forward.Normalize();

            var floor = origin + forward * FallbackDistance;
            floor.y = floorY;
            _body.StandAt(floor, origin);
            _fallbackPlaced = true;
            return true;
        }

        static float FloorYFromCamera(Camera cam)
        {
            // Floor-level tracking: feet near y=0. Otherwise estimate from eye height.
            var y = cam.transform.position.y - FallbackEyeHeight;
            return y > -0.5f && y < 0.5f ? 0f : y;
        }

        static Camera FindXrCamera()
        {
            if (Camera.main != null)
                return Camera.main;
            var tagged = GameObject.FindGameObjectWithTag("MainCamera");
            if (tagged != null)
            {
                var c = tagged.GetComponent<Camera>();
                if (c != null && c.enabled)
                    return c;
            }
            Camera best = null;
            foreach (var cam in Camera.allCameras)
            {
                if (cam == null || !cam.enabled)
                    continue;
                if (cam.stereoTargetEye != StereoTargetEyeMask.None)
                    return cam;
                if (best == null)
                    best = cam;
            }
            return best;
        }

        void Update()
        {
            if (!_sceneReady || _body == null || _body.Busy)
                return;
            if (_speaker != null && _speaker.IsSpeaking)
                return;
            if (Time.time < _nextMoveAt)
                return;
            _nextMoveAt = Time.time + Random.Range(16f, 26f);
            if (_sitting)
            {
                var stand = FloorInFront();
                _body.PhaseTo(stand + Vector3.up * 0.96f, CameraPoint(), false);
                _sitting = false;
                return;
            }
            if (TryFurniture(out var hips, out var look))
            {
                _body.PhaseTo(hips, look, true);
                _sitting = true;
                return;
            }
            if (TryFloorWalk(out var floor))
                _body.WalkTo(floor, CameraPoint());
        }

        public void RemindAtDoor(string text, JarvisSpeaker speaker, JarvisPanels panels)
        {
            var reminder = JarvisMemory.AddReminder("door", text);
            if (!string.IsNullOrEmpty(reminder.id))
                _shownReminderIds.Add(reminder.id);
            if (!TryDoorPose(out var pos, out var rot, out var parent))
            {
                var cam = FindXrCamera();
                pos = cam != null ? cam.transform.position + FlatForward(cam) * 1.1f : Vector3.forward;
                rot = cam != null ? Quaternion.LookRotation(FlatForward(cam)) : Quaternion.identity;
                parent = null;
                speaker.Say("No door in this scan. I'll keep it, and stick it on the door once Space Setup has one. For now it's in front of you.");
            }
            else
            {
                speaker.Say("On the door. " + text);
            }
            var note = JarvisPanels.DoorNote(parent, pos, rot, text);
            panels.ShowCaption(text, 6f);
            if (note != null)
                _shownReminderIds.Add("live");
        }

        void StickSavedReminders()
        {
            foreach (var reminder in JarvisMemory.Data.reminders)
            {
                if (reminder == null || reminder.place != "door" || string.IsNullOrEmpty(reminder.id))
                    continue;
                if (_shownReminderIds.Contains(reminder.id))
                    continue;
                if (!TryDoorPose(out var pos, out var rot, out var parent))
                    continue;
                JarvisPanels.DoorNote(parent, pos, rot, reminder.text);
                _shownReminderIds.Add(reminder.id);
            }
        }

        bool TryDoorPose(out Vector3 pos, out Quaternion rot, out Transform parent)
        {
            pos = default;
            rot = Quaternion.identity;
            parent = null;
            var door = FindLabel(MRUKAnchor.SceneLabels.DOOR_FRAME);
            if (door == null || _room == null)
                return false;
            var center = door.GetAnchorCenter();
            var face = _room.GetFacingDirection(door);
            if (face.sqrMagnitude < 0.001f)
                face = door.transform.forward;
            pos = center + face.normalized * 0.06f;
            pos.y = FloorY() + 1.45f;
            rot = Quaternion.LookRotation(-face.normalized, Vector3.up);
            parent = door.transform;
            return true;
        }

        bool TryFurniture(out Vector3 hips, out Vector3 look)
        {
            hips = default;
            look = CameraPoint();
            var couch = FindLabel(MRUKAnchor.SceneLabels.COUCH);
            var seats = couch != null ? _room.GetSeatPoses() : null;
            if (seats != null && seats.Length > 0)
            {
                var seat = seats[0];
                hips = SeatHips(couch, seat.position);
                look = hips + (seat.rotation * Vector3.forward);
                return true;
            }
            var bed = FindLabel(MRUKAnchor.SceneLabels.BED);
            if (bed != null)
            {
                hips = TopHips(bed);
                look = CameraPoint();
                return true;
            }
            var table = FindLabel(MRUKAnchor.SceneLabels.TABLE);
            if (table != null)
            {
                hips = TopHips(table);
                look = CameraPoint();
                return true;
            }
            return false;
        }

        static Vector3 SeatHips(MRUKAnchor anchor, Vector3 seat)
        {
            var hips = seat;
            if (anchor.VolumeBounds.HasValue)
            {
                var bounds = anchor.VolumeBounds.Value;
                var top = anchor.transform.TransformPoint(bounds.center + Vector3.up * bounds.extents.y);
                hips.y = top.y + 0.06f;
            }
            else
            {
                hips.y = seat.y + 0.08f;
            }
            return hips;
        }

        static Vector3 TopHips(MRUKAnchor anchor)
        {
            var center = anchor.GetAnchorCenter();
            if (anchor.VolumeBounds.HasValue)
            {
                var bounds = anchor.VolumeBounds.Value;
                var top = anchor.transform.TransformPoint(bounds.center + Vector3.up * bounds.extents.y);
                top.y += 0.06f;
                return top;
            }
            center.y += 0.45f;
            return center;
        }

        bool TryFloorWalk(out Vector3 floor)
        {
            floor = default;
            if (_room == null)
                return false;
            if (_room.GenerateRandomPositionOnSurface(MRUK.SurfaceType.FACING_UP, 0.35f, new LabelFilter(MRUKAnchor.SceneLabels.FLOOR), out var pos, out _))
            {
                pos.y = FloorY();
                floor = pos;
                return true;
            }
            return false;
        }

        Vector3 FloorInFront()
        {
            var cam = FindXrCamera();
            var origin = cam != null ? cam.transform.position : Vector3.zero;
            var forward = FlatForward(cam);
            var spot = origin + forward * 1.45f;
            spot.y = FloorY();
            return spot;
        }

        float FloorY()
        {
            if (_room != null && _room.FloorAnchor != null)
                return _room.FloorAnchor.transform.position.y;
            var cam = FindXrCamera();
            return cam != null ? FloorYFromCamera(cam) : 0f;
        }

        Vector3 CameraPoint()
        {
            var cam = FindXrCamera();
            return cam != null ? cam.transform.position : transform.position + transform.forward;
        }

        static Vector3 FlatForward(Camera cam)
        {
            var forward = cam != null ? cam.transform.forward : Vector3.forward;
            forward.y = 0f;
            if (forward.sqrMagnitude < 0.01f)
                forward = Vector3.forward;
            return forward.normalized;
        }

        MRUKAnchor FindLabel(MRUKAnchor.SceneLabels label)
        {
            if (_room == null || _room.Anchors == null)
                return null;
            foreach (var anchor in _room.Anchors)
            {
                if (anchor != null && anchor.HasAnyLabel(label))
                    return anchor;
            }
            return null;
        }
    }
}

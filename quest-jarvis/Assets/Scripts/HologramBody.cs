using System.Collections;
using UnityEngine;

namespace QuestJarvis
{
    /// <summary>
    /// Humanoid hologram (Mixamo or CC0 KayKit) with idle / walk / sit / talk.
    /// Procedural fallback only when Resources/Jarvis/HumanoidBody is missing.
    /// </summary>
    [DefaultExecutionOrder(50)]
    public class HologramBody : MonoBehaviour
    {
        public Transform Head { get; private set; }
        public bool Busy { get; private set; }
        public bool IsSitting { get; private set; }

        Animator _animator;
        GameObject _modelRoot;
        Renderer[] _renderers;
        Material _bodyMat;
        Material _eyeMat;
        bool _humanoid;

        Transform _hips;
        Transform _spine;
        Transform _chest;
        Transform _neck;
        Transform _head;
        Transform _armL;
        Transform _foreL;
        Transform _armR;
        Transform _foreR;
        Transform _thighL;
        Transform _shinL;
        Transform _thighR;
        Transform _shinR;

        float _dissolve;
        float _sit;
        float _walk;
        float _talk;
        float _walkPhase;
        float _faceYaw;
        static readonly int SpeedHash = Animator.StringToHash("Speed");
        static readonly int SitHash = Animator.StringToHash("Sit");
        static readonly int TalkHash = Animator.StringToHash("Talk");

        const float HipHeight = 0.96f;
        const float AimAngle = 25f;
        const float AimDistance = 5f;

        public void Build()
        {
            if (TryBuildHumanoid())
            {
                _humanoid = true;
                Debug.Log("[Jarvis] hologram humanoid rig");
                return;
            }
            _humanoid = false;
            BuildProcedural();
            Debug.Log("[Jarvis] hologram procedural fallback");
        }

        bool TryBuildHumanoid()
        {
            var prefab = Resources.Load<GameObject>("Jarvis/HumanoidBody");
            if (prefab == null)
                return false;

            _modelRoot = Instantiate(prefab, transform, false);
            _modelRoot.name = "HumanoidMesh";
            _modelRoot.transform.localPosition = Vector3.zero;
            _modelRoot.transform.localRotation = Quaternion.identity;
            _modelRoot.transform.localScale = Vector3.one;

            _animator = _modelRoot.GetComponent<Animator>();
            if (_animator == null)
                _animator = _modelRoot.GetComponentInChildren<Animator>();
            _renderers = _modelRoot.GetComponentsInChildren<Renderer>(true);
            _bodyMat = MakeHoloMat(new Color(0.2f, 0.95f, 1f, 0.72f), 2.2f);
            ApplyDissolveToRenderers(0f);

            Head = FindHead(_modelRoot.transform);
            if (Head == null)
                Head = _modelRoot.transform;

            var aim = gameObject.AddComponent<CapsuleCollider>();
            aim.center = new Vector3(0f, 0.9f, 0f);
            aim.height = 1.75f;
            aim.radius = 0.28f;
            aim.isTrigger = true;
            return true;
        }

        static Transform FindHead(Transform root)
        {
            if (root == null)
                return null;
            foreach (var t in root.GetComponentsInChildren<Transform>(true))
            {
                var n = t.name.ToLowerInvariant();
                if (n.Contains("head") && !n.Contains("headtop") && !n.Contains("end"))
                    return t;
            }
            return null;
        }

        void BuildProcedural()
        {
            _bodyMat = MakeHoloMat(new Color(0.2f, 0.95f, 1f, 0.88f), 2.8f);
            _eyeMat = MakeHoloMat(new Color(0.85f, 1f, 1f, 1f), 3.6f);

            _hips = transform;
            Limb(_hips, PrimitiveType.Sphere, new Vector3(0.22f, 0.16f, 0.16f), Vector3.zero, _bodyMat);

            _spine = Joint("Spine", _hips, new Vector3(0f, 0.12f, 0f));
            Limb(_spine, PrimitiveType.Capsule, new Vector3(0.16f, 0.12f, 0.12f), new Vector3(0f, 0.06f, 0f), _bodyMat);

            _chest = Joint("Chest", _spine, new Vector3(0f, 0.16f, 0f));
            Limb(_chest, PrimitiveType.Capsule, new Vector3(0.24f, 0.14f, 0.12f), new Vector3(0f, 0.06f, 0f), _bodyMat);

            _neck = Joint("Neck", _chest, new Vector3(0f, 0.18f, 0f));
            _head = Joint("Head", _neck, new Vector3(0f, 0.07f, 0f));
            Head = _head;
            Limb(_head, PrimitiveType.Sphere, new Vector3(0.17f, 0.19f, 0.17f), new Vector3(0f, 0.08f, 0f), _bodyMat);

            _armL = Joint("UpperArmL", _chest, new Vector3(-0.18f, 0.14f, 0f));
            Limb(_armL, PrimitiveType.Capsule, new Vector3(0.06f, 0.22f, 0.06f), new Vector3(0f, -0.11f, 0f), _bodyMat);
            _foreL = Joint("ForeArmL", _armL, new Vector3(0f, -0.22f, 0f));
            Limb(_foreL, PrimitiveType.Capsule, new Vector3(0.05f, 0.20f, 0.05f), new Vector3(0f, -0.10f, 0f), _bodyMat);

            _armR = Joint("UpperArmR", _chest, new Vector3(0.18f, 0.14f, 0f));
            Limb(_armR, PrimitiveType.Capsule, new Vector3(0.06f, 0.22f, 0.06f), new Vector3(0f, -0.11f, 0f), _bodyMat);
            _foreR = Joint("ForeArmR", _armR, new Vector3(0f, -0.22f, 0f));
            Limb(_foreR, PrimitiveType.Capsule, new Vector3(0.05f, 0.20f, 0.05f), new Vector3(0f, -0.10f, 0f), _bodyMat);

            _thighL = Joint("ThighL", _hips, new Vector3(-0.09f, -0.02f, 0f));
            Limb(_thighL, PrimitiveType.Capsule, new Vector3(0.08f, 0.34f, 0.08f), new Vector3(0f, -0.17f, 0f), _bodyMat);
            _shinL = Joint("ShinL", _thighL, new Vector3(0f, -0.34f, 0f));
            Limb(_shinL, PrimitiveType.Capsule, new Vector3(0.07f, 0.32f, 0.07f), new Vector3(0f, -0.16f, 0f), _bodyMat);

            _thighR = Joint("ThighR", _hips, new Vector3(0.09f, -0.02f, 0f));
            Limb(_thighR, PrimitiveType.Capsule, new Vector3(0.08f, 0.34f, 0.08f), new Vector3(0f, -0.17f, 0f), _bodyMat);
            _shinR = Joint("ShinR", _thighR, new Vector3(0f, -0.34f, 0f));
            Limb(_shinR, PrimitiveType.Capsule, new Vector3(0.07f, 0.32f, 0.07f), new Vector3(0f, -0.16f, 0f), _bodyMat);

            var aim = gameObject.AddComponent<CapsuleCollider>();
            aim.center = new Vector3(0f, 0.15f, 0f);
            aim.height = 1.7f;
            aim.radius = 0.28f;
            aim.isTrigger = true;
        }

        static Material MakeHoloMat(Color color, float brightness)
        {
            var shader = Shader.Find("QuestJarvis/HologramScanline");
            if (shader == null || !shader.isSupported)
                shader = Shader.Find("Unlit/Color");
            if (shader == null)
                shader = Shader.Find("Sprites/Default");
            if (shader == null)
                return null;
            var mat = new Material(shader);
            mat.color = color;
            if (mat.HasProperty("_Color"))
                mat.SetColor("_Color", color);
            if (mat.HasProperty("_Brightness"))
                mat.SetFloat("_Brightness", brightness);
            if (mat.HasProperty("_Dissolve"))
                mat.SetFloat("_Dissolve", 0f);
            return mat;
        }

        static Transform Joint(string name, Transform parent, Vector3 localPos)
        {
            var t = new GameObject(name).transform;
            t.SetParent(parent, false);
            t.localPosition = localPos;
            t.localRotation = Quaternion.identity;
            return t;
        }

        static void Limb(Transform parent, PrimitiveType type, Vector3 scale, Vector3 localPos, Material mat)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = parent.name + "Mesh";
            var col = go.GetComponent<Collider>();
            if (col != null)
                Destroy(col);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localRotation = Quaternion.identity;
            go.transform.localScale = scale;
            var renderer = go.GetComponent<Renderer>();
            if (mat != null)
                renderer.sharedMaterial = mat;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;
        }

        public bool IsUserAimedAt()
        {
            var cam = JarvisCamera.Find();
            if (cam == null || Head == null)
                return false;
            var to = Head.position - cam.transform.position;
            if (to.sqrMagnitude > AimDistance * AimDistance)
                return false;
            return Vector3.Angle(cam.transform.forward, to) <= AimAngle;
        }

        public void PlaceHips(Vector3 hipsWorld, Vector3 lookAtWorld)
        {
            transform.position = hipsWorld;
            Face(lookAtWorld);
        }

        public void Face(Vector3 worldPoint)
        {
            var flat = worldPoint - transform.position;
            flat.y = 0f;
            if (flat.sqrMagnitude < 0.0001f)
                return;
            _faceYaw = Quaternion.LookRotation(flat.normalized, Vector3.up).eulerAngles.y;
            transform.rotation = Quaternion.Euler(0f, _faceYaw, 0f);
        }

        public void SetTalking(bool talking)
        {
            _talk = talking ? 1f : 0f;
            if (_animator != null)
                _animator.SetBool(TalkHash, talking);
        }

        public void StandAt(Vector3 floorPoint, Vector3 lookAt)
        {
            StopAllCoroutines();
            Busy = false;
            IsSitting = false;
            _sit = 0f;
            _walk = 0f;
            SetAnimatorLocomotion(0f, false);
            PlaceHips(floorPoint + Vector3.up * HipHeight, lookAt);
            SetDissolve(0f);
        }

        public void WalkTo(Vector3 floorPoint, Vector3 lookBeyond)
        {
            if (Busy)
                return;
            StartCoroutine(WalkRoutine(floorPoint, lookBeyond));
        }

        public void PhaseTo(Vector3 hipsWorld, Vector3 lookAt, bool sit)
        {
            if (Busy)
                return;
            StartCoroutine(PhaseRoutine(hipsWorld, lookAt, sit));
        }

        IEnumerator WalkRoutine(Vector3 floorPoint, Vector3 lookBeyond)
        {
            Busy = true;
            IsSitting = false;
            _sit = 0f;
            _walk = 1f;
            SetAnimatorLocomotion(1f, false);
            var dest = floorPoint + Vector3.up * HipHeight;
            while (Vector3.Distance(transform.position, dest) > 0.08f)
            {
                Face(dest);
                transform.position = Vector3.MoveTowards(transform.position, dest, 0.85f * Time.deltaTime);
                _walkPhase += Time.deltaTime * 6.2f;
                yield return null;
            }
            transform.position = dest;
            Face(lookBeyond);
            _walk = 0f;
            SetAnimatorLocomotion(0f, false);
            Busy = false;
        }

        IEnumerator PhaseRoutine(Vector3 hipsWorld, Vector3 lookAt, bool sit)
        {
            Busy = true;
            _walk = 0f;
            SetAnimatorLocomotion(0f, false);
            yield return Dissolve(1f, 0.45f);
            transform.position = hipsWorld;
            Face(lookAt);
            IsSitting = sit;
            _sit = sit ? 1f : 0f;
            SetAnimatorLocomotion(0f, sit);
            yield return Dissolve(0f, 0.55f);
            Busy = false;
        }

        void SetAnimatorLocomotion(float speed, bool sit)
        {
            if (_animator == null)
                return;
            _animator.SetFloat(SpeedHash, speed);
            _animator.SetBool(SitHash, sit);
        }

        IEnumerator Dissolve(float target, float seconds)
        {
            float start = _dissolve;
            float t = 0f;
            while (t < seconds)
            {
                t += Time.deltaTime;
                SetDissolve(Mathf.Lerp(start, target, Mathf.Clamp01(t / seconds)));
                yield return null;
            }
            SetDissolve(target);
        }

        void SetDissolve(float value)
        {
            _dissolve = value;
            if (_bodyMat != null)
                _bodyMat.SetFloat("_Dissolve", value);
            if (_eyeMat != null)
                _eyeMat.SetFloat("_Dissolve", value);
            ApplyDissolveToRenderers(value);
        }

        void ApplyDissolveToRenderers(float value)
        {
            if (_renderers == null || _bodyMat == null)
                return;
            _bodyMat.SetFloat("_Dissolve", value);
            foreach (var renderer in _renderers)
            {
                if (renderer == null)
                    continue;
                var mats = renderer.materials;
                for (int i = 0; i < mats.Length; i++)
                {
                    if (mats[i] == null)
                        mats[i] = _bodyMat;
                    if (mats[i].HasProperty("_Dissolve"))
                        mats[i].SetFloat("_Dissolve", value);
                }
            }
        }

        void Update()
        {
            if (_humanoid)
                return;

            var cam = JarvisCamera.Find();
            if (_talk > 0f && cam != null)
                Face(cam.transform.position);

            float time = Time.time;
            float breathe = Mathf.Sin(time * 1.4f);
            float sway = Mathf.Sin(time * 0.7f);
            float step = Mathf.Sin(_walkPhase);
            float stepOpp = Mathf.Sin(_walkPhase + Mathf.PI);

            if (_spine != null)
                _spine.localRotation = Quaternion.Euler(breathe * 2.2f * (1f - _sit), sway * 3f * (1f - _walk), 0f);
            if (_chest != null)
                _chest.localRotation = Quaternion.Euler(1.5f + breathe * 1.6f - _sit * 8f, 0f, 0f);
            if (_head != null)
            {
                float nod = _talk * Mathf.Sin(time * 5.5f) * 6f;
                _head.localRotation = Quaternion.Euler(nod + sway * 2f, Mathf.Sin(time * 0.5f) * 6f, 0f);
            }

            PoseArm(_armL, _foreL, -16f, stepOpp, true);
            PoseArm(_armR, _foreR, 16f, step, false);
            PoseLeg(_thighL, _shinL, step);
            PoseLeg(_thighR, _shinR, stepOpp);
        }

        void PoseArm(Transform upper, Transform fore, float restZ, float step, bool gesture)
        {
            if (upper == null)
                return;
            float hang = Mathf.Lerp(restZ, restZ * 0.3f, _sit);
            float swing = _walk * step * 28f;
            float talkLift = 0f;
            float elbow = 8f + _sit * 20f;
            if (gesture && _talk > 0f)
            {
                talkLift = -28f + Mathf.Sin(Time.time * 4.2f) * 14f;
                elbow = 40f + Mathf.Sin(Time.time * 4.2f) * 18f;
            }
            upper.localRotation = Quaternion.Euler(swing + talkLift, 0f, hang);
            if (fore != null)
                fore.localRotation = Quaternion.Euler(elbow, 0f, 0f);
        }

        void PoseLeg(Transform thigh, Transform shin, float step)
        {
            if (thigh == null)
                return;
            float walkX = _walk * step * 38f;
            float sitThigh = _sit * -82f;
            float sitShin = _sit * 78f;
            float knee = Mathf.Max(0f, -step) * 50f * _walk;
            thigh.localRotation = Quaternion.Euler(walkX + sitThigh, 0f, 0f);
            if (shin != null)
                shin.localRotation = Quaternion.Euler(knee + sitShin, 0f, 0f);
        }
    }
}

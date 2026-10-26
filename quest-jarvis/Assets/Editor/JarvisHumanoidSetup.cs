using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace QuestJarvis.Editor
{
    /// <summary>
    /// Builds Resources/Jarvis/HumanoidBody.prefab from Mixamo/User or CC0 KayKit assets.
    /// </summary>
    public static class JarvisHumanoidSetup
    {
        const string ResourcesDir = "Assets/Resources/Jarvis";
        const string PrefabPath = ResourcesDir + "/HumanoidBody.prefab";
        const string ControllerPath = "Assets/Mixamo/JarvisHumanoid.controller";
        const string UserDir = "Assets/Mixamo/User";
        const string Cc0Dir = "Assets/Mixamo/CC0";

        public static void EnsureHumanoid()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Mixamo"))
                AssetDatabase.CreateFolder("Assets", "Mixamo");
            if (!AssetDatabase.IsValidFolder("Assets/Resources"))
                AssetDatabase.CreateFolder("Assets", "Resources");
            if (!AssetDatabase.IsValidFolder(ResourcesDir))
                AssetDatabase.CreateFolder("Assets/Resources", "Jarvis");

            var modelPath = PickModelPath();
            if (string.IsNullOrEmpty(modelPath))
            {
                Debug.LogWarning("[Jarvis] no humanoid FBX — HologramBody will use procedural fallback");
                return;
            }

            ConfigureHumanoidModel(modelPath);
            AssetDatabase.ImportAsset(modelPath, ImportAssetOptions.ForceUpdate);
            var avatar = AssetDatabase.LoadAssetAtPath<Avatar>(modelPath);
            ConfigureClipImports(UserDir, avatar);
            ConfigureClipImports(Cc0Dir, avatar);

            var clips = CollectClips(modelPath);
            AddClipFolder(clips, UserDir);
            AddClipFolder(clips, Cc0Dir);

            var idle = PickClip(clips, "idle", "Idle_A", "Idle");
            var walk = PickClip(clips, "walk", "Walking_A", "Walking");
            var sit = PickClip(clips, "sit", "Sitting", "Sit", "Interact");
            var talk = PickClip(clips, "talk", "Talking", "Talk", "Interact");

            if (idle == null)
            {
                Debug.LogWarning("[Jarvis] humanoid idle clip missing");
                return;
            }

            walk ??= idle;
            sit ??= idle;
            talk ??= idle;

            var controller = BuildController(idle, walk, sit, talk);
            var instance = AssetDatabase.LoadAssetAtPath<GameObject>(modelPath);
            if (instance == null)
            {
                Debug.LogError("[Jarvis] model load failed " + modelPath);
                return;
            }

            var root = PrefabUtility.InstantiatePrefab(instance) as GameObject;
            if (root == null)
            {
                Debug.LogError("[Jarvis] model instantiate failed");
                return;
            }
            root.name = "JarvisHumanoid";
            root.transform.localScale = Vector3.one;
            var animator = root.GetComponent<Animator>();
            if (animator == null)
                animator = root.AddComponent<Animator>();
            animator.runtimeAnimatorController = controller;
            animator.applyRootMotion = false;

            ApplyHoloMaterial(root);
            StripColliders(root);

            var prefab = PrefabUtility.SaveAsPrefabAsset(root, PrefabPath);
            UnityEngine.Object.DestroyImmediate(root);
            if (prefab != null)
                Debug.Log("[Jarvis] humanoid prefab " + PrefabPath + " model=" + modelPath);
        }

        static string PickModelPath()
        {
            var user = Directory.Exists(UserDir)
                ? Directory.GetFiles(UserDir, "*.fbx", SearchOption.AllDirectories)
                    .FirstOrDefault(f => !LooksLikeClipOnly(f))
                : null;
            if (!string.IsNullOrEmpty(user))
                return ToAssetPath(user);

            var cc0Knight = Cc0Dir + "/Knight.fbx";
            if (File.Exists(Path.GetFullPath(Path.Combine(Application.dataPath, "..", cc0Knight))))
                return cc0Knight;

            var any = Directory.Exists(Cc0Dir)
                ? Directory.GetFiles(Cc0Dir, "*.fbx", SearchOption.AllDirectories)
                    .FirstOrDefault(f => !LooksLikeClipOnly(f))
                : null;
            return string.IsNullOrEmpty(any) ? null : ToAssetPath(any);
        }

        static bool LooksLikeClipOnly(string path)
        {
            var name = Path.GetFileName(path).ToLowerInvariant();
            return name.Contains("rig_medium") || name.Contains("movement") || name.Contains("general")
                   || name.Contains("talking") || name.Contains("idle.fbx");
        }

        static void ConfigureHumanoidModel(string assetPath)
        {
            var importer = AssetImporter.GetAtPath(assetPath) as ModelImporter;
            if (importer == null)
                return;
            importer.animationType = ModelImporterAnimationType.Human;
            importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            importer.importAnimation = true;
            importer.optimizeGameObjects = false;
            importer.materialImportMode = ModelImporterMaterialImportMode.None;
            importer.SaveAndReimport();
        }

        static void ConfigureClipImports(string folder, Avatar avatar)
        {
            if (!Directory.Exists(folder) || avatar == null)
                return;
            foreach (var file in Directory.GetFiles(folder, "*.fbx", SearchOption.AllDirectories))
            {
                if (!LooksLikeClipOnly(file))
                    continue;
                var path = ToAssetPath(file);
                var importer = AssetImporter.GetAtPath(path) as ModelImporter;
                if (importer == null)
                    continue;
                importer.animationType = ModelImporterAnimationType.Human;
                importer.avatarSetup = ModelImporterAvatarSetup.CopyFromOther;
                importer.sourceAvatar = avatar;
                importer.importAnimation = true;
                importer.materialImportMode = ModelImporterMaterialImportMode.None;
                importer.SaveAndReimport();
            }
        }

        static void AddClipFolder(Dictionary<string, AnimationClip> clips, string folder)
        {
            if (!Directory.Exists(folder))
                return;
            foreach (var file in Directory.GetFiles(folder, "*.fbx", SearchOption.AllDirectories))
            {
                var path = ToAssetPath(file);
                foreach (var clip in LoadClipsAt(path))
                {
                    if (!clips.ContainsKey(clip.name))
                        clips[clip.name] = clip;
                }
            }
        }

        static Dictionary<string, AnimationClip> CollectClips(string modelPath)
        {
            var clips = new Dictionary<string, AnimationClip>(StringComparer.OrdinalIgnoreCase);
            foreach (var clip in LoadClipsAt(modelPath))
                clips[clip.name] = clip;
            return clips;
        }

        static IEnumerable<AnimationClip> LoadClipsAt(string assetPath)
        {
            var assets = AssetDatabase.LoadAllAssetsAtPath(assetPath);
            foreach (var asset in assets)
            {
                if (asset is AnimationClip clip && !clip.name.StartsWith("__preview", StringComparison.Ordinal))
                    yield return clip;
            }
        }

        static AnimationClip PickClip(Dictionary<string, AnimationClip> clips, params string[] needles)
        {
            foreach (var needle in needles)
            {
                foreach (var pair in clips)
                {
                    if (pair.Key.IndexOf(needle, StringComparison.OrdinalIgnoreCase) >= 0)
                        return pair.Value;
                }
            }
            return clips.Values.FirstOrDefault();
        }

        static AnimatorController BuildController(AnimationClip idle, AnimationClip walk, AnimationClip sit, AnimationClip talk)
        {
            var dir = Path.GetDirectoryName(ControllerPath)?.Replace('\\', '/');
            if (!string.IsNullOrEmpty(dir) && !AssetDatabase.IsValidFolder(dir))
            {
                if (!AssetDatabase.IsValidFolder("Assets/Mixamo"))
                    AssetDatabase.CreateFolder("Assets", "Mixamo");
            }

            if (File.Exists(ControllerPath))
                AssetDatabase.DeleteAsset(ControllerPath);

            var controller = AnimatorController.CreateAnimatorControllerAtPath(ControllerPath);
            controller.AddParameter("Speed", AnimatorControllerParameterType.Float);
            controller.AddParameter("Sit", AnimatorControllerParameterType.Bool);
            controller.AddParameter("Talk", AnimatorControllerParameterType.Bool);

            var root = controller.layers[0].stateMachine;
            var idleState = root.AddState("Idle", new Vector3(240, 0, 0));
            idleState.motion = idle;
            root.defaultState = idleState;

            var walkState = root.AddState("Walk", new Vector3(240, 80, 0));
            walkState.motion = walk;
            var sitState = root.AddState("Sit", new Vector3(480, 0, 0));
            sitState.motion = sit;
            var talkState = root.AddState("Talk", new Vector3(480, 80, 0));
            talkState.motion = talk;

            idleState.AddTransition(walkState).AddCondition(AnimatorConditionMode.Greater, 0.05f, "Speed");
            walkState.AddTransition(idleState).AddCondition(AnimatorConditionMode.Less, 0.05f, "Speed");
            idleState.AddTransition(sitState).AddCondition(AnimatorConditionMode.If, 0f, "Sit");
            sitState.AddTransition(idleState).AddCondition(AnimatorConditionMode.IfNot, 0f, "Sit");
            idleState.AddTransition(talkState).AddCondition(AnimatorConditionMode.If, 0f, "Talk");
            sitState.AddTransition(talkState).AddCondition(AnimatorConditionMode.If, 0f, "Talk");
            talkState.AddTransition(idleState).AddCondition(AnimatorConditionMode.IfNot, 0f, "Talk");

            EditorUtility.SetDirty(controller);
            return controller;
        }

        static void ApplyHoloMaterial(GameObject root)
        {
            var mat = CreateHoloMaterialAsset();
            foreach (var renderer in root.GetComponentsInChildren<Renderer>(true))
            {
                var mats = new Material[renderer.sharedMaterials.Length];
                for (int i = 0; i < mats.Length; i++)
                    mats[i] = mat;
                renderer.sharedMaterials = mats;
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;
            }
        }

        static Material CreateHoloMaterialAsset()
        {
            var shader = Shader.Find("QuestJarvis/HologramScanline") ?? Shader.Find("Unlit/Color");
            var mat = new Material(shader);
            mat.color = new Color(0.2f, 0.95f, 1f, 0.72f);
            if (mat.HasProperty("_Color"))
                mat.SetColor("_Color", mat.color);
            if (mat.HasProperty("_Brightness"))
                mat.SetFloat("_Brightness", 2.2f);
            if (mat.HasProperty("_Dissolve"))
                mat.SetFloat("_Dissolve", 0f);
            var path = "Assets/Materials/JarvisHologramBody.mat";
            if (!AssetDatabase.IsValidFolder("Assets/Materials"))
                AssetDatabase.CreateFolder("Assets", "Materials");
            AssetDatabase.CreateAsset(mat, path);
            return AssetDatabase.LoadAssetAtPath<Material>(path);
        }

        static void StripColliders(GameObject root)
        {
            foreach (var col in root.GetComponentsInChildren<Collider>(true))
                UnityEngine.Object.DestroyImmediate(col);
        }

        static string ToAssetPath(string fullPath)
        {
            fullPath = Path.GetFullPath(fullPath).Replace('\\', '/');
            var data = Path.GetFullPath(Application.dataPath).Replace('\\', '/');
            if (!fullPath.StartsWith(data, StringComparison.OrdinalIgnoreCase))
                return fullPath;
            return "Assets" + fullPath.Substring(data.Length);
        }
    }
}

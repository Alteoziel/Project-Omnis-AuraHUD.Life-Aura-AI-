using System;
using System.IO;
using System.Linq;
using System.Reflection;
using Meta.XR.MRUtilityKit;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.Rendering;

namespace QuestJarvis.Editor
{
    public static class QuestJarvisBuild
    {
        const string PackageName = "com.alteoziel.questjarvis";
        const string ScenePath = "Assets/Scenes/JarvisRoom.unity";
        const string KeystorePathRelative = "Signing/quest-jarvis-debug.keystore";

        public static void SetupOnly()
        {
            try
            {
                ConfigurePlayer();
                ConfigureXr();
                ConfigureMeta();
                CreateScene();
                WriteVoiceFile();
                AssetDatabase.SaveAssets();
                Debug.Log("[Jarvis] setup complete " + Application.unityVersion);
                EditorApplication.Exit(0);
            }
            catch (Exception e)
            {
                Debug.LogError("[Jarvis] setup failed: " + e);
                EditorApplication.Exit(1);
            }
        }

        public static void BuildApk()
        {
            try
            {
                ConfigurePlayer();
                ConfigureXr();
                ConfigureMeta();
                if (!File.Exists(ScenePath))
                    CreateScene();
                WriteVoiceFile();
                AssetDatabase.SaveAssets();
                var outPath = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "Builds", "QuestJarvis-debug.apk"));
                Directory.CreateDirectory(Path.GetDirectoryName(outPath));
                var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
                {
                    scenes = new[] { ScenePath },
                    locationPathName = outPath,
                    target = BuildTarget.Android,
                    targetGroup = BuildTargetGroup.Android,
                    options = BuildOptions.None
                });
                Debug.Log("[Jarvis] build result " + report.summary.result + " " + outPath);
                if (report.summary.result != BuildResult.Succeeded)
                {
                    EditorApplication.Exit(1);
                    return;
                }
                Debug.Log("[Jarvis] apk bytes " + new FileInfo(outPath).Length);
                EditorApplication.Exit(0);
            }
            catch (Exception e)
            {
                Debug.LogError("[Jarvis] build failed: " + e);
                EditorApplication.Exit(1);
            }
        }

        static void ConfigurePlayer()
        {
            PlayerSettings.companyName = "Alteoziel";
            PlayerSettings.productName = "Jarvis";
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, PackageName);
            PlayerSettings.bundleVersion = "1.0.0";
            PlayerSettings.Android.bundleVersionCode = 1;
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.Android, Il2CppCompilerConfiguration.Release);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel32;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevel34;
            PlayerSettings.Android.forceInternetPermission = true;
            PlayerSettings.Android.preferredInstallLocation = AndroidPreferredInstallLocation.Auto;
            PlayerSettings.SetMobileMTRendering(BuildTargetGroup.Android, true);
            PlayerSettings.stereoRenderingPath = StereoRenderingPath.Instancing;
            PlayerSettings.SplashScreen.show = false;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { GraphicsDeviceType.Vulkan, GraphicsDeviceType.OpenGLES3 });
            EditorUserBuildSettings.development = false;
            EditorUserBuildSettings.buildAppBundle = false;
            EditorUserBuildSettings.androidBuildSystem = AndroidBuildSystem.Gradle;
            EditorUserBuildSettings.exportAsGoogleAndroidProject = false;

            var projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            var keystore = Path.Combine(projectRoot, KeystorePathRelative);
            var passFile = Path.Combine(projectRoot, "Signing", "keystore.pass");
            var pass = File.Exists(passFile) ? File.ReadAllText(passFile).Trim() : null;
            if (File.Exists(keystore) && !string.IsNullOrEmpty(pass))
            {
                PlayerSettings.Android.useCustomKeystore = true;
                PlayerSettings.Android.keystoreName = keystore;
                PlayerSettings.Android.keystorePass = pass;
                PlayerSettings.Android.keyaliasName = "jarvis";
                PlayerSettings.Android.keyaliasPass = pass;
            }
            else
            {
                Debug.LogWarning("[Jarvis] debug keystore missing at " + keystore);
                PlayerSettings.Android.useCustomKeystore = false;
            }

        }

        static void ConfigureXr()
        {
            var store = FindType("UnityEditor.XR.Management.Metadata.XRPackageMetadataStore");
            var generalPer = FindType("UnityEditor.XR.Management.XRGeneralSettingsPerBuildTarget");
            var generalType = FindType("UnityEngine.XR.Management.XRGeneralSettings");
            var managerType = FindType("UnityEngine.XR.Management.XRManagerSettings");
            if (store == null || generalPer == null || generalType == null || managerType == null)
            {
                Debug.LogError("[Jarvis] XR Management assemblies missing");
                return;
            }

            var forTarget = generalPer.GetMethod("XRGeneralSettingsForBuildTarget", BindingFlags.Public | BindingFlags.Static);
            var settings = forTarget.Invoke(null, new object[] { BuildTargetGroup.Android });
            if (settings == null)
            {
                if (!AssetDatabase.IsValidFolder("Assets/XR"))
                    AssetDatabase.CreateFolder("Assets", "XR");
                settings = ScriptableObject.CreateInstance(generalType);
                AssetDatabase.CreateAsset((UnityEngine.Object)settings, "Assets/XR/XRGeneralSettings.asset");
                var set = generalPer.GetMethod("SetSettingsForBuildTarget", BindingFlags.Public | BindingFlags.Static);
                if (set != null)
                    set.Invoke(null, new object[] { BuildTargetGroup.Android, settings });
            }

            var managerProp = settings.GetType().GetProperty("Manager", BindingFlags.Public | BindingFlags.Instance);
            var manager = managerProp != null ? managerProp.GetValue(settings) : null;
            if (manager == null)
            {
                manager = ScriptableObject.CreateInstance(managerType);
                AssetDatabase.CreateAsset((UnityEngine.Object)manager, "Assets/XR/XRManagerSettings.asset");
                if (managerProp != null && managerProp.CanWrite)
                    managerProp.SetValue(settings, manager);
                else
                {
                    var so = new SerializedObject((UnityEngine.Object)settings);
                    var prop = so.FindProperty("m_LoaderManagerInstance");
                    if (prop != null)
                    {
                        prop.objectReferenceValue = (UnityEngine.Object)manager;
                        so.ApplyModifiedPropertiesWithoutUndo();
                    }
                }
            }

            var assign = store.GetMethod("AssignLoader", BindingFlags.Public | BindingFlags.Static);
            if (assign == null)
            {
                Debug.LogError("[Jarvis] AssignLoader missing");
                return;
            }
            object assigned = false;
            foreach (var loaderName in new[] { "UnityEngine.XR.OpenXR.OpenXRLoader", "Unity.XR.Oculus.OculusLoader" })
            {
                assigned = assign.Invoke(null, new[] { manager, loaderName, (object)BuildTargetGroup.Android });
                Debug.Log("[Jarvis] loader " + loaderName + " assigned=" + assigned);
                if (assigned is bool ok && ok)
                    break;
            }
            EnableOpenXrMetaFeatures();
            EditorUtility.SetDirty((UnityEngine.Object)settings);
            if (manager is UnityEngine.Object managerObj)
                EditorUtility.SetDirty(managerObj);
        }

        static void ConfigureMeta()
        {
            var configType = FindType("OVRProjectConfig");
            if (configType == null)
            {
                Debug.LogError("[Jarvis] OVRProjectConfig missing");
                return;
            }
            object config = null;
            var get = configType.GetMethod("GetProjectConfig", BindingFlags.Public | BindingFlags.Static);
            if (get != null)
                config = get.Invoke(null, null);
            if (config == null)
            {
                var prop = configType.GetProperty("CachedProjectConfig", BindingFlags.Public | BindingFlags.Static);
                if (prop != null)
                    config = prop.GetValue(null);
            }
            if (config == null)
            {
                Debug.LogError("[Jarvis] could not create OVRProjectConfig");
                return;
            }
            foreach (var field in configType.GetFields(BindingFlags.Public | BindingFlags.Instance))
                Debug.Log("[Jarvis] cfg " + field.Name + " " + field.FieldType.Name);
            SetRequired(config, "insightPassthroughSupport");
            SetRequired(config, "passthroughSupport");
            SetRequired(config, "sceneSupport");
            SetEnumByName(config, "anchorSupport", "Enabled");
            SetBool(config, "insightPassthroughEnabled", true);
            SetBool(config, "sceneSupportEnabled", true);
            SetQuest3(config);
            if (config is UnityEngine.Object obj)
            {
                EditorUtility.SetDirty(obj);
                AssetDatabase.SaveAssets();
            }
            TryMenu("Meta/Tools/Update AndroidManifest.xml");
            TryMenu("Oculus/Tools/Update AndroidManifest.xml");
            TryMenu("Window/Meta/Tools/Update AndroidManifest.xml");
        }

        static void CreateScene()
        {
            var scene = UnityEditor.SceneManagement.EditorSceneManager.NewScene(
                UnityEditor.SceneManagement.NewSceneSetup.EmptyScene,
                UnityEditor.SceneManagement.NewSceneMode.Single);
            RenderSettings.skybox = null;
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = Color.black;

            var rigPrefab = FindPrefab("OVRCameraRig");
            GameObject rig;
            if (rigPrefab != null)
                rig = (GameObject)PrefabUtility.InstantiatePrefab(rigPrefab);
            else
            {
                Debug.LogError("[Jarvis] OVRCameraRig prefab not found");
                rig = new GameObject("OVRCameraRig");
            }
            rig.name = "OVRCameraRig";

            foreach (var cam in rig.GetComponentsInChildren<Camera>(true))
            {
                cam.clearFlags = CameraClearFlags.SolidColor;
                cam.backgroundColor = new Color(0f, 0f, 0f, 0f);
                cam.nearClipPlane = 0.05f;
                cam.farClipPlane = 1000f;
                // Camera.main must resolve on device — OVRCameraRig defaults to Untagged.
                if (cam.name.IndexOf("CenterEye", System.StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    try { cam.tag = "MainCamera"; }
                    catch (System.Exception e) { Debug.LogWarning("[Jarvis] MainCamera tag: " + e.Message); }
                }
            }

            var manager = rig.GetComponent("OVRManager") ?? rig.GetComponentInChildren(FindType("OVRManager"));
            if (manager != null)
            {
                SetBool(manager, "isInsightPassthroughEnabled", true);
                SetEnumByName(manager, "trackingOriginType", "FloorLevel", "Floor", "Stage");
                var so = new SerializedObject((UnityEngine.Object)manager);
                var iter = so.GetIterator();
                while (iter.NextVisible(true))
                {
                    if (iter.propertyType == SerializedPropertyType.Boolean &&
                        iter.name.IndexOf("InsightPassthrough", StringComparison.OrdinalIgnoreCase) >= 0)
                        iter.boolValue = true;
                    if (iter.propertyType == SerializedPropertyType.Boolean &&
                        iter.name.IndexOf("CameraAccess", StringComparison.OrdinalIgnoreCase) >= 0)
                        iter.boolValue = false;
                    if (iter.propertyType == SerializedPropertyType.Enum &&
                        iter.name.IndexOf("trackingOrigin", StringComparison.OrdinalIgnoreCase) >= 0)
                        SetEnumProperty(iter, "FloorLevel", "Floor", "Stage");
                }
                so.ApplyModifiedPropertiesWithoutUndo();
            }

            var layerType = FindType("OVRPassthroughLayer");
            if (layerType != null)
            {
                var layer = rig.AddComponent(layerType);
                var so = new SerializedObject(layer);
                var iter = so.GetIterator();
                while (iter.NextVisible(true))
                {
                    if (iter.propertyType == SerializedPropertyType.Enum &&
                        (iter.name.IndexOf("overlay", StringComparison.OrdinalIgnoreCase) >= 0 ||
                         iter.name.IndexOf("placement", StringComparison.OrdinalIgnoreCase) >= 0 ||
                         iter.name.IndexOf("composite", StringComparison.OrdinalIgnoreCase) >= 0))
                        SetEnumProperty(iter, "Underlay");
                }
                so.ApplyModifiedPropertiesWithoutUndo();
            }
            else
            {
                Debug.LogError("[Jarvis] OVRPassthroughLayer missing");
            }

            var mrukGo = new GameObject("MRUK");
            var mruk = mrukGo.AddComponent<MRUK>();
            mruk.SceneSettings = new MRUK.MRUKSettings
            {
                DataSource = MRUK.SceneDataSource.Device,
                LoadSceneOnStartup = true
            };
            mruk.EnableWorldLock = true;
            var mrukScript = MonoScript.FromMonoBehaviour(mruk);
            if (mrukScript != null)
                MonoImporter.SetExecutionOrder(mrukScript, 20);

            var app = new GameObject("JarvisApp");
            app.AddComponent<JarvisDirector>();

            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
                AssetDatabase.CreateFolder("Assets", "Scenes");
            UnityEditor.SceneManagement.EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }

        static void WriteVoiceFile()
        {
            var key = ReadKey();
            var dir = Path.Combine(Application.dataPath, "StreamingAssets");
            Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, "jarvis-local.json");
            if (string.IsNullOrEmpty(key))
            {
                if (File.Exists(path))
                    File.Delete(path);
                Debug.Log("[Jarvis] headset voice only");
                return;
            }
            File.WriteAllText(path, "{\"openaiKey\":" + JarvisSpeaker.JsonString(key) + "}");
            Debug.Log("[Jarvis] cloud voice file written");
        }

        static string ReadKey()
        {
            var candidates = new[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "ai-workflow-app", ".env")
            };
            foreach (var file in candidates)
            {
                if (!File.Exists(file))
                    continue;
                foreach (var line in File.ReadAllLines(file))
                {
                    var trimmed = line.Trim();
                    if (!trimmed.StartsWith("OPENAI_API_KEY=", StringComparison.Ordinal))
                        continue;
                    var value = trimmed.Substring("OPENAI_API_KEY=".Length).Trim().Trim('"').Trim('\'');
                    if (!string.IsNullOrEmpty(value))
                        return value;
                }
            }
            return null;
        }

        static void EnableOpenXrMetaFeatures()
        {
            var manager = FindType("UnityEditor.XR.OpenXR.Features.OpenXRFeatureSetManager");
            if (manager == null)
            {
                Debug.LogError("[Jarvis] OpenXRFeatureSetManager missing");
                return;
            }
            var get = manager.GetMethods(BindingFlags.Public | BindingFlags.Static)
                .FirstOrDefault(m => m.Name == "GetFeatureSetWithId" && m.GetParameters().Length == 2);
            var apply = manager.GetMethods(BindingFlags.Public | BindingFlags.Static)
                .FirstOrDefault(m => m.Name == "SetFeaturesFromEnabledFeatureSets" && m.GetParameters().Length == 1);
            if (get == null || apply == null)
            {
                Debug.LogError("[Jarvis] feature set methods missing");
                return;
            }
            var featureSet = get.Invoke(null, new object[] { BuildTargetGroup.Android, "com.meta.openxr.featureset.metaxr" });
            if (featureSet == null)
            {
                Debug.LogError("[Jarvis] Meta XR feature set not found");
                return;
            }
            var enabledField = featureSet.GetType().GetField("isEnabled", BindingFlags.Public | BindingFlags.Instance);
            if (enabledField != null && enabledField.FieldType == typeof(bool))
                enabledField.SetValue(featureSet, true);
            apply.Invoke(null, new object[] { BuildTargetGroup.Android });
            Debug.Log("[Jarvis] Meta XR feature set enabled");
            LogOpenXrFeatures();
        }

        static void LogOpenXrFeatures()
        {
            var settingsType = FindType("UnityEngine.XR.OpenXR.OpenXRSettings");
            if (settingsType == null)
                return;
            var getter = settingsType.GetMethods(BindingFlags.Public | BindingFlags.Static)
                .FirstOrDefault(m => m.Name == "GetSettingsForBuildTargetGroup" && m.GetParameters().Length == 1);
            if (getter == null)
                return;
            var settings = getter.Invoke(null, new object[] { BuildTargetGroup.Android });
            if (settings == null)
            {
                Debug.LogWarning("[Jarvis] OpenXR Android settings missing");
                return;
            }
            var getFeatures = settingsType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .FirstOrDefault(m => m.Name == "GetFeatures" && m.GetParameters().Length == 0 && !m.IsGenericMethod);
            if (getFeatures == null)
                return;
            var features = getFeatures.Invoke(settings, null) as System.Collections.IEnumerable;
            if (features == null)
                return;
            foreach (var feature in features)
            {
                if (feature == null)
                    continue;
                var name = feature.GetType().Name;
                var enabled = feature.GetType().GetProperty("enabled", BindingFlags.Public | BindingFlags.Instance);
                var on = enabled != null ? enabled.GetValue(feature) : null;
                if (name.IndexOf("Eye", StringComparison.OrdinalIgnoreCase) >= 0 && on is bool eyeOn && eyeOn)
                {
                    enabled.SetValue(feature, false);
                    Debug.Log("[Jarvis] disabled OpenXR feature " + name);
                    if (feature is UnityEngine.Object eyeObj)
                        EditorUtility.SetDirty(eyeObj);
                    continue;
                }
                Debug.Log("[Jarvis] OpenXR feature " + name + " enabled=" + on);
            }
            if (settings is UnityEngine.Object settingsObj)
                EditorUtility.SetDirty(settingsObj);
        }

        static GameObject FindPrefab(string name)
        {
            foreach (var guid in AssetDatabase.FindAssets(name + " t:Prefab"))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (path.EndsWith(name + ".prefab", StringComparison.OrdinalIgnoreCase))
                    return AssetDatabase.LoadAssetAtPath<GameObject>(path);
            }
            return null;
        }

        static Type FindType(string fullName)
        {
            foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
            {
                Type type = null;
                try { type = asm.GetType(fullName, false); }
                catch { }
                if (type != null)
                    return type;
            }
            return null;
        }

        static void SetRequired(object target, string fieldName)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.NonPublic);
            if (field == null || !field.FieldType.IsEnum)
                return;
            var match = Enum.GetNames(field.FieldType).FirstOrDefault(n => n.Equals("Required", StringComparison.OrdinalIgnoreCase));
            if (match == null)
                return;
            field.SetValue(target, Enum.Parse(field.FieldType, match));
            Debug.Log("[Jarvis] set " + fieldName + "=Required");
        }

        static void SetBool(object target, string fieldName, bool value)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.NonPublic);
            if (field == null || field.FieldType != typeof(bool))
            {
                var prop = target.GetType().GetProperty(fieldName, BindingFlags.Public | BindingFlags.Instance);
                if (prop != null && prop.PropertyType == typeof(bool) && prop.CanWrite)
                    prop.SetValue(target, value);
                return;
            }
            field.SetValue(target, value);
        }

        static void SetEnumByName(object target, string fieldName, params string[] names)
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.NonPublic);
            if (field == null || !field.FieldType.IsEnum)
            {
                var prop = target.GetType().GetProperty(fieldName, BindingFlags.Public | BindingFlags.Instance);
                if (prop == null || !prop.PropertyType.IsEnum || !prop.CanWrite)
                    return;
                var match = Enum.GetNames(prop.PropertyType).FirstOrDefault(n => names.Any(w => n.IndexOf(w, StringComparison.OrdinalIgnoreCase) >= 0));
                if (match != null)
                    prop.SetValue(target, Enum.Parse(prop.PropertyType, match));
                return;
            }
            var found = Enum.GetNames(field.FieldType).FirstOrDefault(n => names.Any(w => n.IndexOf(w, StringComparison.OrdinalIgnoreCase) >= 0));
            if (found != null)
                field.SetValue(target, Enum.Parse(field.FieldType, found));
        }

        static void SetQuest3(object config)
        {
            foreach (var field in config.GetType().GetFields(BindingFlags.Public | BindingFlags.Instance))
            {
                if (field.FieldType == typeof(bool) && field.Name.IndexOf("Quest3", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    field.SetValue(config, true);
                    Debug.Log("[Jarvis] set " + field.Name + "=true");
                }
                if (!field.FieldType.IsEnum)
                    continue;
                if (field.Name.IndexOf("target", StringComparison.OrdinalIgnoreCase) < 0 &&
                    field.Name.IndexOf("device", StringComparison.OrdinalIgnoreCase) < 0)
                    continue;
                var names = Enum.GetNames(field.FieldType);
                if (!names.Any(n => n.IndexOf("Quest3", StringComparison.OrdinalIgnoreCase) >= 0))
                    continue;
                object value = field.GetValue(config);
                long bits = Convert.ToInt64(value);
                foreach (var name in names)
                {
                    if (name.IndexOf("Quest3", StringComparison.OrdinalIgnoreCase) < 0)
                        continue;
                    bits |= Convert.ToInt64(Enum.Parse(field.FieldType, name));
                }
                field.SetValue(config, Enum.ToObject(field.FieldType, bits));
                Debug.Log("[Jarvis] device flags " + field.Name + "=" + field.GetValue(config));
            }
        }

        static void SetEnumProperty(SerializedProperty prop, params string[] names)
        {
            if (prop.enumDisplayNames == null || prop.enumDisplayNames.Length == 0)
                return;
            for (int i = 0; i < prop.enumNames.Length; i++)
            {
                var candidate = prop.enumNames[i];
                if (names.Any(n => candidate.IndexOf(n, StringComparison.OrdinalIgnoreCase) >= 0))
                {
                    prop.enumValueIndex = i;
                    return;
                }
            }
        }

        static void TryMenu(string path)
        {
            try
            {
                if (EditorApplication.ExecuteMenuItem(path))
                    Debug.Log("[Jarvis] menu " + path);
            }
            catch (Exception e)
            {
                Debug.Log("[Jarvis] menu skipped " + path + " " + e.Message);
            }
        }
    }
}

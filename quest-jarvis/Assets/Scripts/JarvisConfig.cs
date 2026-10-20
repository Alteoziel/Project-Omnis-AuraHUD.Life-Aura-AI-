using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace QuestJarvis
{
    public static class JarvisConfig
    {
        [Serializable]
        class KeyFile
        {
            public string openaiKey;
        }

        public static string OpenAiKey { get; private set; }
        public static bool Ready { get; private set; }

        public static IEnumerator Load()
        {
            Ready = false;
            OpenAiKey = null;
            var path = System.IO.Path.Combine(Application.streamingAssetsPath, "jarvis-local.json");
            using (var req = UnityWebRequest.Get(path))
            {
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    Debug.Log("[Jarvis] no cloud voice file, headset voice only");
                    Ready = true;
                    yield break;
                }
                var parsed = JsonUtility.FromJson<KeyFile>(req.downloadHandler.text);
                if (parsed != null && !string.IsNullOrEmpty(parsed.openaiKey))
                {
                    OpenAiKey = parsed.openaiKey.Trim();
                    Debug.Log("[Jarvis] cloud voice configured");
                }
                else
                {
                    Debug.Log("[Jarvis] cloud voice file empty, headset voice only");
                }
            }
            Ready = true;
        }
    }
}
